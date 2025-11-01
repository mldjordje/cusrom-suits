import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const candidates = [
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_ultra'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_lux'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent')
];
let SRC = '';
for (const p of candidates) { try { await fs.access(p); SRC = p; break; } catch {} }
if (!SRC) { console.error('No source dir'); process.exit(1); }

const OUT = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_ultra_calibrated');
await fs.mkdir(OUT, { recursive: true });

function isSingle1Lapel(name){
  const b = path.basename(name).toLowerCase();
  return b.includes('neck_single_breasted+buttons_1') && b.includes('lapel_');
}
function isSingle1Bottom(name){
  const b = path.basename(name).toLowerCase();
  return b.includes('bottom_single_breasted+length_long');
}

async function* walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(png|webp)$/i.test(e.name)) yield full;
  }
}

function dest(file){
  const rel = path.relative(SRC, file);
  const base = path.basename(rel).replace(/@\dx/i, '');
  return path.join(OUT, path.dirname(rel), base.replace(/\.(png)$/i, '.webp'));
}

function luma(stats){
  const c = stats.channels; if(!c||c.length<3) return 0.5;
  const rn=c[0].mean/255, gn=c[1].mean/255, bn=c[2].mean/255;
  return 0.2126*rn + 0.7152*gn + 0.0722*bn;
}

let targetLuma = null;
// Discover baseline from single_1btn bottom file
for await (const f of walk(SRC)){
  if (isSingle1Bottom(f)) {
    const stats = await sharp(f).stats();
    targetLuma = luma(stats);
    break;
  }
}
if (targetLuma == null) targetLuma = 0.5;
console.log('Target luma (single_1btn baseline):', targetLuma.toFixed(3));

async function processFile(file){
  const out = dest(file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  let img = sharp(file);
  if (isSingle1Lapel(file)) {
    const stats = await img.stats();
    const L = luma(stats);
    let factor = targetLuma / (L || 0.5);
    factor = Math.max(0.92, Math.min(1.08, factor));
    img = img.modulate({ brightness: factor });
  }
  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(out);
}

async function main(){
  let n=0; for await (const f of walk(SRC)) { await processFile(f); n++; if(n%10===0) console.log('Processed', n); }
  console.log('Calibrated files to', OUT);
}

main().catch(e=>{ console.error(e); process.exit(1); });

