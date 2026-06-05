import { invalidateCatalogCaches } from "@/lib/catalog/store";
import { startSyncRun, completeSyncRun, addSyncRunItem } from "@/lib/integrations/core/store";
import type { SyncCounters, SyncEnvironment, SyncMode, SyncTrigger } from "@/lib/integrations/core/types";
import { getServiceSupabase } from "@/lib/supabase/server";

const MOFFICE_API_URL = "https://api.moffice.co.rs/api/LagerTekstil";

export type MofficeItem = {
  ARTIKAL_ID?: number;
  ARTIKAL_SIFRA?: string;
  ARTIKAL_BARKOD?: string;
  ARTIKAL_NAZIV?: string;
  ARTIKAL_MP_CENA?: number;
  ARTIKAL_VP_CENA?: number;
  ARTIKAL_PDV_STOPA?: number;
  ARTIKAL_ZALIHE?: number;
  ARTIKAL_GRUPA?: string;
  ARTIKAL_VELICINA?: string;
};

export type MofficeExistingRow = {
  legacy_id: number;
  sku: string | null;
  ean: string | null;
  name_sr: string | null;
  raw_payload: Record<string, unknown> | null;
};

export type MofficeSyncPlan = {
  rows: Record<string, unknown>[];
  staleLegacyIds: number[];
  duplicateLegacyIds: number[];
  counters: {
    total: number;
    rows: number;
    matched: number;
    created: number;
    stale: number;
    duplicates: number;
  };
};

const nowIso = () => new Date().toISOString();

const normalizeKey = (value: unknown) => String(value ?? "").trim();
const normalizeLower = (value: unknown) => normalizeKey(value).toLowerCase();
const normalizeSize = (value: unknown) => normalizeKey(value).toUpperCase().replace(/\s+/g, "");

const cleanName = (name: string) => {
  const parts = name.trim().split(/\s{2,}/);
  return (parts[0] ?? name).trim();
};

const getRawPayload = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};

const getPayloadAttributes = (payload: Record<string, unknown>): Record<string, unknown> =>
  payload.attributes && typeof payload.attributes === "object"
    ? { ...(payload.attributes as Record<string, unknown>) }
    : {};

const hasManualStockOverride = (payload: Record<string, unknown>) => {
  const overrides =
    payload.commerceOverrides && typeof payload.commerceOverrides === "object"
      ? (payload.commerceOverrides as Record<string, unknown>)
      : {};
  return overrides.stock === true || overrides.inventory === true;
};

const hasManualPriceOverride = (payload: Record<string, unknown>) => {
  const overrides =
    payload.commerceOverrides && typeof payload.commerceOverrides === "object"
      ? (payload.commerceOverrides as Record<string, unknown>)
      : {};
  return overrides.price === true;
};

const isLegacyLagerManagedRow = (row: MofficeExistingRow) => {
  const payload = getRawPayload(row.raw_payload);
  if (payload.source === "manual" || payload.source === "admin") return false;
  if (hasManualStockOverride(payload)) return false;
  if (payload.moffice && typeof payload.moffice === "object") return true;
  if (payload.source === "moffice" || payload.syncSource === "legacy-stock-product.csv") return true;
  if (payload.legacyRaw || payload.stockWarehouses) return true;
  const sku = normalizeKey(row.sku);
  const ean = normalizeKey(row.ean);
  return /^\d{5,}$/.test(sku) || /^0\d{5,}$/.test(ean);
};

const makeVariantKeys = (input: { sku: unknown; ean: unknown; size: unknown; legacyId?: number | null }) => {
  const sku = normalizeLower(input.sku);
  const ean = normalizeLower(input.ean);
  const size = normalizeSize(input.size);
  const keys = new Set<string>();
  if (ean) keys.add(`ean:${ean}`);
  if (sku && size) keys.add(`sku-size:${sku}:${size}`);
  if (input.legacyId) keys.add(`legacy:${Number(input.legacyId)}`);
  return keys;
};

export function buildMofficeSyncPlan(params: {
  items: MofficeItem[];
  existing: MofficeExistingRow[];
  runId: string;
  syncedAt?: string;
}): MofficeSyncPlan {
  const syncedAt = params.syncedAt || nowIso();
  const byEan = new Map<string, MofficeExistingRow>();
  const bySku = new Map<string, MofficeExistingRow>();

  for (const row of params.existing) {
    const ean = normalizeLower(row.ean);
    const sku = normalizeLower(row.sku);
    if (ean && !byEan.has(ean)) byEan.set(ean, row);
    if (sku && !bySku.has(sku)) bySku.set(sku, row);
  }

  const rowsByLegacyId = new Map<number, Record<string, unknown>>();
  const duplicateLegacyIds = new Set<number>();
  const feedSkuSet = new Set<string>();
  const feedEanSet = new Set<string>();
  const feedVariantKeys = new Set<string>();
  let matched = 0;
  let created = 0;

  for (const item of params.items) {
    const mofficeId = Number(item.ARTIKAL_ID ?? 0);
    if (!mofficeId) continue;

    const sku = normalizeKey(item.ARTIKAL_SIFRA);
    const ean = normalizeKey(item.ARTIKAL_BARKOD);
    const size = normalizeKey(item.ARTIKAL_VELICINA);
    const skuKey = normalizeLower(sku);
    const eanKey = normalizeLower(ean);
    if (skuKey) feedSkuSet.add(skuKey);
    if (eanKey) feedEanSet.add(eanKey);
    makeVariantKeys({ sku, ean, size, legacyId: mofficeId }).forEach((key) => feedVariantKeys.add(key));

    const existingRow = (eanKey && byEan.get(eanKey)) || (skuKey && bySku.get(skuKey)) || null;
    const legacyId = existingRow ? Number(existingRow.legacy_id) : mofficeId;
    const existingPayload = getRawPayload(existingRow?.raw_payload);
    const attributes = getPayloadAttributes(existingPayload);
    if (size) attributes.size = [size];

    const payload: Record<string, unknown> = {
      ...existingPayload,
      attributes,
      moffice: {
        id: mofficeId,
        sku,
        ean,
        category: item.ARTIKAL_GRUPA ?? "",
        size,
        syncedAt,
        syncedRunId: params.runId,
      },
    };

    if (!existingRow) {
      payload.source = "moffice";
      payload.category = item.ARTIKAL_GRUPA ?? "";
      payload.size = size;
    }

    if (existingRow) {
      matched++;
      if (mofficeId !== legacyId) duplicateLegacyIds.add(mofficeId);
    } else {
      created++;
    }

    const mpPrice = Number(item.ARTIKAL_MP_CENA ?? 0);
    const vpPrice = Number(item.ARTIKAL_VP_CENA ?? 0);
    const tax = Number(item.ARTIKAL_PDV_STOPA ?? 20);
    const stock = Math.max(0, Math.floor(Number(item.ARTIKAL_ZALIHE ?? 0)));
    const keepManualPrice = hasManualPriceOverride(existingPayload);

    rowsByLegacyId.set(legacyId, {
      legacy_id: legacyId,
      sku,
      ean,
      name_sr: existingRow ? String(existingRow.name_sr ?? cleanName(String(item.ARTIKAL_NAZIV ?? ""))) : cleanName(String(item.ARTIKAL_NAZIV ?? "")),
      tax_percent: tax,
      stock_warehouse_1: stock,
      stock_total: stock,
      is_active: stock > 0,
      is_exported: true,
      raw_payload: payload,
      updated_at: syncedAt,
      ...(keepManualPrice
        ? {}
        : {
            price_net: Math.round(vpPrice * 100) / 100,
            price_gross: Math.round(mpPrice * 100) / 100,
            price_final_gross: Math.round(mpPrice * 100) / 100,
            rebate_percent: 0,
          }),
    });
  }

  const upsertIds = new Set(Array.from(rowsByLegacyId.keys()));
  const staleLegacyIds = new Set<number>();
  for (const row of params.existing) {
    const legacyId = Number(row.legacy_id);
    if (!Number.isFinite(legacyId) || upsertIds.has(legacyId)) continue;
    if (!isLegacyLagerManagedRow(row)) continue;

    const sku = normalizeLower(row.sku);
    const ean = normalizeLower(row.ean);
    const payload = getRawPayload(row.raw_payload);
    const attrs = getPayloadAttributes(payload);
    const sizes = Array.isArray(attrs.size) ? attrs.size : [];
    const payloadSize = normalizeKey(payload.size);
    const moffice =
      payload.moffice && typeof payload.moffice === "object"
        ? (payload.moffice as Record<string, unknown>)
        : {};
    const syncedInCurrentRun = String(moffice.syncedRunId || "") === params.runId;
    const candidateSizes = [payloadSize, moffice.size, ...sizes].map(normalizeSize).filter(Boolean);
    const variantKeys = new Set<string>();
    if (ean) variantKeys.add(`ean:${ean}`);
    for (const size of candidateSizes) {
      if (sku) variantKeys.add(`sku-size:${sku}:${size}`);
    }
    variantKeys.add(`legacy:${legacyId}`);

    const belongsToCurrentMofficeSku = (sku && feedSkuSet.has(sku)) || (ean && feedEanSet.has(ean));
    const hasCurrentVariant = Array.from(variantKeys).some((key) => feedVariantKeys.has(key));
    const oldNumericLegacyRowAbsentFromFeed = sku && !feedSkuSet.has(sku) && !feedEanSet.has(ean);
    if (!syncedInCurrentRun) {
      staleLegacyIds.add(legacyId);
      continue;
    }

    if ((belongsToCurrentMofficeSku && !hasCurrentVariant) || oldNumericLegacyRowAbsentFromFeed) {
      staleLegacyIds.add(legacyId);
    }
  }

  return {
    rows: Array.from(rowsByLegacyId.values()),
    staleLegacyIds: Array.from(staleLegacyIds).sort((a, b) => a - b),
    duplicateLegacyIds: Array.from(duplicateLegacyIds).sort((a, b) => a - b),
    counters: {
      total: params.items.length,
      rows: rowsByLegacyId.size,
      matched,
      created,
      stale: staleLegacyIds.size,
      duplicates: duplicateLegacyIds.size,
    },
  };
}

async function fetchMofficeItems(apiKey: string): Promise<MofficeItem[]> {
  const res = await fetch(MOFFICE_API_URL, {
    headers: { "X-API-KEY": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`mOffice API returned ${res.status}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) {
    throw new Error("mOffice returned invalid response");
  }
  return items as MofficeItem[];
}

export async function runMofficeSync(input: {
  environment?: SyncEnvironment;
  mode?: SyncMode;
  trigger?: SyncTrigger;
  requireCronSecret?: boolean;
}) {
  const apiKey = process.env.MOFFICE_API_KEY?.trim();
  if (!apiKey) throw new Error("MOFFICE_API_KEY is not configured.");
  return executeMofficeSync({
    ...input,
    source: "moffice-api",
    endpoint: MOFFICE_API_URL,
    loadItems: () => fetchMofficeItems(apiKey),
  });
}

export async function runMofficeSyncWithItems(input: {
  items: MofficeItem[];
  environment?: SyncEnvironment;
  mode?: SyncMode;
  trigger?: SyncTrigger;
  source?: string;
  endpoint?: string;
}) {
  if (!Array.isArray(input.items)) throw new Error("mOffice payload must be an array.");
  return executeMofficeSync({
    ...input,
    loadItems: async () => input.items,
  });
}

async function executeMofficeSync(input: {
  environment?: SyncEnvironment;
  mode?: SyncMode;
  trigger?: SyncTrigger;
  source?: string;
  endpoint?: string;
  loadItems: () => Promise<MofficeItem[]>;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase service role client is not configured.");
  const source = input.source || "moffice-api";

  const run = await startSyncRun({
    domain: "stock_inbound",
    environment: input.environment || "production",
    mode: input.mode || "full",
    trigger: input.trigger || "manual",
    meta: {
      source,
      endpoint: input.endpoint || MOFFICE_API_URL,
    },
  });

  try {
    const items = await input.loadItems();
    if (!Array.isArray(items)) throw new Error("mOffice payload must be an array.");

    const { data: existingRaw, error: existingError } = await supabase
      .from("catalog_products")
      .select("legacy_id,sku,ean,name_sr,raw_payload");
    if (existingError) throw new Error(`Catalog load failed: ${existingError.message}`);

    const plan = buildMofficeSyncPlan({
      items,
      existing: (existingRaw ?? []) as unknown as MofficeExistingRow[],
      runId: run.id,
    });

    let upserted = 0;
    const chunkSize = 100;
    for (let i = 0; i < plan.rows.length; i += chunkSize) {
      const batch = plan.rows.slice(i, i + chunkSize);
      const table = supabase.from("catalog_products");
      const { error } = await (table.upsert as Function)(batch, {
        onConflict: "legacy_id",
        ignoreDuplicates: false,
      });
      if (error) {
        await addSyncRunItem(run.id, {
          domain: "stock_inbound",
          entityType: "moffice_batch",
          entityId: `upsert-${i / chunkSize}`,
          status: "failed",
          message: error.message,
          payloadHash: null,
          payload: { batchSize: batch.length },
          response: null,
        });
        continue;
      }
      upserted += batch.length;
    }

    let deactivated = 0;
    const staleIds = Array.from(new Set([...plan.staleLegacyIds, ...plan.duplicateLegacyIds]));
    for (let i = 0; i < staleIds.length; i += chunkSize) {
      const ids = staleIds.slice(i, i + chunkSize);
      const table = supabase.from("catalog_products");
      const { error } = await (table.update as Function)({
        stock_warehouse_1: 0,
        stock_total: 0,
        is_active: false,
        is_exported: false,
        updated_at: new Date().toISOString(),
      }).in("legacy_id", ids);
      if (error) {
        await addSyncRunItem(run.id, {
          domain: "stock_inbound",
          entityType: "moffice_stale_cleanup",
          entityId: `cleanup-${i / chunkSize}`,
          status: "failed",
          message: error.message,
          payloadHash: null,
          payload: { ids },
          response: null,
        });
        continue;
      }
      deactivated += ids.length;
    }

    invalidateCatalogCaches();
    const counters: SyncCounters = {
      total: plan.counters.total,
      success: upserted + deactivated,
      failed: plan.rows.length - upserted,
      skipped: 0,
    };
    const status = counters.failed > 0 ? "partial_success" : "success";
    const summary = `mOffice synced ${upserted} rows, deactivated ${deactivated} stale rows (${plan.counters.matched} matched, ${plan.counters.created} new).`;
    await completeSyncRun(run.id, {
      status,
      counters,
      summary,
      meta: {
        source,
        total: plan.counters.total,
        rows: plan.counters.rows,
        matched: plan.counters.matched,
        created: plan.counters.created,
        stale: plan.counters.stale,
        duplicates: plan.counters.duplicates,
        deactivated,
      },
    });
    return {
      runId: run.id,
      status,
      total: plan.counters.total,
      upserted,
      matched: plan.counters.matched,
      created: plan.counters.created,
      stale: plan.counters.stale,
      duplicates: plan.counters.duplicates,
      deactivated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeSyncRun(run.id, {
      status: "failed",
      counters: { total: 0, success: 0, failed: 1, skipped: 0 },
      summary: `mOffice sync failed: ${message}`,
      meta: { source, fatalError: message },
    });
    throw error;
  }
}
