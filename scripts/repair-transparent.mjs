#!/usr/bin/env node
/**
 * Repair transparent sprites:
 *  - reuse the expected sprite list from options.ts
 *  - convert any existing PNG fallback into WEBP
 *  - normalize canvas size to match torso dimensions
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TRANSPARENT_DIR = path.join(ROOT, "public", "assets", "suits", "transparent");
const MANIFEST_PATH = path.join(TRANSPARENT_DIR, "asset-manifest.json");
const OPTIONS_PATH = path.join(ROOT, "app", "custom-suits", "data", "options.ts");

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const loadManifestSet = async () => {
  if (!(await exists(MANIFEST_PATH))) return null;
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const json = JSON.parse(raw);
    return new Set(Object.keys(json?.files ?? {}));
  } catch (err) {
    console.warn("[repair-transparent] asset-manifest.json invalid:", err.message);
    return null;
  }
};

const scanTransparentDir = async () => {
  const stack = [""];
  const found = new Set();
  while (stack.length) {
    const rel = stack.pop();
    const dir = path.join(TRANSPARENT_DIR, rel);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const nextRel = path.join(rel, entry.name);
      if (entry.isDirectory()) stack.push(nextRel);
      else found.add(nextRel.replace(/\\/g, "/"));
    }
  }
  return found;
};

const gatherExisting = async () => (await loadManifestSet()) ?? (await scanTransparentDir());

const gatherExpected = async () => {
  const text = await fs.readFile(OPTIONS_PATH, "utf8");
  const regex = /\/assets\/suits\/[\w/+.-]+\.png/gi;
  const expected = new Set();
  let match;
  while ((match = regex.exec(text))) {
    const filename = match[0].substring(match[0].lastIndexOf("/") + 1);
    expected.add(filename.toLowerCase());
  }
  ["torso.png", "sleeves.png", "bottom.png", "pants.png", "shirt_to_jacket_open.png"].forEach((name) =>
    expected.add(name)
  );
  return expected;
};

const targetCanvas = async () => {
  const torsoWebp = path.join(TRANSPARENT_DIR, "torso.webp");
  const torsoPng = path.join(TRANSPARENT_DIR, "torso.png");
  const candidate = (await exists(torsoWebp)) ? torsoWebp : (await exists(torsoPng)) ? torsoPng : null;
  if (!candidate) {
    console.warn("[repair-transparent] torso reference missing, defaulting to 600x733");
    return { width: 600, height: 733 };
  }
  const meta = await sharp(candidate).metadata();
  return { width: meta.width ?? 600, height: meta.height ?? 733 };
};

const ensureDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const convertPngToWebp = async ({ pngPath, webpPath, targetWidth, targetHeight }) => {
  const input = sharp(pngPath).ensureAlpha();
  const meta = await input.metadata();
  const width = meta.width ?? targetWidth;
  const height = meta.height ?? targetHeight;

  let compositeBuffer;
  if (width === targetWidth && height === targetHeight) {
    compositeBuffer = await input.toBuffer();
  } else {
    const left = Math.round((targetWidth - width) / 2);
    const top = Math.round((targetHeight - height) / 2);
    const base = sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
    const overlay = await input.toBuffer();
    compositeBuffer = await base
      .composite([{ input: overlay, left: Math.max(left, 0), top: Math.max(top, 0) }])
      .toBuffer();
  }

  await ensureDir(webpPath);
  await sharp(compositeBuffer)
    .webp({ quality: 100, lossless: true })
    .toFile(webpPath);
};

const main = async () => {
  const [existing, expected, canvas] = await Promise.all([gatherExisting(), gatherExpected(), targetCanvas()]);

  const results = [];
  for (const file of Array.from(expected).sort()) {
    const targetWebpName = file.replace(/\.png$/i, ".webp");
    const relativeWebp = targetWebpName;
    const relativePng = file;

    if (existing.has(relativeWebp)) {
      results.push({ file: relativeWebp, status: "skip", note: "already exists" });
      continue;
    }

    const pngPath = path.join(TRANSPARENT_DIR, relativePng);
    if (!(await exists(pngPath))) {
      results.push({ file: relativeWebp, status: "unresolved", note: "PNG source missing" });
      continue;
    }

    const webpPath = path.join(TRANSPARENT_DIR, relativeWebp);
    try {
      await convertPngToWebp({
        pngPath,
        webpPath,
        targetWidth: canvas.width,
        targetHeight: canvas.height,
      });
      results.push({ file: relativeWebp, status: "converted", note: `from ${relativePng}` });
    } catch (err) {
      results.push({
        file: relativeWebp,
        status: "error",
        note: `failed: ${err.message}`,
      });
    }
  }

  console.table(results);
  const summary = results.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {}
  );
  console.log("\nSummary:", summary);
  console.log("All converted WEBP files saved under public/assets/suits/transparent/ (matching torso dimensions).");
  console.log("Re-run scripts/build-asset-manifest.mjs afterwards to refresh manifest.");
};

main().catch((err) => {
  console.error("[repair-transparent] Failed:", err);
  process.exitCode = 1;
});
