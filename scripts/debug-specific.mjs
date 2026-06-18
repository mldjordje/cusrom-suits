/**
 * Debuguje zašto sku=128334 ean=012833440 ne matchuje u match-via-full-dump.mjs
 */
import fs from 'fs';

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

// Parsiraj product_file (isto kao match-via-full-dump.mjs)
const pfSql = fs.readFileSync('C:/Users/PC/Downloads/product_file.sql', 'utf8');
const imagesByProductId = new Map();
let pfTotal = 0;
for (const row of extractRows(pfSql, 'product_file')) {
  pfTotal++;
  const vals = parseRow(row);
  const productid = parseInt(vals[1], 10);
  const type = vals[2];
  const content = (vals[3] || '').trim();
  const sort = parseInt(vals[7] || '0', 10);
  if (type !== 'img' || !content || isNaN(productid)) continue;
  if (!imagesByProductId.has(productid)) imagesByProductId.set(productid, []);
  imagesByProductId.get(productid).push({ content, sort });
}
log(`product_file: ${pfTotal} redova, ${imagesByProductId.size} sa slikama`);

// Parsiraj product (isto kao match-via-full-dump.mjs)
const PROD_ID=0, PROD_BARCODE=3, PROD_CODE=4;
const fullSql = fs.readFileSync('C:/Users/PC/Downloads/agyc3416_santos_sa2025.sql', 'utf8');
const productByCode    = new Map();
const productByBarcode = new Map();
let prodTotal = 0;
let found128334 = null;
for (const row of extractRows(fullSql, 'product')) {
  prodTotal++;
  const vals = parseRow(row);
  const id = parseInt(vals[PROD_ID], 10);
  const code = (vals[PROD_CODE] || '').trim().toLowerCase();
  const barcode = (vals[PROD_BARCODE] || '').trim().toLowerCase();

  // Debug: tražimo 128334
  if (code === '128334' || barcode === '012833440' || barcode === '12833440') {
    found128334 = { id, code, barcode, allVals: vals.slice(0, 8) };
    log(`DEBUG found128334: id=${id} code="${code}" barcode="${barcode}" imageExists=${imagesByProductId.has(id)}`);
  }

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
log(`product: ${prodTotal} redova`);

// Testiraj matching za sku=128334
const testEan = '012833440';
const testEanLc = testEan.toLowerCase();
const testEanNoz = testEanLc.replace(/^0+/, '');
log(`\nTest za ean="${testEan}":`);
log(`  eanLc="${testEanLc}", eanNoz="${testEanNoz}"`);
log(`  productByBarcode.has("${testEanLc}"): ${productByBarcode.has(testEanLc)}`);
log(`  productByBarcode.has("${testEanNoz}"): ${productByBarcode.has(testEanNoz)}`);

if (productByBarcode.has(testEanNoz)) {
  const pids = [...productByBarcode.get(testEanNoz)];
  log(`  IDs nađeni: ${pids.join(', ')}`);
  for (const pid of pids) {
    log(`  pid=${pid} imageExists=${imagesByProductId.has(pid)}`);
    if (imagesByProductId.has(pid)) {
      const imgs = imagesByProductId.get(pid);
      log(`  Slike: ${imgs.map(i=>i.content).join(', ')}`);
    }
  }
}

// Testiraj sku
const testSku = '128334';
log(`\nTest za sku="${testSku}":`);
log(`  productByCode.has("${testSku}"): ${productByCode.has(testSku)}`);
if (productByCode.has(testSku)) {
  const pids = [...productByCode.get(testSku)];
  log(`  IDs: ${pids.join(', ')}`);
  for (const pid of pids) log(`  pid=${pid} imageExists=${imagesByProductId.has(pid)}`);
}
