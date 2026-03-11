import crypto from "crypto";
import AdmZip from "adm-zip";
import { fileBaseName, parseLegacyCsv } from "@/lib/integrations/core/csv";
import { createPayloadHash } from "@/lib/integrations/core/hash";
import {
  addSyncRunItem,
  getDeltaHash,
  saveRawStockFile,
  saveRawStockRows,
  setDeltaState,
} from "@/lib/integrations/core/store";
import type { IntegrationContext, SyncCounters } from "@/lib/integrations/core/types";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import { getServiceSupabase } from "@/lib/supabase/server";

type RunInboundOptions = {
  context: IntegrationContext;
};

type ProductCsvRow = {
  sourceId: number;
  legacyId: number;
  category: string;
  sku: string;
  name: string;
  size: string;
  amount: number;
  barcode: string;
  mpprice: number;
  vpprice: number;
  taxCode: number;
};

type ProductCategoryCsvRow = {
  legacyId: number;
  categoryId: number;
};

type CategoryCsvRow = {
  id: number;
  name: string;
  parentId: number | null;
};

type TaxCsvRow = {
  id: number;
  value: number;
};

type WarehouseCsvRow = {
  legacyId: number;
  warehouseId: number;
  amount: number;
  price: number;
  reservedAmount: number;
  orderedAmount: number;
};

type ProductDetailCsvRow = {
  legacyId: number;
  description: string;
  specification: string;
};

type CategoryRecord = {
  id: number;
  name: string;
  parentId: number | null;
};

type HandlerRowFailure = {
  rowIndex: number;
  reason: string;
  row?: (string | number)[];
};

type HandlerResult = {
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  warnings: string[];
  details?: Record<string, unknown>;
  rowFailures: HandlerRowFailure[];
};

type InboundState = {
  categoryMap: Map<number, CategoryRecord>;
  categoryNameIndex: Map<string, number>;
  taxMap: Map<number, number>;
};

const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";
const CATEGORY_MAP_PATH = "data/integrations/stock-category-map.json";
const TAX_MAP_PATH = "data/integrations/stock-tax-map.json";
const MAX_ROW_FAILURE_LOGS_PER_FILE = 200;

const NOOP_COMPATIBILITY_FILES = new Set([
  "document",
  "documentitem",
  "partner",
  "partnercategorypr",
  "bankstatement",
  "bankstatementitem",
  "categorypr",
]);

const OPTIONAL_FILES = [
  "product",
  "productdeleted",
  "tax",
  "category",
  "productcategory",
  "productwarehouse",
  "productdetail",
];

const toNumber = (value: string | number | undefined, fallback = 0) => {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
};

const round = (value: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round(toNumber(value, 0) * p) / p;
};

const toText = (value: string | number | undefined) => String(value ?? "").trim();

const normalizeName = (value: string) => value.trim().toLowerCase();

