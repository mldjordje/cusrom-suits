// Reconcile rows wrongly zeroed in the latest mOffice run.
//
// Symptom (confirmed in data): a row carries the CURRENT run's mOffice payload
// with stock > 0, yet stock_total=0 / is_active=false because the same-run stale
// cleanup zeroed a duplicate legacy row for that variant. Fix: trust mOffice's
// own current-run number and restore the row — but only if no OTHER row for the
// same (sku,size) is already active (dedup safety, so we never double-list a variant).
//
// Dry-run (default) prints what WOULD change + a CSV. `--apply` writes.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const pageAll = async (select, applier) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from("catalog_products").select(select).order("legacy_id", { ascending: true }).range(from, from + 999);
    if (applier) q = applier(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
};

// latest successful run id
const { data: runs, error: rErr } = await sb
  .from("integration_sync_runs")
  .select("id")
  .eq("domain", "stock_inbound")
  .eq("status", "success")
  .order("started_at", { ascending: false })
  .limit(1);
if (rErr) throw new Error(rErr.message);
const latestRun = runs?.[0]?.id;
if (!latestRun) throw new Error("no successful run");
console.log("latest run:", latestRun);

const all = await pageAll("legacy_id,sku,ean,name_sr,is_active,is_exported,stock_total,raw_payload");

const mo = (r) => (r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload.moffice : null);
const sizeOf = (r) => {
  const m = mo(r);
  if (m && m.size) return String(m.size).trim().toUpperCase().replace(/\s+/g, "");
  const a = r.raw_payload && r.raw_payload.attributes && r.raw_payload.attributes.size;
  return Array.isArray(a) && a[0] ? String(a[0]).trim().toUpperCase().replace(/\s+/g, "") : "";
};
const skuKey = (r) => String(r.sku || "").trim().toLowerCase();

// index active rows per (sku,size) to enforce dedup safety
const activeBySkuSize = new Set();
for (const r of all) {
  if (r.is_active && r.is_exported && Number(r.stock_total) > 0) {
    activeBySkuSize.add(`${skuKey(r)}|${sizeOf(r)}`);
  }
}

const toRestore = [];
const skippedDup = [];
for (const r of all) {
  const m = mo(r);
  if (!m || String(m.syncedRunId || "") !== latestRun) continue;
  const moStock = Math.max(0, Math.floor(Number(m.stock || 0)));
  if (moStock <= 0) continue;
  const wrong = !r.is_active || !r.is_exported || Number(r.stock_total) !== moStock;
  if (!wrong) continue;
  const key = `${skuKey(r)}|${sizeOf(r)}`;
  // If another row for this exact sku+size is already active, don't resurrect a duplicate.
  if (!(r.is_active && r.is_exported && Number(r.stock_total) > 0) && activeBySkuSize.has(key)) {
    skippedDup.push({ id: r.legacy_id, sku: r.sku, size: sizeOf(r), moStock, name: (r.name_sr || "").trim() });
    continue;
  }
  toRestore.push({ id: r.legacy_id, sku: r.sku, size: sizeOf(r), moStock, siteStock: r.stock_total, name: (r.name_sr || "").trim() });
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s{2,}/g, " ").trim()}"`;
fs.writeFileSync(
  "scripts/reconcile-preview.csv",
  ["legacy_id,sku,size,moffice_stock,site_stock,name", ...toRestore.map((r) => [r.id, r.sku, r.size, r.moStock, r.siteStock, esc(r.name)].join(","))].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  mode: APPLY ? "APPLY" : "DRY-RUN",
  would_restore: toRestore.length,
  skipped_as_duplicate_of_active: skippedDup.length,
  preview_csv: "scripts/reconcile-preview.csv",
  sample: toRestore.slice(0, 12).map((r) => `${r.sku} ${r.size} ${r.name.slice(0,24)} | mOffice=${r.moStock} site=${r.siteStock}`),
}, null, 2));

if (APPLY) {
  let done = 0;
  for (let i = 0; i < toRestore.length; i += 100) {
    const batch = toRestore.slice(i, i + 100);
    for (const r of batch) {
      const { error } = await sb
        .from("catalog_products")
        .update({ stock_total: r.moStock, stock_warehouse_1: r.moStock, is_active: true, is_exported: true, updated_at: new Date().toISOString() })
        .eq("legacy_id", r.id);
      if (error) throw new Error(`${r.id}: ${error.message}`);
      done++;
    }
  }
  console.log(`Applied: restored ${done} rows.`);
}
