#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_INPUT_PATH = "data/legacy-products.json";

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT_PATH,
    batchSize: 200,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--input" && next) {
      args.inputPath = next;
      i += 1;
      continue;
    }
    if (key === "--batch-size" && next) {
      const parsed = Number.parseInt(next, 10);
      args.batchSize = Number.isFinite(parsed) && parsed > 0 ? parsed : args.batchSize;
      i += 1;
      continue;
    }
    if (key === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (key === "--help" || key === "-h") {
      printHelpAndExit(0);
    }
    throw new Error(`Unknown argument: ${key}`);
  }

  return args;
}

async function loadLocalEnvFiles() {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    let raw;
    try {
      raw = await fs.readFile(fullPath, "utf8");
    } catch {
      continue;
    }
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!key || process.env[key] != null) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function printHelpAndExit(code) {
  // eslint-disable-next-line no-console
  console.log(
    [
      "Import legacy catalog JSON to Supabase",
      "",
      "Usage:",
      "  node scripts/import-legacy-catalog-to-supabase.mjs [options]",
      "",
      "Options:",
      "  --input <path>           Input JSON (default data/legacy-products.json)",
      "  --batch-size <n>         Upsert batch size (default 200)",
      "  --dry-run                Validate and print stats without DB writes",
      "",
      "Required env:",
      "  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
      "  SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  );
  process.exit(code);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function mapCatalogProductRow(item) {
  return {
    legacy_id: toNumber(item.legacyId),
    sku: `${item.sku || ""}`.trim(),
    ean: item.ean || null,
    manuf_code: item.manufCode || null,
    brand: item.brand || null,
    is_active: String(item.status?.active || "").toLowerCase() === "y",
    is_exported: String(item.status?.export || "").toLowerCase() === "y",
    name_sr: item.names?.sr || item.names?.legacy || item.sku || "Legacy Product",
    name_en: item.names?.en || null,
    description_sr: item.descriptions?.sr || null,
    description_en: item.descriptions?.en || null,
    specification_sr: item.specification?.sr || null,
    specification_en: item.specification?.en || null,
    price_net: toNumber(item.price?.net),
    price_gross: toNumber(item.price?.gross),
    price_final_gross: toNumber(item.price?.finalGross),
    tax_percent: toNumber(item.price?.taxPercent),
    rebate_percent: toNumber(item.price?.rebatePercent),
    stock_warehouse_1: toNumber(item.stock?.warehouse1),
    stock_total: toNumber(item.stock?.total),
    raw_payload: {
      categories: item.categories || [],
      attributes: item.attributes || {},
      stockWarehouses: item.stock?.warehouses || [],
      legacyRaw: item.raw || {},
    },
    updated_at: new Date().toISOString(),
  };
}

function mapCatalogMediaRows(item) {
  const legacyProductId = toNumber(item.legacyId);
  const cover = item.coverImage || null;
  const images = Array.isArray(item.images) ? item.images : [];
  return images.map((url, idx) => ({
    legacy_product_id: legacyProductId,
    url,
    is_cover: cover ? cover === url : idx === 0,
    sort: idx,
    updated_at: new Date().toISOString(),
  }));
}

function dedupeMediaRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.legacy_product_id}::${row.url}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, {
      ...existing,
      is_cover: Boolean(existing.is_cover || row.is_cover),
      sort: Math.min(toNumber(existing.sort, 999999), toNumber(row.sort, 999999)),
      updated_at: row.updated_at,
    });
  }
  return Array.from(byKey.values());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadLocalEnvFiles();
  const inputPath = path.resolve(process.cwd(), args.inputPath);
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Input JSON must be an array");
  }

  const productRows = parsed.map(mapCatalogProductRow);
  const mediaRows = dedupeMediaRows(parsed.flatMap(mapCatalogMediaRows));

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      `[legacy-import] dry-run products=${productRows.length} media=${mediaRows.length} input=${path.relative(
        process.cwd(),
        inputPath,
      )}`,
    );
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase env. Required NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const productBatches = chunkArray(productRows, args.batchSize);
  for (let i = 0; i < productBatches.length; i += 1) {
    const batch = productBatches[i];
    const { error } = await supabase
      .from("catalog_products")
      .upsert(batch, { onConflict: "legacy_id", ignoreDuplicates: false });
    if (error) throw new Error(`catalog_products batch ${i + 1} failed: ${error.message}`);
    // eslint-disable-next-line no-console
    console.log(`[legacy-import] catalog_products batch ${i + 1}/${productBatches.length} ok`);
  }

  const mediaBatches = chunkArray(mediaRows, args.batchSize * 2);
  for (let i = 0; i < mediaBatches.length; i += 1) {
    const batch = mediaBatches[i];
    const { error } = await supabase
      .from("catalog_product_media")
      .upsert(batch, { onConflict: "legacy_product_id,url", ignoreDuplicates: false });
    if (error) throw new Error(`catalog_product_media batch ${i + 1} failed: ${error.message}`);
    // eslint-disable-next-line no-console
    console.log(`[legacy-import] catalog_product_media batch ${i + 1}/${mediaBatches.length} ok`);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[legacy-import] done products=${productRows.length} media=${mediaRows.length} input=${path.relative(
      process.cwd(),
      inputPath,
    )}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[legacy-import] failed: ${err?.message || err}`);
  process.exit(1);
});