const parseMd5 = (raw: string) => {
  const token = String(raw || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase();
  return /^[a-f0-9]{32}$/.test(token) ? token : null;
};

const parseProductCsvRow = (row: (string | number)[]): ProductCsvRow | null => {
  if (row.length < 10) return null;
  const sourceId = toNumber(row[0], NaN);
  const barcode = toText(row[6]);
  const barcodeAsLegacyId = toNumber(barcode, NaN);
  const legacyId =
    Number.isFinite(barcodeAsLegacyId) && barcodeAsLegacyId > 0 ? barcodeAsLegacyId : sourceId;
  if (!Number.isFinite(legacyId) || legacyId <= 0) return null;
  return {
    sourceId: Number.isFinite(sourceId) && sourceId > 0 ? sourceId : legacyId,
    legacyId,
    category: toText(row[1]),
    sku: toText(row[2]),
    name: toText(row[3]),
    size: toText(row[4]),
    amount: toNumber(row[5], 0),
    barcode: toText(row[6]),
    mpprice: toNumber(row[7], 0),
    vpprice: toNumber(row[8], 0),
    taxCode: toNumber(row[9], 0),
  };
};

const parseCategoryCsvRow = (row: (string | number)[]): CategoryCsvRow | null => {
  if (row.length < 2) return null;
  const id = toNumber(row[0], NaN);
  const name = toText(row[1]);
  if (!Number.isFinite(id) || id <= 0 || !name) return null;
  const parentRaw = toNumber(row[2], 0);
  const parentId = Number.isFinite(parentRaw) && parentRaw > 0 ? parentRaw : null;
  return { id, name, parentId };
};

const parseProductCategoryCsvRow = (row: (string | number)[]): ProductCategoryCsvRow | null => {
  if (row.length < 2) return null;
  const legacyId = toNumber(row[0], NaN);
  const categoryId = toNumber(row[1], NaN);
  if (!Number.isFinite(legacyId) || legacyId <= 0) return null;
  if (!Number.isFinite(categoryId) || categoryId <= 0) return null;
  return { legacyId, categoryId };
};

const parseTaxCsvRow = (row: (string | number)[]): TaxCsvRow | null => {
  if (row.length < 4) return null;
  const id = toNumber(row[0], NaN);
  const value = toNumber(row[3], NaN);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return { id, value };
};

const parseWarehouseCsvRow = (row: (string | number)[]): WarehouseCsvRow | null => {
  if (row.length < 8) return null;
  const legacyId = toNumber(row[0], NaN);
  const warehouseId = toNumber(row[1], NaN);
  if (!Number.isFinite(legacyId) || legacyId <= 0) return null;
  if (!Number.isFinite(warehouseId) || warehouseId <= 0) return null;
  return {
    legacyId,
    warehouseId,
    amount: toNumber(row[2], 0),
    price: toNumber(row[3], 0),
    reservedAmount: toNumber(row[4], 0),
    orderedAmount: toNumber(row[6], 0),
  };
};

const parseProductDetailCsvRow = (row: (string | number)[]): ProductDetailCsvRow | null => {
  if (row.length < 5) return null;
  const legacyId = toNumber(row[0], NaN);
  if (!Number.isFinite(legacyId) || legacyId <= 0) return null;
  return {
    legacyId,
    description: toText(row[2]),
    specification: toText(row[4]),
  };
};

const buildCategoryPath = (id: number, state: InboundState): string[] => {
  const path: string[] = [];
  let current: number | null = id;
  const guard = new Set<number>();
  while (current && !guard.has(current)) {
    guard.add(current);
    const category = state.categoryMap.get(current);
    if (!category) break;
    path.unshift(category.name);
    current = category.parentId;
  }
  return path;
};

const resolveCategoryByName = (name: string, state: InboundState): number | null => {
  const key = normalizeName(name);
  if (!key) return null;
  return state.categoryNameIndex.get(key) || null;
};

const resolveTaxPercent = (taxCode: number, state: InboundState): number => {
  if (state.taxMap.has(taxCode)) return Number(state.taxMap.get(taxCode) || 20);
  if (taxCode > 0 && taxCode <= 100) return taxCode;
  return 20;
};

const toCategoriesPayload = (categoryIds: number[], state: InboundState) => {
  const out: Array<{ id: number; name: string; path: string[] }> = [];
  for (const categoryId of categoryIds) {
    const category = state.categoryMap.get(categoryId);
    if (!category) continue;
    out.push({
      id: category.id,
      name: category.name,
      path: buildCategoryPath(category.id, state),
    });
  }
  return out;
};

const extractRawPayload = (value: unknown) => {
  if (value && typeof value === "object") {
    return { ...(value as Record<string, unknown>) };
  }
  return {} as Record<string, unknown>;
};

async function downloadLegacyZip() {
  const zipUrl = process.env.STOCK_SYNC_SOURCE_ZIP_URL?.trim();
  if (!zipUrl) {
    throw new Error("Missing STOCK_SYNC_SOURCE_ZIP_URL env variable.");
  }
  const md5Url = process.env.STOCK_SYNC_SOURCE_MD5_URL?.trim() || `${zipUrl}.md5`;

  const [zipRes, md5Res] = await Promise.all([
    fetch(zipUrl, { cache: "no-store" }),
    fetch(md5Url, { cache: "no-store" }),
  ]);

  if (!zipRes.ok) {
    throw new Error(`Failed to download zip: ${zipRes.status}`);
  }
  if (!md5Res.ok) {
    throw new Error(`Failed to download md5: ${md5Res.status}`);
  }

  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
  const providedMd5 = parseMd5(await md5Res.text());
  if (!providedMd5) {
    throw new Error("Invalid md5 content.");
  }
  const checksum = crypto.createHash("md5").update(zipBuffer).digest("hex");
  if (checksum !== providedMd5) {
    throw new Error(`MD5 mismatch. expected=${providedMd5} actual=${checksum}`);
  }

  return { zipBuffer, checksum, zipUrl };
}

async function loadInboundState(): Promise<InboundState> {
  const categoryRows = await readJsonFile<CategoryRecord[]>(CATEGORY_MAP_PATH, []);
  const taxRows = await readJsonFile<Record<string, number>>(TAX_MAP_PATH, {});

  const categoryMap = new Map<number, CategoryRecord>();
  const categoryNameIndex = new Map<string, number>();
  for (const row of categoryRows) {
    if (!row || !Number.isFinite(Number(row.id)) || !row.name) continue;
    const normalized: CategoryRecord = {
      id: Number(row.id),
      name: String(row.name),
      parentId: row.parentId == null ? null : Number(row.parentId),
    };
    categoryMap.set(normalized.id, normalized);
    categoryNameIndex.set(normalizeName(normalized.name), normalized.id);
  }

  const taxMap = new Map<number, number>();
  for (const [key, value] of Object.entries(taxRows || {})) {
    const taxId = Number(key);
    if (!Number.isFinite(taxId) || taxId <= 0) continue;
    const taxValue = Number(value);
    if (!Number.isFinite(taxValue)) continue;
    taxMap.set(taxId, taxValue);
  }

  return { categoryMap, categoryNameIndex, taxMap };
}

async function persistCategoryState(state: InboundState) {
  const rows = Array.from(state.categoryMap.values()).sort((a, b) => a.id - b.id);
  await writeJsonFile(CATEGORY_MAP_PATH, rows);
}

async function persistTaxState(state: InboundState) {
  const payload: Record<string, number> = {};
  for (const [key, value] of state.taxMap.entries()) {
    payload[String(key)] = value;
  }
  await writeJsonFile(TAX_MAP_PATH, payload);
}

async function applyProductRows(rows: (string | number)[][], state: InboundState) {
  const failures: HandlerRowFailure[] = [];
  const parsed: ProductCsvRow[] = [];

  rows.forEach((row, rowIndex) => {
    const value = parseProductCsvRow(row);
    if (!value) {
      failures.push({ rowIndex, reason: "Invalid product CSV row.", row });
      return;
    }
    parsed.push(value);
  });

  if (!parsed.length) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: failures.length,
      skippedRows: 0,
      warnings: ["No valid product rows found."],
      rowFailures: failures,
    } satisfies HandlerResult;
  }

  const supabase = getServiceSupabase();
  if (supabase) {
    const now = new Date().toISOString();
    const upsertRows = parsed.map((row) => {
      const legacySku = row.sku || row.barcode || `legacy-${row.legacyId}`;
      const categoryId = resolveCategoryByName(row.category, state);
      const categoriesPayload = categoryId
        ? toCategoriesPayload([categoryId], state)
        : row.category
          ? [{ id: 0, name: row.category, path: [row.category] }]
          : [];
      const taxPercent = resolveTaxPercent(row.taxCode, state);
      const priceNet = toNumber(row.vpprice, 0);
      const priceGrossRaw = toNumber(row.mpprice, 0);
      const priceGross = priceGrossRaw > 0 ? priceGrossRaw : round(priceNet * (1 + taxPercent / 100), 2);
      const payload = {
        syncSource: "legacy-stock-product.csv",
        sourceProductId: row.sourceId,
        category: row.category,
        size: row.size,
        mpprice: row.mpprice,
        vpprice: row.vpprice,
        taxCode: row.taxCode,
        categories: categoriesPayload,
      };
      return {
        legacy_id: row.legacyId,
        sku: legacySku,
        ean: row.barcode || null,
        manuf_code: row.sku || null,
        brand: "Santos&Santorini",
        is_active: true,
        is_exported: true,
        name_sr: row.name || legacySku,
        name_en: null,
        description_sr: null,
        description_en: null,
        specification_sr: null,
        specification_en: null,
        price_net: priceNet,
        price_gross: priceGross,
        price_final_gross: priceGross,
        tax_percent: taxPercent,
        rebate_percent: 0,
        stock_warehouse_1: row.amount,
        stock_total: row.amount,
        raw_payload: payload,
        updated_at: now,
      };
    });

    const { error } = await supabase.from("catalog_products").upsert(upsertRows, { onConflict: "legacy_id" });
    if (error) {
      parsed.forEach((row, idx) => {
        failures.push({
          rowIndex: idx,
          reason: `Product upsert failed: ${error.message}`,
          row: [row.legacyId, row.sku, row.name],
        });
      });
      return {
        processedRows: rows.length,
        successRows: 0,
        failedRows: failures.length,
        skippedRows: 0,
        warnings: [],
        rowFailures: failures,
      } satisfies HandlerResult;
    }

    return {
      processedRows: rows.length,
      successRows: parsed.length,
      failedRows: failures.length,
      skippedRows: 0,
      warnings: [],
      rowFailures: failures,
      details: { updatedProducts: parsed.length },
    } satisfies HandlerResult;
  }

  const current = await readJsonFile<any[]>(LEGACY_PRODUCTS_PATH, []);
  const byId = new Map<number, any>();
  for (const item of current) {
    byId.set(Number(item.legacyId || 0), item);
  }

  for (const row of parsed) {
    const categoryId = resolveCategoryByName(row.category, state);
    const categoryPayload = categoryId
      ? toCategoriesPayload([categoryId], state)
      : row.category
        ? [{ id: 0, name: row.category, path: [row.category] }]
        : [];
    const taxPercent = resolveTaxPercent(row.taxCode, state);
    const priceNet = toNumber(row.vpprice, 0);
    const priceGrossRaw = toNumber(row.mpprice, 0);
    const priceGross = priceGrossRaw > 0 ? priceGrossRaw : round(priceNet * (1 + taxPercent / 100), 2);
    const entry = byId.get(row.legacyId);
    if (entry) {
      entry.sku = row.sku || entry.sku;
      entry.ean = row.barcode || entry.ean;
      entry.names = entry.names || {};
      entry.names.sr = row.name || entry.names.sr || row.sku;
      entry.price = entry.price || {};
      entry.price.net = priceNet;
      entry.price.gross = priceGross;
      entry.price.finalGross = priceGross;
      entry.price.taxPercent = taxPercent;
      entry.stock = entry.stock || {};
      entry.stock.warehouse1 = row.amount;
      entry.stock.total = row.amount;
      entry.categories = categoryPayload;
      entry.attributes = entry.attributes || {};
      const sizes = Array.isArray(entry.attributes.size) ? entry.attributes.size : [];
      if (row.size && !sizes.includes(row.size)) sizes.push(row.size);
      entry.attributes.size = sizes;
      entry.raw = entry.raw || {};
      entry.raw.stockSyncTs = new Date().toISOString();
      entry.raw.sourceProductId = row.sourceId;
      entry.raw.categories = categoryPayload;
      entry.raw.taxCode = row.taxCode;
      continue;
    }

    byId.set(row.legacyId, {
      legacyId: row.legacyId,
      sku: row.sku || row.barcode || `legacy-${row.legacyId}`,
      ean: row.barcode || null,
      manufCode: row.sku || null,
      brand: "Santos&Santorini",
      status: { active: "y", export: "y" },
      names: { sr: row.name || row.sku, en: null, legacy: row.name || row.sku },
      descriptions: { sr: null, en: null },
      specification: { sr: null, en: null },
      price: {
        net: priceNet,
        gross: priceGross,
        finalGross: priceGross,
        taxPercent,
        rebatePercent: 0,
      },
      stock: {
        warehouse1: row.amount,
        total: row.amount,
        warehouses: [
          {
            warehouseId: 1,
            amount: row.amount,
            reservedAmount: 0,
            orderedAmount: 0,
            priceNet: row.vpprice,
          },
        ],
      },
      categories: categoryPayload,
      images: [],
      coverImage: null,
      attributes: { size: row.size ? [row.size] : [] },
      raw: {
        taxId: row.taxCode,
        sourceProductId: row.sourceId,
        oldProductId: row.legacyId,
        erpId: row.legacyId,
        ts: new Date().toISOString(),
        categories: categoryPayload,
      },
    });
  }

  await writeJsonFile(LEGACY_PRODUCTS_PATH, Array.from(byId.values()));
  return {
    processedRows: rows.length,
    successRows: parsed.length,
    failedRows: failures.length,
    skippedRows: 0,
    warnings: [],
    rowFailures: failures,
    details: { updatedProducts: parsed.length },
  } satisfies HandlerResult;
}

