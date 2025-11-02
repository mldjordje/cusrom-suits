import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Goal:
// - Apply to EVERY image in the "transparent" pipeline
// - Unify tone (identical mid-gray across all layers)
// - Enhance details (lapels, pockets, seams) without halo noise
// - Downsize to performant size (~2x UI display width)
// - Export efficient WebP with alpha

const root = process.cwd();

// Prefer the most detailed source if available, but fall back gracefully
const SRC_CANDIDATES = [
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_ultra_calibrated'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_ultra'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_pro'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent_lux'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@8x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x'),
  path.join(root, 'custom-suits-backend', 'uploads', 'transparent'),
];

let SRC = '';
for (const p of SRC_CANDIDATES) {
  try { await fs.access(p); SRC = p; break; } catch {}
}
if (!SRC) { console.error('No source folder found.'); process.exit(1); }

// Output to the exact folder the app uses
const OUT = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
await fs.mkdir(OUT, { recursive: true });

// Target display width in UI is ~520px; serve ~2x for HiDPI.
const TARGET_WIDTH = 1100; // px

// Single tone target for identical shade across all assets
const TARGET_LUMA = 0.50; // 0..1 mid-gray
// Tighter clamp to prevent micro-mismatch bands between stacked layers
const BRIGHTNESS_CLAMP = [0.92, 1.08];

// Heuristics for per-element tuning
function isLapel(name) {
  const b = path.basename(name).toLowerCase();
  return b.includes('lapel_');
}
function isPocket(name) {
  const b = path.basename(name).toLowerCase();
  return b.includes('hip_pockets_') || b.includes('breast_pocket');
}
function isTorsoOrBottom(name) {
  const b = path.basename(name).toLowerCase();
  return (
    b.includes('length_long+cut_slim') ||
    b.includes('bottom_single_breasted') ||
    b.includes('bottom_double_breasted') ||
    b.includes('double_bottom') ||
    b.includes('sleeves')
  );
}
function isInterior(name) {
  const b = path.basename(name).toLowerCase();
  return b.startsWith('interior');
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // ignore junk folders that are not part of assets
      if (e.name.toLowerCase().includes('single_botom')) continue;
      yield* walk(full);
    } else if (/\.(png|webp)$/i.test(e.name)) {
      yield full;
    }
  }
}

function dest(file) {
  const rel = path.relative(SRC, file);
  const base = path.basename(rel).replace(/@\d+x/i, '');
  // Always write WebP to the output folder used by the app
  return path.join(OUT, path.dirname(rel), base.replace(/\.(png)$/i, '.webp'));
}

function lumaFromStats(stats) {
  const r = stats.channels?.[0]?.mean ?? 0;
  const g = stats.channels?.[1]?.mean ?? 0;
  const b = stats.channels?.[2]?.mean ?? 0;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
}

async function processFile(file) {
  const out = dest(file);
  await fs.mkdir(path.dirname(out), { recursive: true });

  let img = sharp(file);
  const meta = await img.metadata();
  const stats = await img.stats();
  const L = lumaFromStats(stats);

  // Ensure alpha exists; avoid premultiply due to missing method in env
  img = img.ensureAlpha();

  // 1) Brightness normalization for identical tone
  // Skip interiors (they're not part of fabric tone)
  if (!isInterior(file)) {
    if (L > 0.02 && L < 0.98) {
      let factor = TARGET_LUMA / (L || 0.5);
      factor = Math.max(BRIGHTNESS_CLAMP[0], Math.min(BRIGHTNESS_CLAMP[1], factor));
      img = img.modulate({ brightness: factor });
    }
  }

  // 1b) Crisp alpha to eliminate 1px light seams around edges
  if (!isInterior(file)) {
    const alpha = sharp(file).ensureAlpha().extractChannel('alpha').threshold(240);
    const rgb = sharp(file).ensureAlpha().removeAlpha();
    img = rgb.joinChannel([alpha]);
  }

  // 2) Detail tuning
  const name = path.basename(file);
  if (isLapel(name)) {
    // Lapels need crisp edges and clear fold highlights
    img = img.gamma(1.03).sharpen(1.2, 0.9, 0.7);
  } else if (isPocket(name)) {
    // Accentuate welt/edge definition slightly more
    img = img.modulate({ saturation: 1.02 }).sharpen(1.1, 0.9, 0.6);
  } else if (isTorsoOrBottom(name)) {
    // Avoid noise but keep clarity for large areas
    img = img.gamma(1.01).sharpen(0.7, 0.8, 0.3);
  } else if (!isInterior(name)) {
    // Mild default enhancement
    img = img.sharpen(0.6, 0.7, 0.3);
  }

  // 3) Downsize to performant width (keep alpha, preserve aspect)
  const width = meta.width || 0;
  if (width > TARGET_WIDTH) {
    img = img.resize({ width: TARGET_WIDTH, kernel: sharp.kernel.lanczos3 });
  }

  // 4) Efficient WebP output with alpha
  // Save with lossless WebP to fully avoid white seams on transparent edges
  // Save lossless to avoid white seams on edges
  await img.webp({
    lossless: true,
    quality: 100,
    alphaQuality: 100,
    effort: 4,
  }).toFile(out);
}

async function main() {
  let n = 0;
  for await (const f of walk(SRC)) {
    await processFile(f);
    n++;
    if (n % 15 === 0) console.log(`Processed ${n} files...`);
  }
  console.log(`Done. Processed ${n} files. Output: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
