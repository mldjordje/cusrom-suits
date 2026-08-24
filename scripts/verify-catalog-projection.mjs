#!/usr/bin/env node

/**
 * Verifies the trimmed raw_payload projection used by the catalog snapshot query
 * against the real database, and measures what it saves.
 *
 * The snapshot query used to select the whole raw_payload column for every
 * product on every cold start, then throw most of it away in compactRawPayload.
 * It now selects only the whitelisted JSON keys. That rewrite could not be tested
 * against Supabase while the project was restricted for exceeding its egress
 * quota, so this script exists to confirm it once the database answers again:
 *
 *   node scripts/verify-catalog-projection.mjs
 *
 * It fails loudly if the two selects disagree on a single product.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SAMPLE_SIZE = Number(process.env.VERIFY_SAMPLE_SIZE || 400);

/* Mirrors RAW_PAYLOAD_LIST_KEYS in lib/catalog/store.ts. Kept as a literal here
   so the script checks the query the app actually sends rather than importing
   the same constant it is meant to be checking. */
const RAW_PAYLOAD_LIST_KEYS = [
  "categories",
  "landing",
  "attributes",
  "media",
  "seo",
  "washCareIcons",
  "declaration",
  "packageWeightKg",
  "forcedCategoryGroups",
  "excludedCategoryGroups",
  "hiddenFromShop",
  "ananasExport",
  "productType",
  "source",
  "moffice",
  "syncSource",
  "imageFallback",
];

const BASE_COLUMNS =
  "legacy_id,sku,ean,manuf_code,brand,is_active,is_exported,name_sr,name_en,description_sr,description_en,specification_sr,specification_en,price_gross,price_final_gross,tax_percent,rebate_percent,stock_warehouse_1,stock_total";

const SELECT_FULL = `${BASE_COLUMNS},raw_payload`;
const SELECT_TRIMMED = [
  BASE_COLUMNS,
  ...RAW_PAYLOAD_LIST_KEYS.map((key) => `rp_${key}:raw_payload->${key}`),
].join(",");

async function loadLocalEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    let raw;
    try {
      raw = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
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

/* The keep-rules from compactRawPayload, applied to both shapes so the
   comparison is on what the app ends up reading, not on wire format. */
function compactRawPayload(rawPayload) {
  const source = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const compact = {};
  const keepObject = (key) => {
    if (source[key] && typeof source[key] === "object") compact[key] = source[key];
  };
  const keepArray = (key) => {
    if (Array.isArray(source[key])) compact[key] = source[key];
  };
  const keepOwn = (key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) compact[key] = source[key];
  };
  const keepTruthy = (key) => {
    if (source[key]) compact[key] = source[key];
  };

  keepArray("categories");
  keepObject("landing");
  keepObject("attributes");
  keepObject("media");
  keepObject("seo");
  keepArray("washCareIcons");
  keepOwn("declaration");
  keepOwn("packageWeightKg");
  keepArray("forcedCategoryGroups");
  keepArray("excludedCategoryGroups");
  if (source.hiddenFromShop === true) compact.hiddenFromShop = true;
  if (source.ananasExport === true) compact.ananasExport = true;
  keepTruthy("productType");
  keepTruthy("source");
  keepObject("moffice");
  keepTruthy("syncSource");
  keepObject("imageFallback");
  return compact;
}

function rehydrate(row) {
  const rawPayload = {};
  const rest = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith("rp_")) {
      rest[key] = value;
      continue;
    }
    if (value === null || value === undefined) continue;
    rawPayload[key.slice(3)] = value;
  }
  rest.raw_payload = rawPayload;
  return rest;
}

/* Stable key order so two objects that differ only in ordering compare equal. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

const bytes = (value) => Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
const mb = (n) => `${(n / 1_048_576).toFixed(2)} MB`;

async function main() {
  await loadLocalEnvFiles();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase env. Required NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const range = [0, SAMPLE_SIZE - 1];

  const full = await supabase
    .from("catalog_products")
    .select(SELECT_FULL)
    .order("legacy_id", { ascending: true })
    .range(...range);
  if (full.error) throw new Error(`full select failed: ${full.error.message}`);

  const trimmed = await supabase
    .from("catalog_products")
    .select(SELECT_TRIMMED)
    .order("legacy_id", { ascending: true })
    .range(...range);
  if (trimmed.error) {
    throw new Error(
      `trimmed select rejected: ${trimmed.error.message}\n` +
        "The app falls back to the full column on this error, so the shop still works — " +
        "but the egress saving is not being realised. Check the PostgREST JSON alias syntax.",
    );
  }

  const fullRows = full.data || [];
  const trimmedRows = (trimmed.data || []).map(rehydrate);
  console.log(`Sampled ${fullRows.length} products from ${new URL(supabaseUrl).host}\n`);

  if (fullRows.length !== trimmedRows.length) {
    throw new Error(`row count mismatch: full ${fullRows.length}, trimmed ${trimmedRows.length}`);
  }

  const mismatches = [];
  let allNull = 0;
  for (let i = 0; i < fullRows.length; i += 1) {
    const expected = canonical(compactRawPayload(fullRows[i].raw_payload));
    const actual = canonical(compactRawPayload(trimmedRows[i].raw_payload));
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      mismatches.push({ legacyId: fullRows[i].legacy_id, expected, actual });
    }
    if (Object.keys(trimmedRows[i].raw_payload).length === 0) allNull += 1;
  }

  const fullBytes = bytes(fullRows);
  const trimmedBytes = bytes(trimmed.data || []);
  const saved = fullBytes - trimmedBytes;
  const pct = fullBytes > 0 ? ((saved / fullBytes) * 100).toFixed(1) : "0.0";

  console.log(`full select    ${mb(fullBytes)}`);
  console.log(`trimmed select ${mb(trimmedBytes)}`);
  console.log(`saved          ${mb(saved)}  (${pct}% of this sample)\n`);

  /* Every key coming back null for every product is what a projection that
     parses but does not resolve looks like — no error, just silently empty. */
  if (allNull === fullRows.length && fullRows.length > 0) {
    throw new Error(
      "every sampled product came back with an empty raw_payload from the trimmed select. " +
        "The projection is not resolving; do not rely on it.",
    );
  }

  if (mismatches.length > 0) {
    console.error(`MISMATCH on ${mismatches.length} product(s). First 3:`);
    for (const row of mismatches.slice(0, 3)) {
      console.error(`\nlegacy_id ${row.legacyId}`);
      console.error(`  full:    ${JSON.stringify(row.expected).slice(0, 400)}`);
      console.error(`  trimmed: ${JSON.stringify(row.actual).slice(0, 400)}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`OK — trimmed and full selects agree on all ${fullRows.length} products.`);
  if (allNull > 0) {
    console.log(`(${allNull} of them carry an empty raw_payload in both, which is fine.)`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