async function applyDeletedRows(rows: (string | number)[][]) {
  const failures: HandlerRowFailure[] = [];
  const ids: number[] = [];

  rows.forEach((row, rowIndex) => {
    const id = toNumber(row[0], NaN);
    if (!Number.isFinite(id) || id <= 0) {
      failures.push({ rowIndex, reason: "Invalid productdeleted row.", row });
      return;
    }
    ids.push(id);
  });

  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: failures.length,
      skippedRows: 0,
      warnings: ["No valid product IDs for delete/deactivate."],
      rowFailures: failures,
    } satisfies HandlerResult;
  }

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("catalog_products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("legacy_id", uniqueIds);

    if (error) {
      uniqueIds.forEach((legacyId, index) => {
        failures.push({
          rowIndex: index,
          reason: `Deactivate failed: ${error.message}`,
          row: [legacyId],
        });
      });
      return {
        processedRows: rows.length,
        successRows: 0,
        failedRows: failures.length,
        skippedRows: 0,
        warnings: [],
        rowFailures: failures,
      } satisfies HandlerResult;
    }

    return {
      processedRows: rows.length,
      successRows: uniqueIds.length,
      failedRows: failures.length,
      skippedRows: 0,
      warnings: [],
      rowFailures: failures,
      details: { deactivatedProducts: uniqueIds.length },
    } satisfies HandlerResult;
  }

  const current = await readJsonFile<any[]>(LEGACY_PRODUCTS_PATH, []);
  const idSet = new Set(uniqueIds);
  for (const item of current) {
    if (idSet.has(Number(item.legacyId || 0))) {
      item.status = item.status || {};
      item.status.active = "n";
    }
  }
  await writeJsonFile(LEGACY_PRODUCTS_PATH, current);

  return {
    processedRows: rows.length,
    successRows: uniqueIds.length,
    failedRows: failures.length,
    skippedRows: 0,
    warnings: [],
    rowFailures: failures,
    details: { deactivatedProducts: uniqueIds.length },
  } satisfies HandlerResult;
}

