#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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
  const raw = await fs.readFile(MANIFEST_PATH, "utf8");
  try {
    const json = JSON.parse(raw);
    const files = Object.keys(json?.files ?? {});
    return new Set(files);
  } catch (err) {
    console.warn("[check-missing-sprites] Failed to parse asset-manifest.json:", err.message);
    return null;
  }
};

const scanTransparentDir = async () => {
  const stack = [""];
  const files = [];
  while (stack.length) {
    const rel = stack.pop();
    const dir = path.join(TRANSPARENT_DIR, rel);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const nextRel = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextRel);
      } else {
        files.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }
  return new Set(files);
};

const gatherExisting = async () => {
  const manifest = await loadManifestSet();
  if (manifest) return manifest;
  console.warn("[check-missing-sprites] asset-manifest.json missing or invalid – scanning directory instead.");
  return await scanTransparentDir();
};

const gatherExpected = async () => {
  const text = await fs.readFile(OPTIONS_PATH, "utf8");
  const regex = /\/assets\/suits\/transparent\/([A-Za-z0-9._+/-]+\.png)/g;
  const results = new Set();
  let match;
  while ((match = regex.exec(text))) {
    results.add(match[1].replace(/^\//, ""));
  }
  // Core structural defaults that might not live in options.ts but are part of the render stack
  ["torso.png", "sleeves.png", "bottom.png", "pants.png", "shirt_to_jacket_open.png"].forEach((name) =>
    results.add(name)
  );
  return results;
};

const main = async () => {
  const existing = await gatherExisting();
  const expected = await gatherExpected();

  const rows = [];
  for (const relativePng of Array.from(expected).sort()) {
    const relativeWebp = relativePng.replace(/\.png$/i, ".webp");
    const hasWebp = existing.has(relativeWebp);
    const pngPath = path.join(TRANSPARENT_DIR, relativePng);
    const pngExists = await exists(pngPath);
    rows.push({
      file: relativeWebp,
      status: hasWebp ? "found" : "missing",
      sourceCandidate: pngExists ? relativePng : "-",
      action: hasWebp ? "ok" : pngExists ? "convert png -> webp" : "manual source needed",
    });
  }

  const missingCount = rows.filter((r) => r.status === "missing").length;
  console.log("\nSprite audit (expected base assets vs existing webp):");
  console.table(rows);
  console.log(
    `\nSummary: ${rows.length} sprites checked, ${rows.length - missingCount} ok, ${missingCount} missing webp variants.`
  );
};

main().catch((err) => {
  console.error("[check-missing-sprites] Failed:", err);
  process.exitCode = 1;
});

