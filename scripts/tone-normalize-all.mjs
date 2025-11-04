import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Permanent tone normalization for all transparent assets.
// 1) Detect baseline luminance from torso/pants
// 2) Adjust every file brightness to match baseline
// 3) Save lossless WebP

const root = process.cwd();
const DIR = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
const CLAMP = [0.80, 1.25];

async function* walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries){
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(png|webp)$/i.test(e.name)) yield full;
  }
}

async function maskedLuma(file){
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels; const A = ch - 1; let s=0,n=0;
  for (let i=0;i<data.length;i+=ch){ const a=data[i+A]; if(a<16) continue; const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255; s += 0.2126*r+0.7152*g+0.0722*b; n++; }
  return n ? s/n : 0.5;
}

async function detectTarget(){
  const priors = ['length_long+cut_slim', 'bottom_single_breasted+length_long', 'sleeves'];
  const files = []; for await (const f of walk(DIR)) files.push(f);
  for (const p of priors){ const hit = files.find(f => path.basename(f).toLowerCase().startsWith(p)); if (hit) return maskedLuma(hit); }
  const values = await Promise.all(files.map(maskedLuma));
  const sorted = values.sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]||0.5;
}

function webpOut(file){ return file.replace(/\.(png|webp)$/i, '.webp'); }

async function main(){
  try { await fs.access(DIR); } catch { console.error('Not found:', DIR); process.exit(1); }
  const target = await detectTarget();
  console.log('Baseline luminance:', target.toFixed(3));
  let n=0;
  for await (const f of walk(DIR)){
    const L = await maskedLuma(f);
    let factor = target / (L || 0.5);
    if (!Number.isFinite(factor)) factor = 1;
    factor = Math.max(CLAMP[0], Math.min(CLAMP[1], factor));
    let img = sharp(f).ensureAlpha().modulate({ brightness: factor });
    await img.webp({ lossless: true, quality: 100, alphaQuality: 100 }).toFile(webpOut(f));
    if (++n % 20 === 0) console.log('Normalized', n);
  }
  console.log('Done. Files:', n);
}

main().catch(e=>{ console.error(e); process.exit(1); });