async function applyTaxRows(rows: (string | number)[][], state: InboundState) {
  const failures: HandlerRowFailure[] = [];
  let updated = 0;

  rows.forEach((row, rowIndex) => {
    const parsed = parseTaxCsvRow(row);
    if (!parsed) {
      failures.push({ rowIndex, reason: "Invalid tax row.", row });
      return;
    }
    state.taxMap.set(parsed.id, parsed.value);
    updated += 1;
  });

  await persistTaxState(state);
  return {
    processedRows: rows.length,
    successRows: updated,
    failedRows: failures.length,
    skippedRows: 0,
    warnings: [],
    rowFailures: failures,
    details: { updatedTaxRows: updated },
  } satisfies HandlerResult;
}

async function applyCategoryRows(rows: (string | number)[][], state: InboundState) {
  const failures: HandlerRowFailure[] = [];
  let updated = 0;

  rows.forEach((row, rowIndex) => {
    const parsed = parseCategoryCsvRow(row);
    if (!parsed) {
      failures.push({ rowIndex, reason: "Invalid category row.", row });
      return;
    }
    state.categoryMap.set(parsed.id, parsed);
    state.categoryNameIndex.set(normalizeName(parsed.name), parsed.id);
    updated += 1;
  });

  await persistCategoryState(state);
  return {
    processedRows: rows.length,
    successRows: updated,
    failedRows: failures.length,
    skippedRows: 0,
    warnings: [],
    rowFailures: failures,
    details: { updatedCategories: updated },
  } satisfies HandlerResult;
}

