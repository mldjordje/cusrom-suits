import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { getServiceSupabase } from "@/lib/supabase/server";
import { toLegacyCsv } from "@/lib/integrations/core/csv";
import { addSyncRunItem, saveOutboundArtifact } from "@/lib/integrations/core/store";
import type { IntegrationContext, SyncCounters } from "@/lib/integrations/core/types";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";

type RunOutboundOptions = {
  context: IntegrationContext;
};

type OrderRow = {
  id: string;
  created_at?: string;
  status?: string;
  price?: number;
  contact?: Record<string, unknown> | null;
};

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSupabase>>;
type LegacyOutboundTable =
  | "b2c_document"
  | "b2c_documentdetail"
  | "b2c_documentitem"
  | "b2b_document"
  | "b2b_documentdetail"
  | "b2b_documentitem";

type LegacyFilter = {
  column: string;
  value: string;
};

type LegacyExportConfig = {
  fileName: string;
  table: LegacyOutboundTable;
  columns: readonly string[];
  filters: readonly LegacyFilter[];
  siteDataKey: string;
};

type LegacyRow = Record<string, unknown>;

type OutboundFileEntry = {
  fileName: string;
  rows: (string | number)[][] | null;
  source: "supabase" | "snapshot" | "orders_fallback" | "failed";
  cutoffIso: string | null;
  error?: string;
};

const OUTPUT_DIR = "public/integrations";
const FALLBACK_PATH = "data/orders.json";
const LEGACY_OUTBOUND_SNAPSHOT_DIR = "data/integrations/legacy-outbound";
const DEFAULT_LOOKBACK_DAYS = 1;
const PAGE_SIZE = 1000;

const LEGACY_TABLE_COLUMNS: Record<LegacyOutboundTable, readonly string[]> = {
  b2c_document: [
    "id",
    "documentid",
    "number",
    "documenttype",
    "documentcurrency",
    "documentdate",
    "valutedate",
    "admitiondocumentdate",
    "comment",
    "description",
    "partnerid",
    "partneraddressid",
    "status",
    "docreturn",
    "direction",
    "warehouseid",
    "payment",
    "bankstatus",
    "couponid",
    "usedcouponid",
    "deliverycode",
    "origin",
    "b2c_reservationid",
    "b2c_webreservationid",
    "b2c_relateddocumentid",
    "timerstart",
    "userid",
    "lastmodified_userid",
    "ts",
  ],
  b2c_documentdetail: [
    "b2c_documentid",
    "additionalcomment",
    "customername",
    "customerlastname",
    "customeremail",
    "customerphone",
    "customeraddress",
    "customercity",
    "customerzip",
    "recipientname",
    "recipientlastname",
    "recipientphone",
    "recipientaddress",
    "recipientcity",
    "recipientzip",
    "deliverytype",
    "deliveryshopid",
    "deliveryserviceid",
    "deliverycost",
    "ts",
  ],
  b2c_documentitem: [
    "id",
    "documentitemid",
    "rebate",
    "rebatetype",
    "b2c_documentid",
    "price",
    "price2",
    "itemvalue",
    "productid",
    "productname",
    "productattrstring",
    "quantity",
    "sort",
    "taxvalue",
    "taxid",
    "ts",
  ],
  b2b_document: [
    "id",
    "documentid",
    "number",
    "documenttype",
    "documentcurrency",
    "documentdate",
    "valutedate",
    "admitiondocumentdate",
    "comment",
    "description",
    "partnerid",
    "partneraddressid",
    "status",
    "docreturn",
    "direction",
    "warehouseid",
    "payment",
    "bankstatus",
    "couponid",
    "usedcouponid",
    "deliverycode",
    "origin",
    "b2b_reservationid",
    "b2b_webreservationid",
    "b2b_relateddocumentid",
    "timerstart",
    "userid",
    "lastmodified_userid",
    "ts",
  ],
  b2b_documentdetail: [
    "b2b_documentid",
    "additionalcomment",
    "customername",
    "customerlastname",
    "customeremail",
    "customerphone",
    "customeraddress",
    "customercity",
    "customerzip",
    "recipientname",
    "recipientlastname",
    "recipientphone",
    "recipientaddress",
    "recipientcity",
    "recipientzip",
    "deliverytype",
    "deliveryshopid",
    "deliveryserviceid",
    "ts",
  ],
  b2b_documentitem: [
    "id",
    "documentitemid",
    "rebate",
    "rebatetype",
    "b2b_documentid",
    "price",
    "price2",
    "itemvalue",
    "productid",
    "productname",
    "productattrstring",
    "quantity",
    "sort",
    "taxvalue",
    "taxid",
    "documentid",
    "ts",
  ],
};

