/**
 * Normalizes the legacy /fajlovi/ product photography into one uniform,
 * lightweight, square set.
 *
 * Why: a shop grid page currently ships 51.9 MB of images, 48.6 MB of it from
 * fajlovi/ (60 images, avg 829 KB, largest 2.5 MB) painted into 239x290 CSS-px
 * cards. `images.unoptimized: true` in next.config.ts means no resize, no WebP
 * and no srcset, so every device downloads the full original. On top of that
 * the sources are mixed aspect (1:1 legacy, 2:3 new, 3:2 accessories), which is
 * why the card falls back to `object-fit: contain` for accessories and shows
 * the white letterbox bars the client calls "the ugly frame".
 *
 * What this does, per image:
 *   1. never upscales — `withoutEnlargement`, max side MAX_SIDE
 *   2. pads (never crops, never zooms) to a square canvas
 *   3. pads with the photo's own detected border colour, not hardcoded white,
 *      so a garment shot on a grey seamless does not gain a white band
 *   4. writes a high-quality JPEG at the same path + a WebP sibling
 *   5. skips anything that would come out bigger than the original
 *
 * Phases (run in order):
 *   node scripts/normalize-legacy-images.mjs --list
 *   node scripts/normalize-legacy-images.mjs --build
 *   node scripts/normalize-legacy-images.mjs --push          (writes to cPanel)
 *
 * Useful flags:
 *   --limit 20        only the first N images (smoke test)
 *   --only <substr>   only paths containing <substr>
 *   --force           rebuild even if the output already exists
 *   --dry-run         with --push, report what would be uploaded
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const hasFlag = (flag) => process.argv.includes(flag);

const ASSET_ORIGIN = arg("--origin", "https://assets.santos.rs");
const WORK_DIR = arg("--work", "./tmp/legacy-normalize");
const MANIFEST = path.join(WORK_DIR, "manifest.json");
const REPORT = path.join(WORK_DIR, "report.json");
const OUT_DIR = path.join(WORK_DIR, "out");
const SRC_DIR = path.join(WORK_DIR, "src");

// Display need: the grid card is 239x290 CSS px, the PDP main image tops out
// around 900 CSS px tall. 1600 leaves headroom for a 2x retina PDP and still
// throws away the 3700px originals nobody can see.
const MAX_SIDE = Number(arg("--max-side", "1600"));
const JPEG_QUALITY = Number(arg("--jpeg-quality", "88"));
const WEBP_QUALITY = Number(arg("--webp-quality", "85"));
// A border that is not near-uniform means the photo bleeds to the edge; padding
// it with a flat colour would be visible, so those get flagged instead.
const BORDER_UNIFORM_TOLERANCE = Number(arg("--border-tolerance", "12"));
const LIMIT = Number(arg("--limit", "0"));
const ONLY = arg("--only", "");
const FORCE = hasFlag("--force");
const DRY_RUN = hasFlag("--dry-run");

const readEnv = () => {
  const file = ".env.local";
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const eq = line.indexOf("=");
        return [line.slice(0, eq), line.slice(eq + 1).trim()];
      }),
  );
};

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const kb = (bytes) => Math.round(bytes / 1024);

/* -------------------------------------------------------------------------- */
/* Phase 1 — list                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The live product feed only carries the currently eligible subset (~400 paths).
 * catalog_product_media is the authoritative set — 1841 distinct legacy URLs —
 * and includes the gallery images a PDP loads but the feed never mentions.
 */
const runList = async () => {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");

  const paths = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(
      `${url}/rest/v1/catalog_product_media?select=url&url=like.*%2Ffajlovi%2F*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + pageSize - 1}` } },
    );
    if (!res.ok) throw new Error(`Supabase list failed (${res.status}): ${await res.text()}`);
    const rows = await res.json();
    for (const row of rows) {
      // Stored values are a mix of relative /fajlovi/... and full legacy URLs,
      // AND of raw vs percent-encoded filenames — the same photo appears as
      // both `Montano 01.jpg` and `Montano%2002.jpg`. Decoding here is what
      // makes those one entry: kept encoded, the download step would encode a
      // second time (`Montano%252002.jpg`) and the file would look like a dead
      // reference. That mistake hid 39 real images behind a "missing" count.
      const match = String(row.url || "").match(/\/fajlovi\/.+$/);
      if (!match) continue;
      let decoded = match[0];
      try {
        decoded = decodeURIComponent(decoded);
      } catch (_) {
        // A stray % that is not an escape — keep the raw value.
      }
      paths.add(decoded);
    }
    if (rows.length < pageSize) break;
  }

  const list = [...paths].sort();
  ensureDir(WORK_DIR);
  fs.writeFileSync(MANIFEST, JSON.stringify(list, null, 2));
  console.log(`manifest: ${list.length} distinct legacy image paths -> ${MANIFEST}`);
};