async function applyProductCategoryRows(rows: (string | number)[][], state: InboundState) {
  const failures: HandlerRowFailure[] = [];
  const grouped = new Map<number, Set<number>>();

  rows.forEach((row, rowIndex) => {
    const parsed = parseProductCategoryCsvRow(row);
    if (!parsed) {
      failures.push({ rowIndex, reason: "Invalid productcategory row.", row });
      return;
    }
    const set = grouped.get(parsed.legacyId) || new Set<number>();
    set.add(parsed.categoryId);
    grouped.set(parsed.legacyId, set);
  });

  if (!grouped.size) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: failures.length,
      skippedRows: 0,
      warnings: ["No valid productcategory rows."],
      rowFailures: failures,
    } satisfies HandlerResult;
  }

  const legacyIds = Array.from(grouped.keys());
  const supabase = getServiceSupabase();
  let successRows = 0;
  let skippedRows = 0;

  if (supabase) {
    const { data: products, error } = await supabase
      .from("catalog_products")
      .select("legacy_id,raw_payload")
      .in("legacy_id", legacyIds);

    if (error) {
      legacyIds.forEach((legacyId, index) => {
        failures.push({
          rowIndex: index,
          reason: `Productcategory fetch failed: ${error.message}`,
          row: [legacyId],
        });
      });
      return {
        processedRows: rows.length,
        successRows: 0,
        failedRows: failures.length,
        skippedRows: 0,
        warnings: [],
        rowFailures: failures,
      } satisfies HandlerResult;
    }

    const productMap = new Map<number, Record<string, unknown>>();
    for (const row of products || []) {
      const data = row as Record<string, unknown>;
      productMap.set(Number(data.legacy_id), extractRawPayload(data.raw_payload));
    }

    for (const legacyId of legacyIds) {
      const categoryIds = Array.from(grouped.get(legacyId) || []);
      const categories = toCategoriesPayload(categoryIds, state);
      if (!categories.length) {
        skippedRows += 1;
        failures.push({
          rowIndex: legacyId,
          reason: `No known category records for product ${legacyId}.`,
          row: [legacyId],
        });
        continue;
      }

      const rawPayload = productMap.get(legacyId);
      if (!rawPayload) {
        failures.push({
          rowIndex: legacyId,
          reason: `Product ${legacyId} not found for category mapping.`,
          row: [legacyId],
        });
        continue;
      }

      rawPayload.categories = categories;
      const { error: updateError } = await supabase
        .from("catalog_products")
        .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() })
        .eq("legacy_id", legacyId);

      if (updateError) {
        failures.push({
          rowIndex: legacyId,
          reason: `Category update failed for product ${legacyId}: ${updateError.message}`,
          row: [legacyId],
        });
        continue;
      }
      successRows += 1;
    }

    return {
      processedRows: rows.length,
      successRows,
      failedRows: failures.length,
      skippedRows,
      warnings: [],
      rowFailures: failures,
      details: { mappedProducts: successRows },
    } satisfies HandlerResult;
  }

  const products = await readJsonFile<any[]>(LEGACY_PRODUCTS_PATH, []);
  const byId = new Map<number, any>();
  for (const item of products) {
    byId.set(Number(item.legacyId || 0), item);
  }

  for (const legacyId of legacyIds) {
    const product = byId.get(legacyId);
    if (!product) {
      failures.push({
        rowIndex: legacyId,
        reason: `Product ${legacyId} not found for category mapping.`,
        row: [legacyId],
      });
      continue;
    }
    const categoryIds = Array.from(grouped.get(legacyId) || []);
    const categories = toCategoriesPayload(categoryIds, state);
    if (!categories.length) {
      skippedRows += 1;
      failures.push({
        rowIndex: legacyId,
        reason: `No known category records for product ${legacyId}.`,
        row: [legacyId],
      });
      continue;
    }
    product.categories = categories;
    product.raw = product.raw || {};
    product.raw.categories = categories;
    successRows += 1;
  }

  await writeJsonFile(LEGACY_PRODUCTS_PATH, Array.from(byId.values()));
  return {
    processedRows: rows.length,
    successRows,
    failedRows: failures.length,
    skippedRows,
    warnings: [],
    rowFailures: failures,
    details: { mappedProducts: successRows },
  } satisfies HandlerResult;
}