const LEGACY_EXPORT_CONFIGS: readonly LegacyExportConfig[] = [
  {
    fileName: "b2c_webdocumentdetail.csv",
    table: "b2c_documentdetail",
    columns: LEGACY_TABLE_COLUMNS.b2c_documentdetail,
    filters: [],
    siteDataKey: "b2c_documentdetail_ls",
  },
  {
    fileName: "b2c_webdocumentitem.csv",
    table: "b2c_documentitem",
    columns: LEGACY_TABLE_COLUMNS.b2c_documentitem,
    filters: [],
    siteDataKey: "b2c_documentitem_ls",
  },
  {
    fileName: "b2c_webdocument.csv",
    table: "b2c_document",
    columns: LEGACY_TABLE_COLUMNS.b2c_document,
    filters: [
      { column: "documenttype", value: "E" },
      { column: "status", value: "o" },
    ],
    siteDataKey: "b2c_document_ls",
  },
  {
    fileName: "b2b_webdocumentdetail.csv",
    table: "b2b_documentdetail",
    columns: LEGACY_TABLE_COLUMNS.b2b_documentdetail,
    filters: [],
    siteDataKey: "b2b_documentdetail_ls",
  },
  {
    fileName: "b2b_webdocumentitem.csv",
    table: "b2b_documentitem",
    columns: LEGACY_TABLE_COLUMNS.b2b_documentitem,
    filters: [],
    siteDataKey: "b2b_documentitem_ls",
  },
  {
    fileName: "b2b_webdocument.csv",
    table: "b2b_document",
    columns: LEGACY_TABLE_COLUMNS.b2b_document,
    filters: [
      { column: "documenttype", value: "E" },
      { column: "status", value: "n" },
    ],
    siteDataKey: "b2b_document_ls",
  },
];

const ensureOutputDir = async () => {
  const full = path.join(process.cwd(), OUTPUT_DIR);
  await fs.mkdir(full, { recursive: true });
  return full;
};

const isTruthy = (value: string | undefined | null) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const getOutboundSourceMode = () => {
  const mode = String(process.env.STOCK_OUTBOUND_SOURCE_MODE || "legacy_tables")
    .trim()
    .toLowerCase();
  return mode === "orders_fallback" ? "orders_fallback" : "legacy_tables";
};

const getLookbackDays = () => {
  const parsed = Number(process.env.STOCK_OUTBOUND_LOOKBACK_DAYS ?? DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LOOKBACK_DAYS;
  return parsed;
};

const getDefaultCutoffIso = (lookbackDays: number) => {
  const ms = Math.floor(lookbackDays * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - ms).toISOString();
};

const toCutoffIso = (
  context: IntegrationContext,
  siteDataKey: string,
  siteDataMap: Map<string, Date>,
  lookbackDays: number,
) => {
  if (context.mode === "full") return null;
  const marker = siteDataMap.get(siteDataKey);
  if (!marker) return getDefaultCutoffIso(lookbackDays);
  const ms = Math.floor(lookbackDays * 24 * 60 * 60 * 1000);
  return new Date(marker.getTime() - ms).toISOString();
};

const normalizeCsvValue = (value: unknown): string | number => {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return "";
    return value.toISOString().replace("T", " ").slice(0, 19);
  }
  return String(value);
};

const toCsvRows = (rows: LegacyRow[], columns: readonly string[]): (string | number)[][] =>
  rows.map((row) => columns.map((column) => normalizeCsvValue(row[column])));

const snapshotPathForTable = (table: LegacyOutboundTable) =>
  path.join(process.cwd(), LEGACY_OUTBOUND_SNAPSHOT_DIR, `${table}.json`);