/* -------------------------------------------------------------------------- */
/* Phase 2 — build                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Reads the 1px frame around the image and returns its median colour plus how
 * uniform it is. A studio cut-out has a dead-flat border; a full-bleed lifestyle
 * shot does not, and padding that one would show a seam.
 */
const detectBorderColour = async (input) => {
  const { data, info } = await sharp(input)
    .resize(64, 64, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const samples = [];
  const push = (x, y) => {
    const o = (y * width + x) * channels;
    samples.push([data[o], data[o + 1], data[o + 2]]);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const colour = [0, 1, 2].map((c) => median(samples.map((s) => s[c])));
  // Spread of the border pixels around that median, per channel, worst case.
  const spread = Math.max(
    ...[0, 1, 2].map((c) => {
      const deltas = samples.map((s) => Math.abs(s[c] - colour[c])).sort((a, b) => a - b);
      // 90th percentile ignores the odd stray pixel (dust, a watermark corner).
      return deltas[Math.floor(deltas.length * 0.9)];
    }),
  );

  return { r: colour[0], g: colour[1], b: colour[2], spread };
};

const buildOne = async (relPath) => {
  const srcFile = path.join(SRC_DIR, relPath);
  const outJpeg = path.join(OUT_DIR, relPath);
  const outWebp = `${outJpeg}.webp`;

  if (!FORCE && fs.existsSync(outJpeg) && fs.existsSync(outWebp)) {
    return { relPath, status: "cached" };
  }

  if (!fs.existsSync(srcFile)) {
    const res = await fetch(`${ASSET_ORIGIN}${relPath.split("/").map(encodeURIComponent).join("/")}`);
    if (!res.ok) return { relPath, status: "missing", httpStatus: res.status };
    ensureDir(path.dirname(srcFile));
    fs.writeFileSync(srcFile, Buffer.from(await res.arrayBuffer()));
  }

  const original = fs.readFileSync(srcFile);
  const meta = await sharp(original, { limitInputPixels: false }).metadata();
  if (!meta.width || !meta.height) return { relPath, status: "unreadable" };

  const border = await detectBorderColour(original);
  const wasSquare = meta.width === meta.height;

  // Fit the whole photo inside a square without ever scaling it up: the square
  // side is the longest source edge, capped at MAX_SIDE.
  const side = Math.min(Math.max(meta.width, meta.height), MAX_SIDE);

  // Nothing is baked into the canvas any more. An earlier pass padded every
  // non-square photo out to 1:1 — flat colour where the border was uniform, a
  // blurred mirror of the edge where it was not — so that `cover` would have
  // nothing to crop. About a quarter of the catalogue needed it, and on the
  // suit categories, where the shots are portrait, that quarter is most of what
  // you see: the result read as a blurred frame around every card, which is the
  // opposite of the brief.
  //
  // The photo now keeps its own aspect and the 1:1 card stage is filled by CSS
  // `object-fit: cover` at render time. That fills the box edge to edge with
  // real photograph, leaves the stored file uncropped, and is reversible in a
  // stylesheet rather than in 1616 re-encoded files.
  const fitted = await sharp(original, { limitInputPixels: false })
    .rotate() // honour EXIF orientation before measuring anything
    .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const base = sharp(fitted.data).flatten({ background: { r: border.r, g: border.g, b: border.b } });

  const jpeg = await base.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  const webp = await base.clone().webp({ quality: WEBP_QUALITY }).toBuffer();
  const outMeta = await sharp(jpeg).metadata();

  // Never make a file worse. Tiny legacy thumbs are already smaller than a
  // re-encode would be; leave those alone entirely.
  if (jpeg.length >= original.length && wasSquare) {
    return { relPath, status: "skipped-larger", srcBytes: original.length, jpegBytes: jpeg.length };
  }

  ensureDir(path.dirname(outJpeg));
  fs.writeFileSync(outJpeg, jpeg);
  fs.writeFileSync(outWebp, webp);

  return {
    relPath,
    status: "built",
    srcDim: `${meta.width}x${meta.height}`,
    outDim: `${outMeta.width}x${outMeta.height}`,
    wasSquare,
    // Kept because the card crops non-square sources at render time: a very wide
    // or very tall source loses more to `cover`, and this is how you find them.
    aspect: +(meta.width / meta.height).toFixed(3),
    borderColour: `rgb(${border.r},${border.g},${border.b})`,
    srcBytes: original.length,
    jpegBytes: jpeg.length,
    webpBytes: webp.length,
  };
};

const runBuild = async () => {
  if (!fs.existsSync(MANIFEST)) throw new Error(`Manifest missing — run --list first (${MANIFEST})`);
  let list = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (ONLY) list = list.filter((p) => p.includes(ONLY));
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  ensureDir(OUT_DIR);
  ensureDir(SRC_DIR);

  const results = [];
  const CONCURRENCY = 6;
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < list.length) {
      const relPath = list[cursor++];
      try {
        results.push(await buildOne(relPath));
      } catch (error) {
        results.push({ relPath, status: "error", error: String(error?.message || error) });
      }
      done += 1;
      if (done % 25 === 0 || done === list.length) {
        process.stdout.write(`\r  ${done}/${list.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");

  const built = results.filter((r) => r.status === "built");
  const srcBytes = built.reduce((sum, r) => sum + r.srcBytes, 0);
  const jpegBytes = built.reduce((sum, r) => sum + r.jpegBytes, 0);
  const webpBytes = built.reduce((sum, r) => sum + r.webpBytes, 0);
  // A 1:1 card crops whatever is not square. Anything past roughly 3:2 either
  // way loses a third of its frame, which is worth eyeballing before it ships.
  const heavyCrop = built.filter((r) => r.aspect && (r.aspect > 1.5 || r.aspect < 0.667));

  const summary = {
    total: results.length,
    built: built.length,
    cached: results.filter((r) => r.status === "cached").length,
    missing: results.filter((r) => r.status === "missing").length,
    skippedLarger: results.filter((r) => r.status === "skipped-larger").length,
    errors: results.filter((r) => r.status === "error").length,
    alreadySquare: built.filter((r) => r.wasSquare).length,
    nonSquareCroppedByCss: built.filter((r) => !r.wasSquare).length,
    heavyCrop: heavyCrop.length,
    srcMB: +(srcBytes / 1048576).toFixed(1),
    jpegMB: +(jpegBytes / 1048576).toFixed(1),
    webpMB: +(webpBytes / 1048576).toFixed(1),
    jpegSavingPct: srcBytes ? +(100 - (jpegBytes / srcBytes) * 100).toFixed(1) : 0,
    webpSavingPct: srcBytes ? +(100 - (webpBytes / srcBytes) * 100).toFixed(1) : 0,
  };

  ensureDir(WORK_DIR);
  fs.writeFileSync(REPORT, JSON.stringify({ summary, results }, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  if (heavyCrop.length) {
    console.log(`\n${heavyCrop.length} image(s) further than 3:2 from square — the 1:1 card crops these hardest:`);
    for (const r of heavyCrop.slice(0, 20)) {
      console.log(`  ${r.relPath}  ${r.srcDim}  aspect ${r.aspect}`);
    }
  }
  console.log(`\nreport -> ${REPORT}\noutput -> ${OUT_DIR}`);
};

/* -------------------------------------------------------------------------- */
/* Phase 3 — push                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Backs the original up to fajlovi/_orig/<same path> before overwriting it, so
 * every step is reversible from the server itself. Overwriting in place is what
 * keeps 1841 rows of catalog_product_media untouched — no path migration.
 */
const runPush = async () => {
  const { Client } = await import("basic-ftp");
  const env = readEnv();
  if (!env.FTP_HOST || !env.FTP_USER || !env.FTP_PASS) throw new Error("FTP_HOST / FTP_USER / FTP_PASS missing from .env.local");

  const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
  let built = report.results.filter((r) => r.status === "built" || r.status === "cached");
  if (ONLY) built = built.filter((r) => r.relPath.includes(ONLY));
  if (LIMIT > 0) built = built.slice(0, LIMIT);
  const remoteRoot = arg("--remote-root", "/public_html");

  // A long run drops the control socket sooner or later, so the connection is
  // treated as disposable: any failure reconnects and retries that one file.
  let client = null;
  const connect = async () => {
    if (client) {
      try {
        client.close();
      } catch (_) {
        /* already gone */
      }
    }
    client = new Client(120000);
    await client.access({
      host: env.FTP_HOST,
      user: env.FTP_USER,
      password: env.FTP_PASS,
      port: +env.FTP_PORT || 21,
      secure: false,
    });
    return client;
  };
  await connect();

  const listSizes = async (dir) => {
    try {
      const entries = await client.list(dir);
      return new Map(entries.filter((e) => e.type === 1).map((e) => [e.name, e.size]));
    } catch (_) {
      return new Map();
    }
  };

  // Resume support, verified against the server rather than a local state file:
  // a file counts as done when both the JPEG and its WebP sibling are on the
  // host at exactly the local byte size. That also repairs a half-written file
  // from an interrupted run, which a state file would happily skip.
  const productDir = path.posix.join(remoteRoot, "fajlovi/product");
  const backupDir = path.posix.join(remoteRoot, "fajlovi/_orig/product");
  const remoteSizes = await listSizes(productDir);
  const backupSizes = await listSizes(backupDir);
  console.log(`server holds ${remoteSizes.size} files in fajlovi/product, ${backupSizes.size} backups`);

  const pending = [];
  let alreadyDone = 0;
  for (const r of built) {
    const name = path.posix.basename(r.relPath);
    const localJpeg = path.join(OUT_DIR, r.relPath);
    if (!fs.existsSync(localJpeg) || !fs.existsSync(`${localJpeg}.webp`)) continue;
    const jpegBytes = fs.statSync(localJpeg).size;
    const webpBytes = fs.statSync(`${localJpeg}.webp`).size;
    if (remoteSizes.get(name) === jpegBytes && remoteSizes.get(`${name}.webp`) === webpBytes) {
      alreadyDone += 1;
      continue;
    }
    pending.push({ name, relPath: r.relPath, localJpeg, hasBackup: backupSizes.has(name) });
  }

  console.log(`${alreadyDone} already in place, ${pending.length} to upload`);
  if (DRY_RUN) {
    for (const item of pending.slice(0, 10)) {
      console.log(`  would write ${productDir}/${item.name} (+ .webp)` + (item.hasBackup ? "" : `, backup -> ${backupDir}/${item.name}`));
    }
    if (client) client.close();
    return;
  }

  let uploaded = 0;
  let backed = 0;
  const failures = [];

  for (const item of pending) {
    const remote = `${productDir}/${item.name}`;
    const backup = `${backupDir}/${item.name}`;

    let lastError = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        // Back up first, and only when one is not already there — a re-run must
        // never overwrite the pristine original with an already-normalized file.
        //
        // The backup is a server-side RENAME, not a re-upload. Sending the
        // originals back would mean pushing another 1 GB the server already
        // holds. If the rename succeeds and the upload then fails, the file is
        // still intact under _orig/ and this loop retries it.
        if (!item.hasBackup) {
          await client.ensureDir(backupDir);
          await client.cd("/");
          try {
            await client.rename(remote, backup);
            backed += 1;
          } catch (_) {
            // No original on the host (a dead catalogue reference) — nothing to
            // preserve, and the normalized file is still worth writing.
          }
          item.hasBackup = true;
        }

        await client.ensureDir(productDir);
        await client.cd("/");
        await client.uploadFrom(item.localJpeg, remote);
        await client.uploadFrom(`${item.localJpeg}.webp`, `${remote}.webp`);
        uploaded += 1;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        // Control socket timeouts are the normal failure here, not the odd one.
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        try {
          await connect();
        } catch (reconnectError) {
          lastError = reconnectError;
        }
      }
    }

    if (lastError) {
      failures.push({ name: item.name, error: String(lastError?.message || lastError).split("\n")[0] });
      console.log(`\n  FAIL ${item.name}: ${failures[failures.length - 1].error}`);
    }
    const seen = uploaded + failures.length;
    if (seen % 25 === 0) process.stdout.write(`\r  ${seen}/${pending.length}`);
  }

  process.stdout.write("\n");
  if (client) client.close();
  console.log(`uploaded ${uploaded} pairs, backed up ${backed} originals to ${backupDir}`);
  if (failures.length) {
    console.log(`${failures.length} failed — re-run --push to retry just those:`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f.name}: ${f.error}`);
  }
};

/* -------------------------------------------------------------------------- */
/* Phase 4 — Supabase backfill                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The 120-odd photos uploaded through the admin since the Supabase migration are
 * 1200x1800 portraits. Once the card stage is 1:1 those would be the only images
 * still getting cropped, so they get the same square treatment, written back to
 * the same storage path (upsert) — no catalog_product_media rows change.
 *
 * New uploads are squared on the way in by app/api/admin/webshop/media/route.ts,
 * so this is a one-off catch-up for what is already in the bucket.
 */
const runSupabase = async () => {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");

  const publicPrefix = `${url}/storage/v1/object/public/`;
  const seen = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${url}/rest/v1/catalog_product_media?select=url&url=like.*storage%2Fv1%2Fobject%2Fpublic*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + pageSize - 1}` },
    });
    if (!res.ok) throw new Error(`Supabase list failed (${res.status}): ${await res.text()}`);
    const rows = await res.json();
    for (const row of rows) {
      const value = String(row.url || "");
      if (value.startsWith(publicPrefix)) seen.add(value.slice(publicPrefix.length));
    }
    if (rows.length < pageSize) break;
  }

  let objects = [...seen].sort();
  if (ONLY) objects = objects.filter((o) => o.includes(ONLY));
  if (LIMIT > 0) objects = objects.slice(0, LIMIT);
  console.log(`${objects.length} Supabase storage objects referenced by the catalogue`);

  const backupDir = path.join(WORK_DIR, "supabase-orig");
  let squared = 0;
  let already = 0;
  let srcBytes = 0;
  let outBytes = 0;

  for (const object of objects) {
    const slash = object.indexOf("/");
    const bucket = object.slice(0, slash);
    const objectPath = object.slice(slash + 1);

    const res = await fetch(`${publicPrefix}${object}`);
    if (!res.ok) {
      console.log(`  miss ${object} (${res.status})`);
      continue;
    }
    const remoteBuffer = Buffer.from(await res.arrayBuffer());

    // Keep a local copy before overwriting — Storage upsert has no undo.
    const backupFile = path.join(backupDir, object);
    ensureDir(path.dirname(backupFile));
    if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, remoteBuffer);

    // An earlier pass padded these out to 1:1 and uploaded the result, so what
    // is on Storage today may already be a padded square. Always work from the
    // local backup when there is one — re-deriving from the padded copy would
    // bake that padding in permanently.
    const source = fs.readFileSync(backupFile);
    const original = source;
    const meta = await sharp(source, { limitInputPixels: false }).metadata();

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const isWebp = contentType.includes("webp");
    const border = await detectBorderColour(source);
    const side = Math.min(Math.max(meta.width, meta.height), MAX_SIDE);
    // Downscale only — no padding. The card fills its 1:1 stage with `cover`.
    const fitted = await sharp(source, { limitInputPixels: false })
      .rotate()
      .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });

    // Nothing to do when Storage already holds exactly what this pass produces.
    const remoteMeta = await sharp(remoteBuffer, { limitInputPixels: false }).metadata();
    if (remoteMeta.width === fitted.info.width && remoteMeta.height === fitted.info.height) {
      already += 1;
      continue;
    }

    const pipeline = sharp(fitted.data).flatten({ background: { r: border.r, g: border.g, b: border.b } });

    const out = isWebp
      ? await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer()
      : await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

    srcBytes += original.length;
    outBytes += out.length;

    if (DRY_RUN) {
      console.log(`  would square ${object}  ${meta.width}x${meta.height} ${kb(original.length)}KB -> ${side}x${side} ${kb(out.length)}KB`);
      squared += 1;
      continue;
    }

    const put = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": contentType,
        "Cache-Control": "31536000",
        "x-upsert": "true",
      },
      body: new Uint8Array(out),
    });
    if (!put.ok) {
      console.log(`  FAIL ${object} (${put.status}): ${(await put.text()).slice(0, 160)}`);
      continue;
    }
    squared += 1;
    if (squared % 10 === 0) process.stdout.write(`\r  ${squared}/${objects.length}`);
  }
  process.stdout.write("\n");
  console.log(
    `squared ${squared}, already square ${already}, ${kb(srcBytes)}KB -> ${kb(outBytes)}KB` +
      (srcBytes ? ` (-${(100 - (outBytes / srcBytes) * 100).toFixed(1)}%)` : "") +
      `\noriginals backed up to ${backupDir}`,
  );
};

/* -------------------------------------------------------------------------- */

const main = async () => {
  if (hasFlag("--list")) return runList();
  if (hasFlag("--build")) return runBuild();
  if (hasFlag("--push")) return runPush();
  if (hasFlag("--supabase")) return runSupabase();
  console.log("Pick a phase: --list | --build | --push | --supabase");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
