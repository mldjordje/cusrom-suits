#!/usr/bin/env node
// Generate 1200x630 OG image from existing hero image.
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";

const INPUT = path.resolve(process.cwd(), "public", "img", "hero2.jpg");
const OUTPUT = path.resolve(process.cwd(), "public", "img", "og-default.jpg");

async function run() {
  const exists = await fs.stat(INPUT).catch(() => null);
  if (!exists) {
    console.error(`[og] Missing source: ${INPUT}`);
    process.exit(1);
  }
  const buffer = await sharp(INPUT)
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();
  const tmp = OUTPUT + ".tmp";
  await fs.writeFile(tmp, buffer);
  await fs.rm(OUTPUT, { force: true }).catch(() => {});
  await fs.rename(tmp, OUTPUT);
  console.log(`[og] Wrote ${OUTPUT} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