async function applyProductWarehouseRows(rows: (string | number)[][]) {
  const failures: HandlerRowFailure[] = [];
  const parsed: WarehouseCsvRow[] = [];
  let skippedRows = 0;

  rows.forEach((row, rowIndex) => {
    const value = parseWarehouseCsvRow(row);
    if (!value) {
      failures.push({ rowIndex, reason: "Invalid productwarehouse row.", row });
      return;
    }
    if (value.warehouseId !== 1) {
      skippedRows += 1;
      return;
    }
    parsed.push(value);
  });

  if (!parsed.length) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: failures.length,
      skippedRows,
      warnings: ["No warehouse #1 rows to apply."],
      rowFailures: failures,
    } satisfies HandlerResult;
  }

  const supabase = getServiceSupabase();
  let successRows = 0;

  if (supabase) {
    const productIds = Array.from(new Set(parsed.map((row) => row.legacyId)));
    const taxByProductId = new Map<number, { taxPercent: number; rebatePercent: number }>();
    if (productIds.length) {
      const { data: products, error: productsError } = await supabase
        .from("catalog_products")
        .select("legacy_id,tax_percent,rebate_percent")
        .in("legacy_id", productIds);
      if (productsError) {
        failures.push({
          rowIndex: -1,
          reason: `Unable to load product tax/rebate metadata: ${productsError.message}`,
        });
      } else {
        for (const product of products || []) {
          const row = product as Record<string, unknown>;
          const legacyId = toNumber(row.legacy_id as number, NaN);
          if (!Number.isFinite(legacyId) || legacyId <= 0) continue;
          taxByProductId.set(legacyId, {
            taxPercent: toNumber(row.tax_percent as number, 20),
            rebatePercent: toNumber(row.rebate_percent as number, 0),
          });
        }
      }
    }

    for (const row of parsed) {
      const patch: Record<string, unknown> = {
        stock_warehouse_1: row.amount,
        stock_total: row.amount,
        updated_at: new Date().toISOString(),
      };
      if (row.price > 0) {
        const taxMeta = taxByProductId.get(row.legacyId) || { taxPercent: 20, rebatePercent: 0 };
        const priceNet = toNumber(row.price, 0);
        const priceGross = round(priceNet * (1 + toNumber(taxMeta.taxPercent, 20) / 100), 2);
        const priceFinalGross = round(
          priceGross * (1 - toNumber(taxMeta.rebatePercent, 0) / 100),
          2,
        );
        patch.price_net = priceNet;
        patch.price_gross = priceGross;
        patch.price_final_gross = priceFinalGross;
      }

      const { error } = await supabase
        .from("catalog_products")
        .update(patch)
        .eq("legacy_id", row.legacyId);

      if (error) {
        failures.push({
          rowIndex: row.legacyId,
          reason: `Warehouse update failed for product ${row.legacyId}: ${error.message}`,
          row: [row.legacyId, row.warehouseId],
        });
        continue;
      }
      successRows += 1;
    }

    return {
      processedRows: rows.length,
      successRows,
      failedRows: failures.length,
      skippedRows,
      warnings: [],
      rowFailures: failures,
      details: { updatedWarehouseRows: successRows },
    } satisfies HandlerResult;
  }

  const products = await readJsonFile<any[]>(LEGACY_PRODUCTS_PATH, []);
  const byId = new Map<number, any>();
  for (const item of products) {
    byId.set(Number(item.legacyId || 0), item);
  }

  for (const row of parsed) {
    const product = byId.get(row.legacyId);
    if (!product) {
      failures.push({
        rowIndex: row.legacyId,
        reason: `Product ${row.legacyId} not found for warehouse update.`,
        row: [row.legacyId],
      });
      continue;
    }
    product.stock = product.stock || {};
    product.stock.warehouse1 = row.amount;
    product.stock.total = row.amount;
    if (row.price > 0) {
      const taxPercent = toNumber(product.price?.taxPercent, 20);
      const rebatePercent = toNumber(product.price?.rebatePercent, 0);
      const priceNet = toNumber(row.price, 0);
      const priceGross = round(priceNet * (1 + taxPercent / 100), 2);
      const priceFinalGross = round(priceGross * (1 - rebatePercent / 100), 2);
      product.price = product.price || {};
      product.price.net = priceNet;
      product.price.gross = priceGross;
      product.price.finalGross = priceFinalGross;
    }
    product.raw = product.raw || {};
    product.raw.stockWarehouse = {
      warehouseId: row.warehouseId,
      amount: row.amount,
      price: row.price,
      reservedAmount: row.reservedAmount,
      orderedAmount: row.orderedAmount,
      ts: new Date().toISOString(),
    };
    successRows += 1;
  }

  await writeJsonFile(LEGACY_PRODUCTS_PATH, Array.from(byId.values()));
  return {
    processedRows: rows.length,
    successRows,
    failedRows: failures.length,
    skippedRows,
    warnings: [],
    rowFailures: failures,
    details: { updatedWarehouseRows: successRows },
  } satisfies HandlerResult;
}

