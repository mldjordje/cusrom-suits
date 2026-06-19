/**
 * Koliko od 705 match-ova već ima slike u Supabase-u?
 */
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase environment variables');

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
const imageIds = new Set();
for (const row of extractRows(pfSql, 'product_file')) {
  const v = parseRow(row);
  if (v[2]==='img' && v[3]?.trim()) imageIds.add(parseInt(v[1],10));
}
log(`product_file: ${imageIds.size} produktida sa slikama`);

const fullSql = fs.readFileSync('C:/Users/PC/Downloads/agyc3416_santos_sa2025.sql', 'utf8');
const byBarcode = new Map();
const byCode = new Map();
for (const row of extractRows(fullSql, 'product')) {
  const v = parseRow(row);
  const id=parseInt(v[0],10), barcode=(v[3]||'').trim().toLowerCase(), code=(v[4]||'').trim().toLowerCase();
  if (!imageIds.has(id)) continue;
  if (code) byCode.set(code, id);
  if (barcode) {
    byBarcode.set(barcode, id);
    const noz = barcode.replace(/^0+/,'');
    if (noz !== barcode) byBarcode.set(noz, id);
  }
}

// Preuzmi mOffice
const all = [];
let from = 0;
while (true) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_products?select=legacy_id,sku,ean,raw_payload`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:`${from}-${from+999}` }
  });
  const batch = await res.json();
  if (!Array.isArray(batch)||!batch.length) break;
  all.push(...batch.filter(p => p.raw_payload?.source === 'moffice'));
  if (batch.length < 1000) break;
  from += 1000;
}
log(`mOffice ukupno: ${all.length}`);

// Preuzmi koji već imaju slike
const mediaRes = await fetch(`${SUPABASE_URL}/rest/v1/catalog_product_media?select=legacy_product_id`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit':'items', Range:'0-9999' }
});
const mediaRows = await mediaRes.json();
const withImg = new Set(mediaRows.map(r => r.legacy_product_id));
log(`Ukupno legacy_id sa slikama u Supabase: ${withImg.size}`);

// Poklapanje i provera
let matchHasImg = 0, matchNoImg = 0;
const noImgMatches = [];
for (const mp of all) {
  const skuLc=(mp.sku||'').trim().toLowerCase();
  const eanLc=(mp.ean||'').trim().toLowerCase();
  const eanNoz=eanLc.replace(/^0+/,'');
  const matches = eanLc && byBarcode.has(eanLc) || eanNoz && byBarcode.has(eanNoz) || skuLc && byCode.has(skuLc);
  if (!matches) continue;
  if (withImg.has(mp.legacy_id)) {
    matchHasImg++;
  } else {
    matchNoImg++;
    noImgMatches.push(mp);
  }
}

log(`Poklapanja koja VEĆ IMAJU slike: ${matchHasImg}`);
log(`Poklapanja koja NEMAJU slike (novi kandidati!): ${matchNoImg}`);

if (noImgMatches.length > 0) {
  console.log('\n=== KANDIDATI BEZ SLIKA (prvih 20) ===');
  for (const mp of noImgMatches.slice(0, 20)) {
    console.log(`  sku=${mp.sku} ean=${mp.ean} legacy_id=${mp.legacy_id}`);
  }
}
