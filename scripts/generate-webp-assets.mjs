/**
 * Generates WebP siblings for the legacy JPEG/PNG assets on the cPanel host.
 *
 * The storefront serves originals straight from assets.santos.rs with
 * `images.unoptimized: true`, so a 2000x2000 / 1MB product photo is downloaded
 * in full to be painted into a 148px-wide grid card. This script writes a
 * downscaled WebP next to every original:
 *
 *     fajlovi/product/173.jpg  ->  fajlovi/product/173.jpg.webp
 *
 * The `.jpg.webp` naming is deliberate: it lets Apache serve the WebP through
 * content negotiation (see public_html/fajlovi/.htaccess) without a single
 * change to the stored image paths in the database. Browsers that don't send
 * `Accept: image/webp` keep getting the original.
 *
 * Usage:
 *   node scripts/generate-webp-assets.mjs --in "./public_html (stari sajt)/fajlovi" --out ./tmp/webp
 *   node scripts/generate-webp-assets.mjs --in ./local-mirror --out ./tmp/webp --width 1200 --quality 78
 *   node scripts/generate-webp-assets.mjs --in ./local-mirror --out ./tmp/webp --dry-run
 *
 * Then sync ./tmp/webp to the cPanel fajlovi/ directory (rsync, FTP, or the
 * existing PHP upload endpoint).
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const arg = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const hasFlag = (flag) => process.argv.includes(flag);

const INPUT_DIR = arg("--in", "./public_html (stari sajt)/fajlovi");
const OUTPUT_DIR = arg("--out", "./tmp/webp");
const MAX_WIDTH = Number(arg("--width", "1200"));
const QUALITY = Number(arg("--quality", "78"));
const DRY_RUN = hasFlag("--dry-run");
const FORCE = hasFlag("--force");
// Optional allow-list of relative paths. The legacy fajlovi/ tree holds ~42k
// images (25 GB), but the live catalog references only a fraction of them —
// converting the rest wastes hours and disk. Derive the list from the product
// feed once it is deployed:
//   curl -s https://www.santos.rs/feed/google-merchant.xml \
//     | grep -o 'fajlovi/[^<]*' | sed 's|^fajlovi/||' | sort -u > images.txt
const LIST_FILE = arg("--list", "");
const LIMIT = Number(arg("--limit", "0"));

const SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`Input directory not found: ${INPUT_DIR}`);
  process.exit(1);
}

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!entry.isFile()) return [];
    return SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
};

const formatKb = (bytes) => `${Math.round(bytes / 1024)}KB`;

const readAllowList = () => {
  if (!LIST_FILE) return null;
  if (!fs.existsSync(LIST_FILE)) {
    console.error(`List file not found: ${LIST_FILE}`);
    process.exit(1);
  }
  const entries = fs
    .readFileSync(LIST_FILE, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\/+/, ""))
    .filter(Boolean)
    // Tolerate entries written with or without the fajlovi/ prefix.
    .map((line) => line.replace(/^fajlovi\//i, ""));
  return new Set(entries.map((entry) => entry.toLowerCase()));
};

const run = async () => {
  const allowList = readAllowList();
  let files = walk(INPUT_DIR);
  const discovered = files.length;

  if (allowList) {
    files = files.filter((file) =>
      allowList.has(path.relative(INPUT_DIR, file).split(path.sep).join("/").toLowerCase()),
    );
  }
  if (LIMIT > 0) files = files.slice(0, LIMIT);

  console.log(
    `Found ${discovered} source images in ${INPUT_DIR}` +
      (allowList ? `, ${files.length} match the allow-list` : "") +
      (LIMIT > 0 ? ` (limited to ${files.length})` : "") +
      (DRY_RUN ? " — dry run, nothing will be written" : ""),
  );

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let originalBytes = 0;
  let webpBytes = 0;

  for (const file of files) {
    const relative = path.relative(INPUT_DIR, file);
    // Keep the full original filename so Apache can map foo.jpg -> foo.jpg.webp.
    const target = path.join(OUTPUT_DIR, `${relative}.webp`);

    try {
      const sourceStat = fs.statSync(file);

      if (!FORCE && fs.existsSync(target)) {
        const targetStat = fs.statSync(target);
        if (targetStat.mtimeMs >= sourceStat.mtimeMs) {
          skipped += 1;
          continue;
        }
      }

      const image = sharp(file);
      const metadata = await image.metadata();
      // Never upscale: a 600px source stays 600px.
      const resizeWidth = metadata.width && metadata.width > MAX_WIDTH ? MAX_WIDTH : null;

      const buffer = await (resizeWidth ? image.resize({ width: resizeWidth }) : image)
        .webp({ quality: QUALITY })
        .toBuffer();

      originalBytes += sourceStat.size;
      webpBytes += buffer.length;

      if (!DRY_RUN) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buffer);
      }

      converted += 1;
      if (converted % 50 === 0) {
        console.log(`  ...${converted} converted`);
      }
    } catch (error) {
      failed += 1;
      console.error(`  FAILED ${relative}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const saved = originalBytes - webpBytes;
  const percent = originalBytes > 0 ? Math.round((saved / originalBytes) * 100) : 0;

  console.log("");
  console.log(`Converted : ${converted}`);
  console.log(`Skipped   : ${skipped} (already up to date)`);
  console.log(`Failed    : ${failed}`);
  console.log(`Original  : ${formatKb(originalBytes)}`);
  console.log(`WebP      : ${formatKb(webpBytes)}`);
  console.log(`Saved     : ${formatKb(saved)} (${percent}%)`);
  if (!DRY_RUN) {
    console.log("");
    console.log(`Output written to ${OUTPUT_DIR}`);
    console.log("Next: sync that tree into the cPanel fajlovi/ directory, preserving paths,");
    console.log("and make sure public_html/fajlovi/.htaccess is in place.");
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