async function applyProductDetailRows(rows: (string | number)[][]) {
  const failures: HandlerRowFailure[] = [];
  const parsed: ProductDetailCsvRow[] = [];

  rows.forEach((row, rowIndex) => {
    const value = parseProductDetailCsvRow(row);
    if (!value) {
      failures.push({ rowIndex, reason: "Invalid productdetail row.", row });
      return;
    }
    if (!value.description && !value.specification) {
      return;
    }
    parsed.push(value);
  });

  if (!parsed.length) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: failures.length,
      skippedRows: rows.length - failures.length,
      warnings: ["No productdetail rows with description/specification."],
      rowFailures: failures,
    } satisfies HandlerResult;
  }

  const supabase = getServiceSupabase();
  let successRows = 0;

  if (supabase) {
    for (const row of parsed) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (row.description) patch.description_sr = row.description;
      if (row.specification) patch.specification_sr = row.specification;

      const { error } = await supabase
        .from("catalog_products")
        .update(patch)
        .eq("legacy_id", row.legacyId);

      if (error) {
        failures.push({
          rowIndex: row.legacyId,
          reason: `Detail update failed for product ${row.legacyId}: ${error.message}`,
          row: [row.legacyId],
        });
        continue;
      }
      successRows += 1;
    }

    return {
      processedRows: rows.length,
      successRows,
      failedRows: failures.length,
      skippedRows: rows.length - successRows - failures.length,
      warnings: [],
      rowFailures: failures,
      details: { updatedProductDetails: successRows },
    } satisfies HandlerResult;
  }

  const products = await readJsonFile<any[]>(LEGACY_PRODUCTS_PATH, []);
  const byId = new Map<number, any>();
  for (const item of products) {
    byId.set(Number(item.legacyId || 0), item);
  }

  for (const row of parsed) {
    const product = byId.get(row.legacyId);
    if (!product) {
      failures.push({
        rowIndex: row.legacyId,
        reason: `Product ${row.legacyId} not found for detail update.`,
        row: [row.legacyId],
      });
      continue;
    }
    product.descriptions = product.descriptions || {};
    product.specification = product.specification || {};
    if (row.description) product.descriptions.sr = row.description;
    if (row.specification) product.specification.sr = row.specification;
    successRows += 1;
  }

  await writeJsonFile(LEGACY_PRODUCTS_PATH, Array.from(byId.values()));
  return {
    processedRows: rows.length,
    successRows,
    failedRows: failures.length,
    skippedRows: rows.length - successRows - failures.length,
    warnings: [],
    rowFailures: failures,
    details: { updatedProductDetails: successRows },
  } satisfies HandlerResult;
}

async function runHandler(baseName: string, rows: (string | number)[][], state: InboundState) {
  if (baseName === "product") return applyProductRows(rows, state);
  if (baseName === "productdeleted") return applyDeletedRows(rows);
  if (baseName === "tax") return applyTaxRows(rows, state);
  if (baseName === "category") return applyCategoryRows(rows, state);
  if (baseName === "productcategory") return applyProductCategoryRows(rows, state);
  if (baseName === "productwarehouse") return applyProductWarehouseRows(rows);
  if (baseName === "productdetail") return applyProductDetailRows(rows);

  if (NOOP_COMPATIBILITY_FILES.has(baseName)) {
    return {
      processedRows: rows.length,
      successRows: 0,
      failedRows: 0,
      skippedRows: rows.length,
      warnings: [`Legacy file '${baseName}' is accepted but not applied in webshop domain.`],
      rowFailures: [],
      details: { noOp: true },
    } satisfies HandlerResult;
  }

  return {
    processedRows: rows.length,
    successRows: 0,
    failedRows: 0,
    skippedRows: rows.length,
    warnings: [`Unknown legacy file '${baseName}' skipped.`],
    rowFailures: [],
    details: { unknown: true },
  } satisfies HandlerResult;
}

