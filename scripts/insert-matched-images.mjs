/**
 * Upisuje slike za mOffice proizvode koji:
 *   1. imaju slike u starom MySQL (product_file.sql)
 *   2. NEMAJU slike u Supabase catalog_product_media
 *
 * Pokretanje:
 *   node scripts/insert-matched-images.mjs --dry-run
 *   node scripts/insert-matched-images.mjs --include-inactive --dry-run
 *   node scripts/insert-matched-images.mjs
 */
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase environment variables');
const IMAGE_BASE = 'https://assets.santos.rs/fajlovi/product/';
const DRY_RUN = process.argv.includes('--dry-run');
const INCLUDE_INACTIVE = process.argv.includes('--include-inactive');
const BATCH_SIZE = 100;

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

function parseRow(row) {
  const vals = [];
  let cur = '', inStr = false, escape = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (escape) { cur += (c === 'n' ? '\n' : c); escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === "'") {
      if (inStr && row[i+1] === "'") { cur += "'"; i++; continue; }
      inStr = !inStr; continue;
    }
    if (!inStr && c === ',') { const v=cur.trim(); vals.push(v==='NULL'?null:v); cur=''; continue; }
    cur += c;
  }
  const v = cur.trim(); vals.push(v==='NULL'?null:v);
  return vals;
}

function* extractRows(sql, tableName) {
  const re = new RegExp(`INSERT INTO \`${tableName}\`[^;]+;`, 'g');
  let m;
  while ((m = re.exec(sql)) !== null) {
    const block = m[0];
    const vi = block.search(/VALUES\s*\n?\s*\(/i);
    if (vi === -1) continue;
    let i = block.indexOf('(', vi);
    while (i < block.length) {
      let depth=0, inStr=false, escape=false, j=i;
      while (j < block.length) {
        const c = block[j];
        if (escape){escape=false;j++;continue;}
        if (c==='\\'){escape=true;j++;continue;}
        if (c==="'"&&!escape){inStr=!inStr;j++;continue;}
        if (!inStr){if(c==='(')depth++;else if(c===')'){depth--;if(depth===0){j++;break;}}}
        j++;
      }
      yield block.slice(i+1,j-1);
      while (j<block.length && /[\s,]/.test(block[j])) j++;
      if (block[j]!=='(') break;
      i=j;
    }
  }
}

// ─── 1. Parsiraj product_file.sql ────────────────────────────────────────────
log('Učitavam product_file.sql...');
const pfSql = fs.readFileSync('C:/Users/PC/Downloads/product_file.sql', 'utf8');
const imagesByProductId = new Map();
for (const row of extractRows(pfSql, 'product_file')) {
  const vals = parseRow(row);
  const productid = parseInt(vals[1], 10);
  const type = vals[2];
  const content = (vals[3] || '').trim();
  const sort = parseInt(vals[7] || '0', 10);
  if (type !== 'img' || !content || isNaN(productid)) continue;
  if (!imagesByProductId.has(productid)) imagesByProductId.set(productid, []);
  imagesByProductId.get(productid).push({ content, sort });
}
for (const imgs of imagesByProductId.values()) imgs.sort((a,b) => a.sort - b.sort);
log(`product_file: ${imagesByProductId.size} produktida sa slikama`);

// ─── 2. Parsiraj product tabelu iz punog dumpa ────────────────────────────────
log('Učitavam puni dump...');
const fullSql = fs.readFileSync('C:/Users/PC/Downloads/agyc3416_santos_sa2025.sql', 'utf8');
const productByCode    = new Map();
const productByBarcode = new Map();
for (const row of extractRows(fullSql, 'product')) {
  const vals = parseRow(row);
  const id = parseInt(vals[0], 10);
  const code = (vals[4] || '').trim().toLowerCase();
  const barcode = (vals[3] || '').trim().toLowerCase();
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
log(`product tabela: ${productByCode.size} SKU, ${productByBarcode.size} EAN/varijanti`);

// ─── 3. Preuzmi sve mOffice i media iz Supabase ───────────────────────────────
log('Preuzimam iz Supabase...');
const allProducts = [];
let from = 0;
while (true) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_products?select=legacy_id,sku,ean,is_active,name_sr,raw_payload`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:`${from}-${from+999}` }
  });
  const batch = await res.json();
  if (!Array.isArray(batch)||!batch.length) break;
  allProducts.push(...batch.filter(p => p.raw_payload?.source === 'moffice'));
  if (batch.length < 1000) break;
  from += 1000;
}
log(`mOffice ukupno: ${allProducts.length}`);

const withImg = new Set();
{
  let mfrom = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media?select=legacy_product_id`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:`${mfrom}-${mfrom+999}` }
    });
    const batch = await res.json();
    if (!Array.isArray(batch)||!batch.length) break;
    for (const r of batch) withImg.add(r.legacy_product_id);
    if (batch.length < 1000) break;
    mfrom += 1000;
  }
}
log(`Legacy IDs sa slikama: ${withImg.size}`);

