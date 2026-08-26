/**
 * Writes the storefront's size variants for product photos already in Supabase
 * Storage.
 *
 * The upload route now generates a .w400.webp and .w800.webp next to every new
 * photo (see app/api/admin/webshop/media/route.ts). Everything uploaded before
 * that only has the full-size original, so the storefront requests a variant,
 * gets a 404 and falls back to the ~190 KB original. This backfills those.
 *
 * It never touches an original: it only reads them and writes new sibling
 * objects. Re-running is safe — existing variants are skipped unless --force.
 *
 *   node scripts/backfill-image-variants.mjs --dry-run
 *   node scripts/backfill-image-variants.mjs --limit 20
 *   node scripts/backfill-image-variants.mjs
 *
 * Flags:
 *   --dry-run       list what would be written, upload nothing
 *   --limit N       stop after N originals
 *   --prefix P      only paths under P (default: webshop)
 *   --force         rewrite variants that already exist
 *   --concurrency N parallel images (default 4)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const STOREFRONT_IMAGE_VARIANT_WIDTHS = [400, 800, 1200];

const variantPath = (objectPath, width) =>
  `${objectPath.replace(/\.[a-z0-9]+$/i, "")}.w${width}.webp`;

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const has = (flag) => process.argv.includes(flag);

const loadEnv = () => {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
};

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const bucket = process.env.SUPABASE_PRODUCTS_BUCKET || "products";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const dryRun = has("--dry-run");
const force = has("--force");
const limit = Number(arg("--limit", "0")) || 0;
const prefix = arg("--prefix", "webshop");
const concurrency = Math.max(1, Number(arg("--concurrency", "4")) || 4);

/** Storage list() is one directory at a time, so walk the date folders. */
const listRecursive = async (dir) => {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(dir, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${dir}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const full = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata == null) {
        out.push(...(await listRecursive(full)));
      } else {
        out.push({ path: full, size: Number(entry.metadata?.size || 0) });
      }
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
};

const isOriginal = (p) =>
  /\.(jpe?g|png|webp)$/i.test(p) && !/\.w\d+\.webp$/i.test(p);

const run = async () => {
  console.log(`Listing ${bucket}/${prefix} ...`);
  const all = await listRecursive(prefix);
  const existing = new Set(all.map((entry) => entry.path));
  let originals = all.filter((entry) => isOriginal(entry.path));

  if (!force) {
    originals = originals.filter((entry) =>
      STOREFRONT_IMAGE_VARIANT_WIDTHS.some((width) => !existing.has(variantPath(entry.path, width))),
    );
  }
  if (limit) originals = originals.slice(0, limit);

  console.log(`${all.length} objects, ${originals.length} originals needing variants.`);
  if (dryRun) {
    for (const entry of originals.slice(0, 40)) console.log(`  would write variants for ${entry.path}`);
    if (originals.length > 40) console.log(`  ... and ${originals.length - 40} more`);
    return;
  }

  let done = 0;
  let written = 0;
  let failed = 0;

  const worker = async (queue) => {
    for (;;) {
      const entry = queue.shift();
      if (!entry) return;
      try {
        const { data, error } = await supabase.storage.from(bucket).download(entry.path);
        if (error) throw new Error(error.message);
        const source = Buffer.from(await data.arrayBuffer());

        for (const width of STOREFRONT_IMAGE_VARIANT_WIDTHS) {
          const target = variantPath(entry.path, width);
          if (!force && existing.has(target)) continue;
          const buffer = await sharp(source, { limitInputPixels: false })
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 74 })
            .toBuffer();
          const { error: uploadError } = await supabase.storage.from(bucket).upload(target, buffer, {
            upsert: true,
            contentType: "image/webp",
            cacheControl: "31536000",
          });
          if (uploadError) throw new Error(uploadError.message);
          written += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn(`  FAIL ${entry.path}: ${error.message}`);
      }
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${originals.length} ...`);
    }
  };

  const queue = [...originals];
  await Promise.all(Array.from({ length: concurrency }, () => worker(queue)));
  console.log(`Done. ${written} variants written, ${failed} originals failed.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
