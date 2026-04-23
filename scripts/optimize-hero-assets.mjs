#!/usr/bin/env node
// One-off: compress large hero assets in public/img/ and create .webp variants.
// Reads original -> writes optimized JPG + WebP next to it.
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PUBLIC_IMG = path.resolve(process.cwd(), "public", "img");

const targets = [
  { file: "hero2.jpg", maxWidth: 1920, jpgQuality: 72, webpQuality: 72 },
  { file: "odela2.jpg", maxWidth: 1920, jpgQuality: 72, webpQuality: 72 },
];

const toKb = (bytes) => (bytes / 1024).toFixed(1) + " KB";

async function run() {
  for (const target of targets) {
    const input = path.join(PUBLIC_IMG, target.file);
    const stat = await fs.stat(input).catch(() => null);
    if (!stat) {
      console.warn(`[optimize] Missing ${input}, skipping`);
      continue;
    }
    const originalSize = stat.size;

    const baseName = target.file.replace(/\.(jpg|jpeg|png)$/i, "");
    const outJpg = path.join(PUBLIC_IMG, `${baseName}.jpg`);
    const outWebp = path.join(PUBLIC_IMG, `${baseName}.webp`);

    const image = sharp(input, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    const targetWidth = Math.min(meta.width ?? target.maxWidth, target.maxWidth);

    const jpgBuffer = await image
      .clone()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .jpeg({ quality: target.jpgQuality, progressive: true, mozjpeg: true })
      .toBuffer();

    const webpBuffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: target.webpQuality })
      .toBuffer();

    const tmpJpg = outJpg + ".tmp";
    const tmpWebp = outWebp + ".tmp";
    await fs.writeFile(tmpJpg, jpgBuffer);
    await fs.writeFile(tmpWebp, webpBuffer);
    await fs.rm(outJpg, { force: true }).catch(() => {});
    await fs.rename(tmpJpg, outJpg);
    await fs.rm(outWebp, { force: true }).catch(() => {});
    await fs.rename(tmpWebp, outWebp);

    console.log(
      `[optimize] ${target.file} ${toKb(originalSize)} -> jpg ${toKb(jpgBuffer.length)}, webp ${toKb(
        webpBuffer.length,
      )} (width=${targetWidth})`,
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
