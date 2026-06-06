// Faithful-to-old-site media bridge.
//
// The legacy site grouped variants into a model by `manufcode` and showed the
// "primary" variant's product_file images for the whole model. We replicate that:
// every active, in-stock row WITHOUT its own photo borrows the photos of a
// media-bearing row sharing the same model code (manufcode-equivalent, extracted
// from manuf_code or name). Exact code match => same color, no wrong-image risk.
//
// Dry-run (default) writes scripts/bridge-model-code-review.csv. `--apply` inserts.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Keep in sync with lib/integrations/moffice/modelCode.ts (extractModelCode).
const TYPE_WORDS = /\b(kosulja|pantalone|odelo|sako|kaput|cipele|dzemper|kais|kaisevi|kravata|prsluk|jakna|majica|bermude|bokserice|kapa|sal|marama|carapa|carape|novcanik|torba|maska|navlaka|kutija)\b/g;
const typeToken = (s) => {
  const h = s;
  if (/kosulj/.test(h)) return "kosulja";
  if (/pantalon/.test(h)) return "pantalone";
  if (/bermud/.test(h)) return "bermude";
  if (/\bodel/.test(h)) return "odelo";
  if (/\bsako\b/.test(h)) return "sako";
  if (/cipel|obuc/.test(h)) return "cipele";
  if (/kaput/.test(h)) return "kaput";
  if (/jakn/.test(h)) return "jakna";
  if (/dzemper/.test(h)) return "dzemper";
  if (/prsluk/.test(h)) return "prsluk";
  if (/kravat/.test(h)) return "kravata";
  if (/kais/.test(h)) return "kais";
  return "x";
};
const extractModelCode = (manufCode, name) => {
  const raw = String(manufCode || "").trim() || String(name || "").trim();
  if (!raw) return "";
  const deburr = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const type = typeToken(deburr);
  const cleaned = deburr
    .replace(/\s+m\.[a-z]+.*$/, "")
    .replace(/\b[mzd]\.\s*/g, " ")
    .replace(/\b(muska|muski|zenska|zenski|decija|deciji)\b/g, " ")
    .replace(TYPE_WORDS, " ")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const code = cleaned.replace(/\s/g, "");
  const flat = code.replace(/[^a-z0-9]/g, "");
  // distinctive: must have a LETTER+digit combo (c8/61, p20, cascavel/75) so bare
  // numeric/size-like codes ("1","75","30") never group unrelated products. The old
  // site grouped by manufcode alone (no type), so we key on the bare code too.
  if (!/[a-z]\d|\d[a-z]|[a-z]+\/\d/.test(flat) || flat.length < 3) return "";
  void type;
  return code;
};

const APPLY = process.argv.includes("--apply");
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const pageAll = async (table, select, orderCol = "legacy_id") => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).order(orderCol, { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
};

const media = await pageAll("catalog_product_media", "legacy_product_id,url,sort,is_cover", "legacy_product_id");
const mediaByProduct = new Map();
for (const r of media) {
  const list = mediaByProduct.get(r.legacy_product_id) || [];
  list.push(r);
  mediaByProduct.set(r.legacy_product_id, list);
}
const all = await pageAll("catalog_products", "legacy_id,sku,manuf_code,name_sr,is_active,is_exported,stock_total");

// donor: best media-bearing row per model code (most images wins)
const donorByCode = new Map();
for (const r of all) {
  const imgs = mediaByProduct.get(r.legacy_id);
  if (!imgs?.length) continue;
  const code = extractModelCode(r.manuf_code, r.name_sr);
  if (!code) continue;
  const cur = donorByCode.get(code);
  if (!cur || imgs.length > cur.count) donorByCode.set(code, { legacyId: r.legacy_id, count: imgs.length, name: r.name_sr });
}

const targets = all.filter(
  (r) => r.is_active && r.is_exported && Number(r.stock_total) > 0 && !mediaByProduct.has(r.legacy_id),
);

const matches = [];
for (const t of targets) {
  const code = extractModelCode(t.manuf_code, t.name_sr);
  if (!code) continue;
  const donor = donorByCode.get(code);
  if (!donor || donor.legacyId === t.legacy_id) continue;
  matches.push({ target: t, donorId: donor.legacyId, code, donorName: donor.name, imgs: donor.count });
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s{2,}/g, " ").trim()}"`;
fs.writeFileSync(
  "scripts/bridge-model-code-review.csv",
  ["target_legacy_id,target_name,model_code,donor_legacy_id,donor_name,donor_images",
    ...matches.map((m) => [m.target.legacy_id, esc(m.target.name_sr), esc(m.code), m.donorId, esc(m.donorName), m.imgs].join(","))].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  mode: APPLY ? "APPLY" : "DRY-RUN",
  visible_media_less_targets: targets.length,
  bridged: matches.length,
  review_csv: "scripts/bridge-model-code-review.csv",
  sample: matches.slice(0, 12).map((m) => `${(m.target.name_sr || "").trim().slice(0, 22)} [${m.code}] <= donor ${m.donorId} (${m.imgs} img)`),
}, null, 2));

if (APPLY) {
  const inserts = [];
  for (const m of matches) {
    mediaByProduct.get(m.donorId).slice(0, 8).forEach((media, index) => {
      inserts.push({
        legacy_product_id: m.target.legacy_id,
        url: media.url,
        sort: Number.isFinite(media.sort) ? media.sort : index,
        is_cover: index === 0,
      });
    });
  }
  let done = 0;
  for (let i = 0; i < inserts.length; i += 500) {
    const batch = inserts.slice(i, i + 500);
    const { error } = await sb.from("catalog_product_media").upsert(batch, { onConflict: "legacy_product_id,url", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    done += batch.length;
  }
  console.log(`Applied: inserted/kept ${done} media rows across ${matches.length} products.`);
}
