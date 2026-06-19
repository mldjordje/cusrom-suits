/**
 * Koristi puni MySQL dump (product tabela) + product_file.sql (slike)
 * da nađe slike za mOffice proizvode koji ih nemaju.
 *
 * Logika:
 *   old product.code  (SKU) == mOffice catalog_products.sku
 *   old product.barcode(EAN) == mOffice catalog_products.ean
 *   old product.id == product_file.productid => content (slika)
 *
 * Pokretanje:
 *   node scripts/match-via-full-dump.mjs --dry-run
 *   node scripts/match-via-full-dump.mjs
 */

import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase environment variables');
const IMAGE_BASE      = 'https://assets.santos.rs/fajlovi/product/';
const FULL_DUMP_PATH  = 'C:/Users/PC/Downloads/agyc3416_santos_sa2025.sql';
const PF_DUMP_PATH    = 'C:/Users/PC/Downloads/product_file.sql';
const DRY_RUN         = process.argv.includes('--dry-run');
const BATCH_SIZE      = 100;

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

// ─── Supabase helper ──────────────────────────────────────────────────────────
async function sbFetchAll(path) {
  const all = [];
  let from = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit': 'items', Range: `${from}-${from+999}` },
    });
    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return all;
}

// ─── SQL row parser (čita jedan tuple, vraća polje stringova) ─────────────────
function parseRow(row) {
  const vals = [];
  let cur = '', inStr = false, escape = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (escape) { cur += (c === 'n' ? '\n' : c === 't' ? '\t' : c); escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === "'") {
      if (inStr && row[i+1] === "'") { cur += "'"; i++; continue; }
      inStr = !inStr; continue;
    }
    if (!inStr && c === ',') {
      const v = cur.trim();
      vals.push(v === 'NULL' ? null : v);
      cur = ''; continue;
    }
    cur += c;
  }
  const v = cur.trim();
  vals.push(v === 'NULL' ? null : v);
  return vals;
}

