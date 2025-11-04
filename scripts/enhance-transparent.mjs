import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const srcCandidates = [
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_lux'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent'),
];

let SRC = '';
for (const p of srcCandidates) { try { await fs.access(p); SRC = p; break; } catch {} }
if (!SRC) { console.error('No source folder found.'); process.exit(1); }

const OUT = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro');
await fs.mkdir(OUT, { recursive: true });

const TARGET_LUMA = 0.50; // target mean luminance (0..1)
const UPSCALE = 1.2; // mild additional upscale

function isPocket(name){
  const b = path.basename(name).toLowerCase();
  return b.includes('hip_pockets_double_welt') || b.includes('hip_pockets_patched');
}
function isExcludedFromColor(name){
  // Keep single_1btn as-is (no color/brightness normalization on lapels)
  const b = path.basename(name).toLowerCase();
  return b.includes('neck_single_breasted+buttons_1');
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
  const name = path.basename(rel).replace(/@\d+x/i, '');
  return path.join(OUT, path.dirname(rel), name.replace(/\.(png)$/i, '.webp'));
}

function lumaFromStats(stats){
  const r = stats.channels?.[0]?.mean ?? 0;
  const g = stats.channels?.[1]?.mean ?? 0;
  const b = stats.channels?.[2]?.mean ?? 0;
  // normalize 0..255 → 0..1
  const rn = r/255, gn = g/255, bn = b/255;
  return 0.2126*rn + 0.7152*gn + 0.0722*bn;
}

async function processFile(file){
  const out = dest(file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  let img = sharp(file);
  const meta = await img.metadata();
  const stats = await img.stats();
  let l = lumaFromStats(stats);

  // brightness normalization (avoid overcorrecting near-black/near-white)
  if (!isExcludedFromColor(file)) {
    if (l > 0.02 && l < 0.95) {
      const factor = Math.max(0.85, Math.min(1.25, TARGET_LUMA / l));
      img = img.modulate({ brightness: factor });
    }
  }

  // pockets: add clarity and slight exposure
  if (isPocket(file)) {
    img = img.modulate({ brightness: 1.06, saturation: 1.05 }).sharpen(1.4, 1.0, 0.5);
  } else {
    // global subtle clarity
    img = img.sharpen(0.6, 0.8, 0.2);
  }

  // upscale a bit
  const width = Math.round((meta.width || 0) * UPSCALE) || undefined;
  img = width ? img.resize({ width, kernel: sharp.kernel.lanczos3 }) : img;

  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(out);
  return { out };
}

async function main(){
  let n=0;
  for await (const f of walk(SRC)){
    await processFile(f); n++; if(n%10===0) console.log(`Processed ${n} files...`);
  }
  console.log(`Done. Files: ${n}. Output: ${OUT}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