export async function runStockInboundSync({ context }: RunInboundOptions) {
  const counters: SyncCounters = { total: 0, success: 0, failed: 0, skipped: 0 };
  const meta: Record<string, unknown> = {
    files: {},
    compatibility: {
      optionalFiles: OPTIONAL_FILES,
      acceptedNoOp: Array.from(NOOP_COMPATIBILITY_FILES.values()),
    },
  };

  const state = await loadInboundState();
  const { zipBuffer, checksum, zipUrl } = await downloadLegacyZip();
  meta.sourceUrl = zipUrl;
  meta.checksum = checksum;

  const zip = new AdmZip(zipBuffer);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".csv"));

  counters.total += entries.length;

  if (!entries.length) {
    await addSyncRunItem(context.runId, {
      domain: "stock_inbound",
      entityType: "file",
      entityId: "zip",
      status: "skipped",
      message: "No CSV files in inbound ZIP.",
      payloadHash: null,
      payload: { checksum, sourceUrl: zipUrl },
      response: null,
    });
    return { counters, meta };
  }

  const seenBases = new Set<string>();

  for (const entry of entries) {
    const fileName = entry.entryName.split("/").pop() || entry.entryName;
    const baseName = fileBaseName(fileName);
    seenBases.add(baseName);

    try {
      const csvText = entry.getData().toString("utf8");
      const rows = parseLegacyCsv(csvText);
      const payloadHash = createPayloadHash(rows);
      const previousHash =
        context.mode === "delta" ? await getDeltaHash("stock_inbound", "file", fileName) : null;

      if (context.mode === "delta" && previousHash && previousHash === payloadHash) {
        counters.skipped += 1;
        await addSyncRunItem(context.runId, {
          domain: "stock_inbound",
          entityType: "file",
          entityId: fileName,
          status: "skipped",
          message: "File unchanged (delta mode).",
          payloadHash,
          payload: { fileName, rowCount: rows.length },
          response: null,
        });
        continue;
      }

      const rawMeta = await saveRawStockFile({
        runId: context.runId,
        fileName,
        rowCount: rows.length,
        checksum,
      });
      await saveRawStockRows(rawMeta.id, rows);

      const result = await runHandler(baseName, rows, state);
      const fileStatus =
        result.failedRows > 0 && result.successRows === 0
          ? "failed"
          : result.skippedRows === rows.length
            ? "skipped"
            : "success";

      if (fileStatus === "failed") counters.failed += 1;
      else if (fileStatus === "skipped") counters.skipped += 1;
      else counters.success += 1;

      (meta.files as Record<string, unknown>)[fileName] = {
        baseName,
        processedRows: result.processedRows,
        successRows: result.successRows,
        failedRows: result.failedRows,
        skippedRows: result.skippedRows,
        warnings: result.warnings,
      };

      await addSyncRunItem(context.runId, {
        domain: "stock_inbound",
        entityType: "file",
        entityId: fileName,
        status: fileStatus,
        message: `processed=${result.processedRows} success=${result.successRows} failed=${result.failedRows} skipped=${result.skippedRows}`,
        payloadHash,
        payload: { fileName, rowCount: rows.length, baseName },
        response: {
          rawFileId: rawMeta.id,
          warnings: result.warnings,
          details: result.details || {},
        },
      });

      const failureSlice = result.rowFailures.slice(0, MAX_ROW_FAILURE_LOGS_PER_FILE);
      for (const failure of failureSlice) {
        await addSyncRunItem(context.runId, {
          domain: "stock_inbound",
          entityType: `${baseName}_row`,
          entityId: `${fileName}:${failure.rowIndex}`,
          status: "failed",
          message: failure.reason,
          payloadHash: null,
          payload: failure.row ? { row: failure.row } : null,
          response: null,
        });
      }
      if (result.rowFailures.length > MAX_ROW_FAILURE_LOGS_PER_FILE) {
        await addSyncRunItem(context.runId, {
          domain: "stock_inbound",
          entityType: "row_log_limit",
          entityId: fileName,
          status: "skipped",
          message: `Row failure logs truncated to ${MAX_ROW_FAILURE_LOGS_PER_FILE}.`,
          payloadHash: null,
          payload: { totalFailures: result.rowFailures.length },
          response: null,
        });
      }

      for (const warning of result.warnings) {
        await addSyncRunItem(context.runId, {
          domain: "stock_inbound",
          entityType: "warning",
          entityId: fileName,
          status: "skipped",
          message: warning,
          payloadHash: null,
          payload: { fileName, baseName },
          response: null,
        });
      }

      if (fileStatus !== "failed") {
        await setDeltaState("stock_inbound", "file", fileName, payloadHash, context.runId);
      }
    } catch (error: any) {
      counters.failed += 1;
      await addSyncRunItem(context.runId, {
        domain: "stock_inbound",
        entityType: "file",
        entityId: fileName,
        status: "failed",
        message: error?.message || "Failed to process file.",
        payloadHash: null,
        payload: { fileName, baseName },
        response: null,
      });
    }
  }

  const missingOptionalFiles = OPTIONAL_FILES.filter((file) => !seenBases.has(file));
  meta.missingOptionalFiles = missingOptionalFiles;

  for (const missing of missingOptionalFiles) {
    await addSyncRunItem(context.runId, {
      domain: "stock_inbound",
      entityType: "optional_file",
      entityId: missing,
      status: "skipped",
      message: `Optional legacy file '${missing}.csv' not present in this ZIP.`,
      payloadHash: null,
      payload: null,
      response: null,
    });
  }

  return { counters, meta };
}
