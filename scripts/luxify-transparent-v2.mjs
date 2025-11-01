import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const candidates = [
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_lux'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent'),
];
let SRC = '';
for (const p of candidates) { try { await fs.access(p); SRC = p; break; } catch {} }
if (!SRC) { console.error('No source found.'); process.exit(1); }

const OUT = path.join(root, 'custom-suits-backend', 'uploads', 'transparent_ultra');
await fs.mkdir(OUT, { recursive: true });

const TARGET_LUMA = 0.5; // unify mid-gray
const UPSCALE = 1.5;     // stronger upscale for sharper preview

function isLapel(name){ return /lapel/.test(name.toLowerCase()); }
function isPocket(name){ const b=name.toLowerCase(); return b.includes('hip_pockets_double_welt')||b.includes('hip_pockets_patched'); }
function isTorsoOrBottom(name){ const b=name.toLowerCase(); return b.includes('torso')||b.includes('bottom'); }

async function* walk(dir){
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    const full = path.join(dir,e.name);
    if(e.isDirectory()) yield* walk(full);
    else if(/\.(png|webp)$/i.test(e.name)) yield full;
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

async function processFile(file){
  const out = dest(file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  let img = sharp(file);
  const meta = await img.metadata();
  const stats = await img.stats();
  const L = luma(stats);

  // 1) Luminance normalization
  if (L>0.02 && L<0.98){
    const factor = Math.max(0.9, Math.min(1.2, TARGET_LUMA / L));
    img = img.modulate({ brightness: factor });
  }

  // 2) Depth/clarity tuning by category
  const name = path.basename(file);
  if (isLapel(name)) {
    // Lapels: midtone pop + crisp edges
    img = img.gamma(0.95).sharpen(1.5, 1.0, 0.8);
  } else if (isPocket(name)) {
    // Pockets: emphasize welt/edge more
    img = img.modulate({ brightness: 1.05, saturation: 1.06 }).sharpen(1.8, 1.0, 1.0);
  } else if (isTorsoOrBottom(name)) {
    // Torso/bottom: subtle clarity, avoid noise
    img = img.gamma(0.97).sharpen(0.8, 0.8, 0.3);
  } else {
    // Default mild boost
    img = img.sharpen(0.8, 0.8, 0.4);
  }

  // 3) Mild upscale
  const width = Math.round((meta.width||0)*UPSCALE) || undefined;
  img = width ? img.resize({ width, kernel: sharp.kernel.lanczos3 }) : img;

  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(out);
}

async function main(){
  let n=0; for await (const f of walk(SRC)){ await processFile(f); n++; if(n%10===0) console.log(`Processed ${n}...`); }
  console.log(`Done ${n} files → ${OUT}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

