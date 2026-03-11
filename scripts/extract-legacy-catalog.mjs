#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const DEFAULT_SQL_PATH = "agyc3416_santos_sa2025.sql";
const DEFAULT_OUTPUT_PATH = "data/legacy-products.json";
const DEFAULT_META_PATH = "data/legacy-products.meta.json";
const DEFAULT_BASE_URL = "https://santos.rs";

const TARGET_TABLES = new Set([
  "product",
  "productdetail",
  "productdetail_tr",
  "product_tr",
  "productwarehouse",
  "productcategory",
  "category",
  "product_file",
  "attr",
  "attrval",
  "attrprodval",
  "tax",
  "brend",
]);

const LANGUAGE_BY_ID = {
  1: "sr",
  42: "en",
};

function parseArgs(argv) {
  const args = {
    sqlPath: DEFAULT_SQL_PATH,
    outPath: DEFAULT_OUTPUT_PATH,
    metaPath: DEFAULT_META_PATH,
    baseUrl: DEFAULT_BASE_URL,
    includeInactive: false,
    includeNonExport: false,
    onlyInStock: false,
    limit: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--sql" && next) {
      args.sqlPath = next;
      i += 1;
      continue;
    }
    if (key === "--out" && next) {
      args.outPath = next;
      i += 1;
      continue;
    }
    if (key === "--meta" && next) {
      args.metaPath = next;
      i += 1;
      continue;
    }
    if (key === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }
    if (key === "--include-inactive") {
      args.includeInactive = true;
      continue;
    }
    if (key === "--include-non-export") {
      args.includeNonExport = true;
      continue;
    }
    if (key === "--only-in-stock") {
      args.onlyInStock = true;
      continue;
    }
    if (key === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      i += 1;
      continue;
    }
    if (key === "--help" || key === "-h") {
      printHelpAndExit(0);
    }
    throw new Error(`Unknown argument: ${key}`);
  }

  return args;
}

function printHelpAndExit(code) {
  const lines = [
    "Extract legacy webshop catalog from SQL dump",
    "",
    "Usage:",
    "  node scripts/extract-legacy-catalog.mjs [options]",
    "",
    "Options:",
    "  --sql <path>              Path to SQL dump",
    "  --out <path>              Output products JSON file",
    "  --meta <path>             Output metadata JSON file",
    "  --base-url <url>          Base URL for legacy images",
    "  --include-inactive        Keep products with active='n'",
    "  --include-non-export      Keep products with export='n'",
    "  --only-in-stock           Keep only products with stock > 0 in warehouse 1",
    "  --limit <n>               Limit final product count",
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
  process.exit(code);
}

function decodeSqlString(input) {
  return input
    .replace(/\\0/g, "\0")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\Z/g, "\u001A")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function decodeSqlValue(rawValue) {
  const value = rawValue.trim();
  if (/^null$/i.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    const unwrapped = value.slice(1, -1);
    return decodeSqlString(unwrapped);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  return value;
}

function splitTupleFields(tupleBody) {
  const fields = [];
  let inString = false;
  let escaped = false;
  let start = 0;

  for (let i = 0; i < tupleBody.length; i += 1) {
    const ch = tupleBody[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === ",") {
      fields.push(tupleBody.slice(start, i));
      start = i + 1;
    }
  }

  fields.push(tupleBody.slice(start));
  return fields;
}

function extractTuples(valuesRaw) {
  const tuples = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < valuesRaw.length; i += 1) {
    const ch = valuesRaw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) {
        start = i + 1;
      }
      depth += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        tuples.push(valuesRaw.slice(start, i));
        start = -1;
      }
    }
  }

  return tuples;
}

function parseInsertStatement(statement) {
  const match = statement.match(
    /^INSERT INTO\s+`([^`]+)`\s+\(([\s\S]*?)\)\s+VALUES\s+([\s\S]+);$/i,
  );
  if (!match) return null;
  const table = match[1];
  const columns = match[2]
    .split(",")
    .map((col) => col.replace(/`/g, "").trim())
    .filter(Boolean);
  const valuesRaw = match[3];
  const tuples = extractTuples(valuesRaw);
  const rows = tuples.map((tupleBody) => {
    const fields = splitTupleFields(tupleBody);
    const row = {};
    for (let i = 0; i < columns.length; i += 1) {
      row[columns[i]] = decodeSqlValue(fields[i] ?? "NULL");
    }
    return row;
  });
  return { table, rows };
}

function ensureNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildImageUrl(content, baseUrl) {
  if (!content) return null;
  const normalizedBase = String(baseUrl).trim().replace(/\/+$/, "");
  const clean = String(content).trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^fajlovi\//i.test(clean)) return `${normalizedBase}/${clean}`;
  if (clean.includes("/")) return `${normalizedBase}/${clean}`;
  return `${normalizedBase}/fajlovi/product/${clean}`;
}

function buildCategoryPath(categoryId, categories) {
  const pathParts = [];
  let current = categoryId;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    const row = categories.get(current);
    if (!row) break;
    pathParts.unshift(row.name || String(row.id));
    current = ensureNumber(row.parentid);
  }
  return pathParts;
}

function round(value, digits = 2) {
  const p = 10 ** digits;
  return Math.round(ensureNumber(value) * p) / p;
}

function pickNetPrice(product, stockRow) {
  const productPrice = ensureNumber(product.price, 0);
  if (productPrice > 0) return productPrice;

  const warehouseRows = Array.isArray(stockRow?.warehouses) ? stockRow.warehouses : [];
  const warehouse1Price = warehouseRows
    .filter((row) => ensureNumber(row.warehouseid, 0) === 1)
    .map((row) => ensureNumber(row.price, 0))
    .find((value) => value > 0);
  if (warehouse1Price != null) return warehouse1Price;

  const anyWarehousePrice = warehouseRows
    .map((row) => ensureNumber(row.price, 0))
    .find((value) => value > 0);
  if (anyWarehousePrice != null) return anyWarehousePrice;

  return 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sqlPath = path.resolve(process.cwd(), args.sqlPath);
  const outPath = path.resolve(process.cwd(), args.outPath);
  const metaPath = path.resolve(process.cwd(), args.metaPath);

  const state = {
    counters: {
      insertStatements: 0,
      rowCount: 0,
      tableRows: Object.fromEntries([...TARGET_TABLES].map((table) => [table, 0])),
      skippedProductsInactive: 0,
      skippedProductsNonExport: 0,
      skippedProductsOutOfStock: 0,
    },
    products: new Map(),
    details: new Map(),
    detailTr: new Map(),
    productTr: new Map(),
    stock: new Map(),
    categories: new Map(),
    productCategories: new Map(),
    productFiles: new Map(),
    taxes: new Map(),
    brands: new Map(),
    attrs: new Map(),
    attrValues: new Map(),
    attrLinks: new Map(),
  };

  const readStream = fs.createReadStream(sqlPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  let currentStatement = null;

  for await (const line of rl) {
    const insertMatch = line.match(/^\s*INSERT INTO\s+`([^`]+)`/i);
    if (!currentStatement) {
      if (!insertMatch) continue;
      const table = insertMatch[1];
      if (!TARGET_TABLES.has(table)) continue;
      currentStatement = line;
      if (line.trim().endsWith(";")) {
        processStatement(currentStatement, state);
        currentStatement = null;
      }
      continue;
    }

    currentStatement += `\n${line}`;
    if (line.trim().endsWith(";")) {
      processStatement(currentStatement, state);
      currentStatement = null;
    }
  }

  const sizeAttrIds = new Set([5]);
  for (const [attrId, row] of state.attrs.entries()) {
    const label = `${row.name || ""}`.toLowerCase();
    if (label.includes("velic")) sizeAttrIds.add(attrId);
  }

  const products = [];
  for (const [productId, product] of state.products.entries()) {
    const isActive = String(product.active || "").toLowerCase() === "y";
    const isExport = String(product.export || "").toLowerCase() === "y";
    if (!args.includeInactive && !isActive) {
      state.counters.skippedProductsInactive += 1;
      continue;
    }
    if (!args.includeNonExport && !isExport) {
      state.counters.skippedProductsNonExport += 1;
      continue;
    }

    const stockRow = state.stock.get(productId) || {
      warehouse1: 0,
      total: 0,
      warehouses: [],
    };
    if (args.onlyInStock && stockRow.warehouse1 <= 0) {
      state.counters.skippedProductsOutOfStock += 1;
      continue;
    }

    const details = state.details.get(productId) || {};
    const detailTr = state.detailTr.get(productId) || {};
    const productTr = state.productTr.get(productId) || {};

    const nameSr =
      productTr.sr?.name ||
      (typeof product.altername === "string" && product.altername.trim().length > 0
        ? product.altername
        : product.name) ||
      "";
    const nameEn = productTr.en?.name || null;

    const descSr = detailTr.sr?.description || details.description || null;
    const descEn = detailTr.en?.description || null;
    const specSr = detailTr.sr?.specification || details.specification || null;
    const specEn = detailTr.en?.specification || null;

    const taxId = ensureNumber(product.taxid);
    const taxPercent = ensureNumber(state.taxes.get(taxId)?.value, 0);
    const priceNet = pickNetPrice(product, stockRow);
    const rebatePercent = ensureNumber(product.rebate, 0);
    const priceGross = round(priceNet * (1 + taxPercent / 100), 2);
    const priceFinalGross = round(priceGross * (1 - rebatePercent / 100), 2);

    const categoryIds = Array.from(state.productCategories.get(productId) || []);
    const categories = categoryIds
      .map((categoryId) => {
        const row = state.categories.get(categoryId);
        if (!row) return null;
        return {
          id: categoryId,
          name: row.name || String(categoryId),
          parentId: ensureNumber(row.parentid),
          path: buildCategoryPath(categoryId, state.categories),
        };
      })
      .filter(Boolean);

    const imageRows = [...(state.productFiles.get(productId) || [])]
      .filter((row) => String(row.type || "").toLowerCase() === "img")
      .filter((row) => String(row.status || "v").toLowerCase() !== "h")
      .sort((a, b) => ensureNumber(a.sort) - ensureNumber(b.sort));
    const images = imageRows
      .map((img) => buildImageUrl(img.content, args.baseUrl))
      .filter(Boolean);
    const coverImage = images[0] || null;

    const attrValidIds = Array.from(state.attrLinks.get(productId) || []);
    const sizeSet = new Set();
    for (const attrValidId of attrValidIds) {
      const attrValue = state.attrValues.get(attrValidId);
      if (!attrValue) continue;
      const attrId = ensureNumber(attrValue.attrid);
      if (!sizeAttrIds.has(attrId)) continue;
      const value = `${attrValue.value || ""}`.trim();
      if (value) sizeSet.add(value);
    }

    const brandId = ensureNumber(product.brendid);
    const brand = state.brands.get(brandId)?.name || null;

    products.push({
      legacyId: productId,
      sku: `${product.code || ""}`.trim(),
      ean: product.barcode ? `${product.barcode}` : null,
      manufCode: product.manufcode ? `${product.manufcode}` : null,
      brand,
      status: {
        active: product.active || "n",
        export: product.export || "n",
      },
      names: {
        sr: `${nameSr || ""}`.trim(),
        en: nameEn ? `${nameEn}`.trim() || null : null,
        legacy: `${product.name || ""}`.trim(),
      },
      descriptions: {
        sr: descSr ? `${descSr}` : null,
        en: descEn ? `${descEn}` : null,
      },
      specification: {
        sr: specSr ? `${specSr}` : null,
        en: specEn ? `${specEn}` : null,
      },
      price: {
        net: round(priceNet, 2),
        gross: round(priceGross, 2),
        finalGross: round(priceFinalGross, 2),
        taxPercent: round(taxPercent, 2),
        rebatePercent: round(rebatePercent, 2),
      },
      stock: {
        warehouse1: round(stockRow.warehouse1, 3),
        total: round(stockRow.total, 3),
        warehouses: stockRow.warehouses.map((warehouseRow) => ({
          warehouseId: ensureNumber(warehouseRow.warehouseid),
          amount: round(ensureNumber(warehouseRow.amount), 3),
          reservedAmount: round(ensureNumber(warehouseRow.reservedamount), 3),
          orderedAmount: round(ensureNumber(warehouseRow.orderedamount), 3),
          priceNet: round(ensureNumber(warehouseRow.price), 6),
        })),
      },
      categories,
      images,
      coverImage,
      attributes: {
        size: Array.from(sizeSet),
      },
      raw: {
        taxId,
        oldProductId: ensureNumber(product.old_productid),
        erpId: ensureNumber(product.erp_id),
        ts: product.ts ? `${product.ts}` : null,
      },
    });
  }

  products.sort((a, b) => a.legacyId - b.legacyId);
  const finalProducts = args.limit ? products.slice(0, args.limit) : products;

  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  await fsp.writeFile(outPath, JSON.stringify(finalProducts, null, 2), "utf8");

  const meta = {
    generatedAt: new Date().toISOString(),
    inputSql: path.relative(process.cwd(), sqlPath),
    outputFile: path.relative(process.cwd(), outPath),
    options: {
      includeInactive: args.includeInactive,
      includeNonExport: args.includeNonExport,
      onlyInStock: args.onlyInStock,
      limit: args.limit,
      baseUrl: args.baseUrl,
    },
    counters: {
      ...state.counters,
      parsedProducts: state.products.size,
      finalProducts: finalProducts.length,
      categories: state.categories.size,
      brands: state.brands.size,
      taxes: state.taxes.size,
    },
  };
  await fsp.mkdir(path.dirname(metaPath), { recursive: true });
  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `[legacy-extract] products: ${finalProducts.length} | output: ${path.relative(
      process.cwd(),
      outPath,
    )} | meta: ${path.relative(process.cwd(), metaPath)}`,
  );
}

function processStatement(statement, state) {
  const parsed = parseInsertStatement(statement);
  if (!parsed) return;
  const { table, rows } = parsed;
  state.counters.insertStatements += 1;
  state.counters.rowCount += rows.length;
  state.counters.tableRows[table] += rows.length;

  for (const row of rows) {
    switch (table) {
      case "product": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.products.set(id, row);
        break;
      }
      case "productdetail": {
        const productId = ensureNumber(row.productid, -1);
        if (productId < 0) break;
        state.details.set(productId, row);
        break;
      }
      case "productdetail_tr": {
        const productId = ensureNumber(row.productid, -1);
        const lang = LANGUAGE_BY_ID[ensureNumber(row.langid)] || null;
        if (productId < 0 || !lang) break;
        const current = state.detailTr.get(productId) || {};
        current[lang] = row;
        state.detailTr.set(productId, current);
        break;
      }
      case "product_tr": {
        const productId = ensureNumber(row.productid, -1);
        const lang = LANGUAGE_BY_ID[ensureNumber(row.langid)] || null;
        if (productId < 0 || !lang) break;
        const current = state.productTr.get(productId) || {};
        current[lang] = row;
        state.productTr.set(productId, current);
        break;
      }
      case "productwarehouse": {
        const productId = ensureNumber(row.productid, -1);
        if (productId < 0) break;
        const current = state.stock.get(productId) || {
          warehouse1: 0,
          total: 0,
          warehouses: [],
        };
        const amount = ensureNumber(row.amount, 0);
        const warehouseId = ensureNumber(row.warehouseid, 0);
        current.total += amount;
        if (warehouseId === 1) current.warehouse1 += amount;
        current.warehouses.push(row);
        state.stock.set(productId, current);
        break;
      }
      case "productcategory": {
        const productId = ensureNumber(row.productid, -1);
        const categoryId = ensureNumber(row.categoryid, -1);
        if (productId < 0 || categoryId < 0) break;
        const current = state.productCategories.get(productId) || new Set();
        current.add(categoryId);
        state.productCategories.set(productId, current);
        break;
      }
      case "category": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.categories.set(id, row);
        break;
      }
      case "product_file": {
        const productId = ensureNumber(row.productid, -1);
        if (productId < 0) break;
        const current = state.productFiles.get(productId) || [];
        current.push(row);
        state.productFiles.set(productId, current);
        break;
      }
      case "tax": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.taxes.set(id, row);
        break;
      }
      case "brend": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.brands.set(id, row);
        break;
      }
      case "attr": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.attrs.set(id, row);
        break;
      }
      case "attrval": {
        const id = ensureNumber(row.id, -1);
        if (id < 0) break;
        state.attrValues.set(id, row);
        break;
      }
      case "attrprodval": {
        const productId = ensureNumber(row.productid, -1);
        const attrValId = ensureNumber(row.attrvalid, -1);
        if (productId < 0 || attrValId < 0) break;
        const current = state.attrLinks.get(productId) || new Set();
        current.add(attrValId);
        state.attrLinks.set(productId, current);
        break;
      }
      default:
        break;
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[legacy-extract] failed: ${err?.message || err}`);
  process.exit(1);
});
