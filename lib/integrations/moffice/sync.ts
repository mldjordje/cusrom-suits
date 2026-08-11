import { invalidateCatalogCaches } from "@/lib/catalog/store";
import { extractModelCode } from "@/lib/integrations/moffice/modelCode";
import { startSyncRun, completeSyncRun, addSyncRunItem } from "@/lib/integrations/core/store";
import type { SyncCounters, SyncEnvironment, SyncMode, SyncTrigger } from "@/lib/integrations/core/types";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getFulfillmentSettings, updateFulfillmentSettings, type Voucher } from "@/lib/storefront/fulfillment";

const MOFFICE_API_URL = "https://api.moffice.co.rs/api/LagerTekstil";
const DEBUG_SKUS = new Set(["129513", "130406", "133051"]);

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
  price_net: number | null;
  price_gross: number | null;
  price_final_gross: number | null;
  rebate_percent: number | null;
};

export type MofficePostSyncRow = MofficeExistingRow & {
  is_active: boolean | null;
  is_exported: boolean | null;
  stock_total: number | null;
  stock_warehouse_1: number | null;
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

export type MofficeExportRow = {
  sku: string;
  ean: string;
  velicina: string;
  moffice_kolicina: number | "";
  site_stock_total: number;
  site_active: boolean;
  site_exported: boolean;
  status:
    | "OK"
    | "ZERO_IN_MOFFICE_HIDDEN"
    | "MISSING_FROM_MOFFICE_HIDDEN"
    | "VISIBLE_BUT_MISSING_FROM_MOFFICE"
    | "VISIBLE_WITH_WRONG_STOCK"
    | "MISSING_SIZE";
  legacy_id: number;
  moffice_id: number | "";
  naziv: string;
  kategorija: string;
  last_synced_run: string;
};

export type MofficePulledRow = {
  moffice_id: number | "";
  sku: string;
  ean: string;
  naziv: string;
  kategorija: string;
  velicina: string;
  moffice_kolicina: number;
  mp_cena: number;
  vp_cena: number;
  pdv: number;
  raw: MofficeItem;
};

const nowIso = () => new Date().toISOString();

const normalizeKey = (value: unknown) => String(value ?? "").trim();

/**
 * Numeric feed fields that never accept NaN. Also tolerates comma decimals,
 * which mOffice sends for some articles.
 */
const safeNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return fallback;
  const parsed = Number(raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
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

const makeVariantKeys = (input: { sku: unknown; ean: unknown; size: unknown }) => {
  const sku = normalizeLower(input.sku);
  const ean = normalizeLower(input.ean);
  const size = normalizeSize(input.size);
  const keys = new Set<string>();
  if (ean) keys.add(`ean:${ean}`);
  if (sku && size) keys.add(`sku-size:${sku}:${size}`);
  return keys;
};

const hashVariantLegacyId = (sku: string, size: string) => {
  const key = `${normalizeLower(sku)}:${normalizeSize(size)}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 9_100_000_000_000 + (hash >>> 0);
};

const resolveNewLegacyId = (input: { mofficeId: number; sku: string; ean: string; size: string }) => {
  const numericEan = Number(input.ean.replace(/\D/g, ""));
  if (Number.isSafeInteger(numericEan) && numericEan > 0) return numericEan;
  if (input.sku && input.size) return hashVariantLegacyId(input.sku, input.size);
  return input.mofficeId;
};

const buildDebugItems = (items: MofficeItem[]) =>
  items
    .filter((item) => DEBUG_SKUS.has(normalizeKey(item.ARTIKAL_SIFRA)))
    .map((item) => ({
      id: item.ARTIKAL_ID ?? null,
      sku: normalizeKey(item.ARTIKAL_SIFRA),
      ean: normalizeKey(item.ARTIKAL_BARKOD),
      size: normalizeKey(item.ARTIKAL_VELICINA),
      stock: Number(item.ARTIKAL_ZALIHE ?? 0),
      category: item.ARTIKAL_GRUPA ?? "",
      name: item.ARTIKAL_NAZIV ?? "",
    }));

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const isVoucherItem = (item: MofficeItem): boolean => {
  const naziv = normalizeKey(item.ARTIKAL_NAZIV).toLowerCase();
  const grupa = normalizeKey(item.ARTIKAL_GRUPA).toLowerCase();
  return naziv.includes("vaučer") || naziv.includes("vaucer") || naziv.includes("voucher") ||
    grupa.includes("vaučer") || grupa.includes("vaucer") || grupa.includes("voucher");
};

const mapMofficeVoucher = (item: MofficeItem): Voucher | null => {
  const code = normalizeKey(item.ARTIKAL_BARKOD || item.ARTIKAL_SIFRA).toUpperCase();
  if (!code) return null;

  // Discount amount from MP price; size field can also carry denomination
  const amountFromPrice = Math.max(0, Number(item.ARTIKAL_MP_CENA ?? 0));
  const amountFromSize = Math.max(0, Number(item.ARTIKAL_VELICINA ?? 0));
  const amount = amountFromPrice > 0 ? amountFromPrice : amountFromSize;
  if (amount <= 0) return null;

  // Treat as percent if ≤ 100 and the name or group hints at percent, else fixed RSD
  const naziv = normalizeKey(item.ARTIKAL_NAZIV).toLowerCase();
  const isPercent = (naziv.includes("%") || naziv.includes("procenat")) && amount <= 100;
  const type: Voucher["type"] = isPercent ? "percent" : "fixed";

  const isActive = Math.max(0, Math.floor(Number(item.ARTIKAL_ZALIHE ?? 0))) > 0;

  return {
    id: `moffice_${normalizeKey(item.ARTIKAL_ID ?? item.ARTIKAL_BARKOD ?? code)}`,
    code,
    email: "",
    amount,
    type,
    isActive,
    createdAt: new Date().toISOString(),
    usedAt: isActive ? null : new Date().toISOString(),
    usedOrderId: null,
  };
};

async function syncVouchersFromItems(items: MofficeItem[]): Promise<number> {
  const voucherItems = items.filter(isVoucherItem);
  if (!voucherItems.length) return 0;

  const imported = voucherItems.map(mapMofficeVoucher).filter((v): v is Voucher => v !== null);
  if (!imported.length) return 0;

  const settings = await getFulfillmentSettings();
  const mofficeIds = new Set(imported.map((v) => v.id));
  const kept = settings.vouchers.filter((v) => !v.id.startsWith("moffice_") || !mofficeIds.has(v.id));
  await updateFulfillmentSettings({ vouchers: [...kept, ...imported] });
  return imported.length;
}

export const buildMofficePulledRows = (items: MofficeItem[]): MofficePulledRow[] =>
  items.map((item) => ({
    moffice_id: Number(item.ARTIKAL_ID || 0) || "",
    sku: normalizeKey(item.ARTIKAL_SIFRA),
    ean: normalizeKey(item.ARTIKAL_BARKOD),
    naziv: normalizeKey(item.ARTIKAL_NAZIV),
    kategorija: normalizeKey(item.ARTIKAL_GRUPA),
    velicina: normalizeKey(item.ARTIKAL_VELICINA),
    moffice_kolicina: Math.max(0, Math.floor(Number(item.ARTIKAL_ZALIHE ?? 0))),
    mp_cena: Number(item.ARTIKAL_MP_CENA ?? 0),
    vp_cena: Number(item.ARTIKAL_VP_CENA ?? 0),
    pdv: Number(item.ARTIKAL_PDV_STOPA ?? 0),
    raw: item,
  }));

async function loadAllCatalogRows<T = Record<string, unknown>>(
  supabase: ReturnType<typeof getServiceSupabase>,
  select: string,
): Promise<T[]> {
  if (!supabase) throw new Error("Supabase service role client is not configured.");
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("catalog_products")
      .select(select)
      .order("legacy_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Catalog load failed: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

async function copySkuMediaToActiveMofficeRows(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  rows: Record<string, unknown>[],
  existing: MofficeExistingRow[],
) {
  const activeRows = rows
    .map((row) => ({
      legacyId: Number(row.legacy_id),
      sku: normalizeLower(row.sku),
      stock: Number(row.stock_total || 0),
      isActive: row.is_active === true,
      isExported: row.is_exported === true,
    }))
    .filter((row) => Number.isFinite(row.legacyId) && row.sku && row.stock > 0 && row.isActive && row.isExported);
  if (!activeRows.length) return 0;

  const targetIds = Array.from(new Set(activeRows.map((row) => row.legacyId)));
  const targetMediaIds = new Set<number>();
  for (const idChunk of chunkArray(targetIds, 500)) {
    const { data, error } = await supabase
      .from("catalog_product_media")
      .select("legacy_product_id")
      .in("legacy_product_id", idChunk);
    if (error) throw new Error(`mOffice media target check failed: ${error.message}`);
    for (const row of data || []) {
      targetMediaIds.add(Number((row as Record<string, unknown>).legacy_product_id));
    }
  }

  const missingTargets = activeRows.filter((row) => !targetMediaIds.has(row.legacyId));
  if (!missingTargets.length) return 0;

  const skuSet = new Set(missingTargets.map((row) => row.sku));
  const donorIds = Array.from(
    new Set(
      existing
        .filter((row) => skuSet.has(normalizeLower(row.sku)))
        .map((row) => Number(row.legacy_id))
        .filter((legacyId) => Number.isFinite(legacyId)),
    ),
  );
  if (!donorIds.length) return 0;

  const existingSkuById = new Map(existing.map((row) => [Number(row.legacy_id), normalizeLower(row.sku)]));
  const donorMediaBySku = new Map<string, Array<{ url: string; sort: number; isCover: boolean }>>();
  for (const idChunk of chunkArray(donorIds, 500)) {
    const { data, error } = await supabase
      .from("catalog_product_media")
      .select("legacy_product_id,url,sort,is_cover")
      .in("legacy_product_id", idChunk)
      .order("sort", { ascending: true });
    if (error) throw new Error(`mOffice media donor load failed: ${error.message}`);
    for (const row of data || []) {
      const record = row as Record<string, unknown>;
      const legacyId = Number(record.legacy_product_id);
      const sku = existingSkuById.get(legacyId) || "";
      const url = normalizeKey(record.url);
      if (!sku || !url) continue;
      const list = donorMediaBySku.get(sku) || [];
      list.push({
        url,
        sort: Number(record.sort || list.length),
        isCover: record.is_cover === true || list.length === 0,
      });
      donorMediaBySku.set(sku, list);
    }
  }

  const mediaRows: Array<{ legacy_product_id: number; url: string; sort: number; is_cover: boolean }> = [];
  for (const target of missingTargets) {
    const donor = donorMediaBySku.get(target.sku);
    if (!donor?.length) continue;
    donor.slice(0, 8).forEach((media, index) => {
      mediaRows.push({
        legacy_product_id: target.legacyId,
        url: media.url,
        sort: Number.isFinite(media.sort) ? media.sort : index,
        is_cover: index === 0 || media.isCover,
      });
    });
  }

  let copied = 0;
  for (const batch of chunkArray(mediaRows, 500)) {
    const { error } = await supabase
      .from("catalog_product_media")
      .upsert(batch as never, { onConflict: "legacy_product_id,url", ignoreDuplicates: true });
    if (error) throw new Error(`mOffice media copy failed: ${error.message}`);
    copied += batch.length;
  }

  return copied;
}

/**
 * Faithful to the legacy site: variants were grouped into a model by `manufcode` and
 * the model's photos lived on one "primary" variant. Here we share photos across the
 * model: any active, in-stock row that still has NO media borrows the photos of a
 * media-bearing row with the same model code (extracted from name/manufCode). Exact
 * code match => same colour, so no wrong-image risk. Runs after the SKU copy as a
 * second pass that only fills rows the SKU copy could not.
 */
async function copyModelCodeMediaToActiveRows(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  rows: Record<string, unknown>[],
  existing: MofficeExistingRow[],
) {
  const activeRows = rows
    .map((row) => ({
      legacyId: Number(row.legacy_id),
      code: extractModelCode(null, String(row.name_sr || "")),
      stock: Number(row.stock_total || 0),
      isActive: row.is_active === true,
      isExported: row.is_exported === true,
    }))
    .filter((row) => Number.isFinite(row.legacyId) && row.code && row.stock > 0 && row.isActive && row.isExported);
  if (!activeRows.length) return 0;

  const targetIds = Array.from(new Set(activeRows.map((row) => row.legacyId)));
  const targetMediaIds = new Set<number>();
  for (const idChunk of chunkArray(targetIds, 500)) {
    const { data, error } = await supabase
      .from("catalog_product_media")
      .select("legacy_product_id")
      .in("legacy_product_id", idChunk);
    if (error) throw new Error(`mOffice model-code media target check failed: ${error.message}`);
    for (const row of data || []) targetMediaIds.add(Number((row as Record<string, unknown>).legacy_product_id));
  }

  const missingTargets = activeRows.filter((row) => !targetMediaIds.has(row.legacyId));
  if (!missingTargets.length) return 0;

  const missingCodes = new Set(missingTargets.map((row) => row.code));
  const donorIdByCode = new Map<number, string>();
  for (const row of existing) {
    const code = extractModelCode(null, String(row.name_sr || ""));
    if (code && missingCodes.has(code)) donorIdByCode.set(Number(row.legacy_id), code);
  }
  const donorIds = Array.from(donorIdByCode.keys()).filter((id) => Number.isFinite(id));
  if (!donorIds.length) return 0;

  const donorMediaByCode = new Map<string, Array<{ url: string; sort: number; isCover: boolean }>>();
  for (const idChunk of chunkArray(donorIds, 500)) {
    const { data, error } = await supabase
      .from("catalog_product_media")
      .select("legacy_product_id,url,sort,is_cover")
      .in("legacy_product_id", idChunk)
      .order("sort", { ascending: true });
    if (error) throw new Error(`mOffice model-code donor load failed: ${error.message}`);
    for (const row of data || []) {
      const record = row as Record<string, unknown>;
      const code = donorIdByCode.get(Number(record.legacy_product_id)) || "";
      const url = normalizeKey(record.url);
      if (!code || !url) continue;
      const list = donorMediaByCode.get(code) || [];
      list.push({ url, sort: Number(record.sort || list.length), isCover: record.is_cover === true || list.length === 0 });
      donorMediaByCode.set(code, list);
    }
  }

  const mediaRows: Array<{ legacy_product_id: number; url: string; sort: number; is_cover: boolean }> = [];
  for (const target of missingTargets) {
    const donor = donorMediaByCode.get(target.code);
    if (!donor?.length) continue;
    donor.slice(0, 8).forEach((media, index) => {
      mediaRows.push({
        legacy_product_id: target.legacyId,
        url: media.url,
        sort: Number.isFinite(media.sort) ? media.sort : index,
        is_cover: index === 0,
      });
    });
  }

  let copied = 0;
  for (const batch of chunkArray(mediaRows, 500)) {
    const { error } = await supabase
      .from("catalog_product_media")
      .upsert(batch as never, { onConflict: "legacy_product_id,url", ignoreDuplicates: true });
    if (error) throw new Error(`mOffice model-code media copy failed: ${error.message}`);
    copied += batch.length;
  }

  return copied;
}

const getMofficeSyncedRunId = (payload: Record<string, unknown>) => {
  const moffice =
    payload.moffice && typeof payload.moffice === "object"
      ? (payload.moffice as Record<string, unknown>)
      : {};
  return String(moffice.syncedRunId || "");
};

const getMofficePayload = (payload: Record<string, unknown>) =>
  payload.moffice && typeof payload.moffice === "object"
    ? (payload.moffice as Record<string, unknown>)
    : {};

const getFirstSize = (payload: Record<string, unknown>) => {
  const attrs = getPayloadAttributes(payload);
  const sizes = Array.isArray(attrs.size) ? attrs.size : [];
  return normalizeKey(sizes[0] ?? payload.size ?? getMofficePayload(payload).size);
};

export const buildPostSyncStaleIds = (rows: MofficePostSyncRow[], runId: string) =>
  rows
    .filter((row) => isLegacyLagerManagedRow(row))
    .filter((row) => getMofficeSyncedRunId(getRawPayload(row.raw_payload)) !== runId)
    .filter(
      (row) =>
        row.is_active !== false ||
        row.is_exported !== false ||
        Number(row.stock_total || 0) !== 0 ||
        Number(row.stock_warehouse_1 || 0) !== 0,
    )
    .map((row) => Number(row.legacy_id))
    .filter((legacyId) => Number.isFinite(legacyId));

/**
 * Removes any legacy id that was upserted (or already cleaned) in the current run
 * from the stale-deactivation set. A row upserted this run carries fresh mOffice
 * stock and must never be zeroed by the stale cleanup — duplicate legacy rows for
 * the same variant (small id + EAN-derived id) otherwise caused in-stock rows to be
 * hidden in the same run. Pure + exported so the invariant is regression-tested.
 */
export const excludeProtectedStaleIds = (
  staleCandidates: number[],
  protectedIds: Iterable<number>,
): number[] => {
  const guarded = new Set<number>();
  for (const id of protectedIds) {
    const num = Number(id);
    if (Number.isFinite(num)) guarded.add(num);
  }
  return staleCandidates.filter((legacyId) => !guarded.has(Number(legacyId)));
};

export function buildMofficeSyncPlan(params: {
  items: MofficeItem[];
  existing: MofficeExistingRow[];
  runId: string;
  syncedAt?: string;
}): MofficeSyncPlan {
  const syncedAt = params.syncedAt || nowIso();
  const byEan = new Map<string, MofficeExistingRow>();
  const bySkuSize = new Map<string, MofficeExistingRow>();
  const bySkuUnambiguous = new Map<string, MofficeExistingRow | null>();

  for (const row of params.existing) {
    const ean = normalizeLower(row.ean);
    const sku = normalizeLower(row.sku);
    const payload = getRawPayload(row.raw_payload);
    const attrs = getPayloadAttributes(payload);
    const sizes = Array.isArray(attrs.size) ? attrs.size : [];
    const moffice =
      payload.moffice && typeof payload.moffice === "object"
        ? (payload.moffice as Record<string, unknown>)
        : {};
    const candidateSizes = [payload.size, moffice.size, ...sizes].map(normalizeSize).filter(Boolean);
    if (ean && !byEan.has(ean)) byEan.set(ean, row);
    if (sku) {
      for (const size of candidateSizes) {
        const key = `${sku}:${size}`;
        if (!bySkuSize.has(key)) bySkuSize.set(key, row);
      }
      bySkuUnambiguous.set(sku, bySkuUnambiguous.has(sku) ? null : row);
    }
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
    makeVariantKeys({ sku, ean, size }).forEach((key) => feedVariantKeys.add(key));

    const sizeKey = normalizeSize(size);
    const existingRow =
      (eanKey && byEan.get(eanKey)) ||
      (skuKey && sizeKey && bySkuSize.get(`${skuKey}:${sizeKey}`)) ||
      (skuKey ? bySkuUnambiguous.get(skuKey) || null : null);
    const legacyId = existingRow ? Number(existingRow.legacy_id) : resolveNewLegacyId({ mofficeId, sku, ean, size });
    const existingPayload = getRawPayload(existingRow?.raw_payload);
    const attributes = getPayloadAttributes(existingPayload);
    if (size) attributes.size = [size];
    // Feed rows occasionally carry unparsable prices ("", "-", localized decimals).
    // Number() turns those into NaN, which serializes to null and trips the
    // NOT NULL constraint on catalog_products.price_net — taking the whole
    // 100-row batch down with it (observed 2026-08-04, 100 failures per run).
    const mpPrice = safeNumber(item.ARTIKAL_MP_CENA, 0);
    const vpPrice = safeNumber(item.ARTIKAL_VP_CENA, 0);
    const tax = safeNumber(item.ARTIKAL_PDV_STOPA, 20);
    const stock = Math.max(0, Math.floor(safeNumber(item.ARTIKAL_ZALIHE, 0)));
    const keepManualPrice = hasManualPriceOverride(existingPayload);

    const payload: Record<string, unknown> = {
      ...existingPayload,
      attributes,
      moffice: {
        id: mofficeId,
        sku,
        ean,
        category: item.ARTIKAL_GRUPA ?? "",
        size,
        stock,
        priceGross: mpPrice,
        priceNet: vpPrice,
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

    const upsertRow = {
      legacy_id: legacyId,
      sku,
      ean,
      name_sr: existingRow ? String(existingRow.name_sr ?? cleanName(String(item.ARTIKAL_NAZIV ?? ""))) : cleanName(String(item.ARTIKAL_NAZIV ?? "")),
      tax_percent: tax,
      stock_warehouse_1: stock,
      stock_total: stock,
      is_active: stock > 0,
      is_exported: stock > 0,
      raw_payload: payload,
      updated_at: syncedAt,
      ...(keepManualPrice
        ? {
            price_net: existingRow?.price_net ?? 0,
            price_gross: existingRow?.price_gross ?? 0,
            price_final_gross: existingRow?.price_final_gross ?? 0,
            rebate_percent: existingRow?.rebate_percent ?? 0,
          }
        : {
            price_net: Math.round(vpPrice * 100) / 100,
            price_gross: Math.round(mpPrice * 100) / 100,
            price_final_gross: Math.round(mpPrice * 100) / 100,
            rebate_percent: 0,
          }),
    };

    rowsByLegacyId.set(legacyId, upsertRow);
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
    const belongsToCurrentMofficeSku = (sku && feedSkuSet.has(sku)) || (ean && feedEanSet.has(ean));
    const hasCurrentVariant = Array.from(variantKeys).some((key) => feedVariantKeys.has(key));
    const oldNumericLegacyRowAbsentFromFeed = sku && !feedSkuSet.has(sku) && !feedEanSet.has(ean);
    if ((belongsToCurrentMofficeSku && !hasCurrentVariant) || oldNumericLegacyRowAbsentFromFeed) {
      staleLegacyIds.add(legacyId);
      continue;
    }

    if (!syncedInCurrentRun) {
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

export function buildMofficeExportRows(params: {
  rows: MofficePostSyncRow[];
  latestRunId: string;
}): MofficeExportRow[] {
  return params.rows
    .filter((row) => isLegacyLagerManagedRow(row))
    .map((row) => {
      const payload = getRawPayload(row.raw_payload);
      const moffice = getMofficePayload(payload);
      const syncedRunId = String(moffice.syncedRunId || "");
      const mofficeStockRaw = moffice.stock;
      const hasCurrentMoffice = syncedRunId === params.latestRunId;
      const mofficeStock: number | "" = hasCurrentMoffice ? Number(mofficeStockRaw ?? 0) : "";
      const mofficeId: number | "" = hasCurrentMoffice ? Number(moffice.id || 0) || "" : "";
      const siteStock = Number(row.stock_total || 0);
      const siteActive = row.is_active === true;
      const siteExported = row.is_exported === true;
      const visible = siteActive && siteExported && siteStock > 0;
      const size = getFirstSize(payload);

      let status: MofficeExportRow["status"] = "OK";
      if (!hasCurrentMoffice) {
        status = visible ? "VISIBLE_BUT_MISSING_FROM_MOFFICE" : "MISSING_FROM_MOFFICE_HIDDEN";
      } else if (!size) {
        status = "MISSING_SIZE";
      } else if (Number(mofficeStock) <= 0) {
        status = visible ? "VISIBLE_WITH_WRONG_STOCK" : "ZERO_IN_MOFFICE_HIDDEN";
      } else if (!visible || siteStock !== Number(mofficeStock)) {
        status = "VISIBLE_WITH_WRONG_STOCK";
      }

      return {
        sku: normalizeKey(row.sku),
        ean: normalizeKey(row.ean),
        velicina: size,
        moffice_kolicina: mofficeStock,
        site_stock_total: siteStock,
        site_active: siteActive,
        site_exported: siteExported,
        status,
        legacy_id: Number(row.legacy_id),
        moffice_id: mofficeId,
        naziv: normalizeKey(row.name_sr),
        kategorija: normalizeKey(moffice.category || payload.category),
        last_synced_run: syncedRunId,
      };
    })
    .sort((left, right) => {
      const skuCompare = left.sku.localeCompare(right.sku, "sr", { numeric: true });
      if (skuCompare !== 0) return skuCompare;
      return left.velicina.localeCompare(right.velicina, "sr", { numeric: true });
    });
}

export async function loadMofficeExportRows(latestRunId?: string): Promise<{
  latestRunId: string;
  rows: MofficeExportRow[];
}> {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase service role client is not configured.");

  let runId = latestRunId || "";
  if (!runId) {
    const { data, error } = await supabase
      .from("integration_sync_runs")
      .select("id")
      .eq("domain", "stock_inbound")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Latest mOffice run load failed: ${error.message}`);
    runId = String((data as Record<string, unknown> | null)?.id || "");
  }
  if (!runId) throw new Error("No successful mOffice sync run found.");

  const rows = await loadAllCatalogRows<MofficePostSyncRow>(
    supabase,
    "legacy_id,sku,ean,name_sr,is_active,is_exported,stock_total,stock_warehouse_1,raw_payload",
  );

  return {
    latestRunId: runId,
    rows: buildMofficeExportRows({ rows, latestRunId: runId }),
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
    const allItems = await input.loadItems();
    if (!Array.isArray(allItems)) throw new Error("mOffice payload must be an array.");

    // Separate voucher articles from regular catalog products
    const items = allItems.filter((item) => !isVoucherItem(item));
    const syncedVouchers = await syncVouchersFromItems(allItems).catch((err) =>
      console.error("[moffice] voucher sync failed:", err) ?? 0,
    );

    const debugItems = buildDebugItems(items);
    const pulledRows = buildMofficePulledRows(items);

    const existingRaw = await loadAllCatalogRows<MofficeExistingRow>(
      supabase,
      "legacy_id,sku,ean,name_sr,raw_payload,price_net,price_gross,price_final_gross,rebate_percent",
    );

    const plan = buildMofficeSyncPlan({
      items,
      existing: (existingRaw ?? []) as unknown as MofficeExistingRow[],
      runId: run.id,
    });

    for (const [index, batch] of chunkArray(pulledRows, 250).entries()) {
      await addSyncRunItem(run.id, {
        domain: "stock_inbound",
        entityType: "moffice_feed",
        entityId: `feed-${index + 1}`,
        status: "success",
        message: `mOffice feed rows ${index * 250 + 1}-${index * 250 + batch.length}`,
        payloadHash: null,
        payload: { rows: batch },
        response: { rowCount: batch.length },
      });
    }

    // Re-read current categories from DB just before upserting to prevent
    // a race condition where an admin saves categories while the sync is
    // running — the plan was built from a snapshot taken at sync start.
    const upsertLegacyIds = plan.rows.map((row) => Number(row.legacy_id)).filter((id) => Number.isFinite(id) && id > 0);
    const currentCategoriesById = new Map<number, unknown[]>();
    for (const idChunk of chunkArray(upsertLegacyIds, 500)) {
      const { data: catRows } = await supabase
        .from("catalog_products")
        .select("legacy_id,raw_payload")
        .in("legacy_id", idChunk);
      for (const row of catRows || []) {
        const id = Number((row as Record<string, unknown>).legacy_id);
        const payload = getRawPayload((row as Record<string, unknown>).raw_payload);
        const cats = Array.isArray(payload.categories) ? payload.categories : [];
        if (cats.length > 0) currentCategoriesById.set(id, cats);
      }
    }
    const rowsToUpsert = plan.rows.map((row) => {
      const cats = currentCategoriesById.get(Number(row.legacy_id));
      if (!cats) return row;
      return { ...row, raw_payload: { ...getRawPayload(row.raw_payload), categories: cats } };
    });

    let upserted = 0;
    const chunkSize = 100;
    for (let i = 0; i < rowsToUpsert.length; i += chunkSize) {
      const batch = rowsToUpsert.slice(i, i + chunkSize);
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

    const copiedMediaRows = await copySkuMediaToActiveMofficeRows(
      supabase,
      plan.rows,
      existingRaw as MofficeExistingRow[],
    );
    // Second pass: share a model's photos across its in-stock variants (legacy
    // manufcode behaviour) for rows the SKU copy could not fill.
    const copiedModelMediaRows = await copyModelCodeMediaToActiveRows(
      supabase,
      plan.rows,
      existingRaw as MofficeExistingRow[],
    );

    let deactivated = 0;
    const upsertIds = new Set(
      plan.rows
        .map((row) => Number(row.legacy_id))
        .filter((legacyId) => Number.isFinite(legacyId)),
    );
    const staleIds = new Set(
      [...plan.staleLegacyIds, ...plan.duplicateLegacyIds].filter((legacyId) => !upsertIds.has(legacyId)),
    );
    const initialStaleIds = Array.from(staleIds);
    for (let i = 0; i < initialStaleIds.length; i += chunkSize) {
      const ids = initialStaleIds.slice(i, i + chunkSize);
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

    const postSyncRaw = await loadAllCatalogRows<MofficePostSyncRow>(
      supabase,
      "legacy_id,sku,ean,name_sr,is_active,is_exported,stock_total,stock_warehouse_1,raw_payload",
    );

    // A row we just upserted this run carries fresh mOffice stock and must NEVER be
    // deactivated by the stale cleanup. Without this guard, duplicate legacy rows for
    // the same variant (small legacy id + EAN-derived id from different import
    // generations) caused upserted-in-stock rows to be zeroed in the same run, hiding
    // ~600 products that mOffice actually has on stock.
    const postSyncStaleIds = excludeProtectedStaleIds(
      buildPostSyncStaleIds((postSyncRaw ?? []) as unknown as MofficePostSyncRow[], run.id),
      [...staleIds, ...upsertIds],
    );

    for (let i = 0; i < postSyncStaleIds.length; i += chunkSize) {
      const ids = postSyncStaleIds.slice(i, i + chunkSize);
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
          entityType: "moffice_post_sync_stale_cleanup",
          entityId: `post-cleanup-${i / chunkSize}`,
          status: "failed",
          message: error.message,
          payloadHash: null,
          payload: { ids },
          response: null,
        });
        continue;
      }
      deactivated += ids.length;
      ids.forEach((id) => staleIds.add(id));
    }

    const exportRows = buildMofficeExportRows({
      rows: postSyncRaw as MofficePostSyncRow[],
      latestRunId: run.id,
    });
    const visibleMismatchRows = exportRows.filter(
      (row) => row.status === "VISIBLE_BUT_MISSING_FROM_MOFFICE" || row.status === "VISIBLE_WITH_WRONG_STOCK",
    ).length;

    invalidateCatalogCaches();
    const counters: SyncCounters = {
      total: plan.counters.total,
      success: upserted + deactivated,
      failed: plan.rows.length - upserted,
      skipped: 0,
    };
    const status = counters.failed > 0 ? "partial_success" : "success";
    const summary = `mOffice synced ${upserted} rows, deactivated ${deactivated} stale rows (${plan.counters.matched} matched, ${plan.counters.created} new).${syncedVouchers ? ` Vouchers: ${syncedVouchers}.` : ""}`;
    await completeSyncRun(run.id, {
      status,
      counters,
      summary,
      meta: {
        source,
        feedRows: plan.counters.total,
        total: plan.counters.total,
        upsertRows: upserted,
        hiddenRows: deactivated,
        visibleMismatchRows,
        copiedMediaRows,
        copiedModelMediaRows,
        rows: plan.counters.rows,
        matched: plan.counters.matched,
        created: plan.counters.created,
        stale: plan.counters.stale,
        duplicates: plan.counters.duplicates,
        postSyncStale: postSyncStaleIds.length,
        deactivated,
        syncedVouchers,
        debugItems,
      },
    });
    return {
      runId: run.id,
      status,
      total: plan.counters.total,
      feedRows: plan.counters.total,
      upserted,
      upsertRows: upserted,
      matched: plan.counters.matched,
      created: plan.counters.created,
      stale: plan.counters.stale,
      duplicates: plan.counters.duplicates,
      postSyncStale: postSyncStaleIds.length,
      hiddenRows: deactivated,
      visibleMismatchRows,
      copiedMediaRows,
      copiedModelMediaRows,
      deactivated,
      syncedVouchers,
      debugItems,
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
