#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnvFiles() {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    let raw;
    try {
      raw = await fs.readFile(fullPath, "utf8");
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function describeProject(url) {
  const parsed = new URL(url);
  return {
    host: parsed.host,
    projectRef: parsed.host.split(".")[0] || parsed.host,
  };
}

async function main() {
  await loadLocalEnvFiles();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase env. Required NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const project = describeProject(supabaseUrl);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const tables = [
    { name: "catalog_products", select: "id" },
    { name: "content_posts", select: "id" },
    { name: "content_post_categories", select: "id" },
    { name: "content_post_category_links", select: "post_id,category_id" },
  ];

  console.log(`[supabase-content-check] project=${project.projectRef} host=${project.host}`);

  let hasFailure = false;
  for (const table of tables) {
    const { data, error } = await supabase.from(table.name).select(table.select).limit(1);
    if (error) {
      hasFailure = true;
      console.log(
        `[supabase-content-check] ${table.name} FAIL code=${error.code || "unknown"} message=${error.message || "Unknown Supabase error"}`,
      );
      continue;
    }
    console.log(
      `[supabase-content-check] ${table.name} OK rows=${Array.isArray(data) ? data.length : 0}`,
    );
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`[supabase-content-check] failed: ${err?.message || err}`);
  process.exit(1);
});
