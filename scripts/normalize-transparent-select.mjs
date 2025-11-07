// Normalize brightness (tone) for a subset of transparent sprites by glob/regex
// Usage examples:
//  node scripts/normalize-transparent-select.mjs --match "neck_double_breasted+buttons_4+lapel_narrow+style_lapel_peak"
//  node scripts/normalize-transparent-select.mjs --regex "lapel_narrow.*style_lapel_peak"

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
let DIR = path.join(ROOT, 'custom-suits-backend', 'uploads', 'transparent');
const ALT = path.join(ROOT, 'custom-suits-backend', 'custom-suits-backend', 'uploads', 'transparent');
const CLAMP = [0.80, 1.25];

function arg(flag, def){ const i = process.argv.indexOf(flag); return i>=0?process.argv[i+1]:def; }
const MATCH = arg('--match','');
const REGEX = arg('--regex','');

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

function webpOut(file){ return file.replace(/\.(png|webp)$/i, '.webp'); }

async function main(){
  const files = [];
  try { await fs.access(DIR); } catch { DIR = ALT; } for await (const f of walk(DIR)) files.push(f);
  let selected = files;
  if (MATCH) selected = selected.filter(f => path.basename(f).includes(MATCH));
  if (REGEX){ const rx = new RegExp(REGEX,'i'); selected = selected.filter(f => rx.test(path.basename(f))); }
  if (!selected.length){ console.error('No files matched'); process.exit(2); }

  // baseline = median of all matched
  const values = await Promise.all(selected.map(maskedLuma));
  const sorted = [...values].sort((a,b)=>a-b);
  const target = sorted[Math.floor(sorted.length/2)] || 0.5;
  console.log('Matched files:', selected.length, 'Target L:', target.toFixed(3));

  let n=0;
  for (let i=0;i<selected.length;i++){
    const f = selected[i];
    const L = values[i];
    let factor = target / (L || 0.5);
    if (!Number.isFinite(factor)) factor = 1;
    factor = Math.max(CLAMP[0], Math.min(CLAMP[1], factor));
    await sharp(f).ensureAlpha().modulate({ brightness: factor })
      .webp({ lossless: true, quality: 100, alphaQuality: 100 })
      .toFile(webpOut(f));
    if (++n % 10 === 0) console.log('Normalized', n);
  }
  console.log('Done:', n);
}

main().catch(e=>{ console.error(e); process.exit(1); });




