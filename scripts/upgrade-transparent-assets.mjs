#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  return value && !value.startsWith("--") ? value : fallback;
};

const SRC = path.resolve(root, getArg("src", "custom-suits-backend/uploads/transparent"));
const OUT = path.resolve(root, getArg("out", "custom-suits-backend/uploads/transparent_ultra"));
const SCALE = Math.max(1, Number.parseFloat(getArg("scale", "2")) || 2);
const EDGE_ALPHA_BOOST = Math.max(0.6, Number.parseFloat(getArg("edge-boost", "1.15")) || 1.15);
const EDGE_GAMMA = Math.max(0.6, Number.parseFloat(getArg("edge-gamma", "0.9")) || 0.9);

const exts = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const priority = { ".png": 3, ".webp": 2, ".jpg": 1, ".jpeg": 1 };

const ensureDir = async (p) => {
  await fs.mkdir(p, { recursive: true });
};

const toRel = (p) => p.replace(/\\/g, "/");

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

const detectBucket = (relKey) => {
  if (relKey.startsWith("edges/") || relKey.includes("/edges/")) return "edges";
  if (relKey.startsWith("shading/") || relKey.includes("/shading/")) return "shading";
  if (relKey.startsWith("specular/") || relKey.includes("/specular/")) return "specular";
  return "base";
};

const processEdges = async (file, outPng, outWebp) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const srcAlpha = channels === 4 ? data[i + 3] / 255 : 1;
    let luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    luma = Math.pow(luma, EDGE_GAMMA) * srcAlpha;
    const alpha = Math.max(0, Math.min(255, Math.round(luma * EDGE_ALPHA_BOOST * 255)));

    out[j] = 0;
    out[j + 1] = 0;
    out[j + 2] = 0;
    out[j + 3] = alpha;
  }

  let img = sharp(out, { raw: { width, height, channels: 4 } }).sharpen(1.2, 0.8, 0.5);

  if (SCALE !== 1) {
    img = img.resize({
      width: Math.round(width * SCALE),
      height: Math.round(height * SCALE),
      kernel: sharp.kernel.lanczos3,
    });
  }

  await ensureDir(path.dirname(outPng));
  await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outPng);
  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(outWebp);
};

const processStandard = async (file, bucket, outPng, outWebp) => {
  const input = sharp(file, { failOn: "none" }).ensureAlpha();
  const meta = await input.metadata();
  let img = input;

  if (bucket === "shading") {
    img = img.gamma(1.04).modulate({ brightness: 1.03 }).sharpen(0.9, 0.8, 0.4);
  } else if (bucket === "specular") {
    img = img.gamma(1.06).modulate({ brightness: 1.06 }).sharpen(1.1, 0.9, 0.5);
  } else {
    img = img.sharpen(0.6, 0.6, 0.2);
  }

  if (SCALE !== 1 && meta.width && meta.height) {
    img = img.resize({
      width: Math.round(meta.width * SCALE),
      height: Math.round(meta.height * SCALE),
      kernel: sharp.kernel.lanczos3,
    });
  }

  await ensureDir(path.dirname(outPng));
  await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outPng);
  await img.webp({ quality: 100, alphaQuality: 100, lossless: true }).toFile(outWebp);
};

const buildManifest = async (outDir) => {
  const buckets = {
    base: outDir,
    shading: path.join(outDir, "shading"),
    specular: path.join(outDir, "specular"),
    edges: path.join(outDir, "edges"),
  };
  const filesFlat = {};
  const counts = {};

  const readFiles = async (dir) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.(png|webp)$/i.test(name))
        .sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  };

  for (const [bucket, dir] of Object.entries(buckets)) {
    const list = await readFiles(dir);
    counts[bucket] = list.length;
    const prefix = bucket === "base" ? "" : `${bucket}/`;
    for (const name of list) {
      filesFlat[`${prefix}${name}`] = true;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    counts,
    files: filesFlat,
  };
  const target = path.join(outDir, "asset-manifest.json");
  await fs.writeFile(target, JSON.stringify(payload, null, 2));
  return target;
};

const main = async () => {
  try {
    await fs.access(SRC);
  } catch {
    console.error(`Source folder not found: ${SRC}`);
    process.exit(1);
  }

  await ensureDir(OUT);

  const sources = new Map();
  for await (const file of walk(SRC)) {
    const ext = path.extname(file).toLowerCase();
    const rel = toRel(path.relative(SRC, file));
    const key = rel.replace(new RegExp(`${ext}$`, "i"), "");
    const existing = sources.get(key);
    if (!existing || (priority[ext] || 0) > (priority[existing.ext] || 0)) {
      sources.set(key, { file, ext });
    }
  }

  let processed = 0;
  for (const [key, entry] of sources.entries()) {
    const bucket = detectBucket(key);
    const outPng = path.join(OUT, `${key}.png`);
    const outWebp = path.join(OUT, `${key}.webp`);
    if (bucket === "edges") {
      await processEdges(entry.file, outPng, outWebp);
    } else {
      await processStandard(entry.file, bucket, outPng, outWebp);
    }
    processed += 1;
    if (processed % 10 === 0) {
      console.log(`Processed ${processed} assets...`);
    }
  }

  const htaccess = path.join(SRC, ".htaccess");
  try {
    await fs.access(htaccess);
    await fs.copyFile(htaccess, path.join(OUT, ".htaccess"));
  } catch {}

  const manifestPath = await buildManifest(OUT);
  console.log(`Done. Upgraded assets: ${processed}`);
  console.log(`Output folder: ${OUT}`);
  console.log(`Manifest: ${manifestPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
