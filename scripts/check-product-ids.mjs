/**
 * Proveri koliko productid-a iz SQL dumpa postoji kao legacy_id u catalog_products
 * node scripts/check-product-ids.mjs
 */
import fs from 'fs';

const SUPABASE_URL = 'https://jmnuuekizaljlqdeupqr.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ0.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbnV1ZWtpemFsamxxZGV1cHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzMTc0NCwiZXhwIjoyMDc5NzA3NzQ0fQ.I87nmF6_dNPxV4JtKcPgxP95rMCzM2KvEXNxx4_BJ2I';
const SQL_PATH = 'C:/Users/PC/Downloads/product_file.sql';

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

const sql = fs.readFileSync(SQL_PATH, 'utf8');
const fullRowRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)',\s*'[^']*',\s*(\d+),\s*'[^']*',\s*(-?\d+)/g;
const productIds = new Set();
let match;
while ((match = fullRowRegex.exec(sql)) !== null) {
  const [, , productid, type] = match;
  if (type === 'img') productIds.add(parseInt(productid, 10));
}
log(`Unique productid u dumpu: ${productIds.size}`);

// Preuzmi sve koji već imaju slike
const existingMedia = new Set();
let from = 0;
while (true) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/catalog_product_media?select=legacy_product_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit': 'items', Range: `${from}-${from+999}` } }
  );
  const batch = await res.json();
  if (!Array.isArray(batch) || !batch.length) break;
  batch.forEach(r => existingMedia.add(r.legacy_product_id));
  if (batch.length < 1000) break;
  from += 1000;
}

const newIds = [...productIds].filter(id => !existingMedia.has(id));
log(`Bez slika u Supabase: ${newIds.length} productid-a`);

// Preuzmi sve legacy_id iz catalog_products
log('Preuzimam sve legacy_id iz catalog_products...');
const legacyIds = new Set();
from = 0;
while (true) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/catalog_products?select=legacy_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Range-Unit': 'items', Range: `${from}-${from+999}` } }
  );
  const batch = await res.json();
  if (!Array.isArray(batch) || !batch.length) break;
  batch.forEach(r => legacyIds.add(r.legacy_id));
  if (batch.length < 1000) break;
  from += 1000;
}
log(`Ukupno legacy_id u catalog_products: ${legacyIds.size}`);

const matched   = newIds.filter(id => legacyIds.has(id));
const unmatched = newIds.filter(id => !legacyIds.has(id));
log(`Poklapaju se s catalog_products: ${matched.length}`);
log(`NE poklapaju (nisu u katalogu): ${unmatched.length}`);
if (unmatched.length > 0 && unmatched.length <= 20) {
  console.log('  Nepostojeći IDs:', unmatched);
}