const applyRowFilters = (
  rows: LegacyRow[],
  filters: readonly LegacyFilter[],
  cutoffIso: string | null,
): LegacyRow[] => {
  const cutoffMs = cutoffIso ? new Date(cutoffIso).getTime() : null;

  return rows.filter((row) => {
    for (const filter of filters) {
      if (String(row[filter.column] ?? "") !== filter.value) return false;
    }

    if (cutoffMs != null) {
      const rawTs = row.ts;
      const tsMs = new Date(String(rawTs ?? "")).getTime();
      if (!Number.isFinite(tsMs) || tsMs <= cutoffMs) return false;
    }
    return true;
  });
};

const readSnapshotRows = async (
  table: LegacyOutboundTable,
  filters: readonly LegacyFilter[],
  cutoffIso: string | null,
): Promise<LegacyRow[] | null> => {
  const fullPath = snapshotPathForTable(table);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Snapshot for '${table}' is not a JSON array.`);
    }
    return applyRowFilters(parsed as LegacyRow[], filters, cutoffIso);
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Failed to read outbound snapshot '${fullPath}': ${error?.message || String(error)}`);
  }
};

const fetchSiteDataMap = async (
  supabase: ServiceSupabase | null,
  keys: string[],
): Promise<Map<string, Date>> => {
  const map = new Map<string, Date>();
  if (!supabase || keys.length === 0) return map;

  const { data, error } = await supabase.from("site_data").select("name,value").in("name", keys);
  if (error) {
    console.warn(`[stock_outbound] site_data lookup skipped: ${error.message}`);
    return map;
  }

  for (const row of data || []) {
    const key = String((row as Record<string, unknown>).name || "").trim();
    const value = String((row as Record<string, unknown>).value || "").trim();
    const parsed = new Date(value);
    if (!key || !Number.isFinite(parsed.getTime())) continue;
    map.set(key, parsed);
  }
  return map;
};