// ─── Izdvoji sve VALUE tuple-ove za zadatu tabelu iz SQL teksta ────────────────
function* extractRows(sql, tableName) {
  // Regex koji hvata SVE INSERT INTO `tableName` blokove
  const insertRe = new RegExp(`INSERT INTO \`${tableName}\`[^;]+;`, 'g');
  let insertMatch;
  while ((insertMatch = insertRe.exec(sql)) !== null) {
    const block = insertMatch[0];
    // Izvuci sve (tuple) iz VALUES dela
    const valuesIdx = block.search(/VALUES\s*\n?\s*\(/i);
    if (valuesIdx === -1) continue;

    let i = block.indexOf('(', valuesIdx);
    while (i < block.length) {
      // Nađi zatvarajuću zagradu (pazi na zagrade unutar stringova)
      let depth = 0, inStr = false, escape = false, j = i;
      while (j < block.length) {
        const c = block[j];
        if (escape) { escape = false; j++; continue; }
        if (c === '\\') { escape = true; j++; continue; }
        if (c === "'" && !escape) { inStr = !inStr; j++; continue; }
        if (!inStr) {
          if (c === '(') depth++;
          else if (c === ')') { depth--; if (depth === 0) { j++; break; } }
        }
        j++;
      }
      yield block.slice(i + 1, j - 1);
      // Preskoči razmake, zareze, newline do sledećeg `(` ili `;`
      while (j < block.length && /[\s,]/.test(block[j])) j++;
      if (block[j] !== '(') break;
      i = j;
    }
  }
}

// ─── 1. Parsiraj product_file.sql (noviji, 11249 slika) ──────────────────────
log(`Učitavam product_file.sql...`);
const pfSql = fs.readFileSync(PF_DUMP_PATH, 'utf8');

// Kolone: id, productid, type, content, contentface, attrvalid, status, sort, ts, erp_id, old_productid
const imagesByProductId = new Map(); // productid -> [{content, sort}]
let pfTotal = 0;
for (const row of extractRows(pfSql, 'product_file')) {
  pfTotal++;
  const vals      = parseRow(row);
  const productid = parseInt(vals[1], 10);
  const type      = vals[2];
  const content   = (vals[3] || '').trim();
  const sort      = parseInt(vals[7] || '0', 10);
  if (type !== 'img' || !content || isNaN(productid)) continue;
  if (!imagesByProductId.has(productid)) imagesByProductId.set(productid, []);
  imagesByProductId.get(productid).push({ content, sort });
}
for (const imgs of imagesByProductId.values()) imgs.sort((a, b) => a.sort - b.sort);
log(`product_file: ${pfTotal} redova parsirano, ${imagesByProductId.size} proizvoda sa slikama`);

// ─── 2. Parsiraj product tabelu iz punog dumpa ────────────────────────────────
log(`Učitavam puni dump (${(fs.statSync(FULL_DUMP_PATH).size / 1024 / 1024).toFixed(1)} MB)...`);
const fullSql = fs.readFileSync(FULL_DUMP_PATH, 'utf8');
log('Parsiram product tabelu (svi INSERT blokovi)...');

// Kolone product tabele (iz CREATE TABLE):
// id, active, active_doc, barcode, code, inputprice, inputpricecurrency, manufcode, manufname, name, altername, ...
// Pozicije: id=0, active=1, active_doc=2, barcode=3, code=4, ..., name=9
const PROD_ID=0, PROD_BARCODE=3, PROD_CODE=4, PROD_NAME=9;

const productById      = new Map(); // id -> {id, code, barcode, name}
const productByCode    = new Map(); // code_lc -> Set<id>
const productByBarcode = new Map(); // barcode_lc -> Set<id>

let prodTotal = 0;
for (const row of extractRows(fullSql, 'product')) {
  prodTotal++;
  const vals    = parseRow(row);
  const id      = parseInt(vals[PROD_ID], 10);
  const code    = (vals[PROD_CODE] || '').trim().toLowerCase();
  const barcode = (vals[PROD_BARCODE] || '').trim().toLowerCase();
  const name    = (vals[PROD_NAME] || '').trim();
  if (isNaN(id)) continue;

  productById.set(id, { id, code, barcode, name });

  if (code) {
    if (!productByCode.has(code)) productByCode.set(code, new Set());
    productByCode.get(code).add(id);
  }
  if (barcode) {
    const bcNoZero = barcode.replace(/^0+/, '');
    if (!productByBarcode.has(barcode)) productByBarcode.set(barcode, new Set());
    productByBarcode.get(barcode).add(id);
    if (bcNoZero !== barcode) {
      if (!productByBarcode.has(bcNoZero)) productByBarcode.set(bcNoZero, new Set());
      productByBarcode.get(bcNoZero).add(id);
    }
  }
}
log(`product: ${prodTotal} redova, ${productByCode.size} unikatnih SKU, ${productByBarcode.size} unikatnih EAN`);

// Koliko starih proizvoda ima slike?
let oldWithImages = 0;
const oldWithImagesSample = [];
for (const [pid] of imagesByProductId) {
  if (productById.has(pid)) {
    oldWithImages++;
    if (oldWithImagesSample.length < 10) oldWithImagesSample.push(productById.get(pid));
  }
}
log(`Starih MySQL proizvoda koji IMAJU i product zapis i slike: ${oldWithImages}`);
if (oldWithImagesSample.length) {
  console.log('  Primeri (id, code=SKU, barcode=EAN):');
  for (const p of oldWithImagesSample) console.log(`    id=${p.id} code="${p.code}" barcode="${p.barcode}"`);
}

// Primeri mOffice bez slike
console.log('\n  Primeri mOffice BEZ slike (prvih 10 — nakon preuzimanja):');

// ─── 3. Preuzmi mOffice proizvode bez slike iz Supabase ──────────────────────
log('Preuzimam iz Supabase...');
const allCatalog    = await sbFetchAll('catalog_products?select=legacy_id,sku,ean,is_active,name_sr,raw_payload');
const existingMedia = await sbFetchAll('catalog_product_media?select=legacy_product_id');
const existingSet   = new Set(existingMedia.map(r => r.legacy_product_id));

const mofficeWithoutImg = allCatalog.filter(p =>
  p.raw_payload?.source === 'moffice' && p.is_active && !existingSet.has(p.legacy_id)
);
log(`Aktivnih mOffice bez slike: ${mofficeWithoutImg.length}`);
for (const p of mofficeWithoutImg.slice(0, 10)) {
  console.log(`    sku="${p.sku}" ean="${p.ean}" legacy_id=${p.legacy_id}`);
}

// ─── 4. Poklapanje ────────────────────────────────────────────────────────────
log('Poklapam po EAN i SKU...');

const matches = [];

for (const mp of mofficeWithoutImg) {
  const skuLc  = (mp.sku || '').trim().toLowerCase();
  const eanLc  = (mp.ean || '').trim().toLowerCase();
  const eanNoz = eanLc.replace(/^0+/, '');

  let found = null;

  // 1. EAN direktno
  if (eanLc && productByBarcode.has(eanLc)) {
    for (const pid of productByBarcode.get(eanLc)) {
      if (imagesByProductId.has(pid)) { found = { pid, matchType: 'EAN' }; break; }
    }
  }
  // 2. EAN bez vodećih nula
  if (!found && eanNoz && eanNoz !== eanLc && productByBarcode.has(eanNoz)) {
    for (const pid of productByBarcode.get(eanNoz)) {
      if (imagesByProductId.has(pid)) { found = { pid, matchType: 'EAN_NOLZ' }; break; }
    }
  }
  // 3. SKU
  if (!found && skuLc && productByCode.has(skuLc)) {
    for (const pid of productByCode.get(skuLc)) {
      if (imagesByProductId.has(pid)) { found = { pid, matchType: 'SKU' }; break; }
    }
  }

  if (!found) continue;

  const images = imagesByProductId.get(found.pid);
  if (!images?.length) continue;

  matches.push({ mp, images, matchType: found.matchType, oldPid: found.pid });
}

log(`Poklopljenih mOffice proizvoda koji mogu dobiti slike: ${matches.length}`);
const byType = {};
for (const m of matches) byType[m.matchType] = (byType[m.matchType] || 0) + 1;
for (const [t, n] of Object.entries(byType)) log(`  ${t}: ${n}`);

// ─── 5. Prikaži primere ───────────────────────────────────────────────────────
if (matches.length > 0) {
  console.log('\n=== PRIMERI (prvih 25) ===');
  for (const m of matches.slice(0, 25)) {
    const imgs = m.images.map(i => i.content).join(' | ');
    console.log(`  [${m.matchType}] sku=${m.mp.sku} ean=${m.mp.ean} -> oldPid=${m.oldPid}`);
    console.log(`    naziv: "${m.mp.name_sr}" | slike(${m.images.length}): ${imgs.slice(0, 100)}`);
  }
  console.log('');
}

// ─── 6. Pripremi i upiši ─────────────────────────────────────────────────────
const records = [];
for (const m of matches) {
  m.images.forEach((img, i) => {
    records.push({
      legacy_product_id: m.mp.legacy_id,
      url:               IMAGE_BASE + encodeURIComponent(img.content),
      sort:              i,
      is_cover:          i === 0,
    });
  });
}

log(`Ukupno novih zapisa za upis: ${records.length} (za ${matches.length} mOffice proizvoda)`);

if (DRY_RUN) { log('DRY RUN — ništa nije upisano.'); process.exit(0); }
if (!records.length) { log('Nema šta da se upiše.'); process.exit(0); }

log('Upisujem u Supabase...');
let inserted = 0, errors = 0;
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (res.status >= 200 && res.status < 300) {
    inserted += batch.length;
    if (i % (BATCH_SIZE * 5) === 0) log(`  ... ${inserted}/${records.length}`);
  } else {
    const body = await res.text();
    log(`GREŠKA (HTTP ${res.status}): ${body.slice(0, 300)}`);
    errors += batch.length;
  }
}

log('=== GOTOVO ===');
log(`Upisano: ${inserted} zapisa za ${matches.length} proizvoda`);
log(`Greške:  ${errors}`);
