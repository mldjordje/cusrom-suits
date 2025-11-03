import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Tone gate: verify all transparent assets share the same luminance
// Usage: node scripts/tone-check.mjs [--target 0.50] [--tolerance 0.02]

const root = process.cwd();
const UPLOADS = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
const args = process.argv.slice(2);
const getArg = (k, def) => {
  const i = args.indexOf(k);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const TOL = getArg('--tolerance', 0.02); // ±2% default
let TARGET = getArg('--target', NaN);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(png|webp)$/i.test(e.name)) yield full;
  }
}

// Compute luminance ignoring near-transparent pixels
async function maskedLuma(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels; const A = ch - 1;
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    const a = data[i + A]; if (a < 16) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b; n++;
  }
  return n ? sum / n : 0.5;
}

async function autodetectTarget() {
  // Prefer torso/pants baseline
  const candidates = [
    'length_long+cut_slim',
    'bottom_single_breasted+length_long',
    'sleeves',
  ];
  const files = [];
  for await (const f of walk(UPLOADS)) files.push(f);
  for (const key of candidates) {
    const hit = files.find(f => path.basename(f).toLowerCase().startsWith(key));
    if (hit) return maskedLuma(hit);
  }
  // fallback: median of all
  const lumas = await Promise.all(files.map(maskedLuma));
  const sorted = lumas.sort((a,b)=>a-b); const m = sorted[Math.floor(sorted.length/2)] || 0.5;
  return m;
}

async function main(){
  try { await fs.access(UPLOADS); } catch { console.error('transparent folder not found:', UPLOADS); process.exit(1); }
  if (Number.isNaN(TARGET)) TARGET = await autodetectTarget();
  const bad = [];
  let count = 0;
  for await (const f of walk(UPLOADS)){
    const L = await maskedLuma(f);
    const diff = Math.abs(L - TARGET);
    if (diff > TOL) bad.push({ file: f, L, diff });
    count++;
  }
  console.log(`Checked ${count} files. Target=${TARGET.toFixed(3)} tol=±${TOL}`);
  if (bad.length){
    console.log('Out of tolerance:');
    for (const b of bad.sort((a,b)=>b.diff-a.diff)){
      console.log(`${b.L.toFixed(3)} (Δ=${b.diff.toFixed(3)})  ${path.basename(b.file)}`);
    }
    process.exit(2);
  } else {
    console.log('All files within tolerance.');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });

