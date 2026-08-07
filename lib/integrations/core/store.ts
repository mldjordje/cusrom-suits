import { getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import {
  type AddRunItemInput,
  type CompleteRunInput,
  type StartRunInput,
  type SyncEnvironment,
  type SyncRun,
  type SyncRunItem,
} from "@/lib/integrations/core/types";

const RUNS_FILE = "data/integrations/sync-runs.json";
const ITEMS_FILE = "data/integrations/sync-items.json";
const DELTA_STATE_FILE = "data/integrations/delta-state.json";
const RAW_FILE_META = "data/integrations/stock-raw-files.json";
const RAW_FILE_ROWS = "data/integrations/stock-raw-rows.json";
const OUTBOUND_FILE = "data/integrations/stock-outbound-files.json";
const ANANAS_PRODUCT_STATE_FILE = "data/integrations/ananas-product-state.json";
const ANANAS_DISCOUNT_STATE_FILE = "data/integrations/ananas-discount-state.json";

type DeltaState = {
  scope: string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  updatedAt: string;
  sourceRunId: string | null;
};

type RawFileMeta = {
  id: string;
  runId: string;
  fileName: string;
  rowCount: number;
  checksum: string | null;
  createdAt: string;
};

type RawFileRow = {
  id: string;
  rawFileId: string;
  rowIndex: number;
  data: (string | number)[];
};

type OutboundArtifact = {
  id: string;
  runId: string;
  fileName: string;
  md5: string;
  path: string;
  createdAt: string;
};

export type AnanasProductStateRecord = {
  legacyProductId: number;
  /** Listing ids are issued per environment — a stage id is meaningless on production. */
  environment: SyncEnvironment;
  merchantInventoryId: number | null;
  externalId: string | null;
  ananasStatus: string | null;
  /** MERCHANT_WAREHOUSE | ANANAS_WAREHOUSE — stock is only pushed for the former. */
  warehouse: string | null;
  /** Last values reported by Ananas, used to skip no-op price/stock pushes. */
  remoteBasePrice: number | null;
  remoteStockLevel: number | null;
  payloadHash: string | null;
  lastSyncedAt: string | null;
  syncError: string | null;
  updatedAt: string;
};

export type AnanasDiscountStateRecord = {
  id: string;
  legacyProductId: number;
  merchantInventoryId: number;
  discountId: string | null;
  discountType: string;
  discountPrice: number;
  discountPriceCurrency: string;
  dateFrom: string;
  dateTo: string;
  active: boolean;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeCounters = (value?: Partial<SyncRun["counters"]>): SyncRun["counters"] => ({
  total: Number(value?.total || 0),
  success: Number(value?.success || 0),
  failed: Number(value?.failed || 0),
  skipped: Number(value?.skipped || 0),
});

async function withFileStore<T>(fn: (state: { runs: SyncRun[]; items: SyncRunItem[] }) => Promise<T>) {
  const runs = await readJsonFile<SyncRun[]>(RUNS_FILE, []);
  const items = await readJsonFile<SyncRunItem[]>(ITEMS_FILE, []);
  const result = await fn({ runs, items });
  await writeJsonFile(RUNS_FILE, runs);
  await writeJsonFile(ITEMS_FILE, items);
  return result;
}

export async function startSyncRun(input: StartRunInput): Promise<SyncRun> {
  const startedAt = nowIso();
  const run: SyncRun = {
    id: newId(),
    domain: input.domain,
    status: "running",
    environment: input.environment,
    mode: input.mode,
    trigger: input.trigger,
    startedAt,
    finishedAt: null,
    durationMs: null,
    counters: normalizeCounters(),
    summary: null,
    meta: input.meta || {},
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_sync_runs").insert({
      id: run.id,
      domain: run.domain,
      status: run.status,
      environment: run.environment,
      mode: run.mode,
      trigger: run.trigger,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      duration_ms: run.durationMs,
      counters: run.counters,
      summary: run.summary,
      meta: run.meta,
    } as never);
    if (!error) return run;
  }

  return withFileStore(async ({ runs }) => {
    runs.unshift(run);
    return run;
  });
}

export async function completeSyncRun(runId: string, input: CompleteRunInput) {
  const finishedAt = nowIso();
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data: current } = await supabase
      .from("integration_sync_runs")
      .select("started_at,counters,meta")
      .eq("id", runId)
      .maybeSingle();
    const currentRun = current as
      | {
          started_at?: string | null;
          counters?: Partial<SyncRun["counters"]> | null;
          meta?: Record<string, unknown> | null;
        }
      | null;

    const startedAt = currentRun?.started_at ? new Date(currentRun.started_at).getTime() : Date.now();
    const durationMs = Math.max(0, Date.now() - startedAt);
    const nextCounters = normalizeCounters({
      ...(currentRun?.counters || {}),
      ...(input.counters || {}),
    });
    const nextMeta = { ...(currentRun?.meta || {}), ...(input.meta || {}) };
    const { error } = await supabase
      .from("integration_sync_runs")
      .update({
        status: input.status,
        finished_at: finishedAt,
        duration_ms: durationMs,
        counters: nextCounters,
        summary: input.summary || null,
        meta: nextMeta,
      } as never)
      .eq("id", runId);
    if (!error) return;
  }

  await withFileStore(async ({ runs }) => {
    const index = runs.findIndex((run) => run.id === runId);
    if (index < 0) return;
    const current = runs[index];
    const startedAt = new Date(current.startedAt).getTime();
    runs[index] = {
      ...current,
      status: input.status,
      finishedAt,
      durationMs: Math.max(0, Date.now() - startedAt),
      counters: normalizeCounters({ ...current.counters, ...(input.counters || {}) }),
      summary: input.summary || null,
      meta: { ...current.meta, ...(input.meta || {}) },
      updatedAt: finishedAt,
    };
  });
}

export async function addSyncRunItem(runId: string, input: AddRunItemInput): Promise<SyncRunItem> {
  const now = nowIso();
  const item: SyncRunItem = {
    id: newId(),
    runId,
    domain: input.domain,
    entityType: input.entityType,
    entityId: input.entityId,
    status: input.status,
    message: input.message || null,
    payloadHash: input.payloadHash || null,
    payload: input.payload || null,
    response: input.response || null,
    retryOfItemId: input.retryOfItemId || null,
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_sync_items").insert({
      id: item.id,
      run_id: item.runId,
      domain: item.domain,
      entity_type: item.entityType,
      entity_id: item.entityId,
      status: item.status,
      message: item.message,
      payload_hash: item.payloadHash,
      payload: item.payload,
      response: item.response,
      retry_of_item_id: item.retryOfItemId,
    } as never);
    if (!error) return item;
  }

  return withFileStore(async ({ items }) => {
    items.unshift(item);
    return item;
  });
}

export async function listSyncRuns(limit = 50): Promise<SyncRun[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("integration_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        domain: row.domain,
        status: row.status,
        environment: row.environment,
        mode: row.mode,
        trigger: row.trigger,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        durationMs: row.duration_ms,
        counters: normalizeCounters(row.counters),
        summary: row.summary,
        meta: row.meta || {},
        createdAt: row.created_at || row.started_at,
        updatedAt: row.updated_at || row.started_at,
      }));
    }
  }
  const runs = await readJsonFile<SyncRun[]>(RUNS_FILE, []);
  return runs.slice(0, limit);
}

export async function getSyncRunById(runId: string): Promise<{ run: SyncRun | null; items: SyncRunItem[] }> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const [{ data: run }, { data: items }] = await Promise.all([
      supabase.from("integration_sync_runs").select("*").eq("id", runId).maybeSingle(),
      supabase
        .from("integration_sync_items")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (run) {
      const runRow = run as Record<string, any>;
      const itemRows = (items || []) as Array<Record<string, any>>;
      return {
        run: {
          id: runRow.id,
          domain: runRow.domain,
          status: runRow.status,
          environment: runRow.environment,
          mode: runRow.mode,
          trigger: runRow.trigger,
          startedAt: runRow.started_at,
          finishedAt: runRow.finished_at,
          durationMs: runRow.duration_ms,
          counters: normalizeCounters(runRow.counters),
          summary: runRow.summary,
          meta: runRow.meta || {},
          createdAt: runRow.created_at || runRow.started_at,
          updatedAt: runRow.updated_at || runRow.started_at,
        },
        items:
          itemRows.map((item: any) => ({
            id: item.id,
            runId: item.run_id,
            domain: item.domain,
            entityType: item.entity_type,
            entityId: item.entity_id,
            status: item.status,
            message: item.message,
            payloadHash: item.payload_hash,
            payload: item.payload,
            response: item.response,
            retryOfItemId: item.retry_of_item_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          })) || [],
      };
    }
  }

  const [runs, items] = await Promise.all([
    readJsonFile<SyncRun[]>(RUNS_FILE, []),
    readJsonFile<SyncRunItem[]>(ITEMS_FILE, []),
  ]);
  const run = runs.find((entry) => entry.id === runId) || null;
  const runItems = items.filter((entry) => entry.runId === runId);
  return { run, items: runItems };
}

export async function getFailedRunItems(runId: string) {
  const { items } = await getSyncRunById(runId);
  return items.filter((item) => item.status === "failed");
}

export async function setDeltaState(
  scope: string,
  entityType: string,
  entityId: string,
  payloadHash: string,
  sourceRunId: string | null,
) {
  const updatedAt = nowIso();
  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_stock_delta_state").upsert(
      {
        scope,
        entity_type: entityType,
        entity_id: entityId,
        payload_hash: payloadHash,
        updated_at: updatedAt,
        source_run_id: sourceRunId,
      } as never,
      { onConflict: "scope,entity_type,entity_id" },
    );
    if (!error) return;
  }

  const states = await readJsonFile<DeltaState[]>(DELTA_STATE_FILE, []);
  const idx = states.findIndex(
    (entry) => entry.scope === scope && entry.entityType === entityType && entry.entityId === entityId,
  );
  const next: DeltaState = { scope, entityType, entityId, payloadHash, updatedAt, sourceRunId };
  if (idx >= 0) states[idx] = next;
  else states.push(next);
  await writeJsonFile(DELTA_STATE_FILE, states);
}

export async function getDeltaHash(scope: string, entityType: string, entityId: string) {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("integration_stock_delta_state")
      .select("payload_hash")
      .eq("scope", scope)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    const deltaRow = data as { payload_hash?: string | null } | null;
    if (deltaRow?.payload_hash) return String(deltaRow.payload_hash);
  }

  const states = await readJsonFile<DeltaState[]>(DELTA_STATE_FILE, []);
  return (
    states.find(
      (entry) => entry.scope === scope && entry.entityType === entityType && entry.entityId === entityId,
    )?.payloadHash || null
  );
}

export async function saveRawStockFile(meta: Omit<RawFileMeta, "id" | "createdAt">) {
  const record: RawFileMeta = {
    id: newId(),
    runId: meta.runId,
    fileName: meta.fileName,
    rowCount: meta.rowCount,
    checksum: meta.checksum,
    createdAt: nowIso(),
  };

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_stock_raw_files").insert({
      id: record.id,
      run_id: record.runId,
      file_name: record.fileName,
      row_count: record.rowCount,
      checksum: record.checksum,
      created_at: record.createdAt,
    } as never);
    if (!error) return record;
  }
  const list = await readJsonFile<RawFileMeta[]>(RAW_FILE_META, []);
  list.unshift(record);
  await writeJsonFile(RAW_FILE_META, list);
  return record;
}

export async function saveRawStockRows(rawFileId: string, rows: (string | number)[][]) {
  if (!rows.length) return;
  const payload: RawFileRow[] = rows.map((row, index) => ({
    id: newId(),
    rawFileId,
    rowIndex: index,
    data: row,
  }));

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_stock_raw_rows").insert(
      payload.map((row) => ({
        id: row.id,
        raw_file_id: row.rawFileId,
        row_index: row.rowIndex,
        data: row.data,
      })) as never,
    );
    if (!error) return;
  }

  const list = await readJsonFile<RawFileRow[]>(RAW_FILE_ROWS, []);
  list.unshift(...payload);
  await writeJsonFile(RAW_FILE_ROWS, list.slice(0, 50000));
}

export async function saveOutboundArtifact(record: Omit<OutboundArtifact, "id" | "createdAt">) {
  const row: OutboundArtifact = {
    id: newId(),
    runId: record.runId,
    fileName: record.fileName,
    md5: record.md5,
    path: record.path,
    createdAt: nowIso(),
  };
  const list = await readJsonFile<OutboundArtifact[]>(OUTBOUND_FILE, []);
  list.unshift(row);
  await writeJsonFile(OUTBOUND_FILE, list.slice(0, 500));
}

const normalizeAnanasDate = (value: string) => {
  const trimmed = String(value || "").trim();
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (yyyymmdd) return trimmed;
  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10);
  }
  return trimmed;
};

const mapAnanasProductStateRow = (row: Record<string, any>): AnanasProductStateRecord => ({
  legacyProductId: Number(row.legacy_product_id),
  environment: row.environment === "stage" ? "stage" : "production",
  merchantInventoryId: row.merchant_inventory_id == null ? null : Number(row.merchant_inventory_id),
  externalId: row.external_id == null ? null : String(row.external_id),
  ananasStatus: row.ananas_status == null ? null : String(row.ananas_status),
  warehouse: row.warehouse == null ? null : String(row.warehouse),
  remoteBasePrice: row.remote_base_price == null ? null : Number(row.remote_base_price),
  remoteStockLevel: row.remote_stock_level == null ? null : Number(row.remote_stock_level),
  payloadHash: row.payload_hash == null ? null : String(row.payload_hash),
  lastSyncedAt: row.last_synced_at || null,
  syncError: row.sync_error == null ? null : String(row.sync_error),
  updatedAt: row.updated_at || nowIso(),
});

export async function upsertAnanasProductState(input: {
  legacyProductId: number;
  /** Defaults to production only so older call sites keep their meaning. */
  environment?: SyncEnvironment;
  merchantInventoryId?: number | null;
  externalId?: string | number | null;
  ananasStatus?: string | null;
  warehouse?: string | null;
  remoteBasePrice?: number | null;
  remoteStockLevel?: number | null;
  payloadHash?: string | null;
  lastSyncedAt?: string | null;
  syncError?: string | null;
}) {
  const now = nowIso();
  const row: AnanasProductStateRecord = {
    legacyProductId: Number(input.legacyProductId),
    environment: input.environment === "stage" ? "stage" : "production",
    merchantInventoryId:
      input.merchantInventoryId == null ? null : Number(input.merchantInventoryId || 0) || null,
    externalId:
      input.externalId == null || input.externalId === ""
        ? null
        : String(input.externalId),
    ananasStatus: input.ananasStatus == null ? null : String(input.ananasStatus),
    warehouse: input.warehouse == null ? null : String(input.warehouse),
    remoteBasePrice: input.remoteBasePrice == null ? null : Number(input.remoteBasePrice),
    remoteStockLevel: input.remoteStockLevel == null ? null : Number(input.remoteStockLevel),
    payloadHash: input.payloadHash == null ? null : String(input.payloadHash),
    lastSyncedAt: input.lastSyncedAt || now,
    syncError: input.syncError == null ? null : String(input.syncError),
    updatedAt: now,
  };

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_ananas_product_state").upsert(
      {
        legacy_product_id: row.legacyProductId,
        environment: row.environment,
        merchant_inventory_id: row.merchantInventoryId,
        external_id: row.externalId,
        ananas_status: row.ananasStatus,
        warehouse: row.warehouse,
        remote_base_price: row.remoteBasePrice,
        remote_stock_level: row.remoteStockLevel,
        payload_hash: row.payloadHash,
        last_synced_at: row.lastSyncedAt,
        sync_error: row.syncError,
        updated_at: row.updatedAt,
      } as never,
      { onConflict: "legacy_product_id,environment" },
    );
    if (!error) return;
  }

  const list = await readJsonFile<AnanasProductStateRecord[]>(ANANAS_PRODUCT_STATE_FILE, []);
  const idx = list.findIndex(
    (entry) =>
      entry.legacyProductId === row.legacyProductId &&
      (entry.environment || "production") === row.environment,
  );
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.push(row);
  await writeJsonFile(ANANAS_PRODUCT_STATE_FILE, list);
}

/** Full listing map (legacyId → merchantInventoryId/warehouse/status) for the sync phases. */
export async function listAnanasProductStates(
  environment: SyncEnvironment = "production",
): Promise<AnanasProductStateRecord[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const rows: AnanasProductStateRecord[] = [];
    const pageSize = 1000;
    for (let page = 0; page < 50; page += 1) {
      const { data, error } = await supabase
        .from("integration_ananas_product_state")
        .select("*")
        .eq("environment", environment)
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) break;
      const batch = (data || []) as Array<Record<string, any>>;
      rows.push(...batch.map(mapAnanasProductStateRow));
      if (batch.length < pageSize) return rows;
    }
    if (rows.length) return rows;
  }
  const list = await readJsonFile<AnanasProductStateRecord[]>(ANANAS_PRODUCT_STATE_FILE, []);
  return list.filter((entry) => (entry.environment || "production") === environment);
}

/** Discount campaigns we know about; used for cooldown and price-freeze checks. */
export async function listAnanasDiscountStates(): Promise<AnanasDiscountStateRecord[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("integration_ananas_discount_state")
      .select("*")
      .order("date_to", { ascending: false })
      .limit(20000);
    if (!error && data) {
      return (data as Array<Record<string, any>>).map((row) => ({
        id: String(row.id),
        legacyProductId: Number(row.legacy_product_id),
        merchantInventoryId: Number(row.merchant_inventory_id),
        discountId: row.discount_id == null ? null : String(row.discount_id),
        discountType: String(row.discount_type || "SALE"),
        discountPrice: Number(row.discount_price || 0),
        discountPriceCurrency: String(row.discount_price_currency || "RSD"),
        dateFrom: String(row.date_from),
        dateTo: String(row.date_to),
        active: row.active !== false,
        updatedAt: row.updated_at || nowIso(),
      }));
    }
  }
  return readJsonFile<AnanasDiscountStateRecord[]>(ANANAS_DISCOUNT_STATE_FILE, []);
}

export async function upsertAnanasDiscountState(input: {
  legacyProductId: number;
  merchantInventoryId: number;
  discountId?: string | null;
  discountType?: string;
  discountPrice: number;
  discountPriceCurrency?: string;
  dateFrom: string;
  dateTo: string;
  active?: boolean;
}) {
  const now = nowIso();
  const row: AnanasDiscountStateRecord = {
    id: newId(),
    legacyProductId: Number(input.legacyProductId),
    merchantInventoryId: Number(input.merchantInventoryId || 0),
    discountId: input.discountId == null ? null : String(input.discountId),
    discountType: String(input.discountType || "SALE"),
    discountPrice: Number(input.discountPrice || 0),
    discountPriceCurrency: String(input.discountPriceCurrency || "RSD"),
    dateFrom: normalizeAnanasDate(input.dateFrom),
    dateTo: normalizeAnanasDate(input.dateTo),
    active: input.active !== false,
    updatedAt: now,
  };

  if (!row.legacyProductId || !row.merchantInventoryId) return;

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase.from("integration_ananas_discount_state").upsert(
      {
        legacy_product_id: row.legacyProductId,
        merchant_inventory_id: row.merchantInventoryId,
        discount_id: row.discountId,
        discount_type: row.discountType,
        discount_price: row.discountPrice,
        discount_price_currency: row.discountPriceCurrency,
        date_from: row.dateFrom,
        date_to: row.dateTo,
        active: row.active,
        updated_at: row.updatedAt,
      } as never,
      { onConflict: "merchant_inventory_id,date_from,date_to,discount_type" },
    );
    if (!error) return;
  }

  const list = await readJsonFile<AnanasDiscountStateRecord[]>(ANANAS_DISCOUNT_STATE_FILE, []);
  const idx = list.findIndex(
    (entry) =>
      entry.merchantInventoryId === row.merchantInventoryId &&
      entry.dateFrom === row.dateFrom &&
      entry.dateTo === row.dateTo &&
      entry.discountType === row.discountType,
  );
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.unshift(row);
  await writeJsonFile(ANANAS_DISCOUNT_STATE_FILE, list.slice(0, 20000));
}

export async function deactivateAnanasDiscountStateByDiscountId(discountId: string) {
  const normalized = String(discountId || "").trim();
  if (!normalized) return;

  const supabase = getServiceSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("integration_ananas_discount_state")
      .update({ active: false, updated_at: nowIso() } as never)
      .eq("discount_id", normalized);
    if (!error) return;
  }

  const list = await readJsonFile<AnanasDiscountStateRecord[]>(ANANAS_DISCOUNT_STATE_FILE, []);
  for (const row of list) {
    if (row.discountId === normalized) {
      row.active = false;
      row.updatedAt = nowIso();
    }
  }
  await writeJsonFile(ANANAS_DISCOUNT_STATE_FILE, list);
}

/**
 * Wipes everything we remember about the remote Ananas catalog: listing ids,
 * payload hashes and discount campaigns.
 *
 * Needed when Ananas deletes our products on their side (they did this on
 * 2026-08-07 before the production re-listing). Without the reset the catalog
 * phase would skip products whose hash still matches, and the price/stock
 * phases would push to merchantInventoryIds that no longer exist.
 *
 * Our own catalog is untouched — only integration bookkeeping is cleared.
 */
export async function resetAnanasIntegrationState(): Promise<{
  productStates: number;
  deltaStates: number;
  discountStates: number;
}> {
  const counts = { productStates: 0, deltaStates: 0, discountStates: 0 };
  const supabase = getServiceSupabase();

  if (supabase) {
    const { count: productCount } = await supabase
      .from("integration_ananas_product_state")
      .delete({ count: "exact" })
      .gte("legacy_product_id", 0);
    counts.productStates = Number(productCount || 0);

    const { count: discountCount } = await supabase
      .from("integration_ananas_discount_state")
      .delete({ count: "exact" })
      .not("id", "is", null);
    counts.discountStates = Number(discountCount || 0);

    const { count: deltaCount } = await supabase
      .from("integration_stock_delta_state")
      .delete({ count: "exact" })
      .eq("scope", "ananas");
    counts.deltaStates = Number(deltaCount || 0);
    return counts;
  }

  const products = await readJsonFile<AnanasProductStateRecord[]>(ANANAS_PRODUCT_STATE_FILE, []);
  counts.productStates = products.length;
  await writeJsonFile(ANANAS_PRODUCT_STATE_FILE, []);

  const discounts = await readJsonFile<AnanasDiscountStateRecord[]>(ANANAS_DISCOUNT_STATE_FILE, []);
  counts.discountStates = discounts.length;
  await writeJsonFile(ANANAS_DISCOUNT_STATE_FILE, []);

  const deltas = await readJsonFile<DeltaState[]>(DELTA_STATE_FILE, []);
  const kept = deltas.filter((entry) => entry.scope !== "ananas");
  counts.deltaStates = deltas.length - kept.length;
  await writeJsonFile(DELTA_STATE_FILE, kept);

  return counts;
}

export async function getLatestOutboundArtifact() {
  const list = await readJsonFile<OutboundArtifact[]>(OUTBOUND_FILE, []);
  return list[0] || null;
}
