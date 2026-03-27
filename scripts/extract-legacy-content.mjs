#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const DEFAULT_SQL_PATH = "agyc3416_santos_sa2025.sql";
const DEFAULT_OUT_PATH = "data/posts.json";
const TARGET_TABLES = new Set([
  "blog",
  "news",
  "blogcategory",
  "newscategory",
  "blogcategoryblog",
  "newscategorynews",
]);

const CP1252_EXTENDED_MAP = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function repairMojibake(value) {
  const input = String(value || "");
  if (!/[ÃÄÅÆÐÑØÙÚÛÝÞßŁłŒœŠšŽžƒ…†‡‰‹›–—‘’“”™]/u.test(input)) return input;
  try {
    const bytes = Uint8Array.from(
      [...input].map((char) => {
        const codePoint = char.codePointAt(0);
        if (codePoint == null) return 0x3f;
        if (codePoint <= 0xff) return codePoint;
        return CP1252_EXTENDED_MAP.get(codePoint) ?? 0x3f;
      }),
    );
    const repaired = new TextDecoder("utf-8").decode(bytes);
    if (!repaired || repaired.includes("\uFFFD")) return input;
    return repaired;
  } catch {
    return input;
  }
}

function parseArgs(argv) {
  const args = {
    sqlPath: DEFAULT_SQL_PATH,
    outPath: DEFAULT_OUT_PATH,
    limit: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--sql" && next) {
      args.sqlPath = next;
      i += 1;
      continue;
    }
    if (key === "--out" && next) {
      args.outPath = next;
      i += 1;
      continue;
    }
    if (key === "--limit" && next) {
      const n = Number.parseInt(next, 10);
      args.limit = Number.isFinite(n) && n > 0 ? n : null;
      i += 1;
      continue;
    }
    if (key === "--help" || key === "-h") {
      printHelp(0);
    }
    throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function printHelp(code) {
  console.log(
    [
      "Extract merged legacy blog+news content from SQL dump",
      "",
      "Usage: node scripts/extract-legacy-content.mjs [options]",
      "",
      "Options:",
      "  --sql <path>   SQL dump path (default agyc3416_santos_sa2025.sql)",
      "  --out <path>   Output json path (default data/posts.json)",
      "  --limit <n>    Limit number of merged posts",
    ].join("\n"),
  );
  process.exit(code);
}

function decodeSqlString(input) {
  return repairMojibake(
    input
    .replace(/\\0/g, "\0")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\Z/g, "\u001A")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\"),
  );
}

function decodeSqlValue(rawValue) {
  const value = rawValue.trim();
  if (/^null$/i.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    return decodeSqlString(value.slice(1, -1));
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

function splitTupleFields(tupleBody) {
  const fields = [];
  let inString = false;
  let escaped = false;
  let start = 0;
  for (let i = 0; i < tupleBody.length; i += 1) {
    const ch = tupleBody[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === ",") {
      fields.push(tupleBody.slice(start, i));
      start = i + 1;
    }
  }
  fields.push(tupleBody.slice(start));
  return fields;
}

function extractTuples(valuesRaw) {
  const tuples = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < valuesRaw.length; i += 1) {
    const ch = valuesRaw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        tuples.push(valuesRaw.slice(start, i));
        start = -1;
      }
    }
  }
  return tuples;
}

function parseInsertStatement(statement) {
  const match = statement.match(/^INSERT INTO\s+`([^`]+)`\s+\(([\s\S]*?)\)\s+VALUES\s+([\s\S]+);$/i);
  if (!match) return null;
  const table = match[1];
  if (!TARGET_TABLES.has(table)) return null;
  const columns = match[2]
    .split(",")
    .map((col) => col.replace(/`/g, "").trim())
    .filter(Boolean);
  const tuples = extractTuples(match[3]);
  const rows = tuples.map((tuple) => {
    const fields = splitTupleFields(tuple);
    const row = {};
    for (let i = 0; i < columns.length; i += 1) {
      row[columns[i]] = decodeSqlValue(fields[i] ?? "NULL");
    }
    return row;
  });
  return { table, rows };
}

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

function uniqueSlug(base, taken) {
  const safe = base || "post";
  if (!taken.has(safe)) {
    taken.add(safe);
    return safe;
  }
  let idx = 2;
  while (taken.has(`${safe}-${idx}`)) idx += 1;
  const final = `${safe}-${idx}`;
  taken.add(final);
  return final;
}

function mapLegacyPost(row, type, slugSet) {
  const title = String(row.title || "").trim() || `${type} ${row.id}`;
  const slug = uniqueSlug(slugify(title) || `${type}-${row.id}`, slugSet);
  const addDate = row.adddate ? new Date(String(row.adddate)).toISOString() : null;
  const changeDate = row.changedate ? new Date(String(row.changedate)).toISOString() : null;
  const thumb = row.thumb ? String(row.thumb).trim() : "";
  const cleanThumb = thumb.replace(/^\/+/, "");
  const coverImage = thumb
    ? /^https?:\/\//i.test(cleanThumb)
      ? cleanThumb
      : cleanThumb.startsWith("fajlovi/")
        ? `https://santos.rs/${cleanThumb}`
        : `https://santos.rs/fajlovi/blog/${cleanThumb}`
    : null;
  const excerptKey = type === "blog" ? "shortblog" : "shortnews";
  return {
    id: `${type}_${row.id}`,
    slug,
    title,
    excerpt: row[excerptKey] ? String(row[excerptKey]) : null,
    bodyHtml: row.body ? String(row.body) : null,
    coverImage,
    postType: type,
    sourceLegacyId: Number(row.id || 0),
    sourceTable: type,
    isPublished: String(row.status || "v").toLowerCase() !== "n",
    publishedAt: addDate,
    createdAt: addDate || new Date().toISOString(),
    updatedAt: changeDate || addDate || new Date().toISOString(),
    rawPayload: row,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sqlPath = path.resolve(process.cwd(), args.sqlPath);
  const outPath = path.resolve(process.cwd(), args.outPath);

  const stream = fs.createReadStream(sqlPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let statement = "";
  const tables = new Map();

  for await (const line of rl) {
    if (!line) continue;
    if (!statement && !line.startsWith("INSERT INTO")) continue;
    statement += `${line}\n`;
    if (!line.trim().endsWith(";")) continue;
    const parsed = parseInsertStatement(statement.trim());
    statement = "";
    if (!parsed) continue;
    const list = tables.get(parsed.table) || [];
    list.push(...parsed.rows);
    tables.set(parsed.table, list);
  }

  const blogRows = tables.get("blog") || [];
  const newsRows = tables.get("news") || [];
  const slugSet = new Set();
  let posts = [
    ...blogRows.map((row) => mapLegacyPost(row, "blog", slugSet)),
    ...newsRows.map((row) => mapLegacyPost(row, "news", slugSet)),
  ];

  posts.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
  if (args.limit) posts = posts.slice(0, args.limit);

  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  await fsp.writeFile(outPath, JSON.stringify(posts, null, 2));
  console.log(`[legacy-content] extracted posts=${posts.length} to ${path.relative(process.cwd(), outPath)}`);
}

main().catch((error) => {
  console.error(`[legacy-content] failed: ${error?.message || error}`);
  process.exit(1);
});
