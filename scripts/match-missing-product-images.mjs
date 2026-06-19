/**
 * Proverava da li "missing" productid-i iz product_file.sql
 * odgovaraju mOffice proizvodima u Supabazi (preko EAN-a)
 * i ako da — upisuje slike u catalog_product_media.
 *
 * Pokretanje:
 *   node scripts/match-missing-product-images.mjs --dry-run
 *   node scripts/match-missing-product-images.mjs
 */

import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase environment variables');
const IMAGE_BASE = 'https://assets.santos.rs/fajlovi/product/';
const SQL_PATH   = 'C:/Users/PC/Downloads/product_file.sql';
const DRY_RUN    = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function sbFetchAll(path) {
  const all = [];
  let from = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Range-Unit': 'items',
        Range: `${from}-${from + 999}`,
      },
    });
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return all;
}

// ─── 1. Parsiraj SQL dump ─────────────────────────────────────────────────────
log('Učitavam SQL dump...');
const sql = fs.readFileSync(SQL_PATH, 'utf8');
const fullRowRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)',\s*'[^']*',\s*(\d+),\s*'[^']*',\s*(-?\d+)/g;

const grouped = new Map(); // productid -> [{content, sort}]
let m;
while ((m = fullRowRegex.exec(sql)) !== null) {
  const [, , productid, type, content, , sort] = m;
  if (type !== 'img' || !content.trim()) continue;
  const pid = parseInt(productid, 10);
  if (!grouped.has(pid)) grouped.set(pid, []);
  grouped.get(pid).push({ content: content.replace(/\\'/g, "'"), sort: parseInt(sort, 10) });
}
for (const imgs of grouped.values()) imgs.sort((a, b) => a.sort - b.sort);
log(`Jedinstvenih productid-a u dumpu: ${grouped.size}`);

// ─── 2. Preuzmi catalog_products legacy_id-ove ───────────────────────────────
log('Preuzimam catalog_products...');
const catalogRows = await sbFetchAll('catalog_products?select=legacy_id,sku,ean,is_active,raw_payload');
const catalogIds  = new Set(catalogRows.map(r => r.legacy_id));
log(`catalog_products: ${catalogRows.length} redova`);

// ─── 3. Nađi "missing" productide (nisu u katalogu) ──────────────────────────
const missingIds = [...grouped.keys()].filter(id => !catalogIds.has(id));
log(`Produktida iz dumpa koji NISU u katalogu: ${missingIds.length}`);

// ─── 4. Pokušaj poklapanje EAN/SKU ───────────────────────────────────────────
// productid u dumpu = int(EAN) — dodaj vodece nule do 9 cifara za EAN
// Alternativno: productid = sku * 100 + veličina

// Izgradimo mape po EAN i SKU
const byEan = new Map(); // ean_as_int -> [catalog_product, ...]
const bySku = new Map(); // sku -> [catalog_product, ...]

for (const row of catalogRows) {
  // EAN
  if (row.ean) {
    const eanInt = parseInt(row.ean, 10);
    if (!byEan.has(eanInt)) byEan.set(eanInt, []);
    byEan.get(eanInt).push(row);
  }
  // SKU prefix (productid may be sku * 100 + size_suffix)
  if (row.sku) {
    const skuInt = parseInt(row.sku, 10);
    if (!isNaN(skuInt)) {
      if (!bySku.has(skuInt)) bySku.set(skuInt, []);
      bySku.get(skuInt).push(row);
    }
  }
}

// ─── 5. Poklapanje ───────────────────────────────────────────────────────────
log('Poklapam missing productid-e sa mOffice EAN/SKU...');

const matches = []; // {dumpProductId, catalogProduct, images, matchType}

for (const dumpId of missingIds) {
  const images = grouped.get(dumpId);

  // Pokušaj 1: direktan EAN match
  if (byEan.has(dumpId)) {
    for (const prod of byEan.get(dumpId)) {
      matches.push({ dumpProductId: dumpId, catalogProduct: prod, images, matchType: 'EAN_EXACT' });
    }
    continue;
  }

  // Pokušaj 2: productid počinje sa SKU (productid = sku * 100 + suffix)
  // Npr. 12405286 — prvih 6 cifara = 124052 → sku='124052'
  const dumpStr = String(dumpId);
  for (let skuLen = 4; skuLen <= 7; skuLen++) {
    const skuCandidate = parseInt(dumpStr.slice(0, skuLen), 10);
    if (bySku.has(skuCandidate)) {
      for (const prod of bySku.get(skuCandidate)) {
        matches.push({ dumpProductId: dumpId, catalogProduct: prod, images, matchType: `SKU_PREFIX_${skuLen}` });
      }
    }
  }
}

log(`Ukupno poklapanja: ${matches.length}`);

// ─── 6. Filtriraj: samo mOffice, samo is_active ───────────────────────────────
const mofficeMatches = matches.filter(m =>
  m.catalogProduct.raw_payload?.source === 'moffice' && m.catalogProduct.is_active
);
log(`Poklapanja sa AKTIVNIM mOffice proizvodima: ${mofficeMatches.length}`);

// ─── 7. Preuzmi koji mOffice već ima slike ────────────────────────────────────
const existingMedia = await sbFetchAll('catalog_product_media?select=legacy_product_id');
const existingSet   = new Set(existingMedia.map(r => r.legacy_product_id));
// Prikaži detalje za sva poklapanja sa mOffice
if (mofficeMatches.length > 0) {
  console.log('\n=== SVI mOffice MAČI (aktivni) ===');
  for (const match of mofficeMatches) {
    const hasImg = existingSet.has(match.catalogProduct.legacy_id);
    console.log(`  dumpId=${match.dumpProductId} -> legacy_id=${match.catalogProduct.legacy_id} sku=${match.catalogProduct.sku} name="${match.catalogProduct.name_sr}" match=${match.matchType} vec_ima_sliku=${hasImg}`);
  }
  console.log('');
}

// ─── 8. Pripremi zapise za upis ───────────────────────────────────────────────
// Deduplikuj: jedan catalog legacy_id dobija slike samo jednom (iz prvog match-a)
const seenLegacyIds = new Set();
const records = [];
let skippedDup = 0;

for (const match of mofficeMatches) {
  const lid = match.catalogProduct.legacy_id;
  if (existingSet.has(lid)) { skippedDup++; continue; }
  if (seenLegacyIds.has(lid)) { skippedDup++; continue; }
  seenLegacyIds.add(lid);

  match.images.forEach((img, i) => {
    records.push({
      legacy_product_id: lid,
      url:               IMAGE_BASE + encodeURIComponent(img.content),
      sort:              i,
      is_cover:          i === 0,
    });
  });
}

log(`Novih zapisa za upis: ${records.length} (za ${seenLegacyIds.size} novih proizvoda)`);
log(`Preskočeno (već ima slike ili duplikat): ${skippedDup}`);

// Prikaži koja su poklapanja
const uniqueNewProds = [...seenLegacyIds].map(lid => {
  const match = mofficeMatches.find(m => m.catalogProduct.legacy_id === lid);
  return {
    legacy_id:  lid,
    sku:        match.catalogProduct.sku,
    name:       match.catalogProduct.raw_payload?.name || match.catalogProduct.name_sr || '',
    matchType:  match.matchType,
    dumpId:     match.dumpProductId,
    slike:      match.images.length,
  };
});

if (uniqueNewProds.length > 0) {
  console.log('\n=== NOVI PROIZVODI KOJI ĆE DOBITI SLIKE ===');
  for (const p of uniqueNewProds) {
    console.log(`  legacy_id=${p.legacy_id} sku=${p.sku} naziv="${p.name}" match=${p.matchType} dumpId=${p.dumpId} slike=${p.slike}`);
  }
  console.log('');
}

if (DRY_RUN) {
  log('DRY RUN — ništa nije upisano.');
  process.exit(0);
}

if (records.length === 0) {
  log('Nema novih zapisa za upisivanje.');
  process.exit(0);
}

// ─── 9. Upis u Supabase ───────────────────────────────────────────────────────
log(`Upisujem u Supabase...`);
let inserted = 0, errors = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media`, {
    method: 'POST',
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
  } else {
    const body = await res.text();
    log(`GREŠKA (HTTP ${res.status}): ${body.slice(0, 300)}`);
    errors += batch.length;
  }
}

log('=== GOTOVO ===');
log(`Upisano: ${inserted}`);
log(`Greške:  ${errors}`);
