/**
 * Uvoz slika iz product_file.sql dump-a u Supabase catalog_product_media
 *
 * Pokretanje:
 *   node scripts/import-product-file-images.mjs
 *
 * Argumenti (opciono):
 *   --dry-run   Samo ispiši šta bi ubacio, bez upisa
 *   --sql PATH  Putanja do SQL dump-a (default: C:/Users/PC/Downloads/product_file.sql)
 */

import fs from 'fs';
import path from 'path';

// ─── Konfiguracija ────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://jmnuuekizaljlqdeupqr.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I';
const IMAGE_BASE = 'https://assets.santos.rs/fajlovi/product/';
const SQL_PATH   = process.argv.includes('--sql')
  ? process.argv[process.argv.indexOf('--sql') + 1]
  : 'C:/Users/PC/Downloads/product_file.sql';
const DRY_RUN    = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;
// ─────────────────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

// ─── 1. Parsiraj SQL dump ─────────────────────────────────────────────────────
log('Učitavam SQL dump...');
const sql = fs.readFileSync(SQL_PATH, 'utf8');

// Izvuci sve VALUE redove
// Format: (id, productid, 'type', 'content', ...)
const valueRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)',/g;
let match;
const parsed = []; // [{productid, type, content, sort}]

// INSERT statement može biti višeredni, VALUES su parsovane direktno
// Uzimamo: id[1], productid[2], type[3], content[4]
// Sort je na poziciji 8 — parsujemo ceo red
const fullRowRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)',\s*'[^']*',\s*(\d+),\s*'[^']*',\s*(-?\d+)/g;

while ((match = fullRowRegex.exec(sql)) !== null) {
  const [, /*id*/, productid, type, content, /*attrvalid*/, sort] = match;
  if (type === 'img' && content.trim()) {
    parsed.push({
      productid: parseInt(productid, 10),
      content:   content.replace(/\\'/g, "'"),   // unescape SQL-escaped apostrofe
      sort:      parseInt(sort, 10),
    });
  }
}

log(`Parsirano slika (type=img): ${parsed.length}`);

// ─── 2. Grupiši po productid ──────────────────────────────────────────────────
const grouped = new Map(); // productid -> [{content, sort}, ...]
for (const row of parsed) {
  if (!grouped.has(row.productid)) grouped.set(row.productid, []);
  grouped.get(row.productid).push({ content: row.content, sort: row.sort });
}
// Sortiraj slike unutar svake grupe po sort
for (const [, imgs] of grouped) {
  imgs.sort((a, b) => a.sort - b.sort);
}
log(`Jedinstvenih productid-a: ${grouped.size}`);

// ─── 3. Preuzmi sve legacy_id koji postoje u catalog_products ─────────────────
log('Preuzimam sve legacy_id iz catalog_products...');
const catalogIds = new Set();
let from = 0;
while (true) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/catalog_products?select=legacy_id`,
    {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Range-Unit':  'items',
        Range:         `${from}-${from + 999}`,
      },
    }
  );
  const batch = await res.json();
  if (!Array.isArray(batch) || batch.length === 0) break;
  for (const r of batch) catalogIds.add(r.legacy_id);
  if (batch.length < 1000) break;
  from += 1000;
}
log(`catalog_products legacy_id: ${catalogIds.size}`);

// ─── 4. Preuzmi legacy_id-ove koji već imaju slike u Supabase ─────────────────
log('Preuzimam legacy_product_id koji već imaju slike...');
let existingIds = new Set();
from = 0;
while (true) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/catalog_product_media?select=legacy_product_id`,
    {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Range-Unit':  'items',
        Range:         `${from}-${from + 999}`,
      },
    }
  );
  const batch = await res.json();
  if (!Array.isArray(batch) || batch.length === 0) break;
  for (const r of batch) existingIds.add(r.legacy_product_id);
  if (batch.length < 1000) break;
  from += 1000;
}
log(`Već imaju slike: ${existingIds.size} legacy_product_id`);

// ─── 5. Pripremi nove zapise ──────────────────────────────────────────────────
const records = [];
let skipped = 0;
let notInCatalog = 0;

for (const [productid, images] of grouped) {
  // Preskoči ako nije u catalog_products (FK constraint)
  if (!catalogIds.has(productid)) {
    notInCatalog++;
    continue;
  }
  if (existingIds.has(productid)) {
    skipped++;
    continue;
  }
  images.forEach((img, i) => {
    records.push({
      legacy_product_id: productid,
      url:               IMAGE_BASE + encodeURIComponent(img.content),
      sort:              i,
      is_cover:          i === 0,
    });
  });
}

log(`Preskočeno (već ima slike): ${skipped}`);
log(`Novih zapisa za upisivanje: ${records.length}`);

if (DRY_RUN) {
  log('DRY RUN — primeri prvih 10:');
  records.slice(0, 10).forEach(r =>
    console.log(`  legacy_product_id=${r.legacy_product_id} url=${r.url} cover=${r.is_cover}`)
  );
  log(`Nije u katalogu (preskoči): ${notInCatalog}`);
  log('DRY RUN gotov, ništa nije upisano.');
  process.exit(0);
}

if (records.length === 0) {
  log('Nema novih zapisa za upisivanje.');
  process.exit(0);
}

// ─── 5. Upis u Supabase u batchevima ─────────────────────────────────────────
log(`Upisujem u Supabase (batch=${BATCH_SIZE})...`);
let inserted = 0;
let errors   = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media`, {
    method:  'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });

  if (res.status >= 200 && res.status < 300) {
    inserted += batch.length;
    if (i % (BATCH_SIZE * 10) === 0) log(`  ... ${inserted}/${records.length}`);
  } else {
    const body = await res.text();
    log(`GREŠKA batch ${i}-${i + batch.length} (HTTP ${res.status}): ${body.slice(0, 200)}`);
    errors += batch.length;
  }
}

log('=== GOTOVO ===');
log(`Upisano: ${inserted}`);
log(`Greške:  ${errors}`);
log(`Preskočeno (već imalo slike): ${skipped}`);
log(`Preskočeno (nije u katalogu): ${notInCatalog}`);
