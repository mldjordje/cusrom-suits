#!/usr/bin/env node

import fs from "fs";
import path from "path";
import sharp from "sharp";

const GEOMETRY_DIR = path.join(process.cwd(), "public", "assets", "suits", "geometry");
const MASK_THRESHOLD = 8;

const isMaskPixel = (data, index) => {
  const alpha = data[index + 3];
  const luma = (data[index] + data[index + 1] + data[index + 2]) / 3;
  return alpha > MASK_THRESHOLD && luma > MASK_THRESHOLD;
};

const findSegments = (mask, width, y) => {
  const segments = [];
  let start = -1;
  for (let x = 0; x < width; x += 1) {
    const on = isMaskPixel(mask, (y * width + x) * 4);
    if (on && start === -1) start = x;
    if ((!on || x === width - 1) && start !== -1) {
      const end = on && x === width - 1 ? x : x - 1;
      if (end - start > 2) segments.push([start, end]);
      start = -1;
    }
  }
  return segments;
};

const buildLegUv = async (styleDir) => {
  const maskPath = path.join(styleDir, "pants.mask.png");
  const uvPath = path.join(styleDir, "pants.uv.png");
  const meta = await sharp(maskPath).metadata();
  const width = meta.width;
  const height = meta.height;
  const mask = await sharp(maskPath).ensureAlpha().raw().toBuffer();

  let minX = width;
  let maxX = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isMaskPixel(mask, (y * width + x) * 4)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }
  const out = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y += 1) {
    const u = Math.round((y / Math.max(1, height - 1)) * 255);
    for (const [start, end] of findSegments(mask, width, y)) {
      for (let x = start; x <= end; x += 1) {
        const i = (y * width + x) * 4;
        // In the folded trouser render, fabric grain runs along the leg. Since the
        // pants are laid horizontally on screen, a vertical pinstripe fabric appears
        // mostly horizontal across the visible trousers, matching Hockerty previews.
        out[i] = u;
        out[i + 1] = Math.round(((x - minX) / Math.max(1, maxX - minX)) * 255);
        out[i + 2] = 0;
        out[i + 3] = 255;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(uvPath);
  return { width, height, minX, maxX };
};

const main = async () => {
  const styles = fs
    .readdirSync(GEOMETRY_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const style of styles) {
    const result = await buildLegUv(path.join(GEOMETRY_DIR, style));
    console.log(`${style}: pants.uv.png ${result.width}x${result.height}, xRange=${result.minX}-${result.maxX}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