const fetchSupabaseRows = async (
  supabase: ServiceSupabase,
  config: LegacyExportConfig,
  cutoffIso: string | null,
): Promise<LegacyRow[]> => {
  const result: LegacyRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from(config.table)
      .select(config.columns.join(","))
      .range(from, to)
      .order(config.columns[0], { ascending: true });

    for (const filter of config.filters) {
      query = query.eq(filter.column, filter.value);
    }

    if (cutoffIso) {
      query = query.gt("ts", cutoffIso);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase query failed for '${config.table}': ${error.message}`);
    }

    const batch = Array.isArray(data) ? (data as unknown as LegacyRow[]) : [];
    result.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return result;
};

const loadLegacyRows = async (
  supabase: ServiceSupabase | null,
  config: LegacyExportConfig,
  cutoffIso: string | null,
): Promise<{ rows: LegacyRow[]; source: "supabase" | "snapshot" }> => {
  if (supabase) {
    try {
      const rows = await fetchSupabaseRows(supabase, config, cutoffIso);
      return { rows, source: "supabase" };
    } catch (supabaseError: any) {
      const snapshot = await readSnapshotRows(config.table, config.filters, cutoffIso);
      if (snapshot !== null) return { rows: snapshot, source: "snapshot" };
      throw new Error(supabaseError?.message || "Legacy Supabase source read failed.");
    }
  }

  const snapshot = await readSnapshotRows(config.table, config.filters, cutoffIso);
  if (snapshot !== null) return { rows: snapshot, source: "snapshot" };

  throw new Error(
    `Legacy outbound source unavailable for '${config.table}'. ` +
      `Configure Supabase legacy tables or provide ${LEGACY_OUTBOUND_SNAPSHOT_DIR}/${config.table}.json.`,
  );
};

const buildLegacyFileEntries = async (
  context: IntegrationContext,
  supabase: ServiceSupabase | null,
): Promise<OutboundFileEntry[]> => {
  const lookbackDays = getLookbackDays();
  const siteDataMap = await fetchSiteDataMap(
    supabase,
    LEGACY_EXPORT_CONFIGS.map((entry) => entry.siteDataKey),
  );

  const files: OutboundFileEntry[] = [];
  for (const config of LEGACY_EXPORT_CONFIGS) {
    const cutoffIso = toCutoffIso(context, config.siteDataKey, siteDataMap, lookbackDays);
    try {
      const loaded = await loadLegacyRows(supabase, config, cutoffIso);
      files.push({
        fileName: config.fileName,
        rows: toCsvRows(loaded.rows, config.columns),
        source: loaded.source,
        cutoffIso,
      });
    } catch (error: any) {
      files.push({
        fileName: config.fileName,
        rows: null,
        source: "failed",
        cutoffIso,
        error: error?.message || "Failed to load legacy outbound rows.",
      });
    }
  }
  return files;
};

const toB2CDocumentRows = (orders: OrderRow[][]) => {
  const rows: (string | number)[][] = [];
  let seq = 1;
  for (const bucket of orders) {
    for (const order of bucket) {
      rows.push([
        seq,
        seq,
        "",
        "RSD",
        order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : "",
        order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : "",
        `Order ${order.id}`,
        0,
        "RSD",
        `WS-${String(order.id).slice(0, 8)}`,
        0,
        String(order.status || "n"),
      ]);
      seq += 1;
    }
  }
  return rows;
};

const toB2CDocumentDetailRows = (orders: OrderRow[][]) => {
  const rows: (string | number)[][] = [];
  let seq = 1;
  for (const bucket of orders) {
    for (const order of bucket) {
      const contact = order.contact || {};
      rows.push([
        seq,
        String(contact?.ime || contact?.name || ""),
        String(contact?.prezime || contact?.surname || ""),
        String(contact?.email || ""),
        String(contact?.telefon || contact?.phone || ""),
        String(contact?.adresa || contact?.address || ""),
        String(contact?.grad || contact?.city || ""),
        String(contact?.postanskiBroj || contact?.zip || ""),
      ]);
      seq += 1;
    }
  }
  return rows;
};

const toB2CDocumentItemRows = (orders: OrderRow[][]) => {
  const rows: (string | number)[][] = [];
  let seq = 1;
  for (const bucket of orders) {
    for (const order of bucket) {
      rows.push([
        seq,
        seq,
        Number(order.price || 0),
        Number(order.price || 0),
        1,
        String(order.id),
        Number(order.price || 0),
      ]);
      seq += 1;
    }
  }
  return rows;
};

const readOrdersBuckets = async () => {
  const orders = await readJsonFile<OrderRow[]>(FALLBACK_PATH, []);
  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 1000);
  const b2c = recent.filter((order) => (order.status || "").toLowerCase() !== "b2b");
  const b2b = recent.filter((order) => (order.status || "").toLowerCase() === "b2b");
  return { b2c, b2b };
};

const writeFile = async (fullPath: string, content: string) => {
  await fs.writeFile(fullPath, content, "utf8");
  return fullPath;
};

const buildOrdersFallbackEntries = async (): Promise<OutboundFileEntry[]> => {
  const { b2c, b2b } = await readOrdersBuckets();
  return [
    { fileName: "b2c_webdocumentdetail.csv", rows: toB2CDocumentDetailRows([b2c]), source: "orders_fallback", cutoffIso: null },
    { fileName: "b2c_webdocumentitem.csv", rows: toB2CDocumentItemRows([b2c]), source: "orders_fallback", cutoffIso: null },
    { fileName: "b2c_webdocument.csv", rows: toB2CDocumentRows([b2c]), source: "orders_fallback", cutoffIso: null },
    { fileName: "b2b_webdocumentdetail.csv", rows: toB2CDocumentDetailRows([b2b]), source: "orders_fallback", cutoffIso: null },
    { fileName: "b2b_webdocumentitem.csv", rows: toB2CDocumentItemRows([b2b]), source: "orders_fallback", cutoffIso: null },
    { fileName: "b2b_webdocument.csv", rows: toB2CDocumentRows([b2b]), source: "orders_fallback", cutoffIso: null },
  ];
};

export async function runStockOutboundSync({ context }: RunOutboundOptions) {
  const counters: SyncCounters = { total: 0, success: 0, failed: 0, skipped: 0 };
  const meta: Record<string, unknown> = {};
  const outputDir = await ensureOutputDir();
  const sourceMode = getOutboundSourceMode();
  const allowOrdersFallback = isTruthy(process.env.STOCK_OUTBOUND_ALLOW_ORDERS_FALLBACK);
  const supabase = getServiceSupabase();

  let files: OutboundFileEntry[] =
    sourceMode === "orders_fallback" ? await buildOrdersFallbackEntries() : await buildLegacyFileEntries(context, supabase);

  if (sourceMode === "legacy_tables") {
    const legacySuccess = files.filter((file) => file.source !== "failed" && Array.isArray(file.rows)).length;
    if (legacySuccess === 0 && allowOrdersFallback) {
      files = await buildOrdersFallbackEntries();
      await addSyncRunItem(context.runId, {
        domain: "stock_outbound",
        entityType: "source",
        entityId: "orders_fallback",
        status: "skipped",
        message:
          "Legacy outbound source returned no usable files. STOCK_OUTBOUND_ALLOW_ORDERS_FALLBACK is enabled, switching to orders fallback.",
        payloadHash: null,
        payload: { sourceMode },
        response: null,
      });
      meta.fallbackUsed = true;
    }
  }

  counters.total = files.length;
  meta.sourceMode = sourceMode;
  meta.lookbackDays = getLookbackDays();

  const zip = new AdmZip();
  const fileMeta: Record<string, unknown> = {};

  for (const file of files) {
    if (!file.rows) {
      counters.failed += 1;
      fileMeta[file.fileName] = {
        source: file.source,
        rowCount: 0,
        cutoffIso: file.cutoffIso,
        error: file.error || "Outbound source unavailable.",
      };
      await addSyncRunItem(context.runId, {
        domain: "stock_outbound",
        entityType: "file",
        entityId: file.fileName,
        status: "failed",
        message: file.error || "Failed to load outbound rows.",
        payloadHash: null,
        payload: {
          source: file.source,
          cutoffIso: file.cutoffIso,
        },
        response: null,
      });
      continue;
    }

    try {
      const csv = toLegacyCsv(file.rows);
      const fullPath = path.join(outputDir, file.fileName);
      await writeFile(fullPath, csv);
      zip.addFile(file.fileName, Buffer.from(csv, "utf8"));
      counters.success += 1;
      fileMeta[file.fileName] = {
        source: file.source,
        rowCount: file.rows.length,
        cutoffIso: file.cutoffIso,
        error: null,
      };
      await addSyncRunItem(context.runId, {
        domain: "stock_outbound",
        entityType: "file",
        entityId: file.fileName,
        status: "success",
        message: `Generated ${file.rows.length} rows.`,
        payloadHash: crypto.createHash("sha256").update(csv).digest("hex"),
        payload: {
          rowCount: file.rows.length,
          source: file.source,
          cutoffIso: file.cutoffIso,
        },
        response: null,
      });
    } catch (error: any) {
      counters.failed += 1;
      fileMeta[file.fileName] = {
        source: file.source,
        rowCount: file.rows.length,
        cutoffIso: file.cutoffIso,
        error: error?.message || "Failed to generate csv file.",
      };
      await addSyncRunItem(context.runId, {
        domain: "stock_outbound",
        entityType: "file",
        entityId: file.fileName,
        status: "failed",
        message: error?.message || "Failed to generate csv file.",
        payloadHash: null,
        payload: null,
        response: null,
      });
    }
  }

  if (counters.success === 0) {
    throw new Error("No outbound CSV files were generated.");
  }

  const zipPath = path.join(outputDir, "webchanges.zip");
  const zipBuffer = zip.toBuffer();
  await fs.writeFile(zipPath, zipBuffer);
  const md5 = crypto.createHash("md5").update(zipBuffer).digest("hex");
  const md5Path = path.join(outputDir, "webchanges.md5");
  await fs.writeFile(md5Path, md5, "utf8");

  await saveOutboundArtifact({
    runId: context.runId,
    fileName: "webchanges.zip",
    md5,
    path: "/integrations/webchanges.zip",
  });

  meta.files = counters.success;
  meta.totalFiles = files.length;
  meta.md5 = md5;
  meta.zipPath = "/integrations/webchanges.zip";
  meta.fileSources = fileMeta;
  await writeJsonFile("data/integrations/stock-outbound-latest.json", {
    runId: context.runId,
    md5,
    zipPath: "/integrations/webchanges.zip",
    md5Path: "/integrations/webchanges.md5",
    sourceMode: meta.sourceMode,
    fileSources: fileMeta,
    generatedAt: new Date().toISOString(),
  });

  return { counters, meta };
}
