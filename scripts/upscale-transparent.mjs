import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const srcDir = path.join(root, 'custom-suits-backend', 'uploads', 'transparent');
const outDir = path.join(root, 'custom-suits-backend', 'uploads', 'transparent@4x');

const exts = new Set(['.png', '.webp', '.jpg', '.jpeg']);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      yield full;
    }
  }
}

function destPath(file) {
  const rel = path.relative(srcDir, file);
  const dir = path.dirname(rel);
  const base = path.parse(rel).name + '@4x.webp';
  return path.join(outDir, dir, base);
}

async function processFile(file) {
  const out = destPath(file);
  await ensureDir(path.dirname(out));
  const img = sharp(file, { failOn: 'none' });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    console.warn(`Skip (no dimensions): ${file}`);
    return null;
  }
  const width = Math.round(meta.width * 4);
  const height = Math.round(meta.height * 4);
  await img
    .resize({ width, height, kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
    .webp({ quality: 100, alphaQuality: 100, lossless: true })
    .toFile(out);
  return { file, out, srcW: meta.width, srcH: meta.height, outW: width, outH: height };
}

async function main() {
  // Check source exists
  try {
    await fs.access(srcDir);
  } catch {
    console.error(`Source folder not found: ${srcDir}`);
    process.exit(1);
  }

  await ensureDir(outDir);

  const results = [];
  let count = 0;
  for await (const file of walk(srcDir)) {
    try {
      const r = await processFile(file);
      if (r) {
        results.push(r);
        count++;
        if (count % 10 === 0) console.log(`Processed ${count} files...`);
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }

  const reportPath = path.join(outDir, 'upscale-report.csv');
  const header = 'source,out,srcW,srcH,outW,outH\n';
  const lines = results.map(r => `${path.relative(root, r.file)},${path.relative(root, r.out)},${r.srcW},${r.srcH},${r.outW},${r.outH}`).join('\n');
  await fs.writeFile(reportPath, header + lines, 'utf8');
  console.log(`Done. Files: ${results.length}. Report: ${reportPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

