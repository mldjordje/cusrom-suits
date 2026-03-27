#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_INPUT_PATH = "data/posts.json";

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT_PATH,
    batchSize: 100,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--input" && next) {
      args.inputPath = next;
      i += 1;
      continue;
    }
    if (key === "--batch-size" && next) {
      const parsed = Number.parseInt(next, 10);
      args.batchSize = Number.isFinite(parsed) && parsed > 0 ? parsed : args.batchSize;
      i += 1;
      continue;
    }
    if (key === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (key === "--help" || key === "-h") {
      printHelpAndExit(0);
    }
    throw new Error(`Unknown argument: ${key}`);
  }

  return args;
}

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

function printHelpAndExit(code) {
  console.log(
    [
      "Import legacy content JSON to Supabase",
      "",
      "Usage:",
      "  node scripts/import-legacy-content-to-supabase.mjs [options]",
      "",
      "Options:",
      "  --input <path>           Input JSON (default data/posts.json)",
      "  --batch-size <n>         Upsert batch size (default 100)",
      "  --dry-run                Validate and print stats without DB writes",
      "",
      "Required env:",
      "  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
      "  SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  );
  process.exit(code);
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function describeSupabaseProject(url) {
  try {
    const host = new URL(url).host;
    return {
      host,
      projectRef: host.split(".")[0] || host,
    };
  } catch {
    return {
      host: url,
      projectRef: url,
    };
  }
}

async function assertContentSchemaAvailable(supabase, supabaseUrl) {
  const checks = [
    { table: "content_posts", select: "id" },
    { table: "content_post_categories", select: "id" },
    { table: "content_post_category_links", select: "post_id,category_id" },
  ];
  const failures = [];

  for (const check of checks) {
    const { error } = await supabase.from(check.table).select(check.select).limit(1);
    if (error) {
      failures.push({
        table: check.table,
        code: error.code || null,
        message: error.message || "Unknown Supabase error",
      });
    }
  }

  if (failures.length === 0) return;

  const project = describeSupabaseProject(supabaseUrl);
  const details = failures.map((item) => `${item.table}: ${item.code || "unknown"} ${item.message}`);
  throw new Error(
    [
      `Supabase content schema is not available in project ${project.projectRef} (${project.host}).`,
      "Run supabase/sql/content_schema.sql in that exact project and wait for the REST schema cache to refresh.",
      ...details,
    ].join(" "),
  );
}

function mapContentRow(item) {
  return {
    slug: String(item.slug || "").trim(),
    title: String(item.title || "").trim() || "Legacy post",
    excerpt: item.excerpt ? String(item.excerpt) : null,
    body_html: item.bodyHtml ? String(item.bodyHtml) : null,
    cover_image: item.coverImage ? String(item.coverImage) : null,
    post_type: item.postType === "news" ? "news" : "blog",
    source_legacy_id:
      item.sourceLegacyId == null || Number.isNaN(Number(item.sourceLegacyId))
        ? null
        : Number(item.sourceLegacyId),
    source_table: item.sourceTable ? String(item.sourceTable) : null,
    is_published: item.isPublished !== false,
    published_at: item.publishedAt || null,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
    raw_payload: item.rawPayload && typeof item.rawPayload === "object" ? item.rawPayload : {},
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadLocalEnvFiles();

  const inputPath = path.resolve(process.cwd(), args.inputPath);
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Input JSON must be an array");
  }

  const rows = parsed
    .map(mapContentRow)
    .filter((item) => item.slug.length > 0 && item.title.length > 0);

  if (args.dryRun) {
    console.log(
      `[legacy-content-import] dry-run posts=${rows.length} input=${path.relative(process.cwd(), inputPath)}`,
    );
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase env. Required NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  await assertContentSchemaAvailable(supabase, supabaseUrl);
  const batches = chunkArray(rows, args.batchSize);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase
      .from("content_posts")
      .upsert(batch, { onConflict: "slug", ignoreDuplicates: false });
    if (error) {
      throw new Error(`content_posts batch ${i + 1} failed: ${error.message}`);
    }
    console.log(`[legacy-content-import] content_posts batch ${i + 1}/${batches.length} ok`);
  }

  console.log(
    `[legacy-content-import] done posts=${rows.length} input=${path.relative(process.cwd(), inputPath)}`,
  );
}

main().catch((err) => {
  console.error(`[legacy-content-import] failed: ${err?.message || err}`);
  process.exit(1);
});
