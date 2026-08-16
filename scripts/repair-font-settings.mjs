#!/usr/bin/env node
/**
 * Repair storefront font settings stored in the Supabase `site-config` bucket.
 *
 * Background: the admin font picker accepted a free-text Google Fonts family name
 * without checking it existed. A typo ("SaH2Outline meium") was saved as the heading
 * font, Google answered 400 for the stylesheet, and every h1/h2/h3 on the storefront
 * fell back to the system sans — the site lost its display serif entirely.
 *
 * This script verifies every Google family in the stored library against Google Fonts,
 * drops the ones that do not exist, and repoints font-settings at a family that does.
 *
 * Dry run (default):  node scripts/repair-font-settings.mjs
 * Apply the changes:  node scripts/repair-font-settings.mjs --apply
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_CONFIG_BUCKET || "site-config";
const SETTINGS_PATH = "data/font-settings.json";
const LIBRARY_PATH = "data/font-library.json";

const DEFAULT_LIBRARY = [
  { id: "montserrat", name: "Montserrat", source: "google", fallback: "sans-serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { id: "playfair-display", name: "Playfair Display", source: "google", fallback: "serif", weights: ["400", "500", "600", "700", "800"] },
];

const DEFAULT_SETTINGS = {
  updatedAt: null,
  bodyFontId: "montserrat",
  displayFontId: "playfair-display",
  bodyFont: "Montserrat",
  displayFont: "Playfair Display",
  bodyFontWeight: "400",
  displayFontWeight: "700",
  letterSpacingBase: "0",
};

async function loadLocalEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    let raw;
    try {
      raw = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!key || process.env[key] != null) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

async function readJson(supabase, storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}

async function writeJson(supabase, storagePath, value) {
  const body = Buffer.from(JSON.stringify(value, null, 2), "utf8");
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
}

async function googleFontExists(name, weights) {
  const family = encodeURIComponent(name).replace(/%20/g, "+");
  const wts = (weights?.length ? weights : ["400"]).join(";");
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${wts}&display=swap`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
  });
  return response.ok;
}

async function main() {
  const apply = process.argv.includes("--apply");
  await loadLocalEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const storedLibrary = (await readJson(supabase, LIBRARY_PATH)) || DEFAULT_LIBRARY;
  const storedSettings = (await readJson(supabase, SETTINGS_PATH)) || DEFAULT_SETTINGS;

  console.log(`bucket: ${BUCKET}`);
  console.log(`current body font:    ${storedSettings.bodyFont} (${storedSettings.bodyFontId})`);
  console.log(`current heading font: ${storedSettings.displayFont} (${storedSettings.displayFontId})`);
  console.log("");

  const keep = [];
  const dropped = [];
  for (const font of Array.isArray(storedLibrary) ? storedLibrary : []) {
    if (!font || font.source !== "google") {
      keep.push(font);
      continue;
    }
    const ok = await googleFontExists(font.name, font.weights);
    console.log(`  ${ok ? "OK    " : "BROKEN"}  ${font.name}`);
    (ok ? keep : dropped).push(font);
  }

  for (const fallback of DEFAULT_LIBRARY) {
    if (!keep.some((font) => font?.id === fallback.id)) keep.push(fallback);
  }

  const nextSettings = { ...storedSettings };
  const isBroken = (id) => dropped.some((font) => font.id === id);
  if (isBroken(nextSettings.displayFontId)) {
    nextSettings.displayFontId = DEFAULT_SETTINGS.displayFontId;
    nextSettings.displayFont = DEFAULT_SETTINGS.displayFont;
    nextSettings.displayFontWeight = DEFAULT_SETTINGS.displayFontWeight;
  }
  if (isBroken(nextSettings.bodyFontId)) {
    nextSettings.bodyFontId = DEFAULT_SETTINGS.bodyFontId;
    nextSettings.bodyFont = DEFAULT_SETTINGS.bodyFont;
    nextSettings.bodyFontWeight = DEFAULT_SETTINGS.bodyFontWeight;
  }

  console.log("");
  if (!dropped.length) {
    console.log("Nothing to repair — every stored Google family resolves.");
    return;
  }

  console.log(`dropping ${dropped.length} dead famil${dropped.length === 1 ? "y" : "ies"}: ${dropped.map((f) => f.name).join(", ")}`);
  console.log(`new body font:    ${nextSettings.bodyFont}`);
  console.log(`new heading font: ${nextSettings.displayFont}`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    return;
  }

  nextSettings.updatedAt = new Date().toISOString();
  await writeJson(supabase, LIBRARY_PATH, keep);
  await writeJson(supabase, SETTINGS_PATH, nextSettings);
  console.log("\nWritten. Redeploy or revalidate the storefront to pick it up.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
