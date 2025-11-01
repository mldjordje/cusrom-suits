import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const src8x = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x');
const src4x = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x');
const src1x = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
let SRC = src8x;
try { await fs.access(src8x); } catch { try { await fs.access(src4x); SRC = src4x; } catch { SRC = src1x; } }

const OUT = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_lux');

async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }

async function* walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) yield* walk(full);
    else if(/\.(png|webp)$/i.test(e.name)) yield full;
  }
}

function isPeakForModel(name){
  // Single 2‑button peak and Double 4‑button peak only (do not touch single_1btn)
  const base = path.basename(name).toLowerCase();
  const isPeak = base.includes('style_lapel_peak');
  const single2 = base.includes('neck_single_breasted+buttons_2');
  const double4 = base.includes('neck_double_breasted+buttons_4');
  return isPeak && (single2 || double4);
}

function peakBrightness(name){
  const base = path.basename(name).toLowerCase();
  const isDouble = base.includes('neck_double_breasted+buttons_4');
  let b = 1.12; // default for single_2btn
  if (isDouble) b = 1.15;
  if (base.includes('lapel_narrow')) b -= 0.02;
  if (base.includes('lapel_wide')) b += 0.02;
  return b;
}

function isPocketToEnhance(name){
  const base = path.basename(name).toLowerCase();
  return base.includes('hip_pockets_double_welt') || base.includes('hip_pockets_patched');
}

function destPath(file){
  const rel = path.relative(SRC, file);
  const base = path.basename(rel).replace(/@4x|@8x/i, '');
  return path.join(OUT, path.dirname(rel), base.replace(/\.(png)$/i, '.webp'));
}

async function processFile(file){
  const out = destPath(file);
  await ensureDir(path.dirname(out));
  let img = sharp(file);

  if (isPeakForModel(file)) {
    const b = peakBrightness(file);
    img = img.modulate({ brightness: b });
  } else if (isPocketToEnhance(file)) {
    // Subtle edge clarity and exposure
    img = img.modulate({ brightness: 1.06, saturation: 1.05 }).sharpen(1.2);
  }

  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(out);
  return out;
}

async function main(){
  await ensureDir(OUT);
  let n=0; const changed=[];
  for await (const f of walk(SRC)){
    const out = await processFile(f); n++; if(n%10===0) console.log(`Processed ${n} files...`); changed.push(out);
  }
  console.log(`Done. Files: ${n}. Output: ${OUT}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

