/**
 * Koliko od 483 kandidata je is_active vs inactive?
 */
import fs from 'fs';

const SUPABASE_URL = 'https://jmnuuekizaljlqdeupqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I';
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

// Preuzmi SVE mOffice (bez is_active filtera)
const all = [];
let from = 0;
while (true) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_products?select=legacy_id,sku,ean,is_active,name_sr,raw_payload`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:`${from}-${from+999}` }
  });
  const batch = await res.json();
  if (!Array.isArray(batch)||!batch.length) break;
  all.push(...batch.filter(p => p.raw_payload?.source === 'moffice'));
  if (batch.length < 1000) break;
  from += 1000;
}

const mediaRes = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media?select=legacy_product_id`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:'0-9999' }
});
const mediaRows = await mediaRes.json();
const withImg = new Set(mediaRows.map(r => r.legacy_product_id));
log(`mOffice ukupno: ${all.length}, sa slikama: ${withImg.size}`);

// Nađi sve matcheve bez slika
let activeWithMatch = 0, inactiveWithMatch = 0, matchCount = 0;
const activeMatches = [];
const inactiveMatches = [];

for (const mp of all) {
  if (withImg.has(mp.legacy_id)) continue; // već ima sliku

  const skuLc=(mp.sku||'').trim().toLowerCase();
  const eanLc=(mp.ean||'').trim().toLowerCase();
  const eanNoz=eanLc.replace(/^0+/,'');

  let found = null;
  if (eanLc && productByBarcode.has(eanLc)) {
    for (const pid of productByBarcode.get(eanLc)) {
      if (imagesByProductId.has(pid)) { found = pid; break; }
    }
  }
  if (!found && eanNoz !== eanLc && productByBarcode.has(eanNoz)) {
    for (const pid of productByBarcode.get(eanNoz)) {
      if (imagesByProductId.has(pid)) { found = pid; break; }
    }
  }
  if (!found && skuLc && productByCode.has(skuLc)) {
    for (const pid of productByCode.get(skuLc)) {
      if (imagesByProductId.has(pid)) { found = pid; break; }
    }
  }

  if (!found) continue;
  matchCount++;

  if (mp.is_active) {
    activeWithMatch++;
    activeMatches.push(mp);
  } else {
    inactiveWithMatch++;
    inactiveMatches.push(mp);
  }
}

log(`\nMatchevi bez slika: ${matchCount}`);
log(`  is_active=true: ${activeWithMatch}`);
log(`  is_active=false: ${inactiveWithMatch}`);

if (activeWithMatch > 0) {
  console.log('\n=== AKTIVNI BEZ SLIKA (prvih 10) ===');
  for (const p of activeMatches.slice(0, 10)) {
    console.log(`  sku=${p.sku} ean=${p.ean} name="${p.name_sr}" legacy_id=${p.legacy_id}`);
  }
}

console.log(`\n=== INAKTIVNI BEZ SLIKA (prvih 10) ===`);
for (const p of inactiveMatches.slice(0, 10)) {
  console.log(`  sku=${p.sku} ean=${p.ean} name="${p.name_sr}" legacy_id=${p.legacy_id}`);
}