// ─── 4. Poklapanje ─────────────────────────────────────────────────────────────
const matches = [];
let skippedHasImg = 0, skippedInactive = 0, noMatch = 0;

for (const mp of allProducts) {
  if (withImg.has(mp.legacy_id)) { skippedHasImg++; continue; }
  if (!mp.is_active && !INCLUDE_INACTIVE) { skippedInactive++; continue; }

  const skuLc = (mp.sku||'').trim().toLowerCase();
  const eanLc = (mp.ean||'').trim().toLowerCase();
  const eanNoz = eanLc.replace(/^0+/,'');

  let foundPid = null, matchType = null;

  if (eanLc && productByBarcode.has(eanLc)) {
    for (const pid of productByBarcode.get(eanLc)) {
      if (imagesByProductId.has(pid)) { foundPid = pid; matchType = 'EAN'; break; }
    }
  }
  if (!foundPid && eanNoz !== eanLc && productByBarcode.has(eanNoz)) {
    for (const pid of productByBarcode.get(eanNoz)) {
      if (imagesByProductId.has(pid)) { foundPid = pid; matchType = 'EAN_NOZ'; break; }
    }
  }
  if (!foundPid && skuLc && productByCode.has(skuLc)) {
    for (const pid of productByCode.get(skuLc)) {
      if (imagesByProductId.has(pid)) { foundPid = pid; matchType = 'SKU'; break; }
    }
  }

  if (!foundPid) { noMatch++; continue; }

  const images = imagesByProductId.get(foundPid);
  if (!images?.length) { noMatch++; continue; }

  matches.push({ mp, images, matchType, oldPid: foundPid });
}

log(`\nRezultat poklapanja:`);
log(`  Sa slikama (preskočeno): ${skippedHasImg}`);
log(`  Inaktivni (preskočeno): ${skippedInactive}`);
log(`  Bez poklapanja: ${noMatch}`);
log(`  MATCHEVI: ${matches.length}`);

if (matches.length === 0) {
  log('Nema šta da se upiše.'); process.exit(0);
}

// Grupiši po tipu
const byType = {};
for (const m of matches) byType[m.matchType] = (byType[m.matchType]||0)+1;
for (const [t, n] of Object.entries(byType)) log(`    ${t}: ${n}`);

// ─── 5. Prikaži primere ───────────────────────────────────────────────────────
console.log('\n=== PRIMERI (prvih 30) ===');
for (const m of matches.slice(0, 30)) {
  const imgs = m.images.map(i => i.content).join(' | ');
  console.log(`  [${m.matchType}] sku=${m.mp.sku} ean=${m.mp.ean} active=${m.mp.is_active}`);
  console.log(`    naziv: "${m.mp.name_sr}"`);
  console.log(`    slike(${m.images.length}): ${imgs.slice(0, 120)}`);
}

// ─── 6. Pripremi zapise ───────────────────────────────────────────────────────
const records = [];
for (const m of matches) {
  m.images.forEach((img, i) => {
    records.push({
      legacy_product_id: m.mp.legacy_id,
      url: IMAGE_BASE + encodeURIComponent(img.content),
      sort: i,
      is_cover: i === 0,
    });
  });
}
log(`\nUkupno novih media zapisa: ${records.length} (za ${matches.length} proizvoda)`);

if (DRY_RUN) {
  log('DRY RUN — ništa nije upisano.');
  process.exit(0);
}

// ─── 7. Upis ─────────────────────────────────────────────────────────────────
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
log(`Upisano: ${inserted} media zapisa za ${matches.length} proizvoda`);
log(`Greške: ${errors}`);
