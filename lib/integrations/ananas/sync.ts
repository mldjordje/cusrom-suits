/**
 * Ananas sync, split into the phases the platform actually expects.
 *
 *   catalog   → POST import      : new/changed products handed to the listing team (1×/day)
 *   listings  → GET products     : pull merchantInventoryId + warehouse + status
 *   prices    → PUT product/bulk : base price, "today for tomorrow", frozen during campaigns
 *   stock     → PUT product/bulk : quantities, immediate, min 15 min apart, merchant warehouse only
 *   discounts → discounts API    : SALE windows with duration/cooldown/overlap rules
 *   publish   → publish/unpublish: opt-in, gated behind ANANAS_AUTO_PUBLISH
 *
 * Each phase is independent: one failing phase never blocks the rest, and every
 * skip is recorded with a reason so the admin run view explains itself.
 */
import {
  cancelAnanasDiscountFor,
  getAnanasProductsFor,
  importAnanasProductsFor,
  publishAnanasProductsFor,
  scheduleAnanasDiscountsFor,
  unpublishAnanasProductsFor,
  updateAnanasDiscountsFor,
  updateAnanasProductsFor,
} from "@/lib/integrations/ananas/client";
import {
  allowInternalEanFromEnv,
  mapCatalogToAnanas,
  type MapperRejection,
} from "@/lib/integrations/ananas/mapper";
import {
  ANANAS_LIMITS,
  addDays,
  basePriceEffectiveDay,
  canUpdateBasePrice,
  chunkPayload,
  formatAnanasDate,
  parseAnanasDate,
  startOfDay,
  validateDiscountWindow,
} from "@/lib/integrations/ananas/rules";
import type {
  AnanasDiscountInput,
  AnanasDiscountUpdateInput,
  AnanasProductRemote,
  AnanasProductUpdateInput,
  AnanasScheduleResponse,
} from "@/lib/integrations/ananas/types";
import { listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import { createPayloadHash } from "@/lib/integrations/core/hash";
import {
  addSyncRunItem,
  deactivateAnanasDiscountStateByDiscountId,
  getDeltaHash,
  listAnanasDiscountStates,
  listAnanasProductStates,
  setDeltaState,
  upsertAnanasDiscountState,
  upsertAnanasProductState,
  type AnanasProductStateRecord,
} from "@/lib/integrations/core/store";
import type { IntegrationContext, SyncCounters } from "@/lib/integrations/core/types";

export type AnanasPhase = "catalog" | "listings" | "prices" | "stock" | "discounts" | "publish";

/** Cron default. `catalog` runs on its own once-a-day schedule. */
export const DEFAULT_ANANAS_PHASES: AnanasPhase[] = ["listings", "stock", "prices", "discounts"];

export const ALL_ANANAS_PHASES: AnanasPhase[] = [
  "catalog",
  "listings",
  "prices",
  "stock",
  "discounts",
  "publish",
];

export const parseAnanasPhases = (value: unknown): AnanasPhase[] => {
  const raw = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((entry) => entry.trim());
  const phases = raw.filter((entry): entry is AnanasPhase =>
    ALL_ANANAS_PHASES.includes(entry as AnanasPhase),
  );
  return phases.length ? phases : DEFAULT_ANANAS_PHASES;
};

/**
 * Restricts a run to specific mOffice SKUs — used for the pilot Ananas asked
 * for ("posaljete par proizvoda preko Add products", SKU 133342 / 133856)
 * without touching the rest of the catalog.
 */
export const parseSkuFilter = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return raw.map((entry) => String(entry).trim()).filter(Boolean);
};

/** Kept well under the 30.000 API ceiling so one bad row fails a small batch. */
const EDIT_BATCH_SIZE = 500;
const DISCOUNT_BATCH_SIZE = ANANAS_LIMITS.discounts.maxItems;

const SALE_WINDOW_DAYS = (() => {
  const parsed = Number(process.env.ANANAS_SALE_WINDOW_DAYS || 7);
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(30, Math.max(1, Math.floor(parsed)));
})();

const autoPublishEnabled = () =>
  String(process.env.ANANAS_AUTO_PUBLISH || "").trim().toLowerCase() === "true";

const toFixed = (value: number, digits = 2) =>
  Number.parseFloat(Number(value || 0).toFixed(digits));

const emptyCounters = (): SyncCounters => ({ total: 0, success: 0, failed: 0, skipped: 0 });

const mergeCounters = (base: SyncCounters, next: SyncCounters): SyncCounters => ({
  total: base.total + next.total,
  success: base.success + next.success,
  failed: base.failed + next.failed,
  skipped: base.skipped + next.skipped,
});

type PhaseResult = {
  counters: SyncCounters;
  meta: Record<string, unknown>;
};

type PhaseInput = {
  context: IntegrationContext;
  items: CatalogProductView[];
  stateByLegacyId: Map<number, AnanasProductStateRecord>;
  now: Date;
  /** True when the run was narrowed to specific SKUs, so `items` is not the
   *  full picture and phases must not infer anything from what's missing. */
  skuScoped: boolean;
};

/* ---------------------------------------------------------------- catalog */

/**
 * Hands new/changed products to the listing team. Products without a real GTIN
 * are rejected locally — Ananas can only match on EAN, so sending our internal
 * 9-digit mOffice code would create garbage listings.
 */
async function phaseCatalog({ context, items, stateByLegacyId }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();
  const allowInternalEan = allowInternalEanFromEnv();
  const visible = items.filter((item) => !item.hiddenFromShop);
  const { products, rejected } = mapCatalogToAnanas(visible, { allowInternalEan });

  counters.total = visible.length;
  counters.skipped += rejected.length;

  const pending: typeof products = [];
  for (const product of products) {
    const state = stateByLegacyId.get(product.legacyId);
    const payloadHash = createPayloadHash(product.payload);
    const previousHash =
      context.mode === "delta" ? await getDeltaHash("ananas", "product", String(product.legacyId)) : null;

    // Already listed and unchanged → nothing for the listing team to do.
    if (context.mode === "delta" && previousHash === payloadHash && state?.merchantInventoryId) {
      counters.skipped += 1;
      continue;
    }
    pending.push(product);
  }

  if (!pending.length) {
    return {
      counters,
      meta: {
        catalogCandidates: visible.length,
        catalogRejected: rejected.length,
        catalogRejectedSample: summarizeRejections(rejected),
        catalogSent: 0,
      },
    };
  }

  const batches = chunkPayload(
    pending,
    { maxItems: ANANAS_LIMITS.import.maxItems, maxBytes: ANANAS_LIMITS.import.maxBytes },
  );

  for (const batch of batches) {
    try {
      const response = await importAnanasProductsFor(
        batch.map((entry) => entry.payload),
        context.environment,
      );
      for (const entry of batch) {
        const hash = createPayloadHash(entry.payload);
        await setDeltaState("ananas", "product", String(entry.legacyId), hash, context.runId);
        await upsertAnanasProductState({
          legacyProductId: entry.legacyId,
          externalId: String(entry.legacyId),
          payloadHash: hash,
          ananasStatus: "SUBMITTED_FOR_LISTING",
          syncError: null,
        });
        counters.success += 1;
      }
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "catalog_batch",
        entityId: String((response as { id?: string })?.id || batch[0]?.legacyId || "batch"),
        status: "success",
        message: `Catalog batch of ${batch.length} products submitted for listing.`,
        payloadHash: createPayloadHash(batch.map((entry) => entry.legacyId)),
        payload: { count: batch.length, legacyIds: batch.slice(0, 50).map((entry) => entry.legacyId) },
        response: (response as Record<string, unknown>) || null,
      });
    } catch (error: any) {
      counters.failed += batch.length;
      const message = error?.message || "Catalog import failed.";
      for (const entry of batch) {
        await upsertAnanasProductState({
          legacyProductId: entry.legacyId,
          externalId: String(entry.legacyId),
          ananasStatus: "IMPORT_ERROR",
          syncError: message,
        });
      }
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "catalog_batch",
        entityId: String(batch[0]?.legacyId || "batch"),
        status: "failed",
        message,
        payloadHash: createPayloadHash(batch.map((entry) => entry.legacyId)),
        payload: { count: batch.length, legacyIds: batch.slice(0, 50).map((entry) => entry.legacyId) },
        response: null,
      });
    }
  }

  for (const rejection of rejected.slice(0, 200)) {
    await addSyncRunItem(context.runId, {
      domain: "ananas",
      entityType: "product",
      entityId: String(rejection.legacyId),
      status: "skipped",
      message: rejection.reason,
      payloadHash: null,
      payload: { sku: rejection.sku, ean: rejection.ean },
      response: null,
    });
  }

  return {
    counters,
    meta: {
      catalogCandidates: visible.length,
      catalogRejected: rejected.length,
      catalogRejectedSample: summarizeRejections(rejected),
      catalogSent: pending.length,
      catalogBatches: batches.length,
    },
  };
}

const summarizeRejections = (rejections: MapperRejection[]) => {
  const byReason = new Map<string, number>();
  for (const rejection of rejections) {
    // Reasons embed the offending EAN; group on the prefix only.
    const key = rejection.reason.split("(")[0].trim();
    byReason.set(key, (byReason.get(key) || 0) + 1);
  }
  return Object.fromEntries([...byReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10));
};

/* --------------------------------------------------------------- listings */

/**
 * Recovers our legacy product id from a listed row.
 *
 * Ananas does NOT echo back `externalId` — verified against QA on 2026-07-31,
 * every listed row returns `externalId: null` (they also blank `ean` and issue
 * their own `ananasCode` instead). The only field that survives their listing
 * process is `sku`, which we submit as `<mOffice sku>_<legacyId>`, so the
 * suffix is what ties a listing back to our catalog.
 */
export const resolveLegacyProductId = (row: AnanasProductRemote): number => {
  const fromExternalId = Number(row?.externalId || 0);
  if (Number.isFinite(fromExternalId) && fromExternalId > 0) return fromExternalId;

  const sku = String(row?.sku || "").trim();
  const suffix = /_(\d+)$/.exec(sku);
  if (!suffix) return 0;
  const parsed = Number(suffix[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Pulls listed products and records merchantInventoryId + warehouse. The same
 * product can appear twice (merchant and Ananas warehouse) — both rows are
 * stored, but only the merchant one may receive stock updates.
 */
async function phaseListings({ context, stateByLegacyId }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();
  const size = ANANAS_LIMITS.getProducts.maxPageSize;
  const knownIds = new Set(
    [...stateByLegacyId.values()].map((state) => state.merchantInventoryId).filter(Boolean) as number[],
  );

  let page = 0;
  let fetched = 0;
  let stoppedEarly = false;
  const seen = new Set<number>();

  for (; page < 200; page += 1) {
    let rows: AnanasProductRemote[] = [];
    try {
      rows = await getAnanasProductsFor({ page, size }, context.environment);
    } catch (error: any) {
      counters.failed += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "listing_page",
        entityId: String(page),
        status: "failed",
        message: error?.message || "Failed to fetch listed products.",
        payloadHash: null,
        payload: { page, size },
        response: null,
      });
      break;
    }

    if (!rows.length) break;
    fetched += rows.length;

    let hitKnown = false;
    for (const row of rows) {
      const merchantInventoryId = Number(row?.id || 0);
      if (!merchantInventoryId || seen.has(merchantInventoryId)) continue;
      seen.add(merchantInventoryId);

      const legacyProductId = resolveLegacyProductId(row);
      if (!legacyProductId) {
        counters.skipped += 1;
        continue;
      }
      if (knownIds.has(merchantInventoryId)) hitKnown = true;

      await upsertAnanasProductState({
        legacyProductId,
        merchantInventoryId,
        externalId: String(row?.externalId ?? legacyProductId),
        ananasStatus: row?.status ? String(row.status) : "LISTED",
        warehouse: row?.warehouse ? String(row.warehouse) : null,
        remoteBasePrice: row?.basePrice == null ? null : Number(row.basePrice),
        remoteStockLevel: row?.stockLevel == null ? null : Number(row.stockLevel),
        syncError: null,
      });
      counters.success += 1;
    }

    // Results are newest-first: once we reach ids we already stored, the rest is
    // older and unchanged (their own pagination recommendation).
    if (context.mode === "delta" && hitKnown && page > 0) {
      stoppedEarly = true;
      break;
    }
    if (rows.length < size) break;
  }

  counters.total = fetched;
  return {
    counters,
    meta: { listingsFetched: fetched, listingsPages: page + 1, listingsStoppedEarly: stoppedEarly },
  };
}

/* ----------------------------------------------------------------- prices */

async function phasePrices({ context, items, stateByLegacyId, now }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();
  const discountStates = await listAnanasDiscountStates();
  const activeByMerchantId = buildActiveDiscountMap(discountStates, now);

  const rows: AnanasProductUpdateInput[] = [];
  const legacyIdByMerchantId = new Map<number, number>();

  for (const item of items) {
    const state = stateByLegacyId.get(item.legacyId);
    const merchantInventoryId = state?.merchantInventoryId || 0;
    if (!merchantInventoryId) continue;

    counters.total += 1;
    const basePrice = toFixed(item.priceGross || item.priceFinalGross, 2);
    if (!(basePrice > 0)) {
      counters.skipped += 1;
      continue;
    }

    // A running campaign freezes the base price on their side.
    const activeDiscount = activeByMerchantId.get(merchantInventoryId) || null;
    if (!canUpdateBasePrice(activeDiscount, now)) {
      counters.skipped += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "price",
        entityId: String(item.legacyId),
        status: "skipped",
        message: "Base price frozen while a discount campaign is running.",
        payloadHash: null,
        payload: { merchantInventoryId, basePrice },
        response: null,
      });
      continue;
    }

    const hash = createPayloadHash({ merchantInventoryId, basePrice });
    const previousHash =
      context.mode === "delta" ? await getDeltaHash("ananas", "price", String(item.legacyId)) : null;
    if (previousHash === hash && state?.remoteBasePrice === basePrice) {
      counters.skipped += 1;
      continue;
    }

    rows.push({ id: merchantInventoryId, basePrice });
    legacyIdByMerchantId.set(merchantInventoryId, item.legacyId);
  }

  const applied = await pushProductUpdates({
    context,
    rows,
    legacyIdByMerchantId,
    counters,
    entityType: "price",
    deltaScope: "price",
    hashOf: (row) => createPayloadHash({ merchantInventoryId: row.id, basePrice: row.basePrice }),
  });

  return {
    counters,
    meta: {
      priceRowsSent: rows.length,
      priceRowsApplied: applied,
      priceEffectiveFrom: basePriceEffectiveDay(now),
    },
  };
}

/* ------------------------------------------------------------------ stock */

/**
 * Should a listing that no longer appears in our catalog be zeroed out?
 *
 * Sold-out and deactivated products disappear from the catalog query (the
 * mOffice sync sets is_active/is_exported to `stock > 0`), so "missing from
 * items" is our only signal that they went away.
 */
export const shouldZeroOrphanStock = (
  state: Pick<AnanasProductStateRecord, "merchantInventoryId" | "warehouse" | "remoteStockLevel">,
  inCatalog: boolean,
): boolean => {
  if (inCatalog) return false;
  // Never listed, so there is nothing on their side to zero.
  if (!state.merchantInventoryId) return false;
  // Ananas-fulfilled inventory: their warehouse owns the quantity.
  if (state.warehouse === "ANANAS_WAREHOUSE") return false;
  // Already at zero on their side.
  if (state.remoteStockLevel === 0) return false;
  return true;
};

async function phaseStock({ context, items, stateByLegacyId, now, skuScoped }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();

  // Their rule: at most one stock push every 15 minutes.
  const lastPush = await getDeltaHash("ananas", "stock_push", context.environment);
  if (lastPush) {
    const elapsed = now.getTime() - new Date(lastPush).getTime();
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < ANANAS_LIMITS.stockMinIntervalMs) {
      return {
        counters,
        meta: {
          stockSkipped: "throttled",
          stockNextAllowedAt: new Date(
            new Date(lastPush).getTime() + ANANAS_LIMITS.stockMinIntervalMs,
          ).toISOString(),
        },
      };
    }
  }

  const rows: AnanasProductUpdateInput[] = [];
  const legacyIdByMerchantId = new Map<number, number>();
  let ananasWarehouseSkipped = 0;

  for (const item of items) {
    const state = stateByLegacyId.get(item.legacyId);
    const merchantInventoryId = state?.merchantInventoryId || 0;
    if (!merchantInventoryId) continue;

    counters.total += 1;

    // Fulfilled by Ananas → their warehouse owns the quantity.
    if (state?.warehouse === "ANANAS_WAREHOUSE") {
      ananasWarehouseSkipped += 1;
      counters.skipped += 1;
      continue;
    }

    // Hidden products stay listed but must not be sellable.
    const stockLevel = item.hiddenFromShop ? 0 : Math.max(0, Math.floor(item.stockWarehouse1 || 0));
    const hash = createPayloadHash({ merchantInventoryId, stockLevel });
    const previousHash =
      context.mode === "delta" ? await getDeltaHash("ananas", "stock", String(item.legacyId)) : null;
    if (previousHash === hash && state?.remoteStockLevel === stockLevel) {
      counters.skipped += 1;
      continue;
    }

    rows.push({ id: merchantInventoryId, stockLevel });
    legacyIdByMerchantId.set(merchantInventoryId, item.legacyId);
  }

  /**
   * Sold-out and deactivated products vanish from `items` entirely: the mOffice
   * sync sets is_active/is_exported to `stock > 0`, and the catalog query filters
   * on both. Without this pass their last known quantity would stay live on the
   * marketplace forever — Ananas would keep selling stock we do not have.
   * Their rule: "Ukoliko proizvod više nije dostupan potrebno je poslati količinu 0".
   *
   * Skipped for SKU-scoped runs, where `items` is deliberately a small subset and
   * everything else being "missing" means nothing.
   */
  let zeroedOrphans = 0;
  if (!skuScoped) {
    const inCatalog = new Set(items.map((item) => item.legacyId));
    for (const [legacyProductId, state] of stateByLegacyId) {
      if (!shouldZeroOrphanStock(state, inCatalog.has(legacyProductId))) continue;
      const merchantInventoryId = state.merchantInventoryId as number;

      const hash = createPayloadHash({ merchantInventoryId, stockLevel: 0 });
      const previousHash =
        context.mode === "delta" ? await getDeltaHash("ananas", "stock", String(legacyProductId)) : null;
      if (previousHash === hash) continue;

      counters.total += 1;
      zeroedOrphans += 1;
      rows.push({ id: merchantInventoryId, stockLevel: 0 });
      legacyIdByMerchantId.set(merchantInventoryId, legacyProductId);
    }
  }

  const applied = await pushProductUpdates({
    context,
    rows,
    legacyIdByMerchantId,
    counters,
    entityType: "stock",
    deltaScope: "stock",
    hashOf: (row) => createPayloadHash({ merchantInventoryId: row.id, stockLevel: row.stockLevel }),
  });

  if (rows.length) {
    await setDeltaState("ananas", "stock_push", context.environment, now.toISOString(), context.runId);
  }

  return {
    counters,
    meta: {
      stockRowsSent: rows.length,
      stockRowsApplied: applied,
      stockAnanasWarehouseSkipped: ananasWarehouseSkipped,
      stockZeroedOrphans: zeroedOrphans,
    },
  };
}

/* ------------------------------------------------- shared bulk-update push */

async function pushProductUpdates(input: {
  context: IntegrationContext;
  rows: AnanasProductUpdateInput[];
  legacyIdByMerchantId: Map<number, number>;
  counters: SyncCounters;
  entityType: "price" | "stock";
  deltaScope: "price" | "stock";
  hashOf: (row: AnanasProductUpdateInput) => string;
}) {
  const { context, rows, legacyIdByMerchantId, counters, entityType, deltaScope, hashOf } = input;
  if (!rows.length) return 0;

  let applied = 0;
  const batches = chunkPayload(rows, {
    maxItems: EDIT_BATCH_SIZE,
    maxBytes: ANANAS_LIMITS.editProducts.maxBytes,
  });

  for (const batch of batches) {
    try {
      const results = await updateAnanasProductsFor(batch, context.environment);
      const failureByProductId = new Map<number, string>();
      for (const result of results) {
        const productId = Number(result?.myProductId || 0);
        const failed = String(result?.status || "").toUpperCase() !== "SUCCESS";
        if (productId && failed) {
          failureByProductId.set(productId, JSON.stringify(result?.errors || result?.status || "unknown error"));
        }
      }

      for (const row of batch) {
        const legacyId = legacyIdByMerchantId.get(row.id) || 0;
        const failure = failureByProductId.get(row.id);
        if (failure) {
          counters.failed += 1;
          await addSyncRunItem(context.runId, {
            domain: "ananas",
            entityType,
            entityId: String(legacyId || row.id),
            status: "failed",
            message: `Ananas rejected the ${entityType} update: ${failure}`.slice(0, 500),
            payloadHash: hashOf(row),
            payload: row as unknown as Record<string, unknown>,
            response: null,
          });
          continue;
        }

        applied += 1;
        counters.success += 1;
        if (legacyId) {
          await setDeltaState("ananas", deltaScope, String(legacyId), hashOf(row), context.runId);
          await upsertAnanasProductState({
            legacyProductId: legacyId,
            merchantInventoryId: row.id,
            ...(entityType === "price" ? { remoteBasePrice: row.basePrice ?? null } : {}),
            ...(entityType === "stock" ? { remoteStockLevel: row.stockLevel ?? null } : {}),
            syncError: null,
          });
        }
      }

      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: `${entityType}_batch`,
        entityId: String(batch[0]?.id || "batch"),
        status: failureByProductId.size ? "failed" : "success",
        message: `${entityType} batch: ${batch.length - failureByProductId.size}/${batch.length} applied.`,
        payloadHash: createPayloadHash(batch.map((row) => row.id)),
        payload: { count: batch.length },
        response: { results: results.slice(0, 50) } as unknown as Record<string, unknown>,
      });
    } catch (error: any) {
      counters.failed += batch.length;
      const message = error?.message || `${entityType} update failed.`;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: `${entityType}_batch`,
        entityId: String(batch[0]?.id || "batch"),
        status: "failed",
        message,
        payloadHash: createPayloadHash(batch.map((row) => row.id)),
        payload: { count: batch.length, ids: batch.slice(0, 50).map((row) => row.id) },
        response: null,
      });
    }
  }

  return applied;
}

/* -------------------------------------------------------------- discounts */

type ActiveDiscount = { dateFrom: Date; dateTo: Date; price: number; discountId: string | null; type: string };

const buildActiveDiscountMap = (
  states: Awaited<ReturnType<typeof listAnanasDiscountStates>>,
  now: Date,
) => {
  const today = startOfDay(now).getTime();
  const map = new Map<number, ActiveDiscount>();
  for (const state of states) {
    if (!state.active) continue;
    const from = parseAnanasDate(state.dateFrom);
    const to = parseAnanasDate(state.dateTo);
    if (!from || !to) continue;
    if (startOfDay(to).getTime() < today) continue; // finished
    const existing = map.get(state.merchantInventoryId);
    // Keep the campaign that is running (or starts soonest).
    if (existing && startOfDay(existing.dateFrom).getTime() <= startOfDay(from).getTime()) continue;
    map.set(state.merchantInventoryId, {
      dateFrom: from,
      dateTo: to,
      price: state.discountPrice,
      discountId: state.discountId,
      type: state.discountType,
    });
  }
  return map;
};

const lastFinishedDiscountEnd = (
  states: Awaited<ReturnType<typeof listAnanasDiscountStates>>,
  now: Date,
) => {
  const today = startOfDay(now).getTime();
  const map = new Map<number, Date>();
  for (const state of states) {
    const to = parseAnanasDate(state.dateTo);
    if (!to) continue;
    if (startOfDay(to).getTime() >= today) continue;
    const existing = map.get(state.merchantInventoryId);
    if (!existing || existing.getTime() < to.getTime()) map.set(state.merchantInventoryId, to);
  }
  return map;
};

async function phaseDiscounts({ context, items, stateByLegacyId, now }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();
  const discountStates = await listAnanasDiscountStates();
  const activeByMerchantId = buildActiveDiscountMap(discountStates, now);
  const lastEndByMerchantId = lastFinishedDiscountEnd(discountStates, now);

  const dateFrom = startOfDay(now);
  const dateTo = addDays(now, SALE_WINDOW_DAYS - 1);
  const fromDisplay = formatAnanasDate(dateFrom);
  const toDisplay = formatAnanasDate(dateTo);

  const toCreate: AnanasDiscountInput[] = [];
  const toUpdate: AnanasDiscountUpdateInput[] = [];
  const toCancel: { discountId: string; merchantInventoryId: number; legacyId: number }[] = [];
  const legacyIdByMerchantId = new Map<number, number>();
  const priceByMerchantId = new Map<number, number>();
  const skipped: Record<string, number> = {};
  const noteSkip = (reason: string) => {
    skipped[reason] = (skipped[reason] || 0) + 1;
    counters.skipped += 1;
  };

  for (const item of items) {
    const state = stateByLegacyId.get(item.legacyId);
    const merchantInventoryId = state?.merchantInventoryId || 0;
    if (!merchantInventoryId) continue;

    const basePrice = toFixed(item.priceGross, 2);
    const discountPrice = toFixed(item.priceFinalGross, 2);
    const wantsDiscount = !item.hiddenFromShop && basePrice > discountPrice && discountPrice > 0;
    const active = activeByMerchantId.get(merchantInventoryId) || null;
    legacyIdByMerchantId.set(merchantInventoryId, item.legacyId);

    if (!wantsDiscount) {
      if (active?.discountId) {
        toCancel.push({ discountId: active.discountId, merchantInventoryId, legacyId: item.legacyId });
      }
      continue;
    }

    counters.total += 1;
    priceByMerchantId.set(merchantInventoryId, discountPrice);

    if (!active) {
      const validation = validateDiscountWindow({
        discountType: "SALE",
        dateFrom,
        dateTo,
        basePrice,
        discountPrice,
        previousDateTo: lastEndByMerchantId.get(merchantInventoryId) || null,
        today: now,
      });
      if (!validation.ok) {
        noteSkip(validation.reason);
        continue;
      }
      toCreate.push({
        merchantInventoryId,
        discountPrice,
        discountPriceCurrency: "RSD",
        dateFrom: fromDisplay,
        dateTo: toDisplay,
        discountType: "SALE",
      });
      continue;
    }

    if (!active.discountId) {
      noteSkip("campaign exists without a discountId");
      continue;
    }

    const started = startOfDay(active.dateFrom).getTime() <= startOfDay(now).getTime();
    if (started) {
      // Running campaign: price may only go down, dates and type must stay null.
      if (discountPrice >= active.price) {
        noteSkip("running campaign price can only be lowered");
        continue;
      }
      toUpdate.push({
        discountId: active.discountId,
        newDateFrom: null,
        newDateTo: null,
        newDiscountPrice: discountPrice,
        newDiscountPriceCurrency: "RSD",
        newDiscountType: null,
      });
      continue;
    }

    // Pending campaign: fully editable, but must still satisfy every rule.
    if (discountPrice === active.price && formatAnanasDate(active.dateTo) === toDisplay) {
      noteSkip("pending campaign already matches");
      continue;
    }
    const validation = validateDiscountWindow({
      discountType: "SALE",
      dateFrom: active.dateFrom,
      dateTo,
      basePrice,
      discountPrice,
      previousDateTo: lastEndByMerchantId.get(merchantInventoryId) || null,
      today: now,
    });
    if (!validation.ok) {
      noteSkip(validation.reason);
      continue;
    }
    toUpdate.push({
      discountId: active.discountId,
      newDateFrom: formatAnanasDate(active.dateFrom),
      newDateTo: toDisplay,
      newDiscountPrice: discountPrice,
      newDiscountPriceCurrency: "RSD",
      newDiscountType: "SALE",
    });
  }

  /* create */
  for (const batch of chunkPayload(toCreate, { maxItems: DISCOUNT_BATCH_SIZE })) {
    try {
      const response = (await scheduleAnanasDiscountsFor(batch, context.environment)) as AnanasScheduleResponse;
      const discountIdByMerchant = new Map<number, string>();
      const errorByMerchant = new Map<number, string>();
      for (const entry of response?.scheduleResult || []) {
        const merchantInventoryId = Number(entry?.data?.merchantInventoryId || 0);
        if (!merchantInventoryId) continue;
        if (entry?.success && entry?.data?.discountId) {
          discountIdByMerchant.set(merchantInventoryId, String(entry.data.discountId));
        } else {
          errorByMerchant.set(merchantInventoryId, String(entry?.error?.errorMessage || "rejected"));
        }
      }

      for (const row of batch) {
        const legacyId = legacyIdByMerchantId.get(row.merchantInventoryId) || 0;
        const discountId = discountIdByMerchant.get(row.merchantInventoryId) || null;
        const error = errorByMerchant.get(row.merchantInventoryId);
        await upsertAnanasDiscountState({
          legacyProductId: legacyId,
          merchantInventoryId: row.merchantInventoryId,
          discountId,
          discountType: row.discountType,
          discountPrice: row.discountPrice,
          discountPriceCurrency: row.discountPriceCurrency,
          dateFrom: row.dateFrom,
          dateTo: row.dateTo,
          active: Boolean(discountId),
        });
        if (discountId || (!error && !discountIdByMerchant.size)) {
          counters.success += 1;
        } else {
          counters.failed += 1;
        }
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "discount",
          entityId: String(legacyId || row.merchantInventoryId),
          status: discountId ? "success" : "failed",
          message: discountId ? "Discount scheduled." : `Discount rejected: ${error || "unknown"}`,
          payloadHash: createPayloadHash(row),
          payload: row as unknown as Record<string, unknown>,
          response: (response as unknown as Record<string, unknown>) || null,
        });
      }
    } catch (error: any) {
      counters.failed += batch.length;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_batch",
        entityId: String(batch[0]?.merchantInventoryId || "batch"),
        status: "failed",
        message: error?.message || "Discount schedule failed.",
        payloadHash: createPayloadHash(batch),
        payload: { count: batch.length },
        response: null,
      });
    }
  }

  /* update */
  for (const batch of chunkPayload(toUpdate, { maxItems: DISCOUNT_BATCH_SIZE })) {
    try {
      const response = await updateAnanasDiscountsFor(batch, context.environment);
      for (const row of batch) {
        counters.success += 1;
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "discount_update",
          entityId: row.discountId,
          status: "success",
          message: "Discount updated.",
          payloadHash: createPayloadHash(row),
          payload: row as unknown as Record<string, unknown>,
          response: (response as Record<string, unknown>) || null,
        });
      }
    } catch (error: any) {
      counters.failed += batch.length;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_update_batch",
        entityId: String(batch[0]?.discountId || "batch"),
        status: "failed",
        message: error?.message || "Discount update failed.",
        payloadHash: createPayloadHash(batch),
        payload: { count: batch.length },
        response: null,
      });
    }
  }

  /* cancel */
  for (const row of toCancel) {
    try {
      const response = await cancelAnanasDiscountFor(row.discountId, context.environment);
      await deactivateAnanasDiscountStateByDiscountId(row.discountId);
      counters.success += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_cancel",
        entityId: String(row.legacyId || row.discountId),
        status: "success",
        message: "Discount cancelled.",
        payloadHash: createPayloadHash(row),
        payload: row as unknown as Record<string, unknown>,
        response: (response as Record<string, unknown>) || null,
      });
    } catch (error: any) {
      counters.failed += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_cancel",
        entityId: String(row.legacyId || row.discountId),
        status: "failed",
        message: error?.message || "Discount cancellation failed.",
        payloadHash: createPayloadHash(row),
        payload: row as unknown as Record<string, unknown>,
        response: null,
      });
    }
  }

  return {
    counters,
    meta: {
      discountWindow: `${fromDisplay} → ${toDisplay}`,
      discountsCreated: toCreate.length,
      discountsUpdated: toUpdate.length,
      discountsCancelled: toCancel.length,
      discountsSkipped: skipped,
    },
  };
}

/* ---------------------------------------------------------------- publish */

/**
 * Opt-in: flips READY_FOR_PUBLISH listings live and pulls hidden/out-of-stock
 * ones back. Off by default so nothing goes public without a deliberate switch.
 */
async function phasePublish({ context, items, stateByLegacyId }: PhaseInput): Promise<PhaseResult> {
  const counters = emptyCounters();
  if (!autoPublishEnabled()) {
    return { counters, meta: { publishSkipped: "ANANAS_AUTO_PUBLISH is not enabled" } };
  }

  const toPublish: number[] = [];
  const toUnpublish: number[] = [];

  for (const item of items) {
    const state = stateByLegacyId.get(item.legacyId);
    const merchantInventoryId = state?.merchantInventoryId || 0;
    if (!merchantInventoryId) continue;
    counters.total += 1;

    const status = String(state?.ananasStatus || "").toUpperCase();
    const sellable = !item.hiddenFromShop && (item.stockWarehouse1 || 0) > 0;

    if (sellable && (status === "READY_FOR_PUBLISH" || status === "UNPUBLISHED")) {
      toPublish.push(merchantInventoryId);
    } else if (!sellable && status === "PUBLISHED") {
      toUnpublish.push(merchantInventoryId);
    } else {
      counters.skipped += 1;
    }
  }

  for (const [ids, action] of [
    [toPublish, "publish"],
    [toUnpublish, "unpublish"],
  ] as const) {
    for (const batch of chunkPayload(ids, { maxItems: EDIT_BATCH_SIZE })) {
      try {
        const response =
          action === "publish"
            ? await publishAnanasProductsFor(batch, context.environment)
            : await unpublishAnanasProductsFor(batch, context.environment);
        counters.success += batch.length;
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: `${action}_batch`,
          entityId: String(batch[0] || "batch"),
          status: "success",
          message: `${action} requested for ${batch.length} products (async on their side).`,
          payloadHash: createPayloadHash(batch),
          payload: { count: batch.length, ids: batch.slice(0, 50) },
          response: (response as Record<string, unknown>) || null,
        });
      } catch (error: any) {
        counters.failed += batch.length;
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: `${action}_batch`,
          entityId: String(batch[0] || "batch"),
          status: "failed",
          message: error?.message || `${action} failed.`,
          payloadHash: createPayloadHash(batch),
          payload: { count: batch.length },
          response: null,
        });
      }
    }
  }

  return { counters, meta: { published: toPublish.length, unpublished: toUnpublish.length } };
}

/* ------------------------------------------------------------- entrypoint */

type RunAnanasOptions = {
  context: IntegrationContext;
  phases?: AnanasPhase[];
  /** Restrict every phase to these mOffice SKUs (pilot/manual test runs). */
  skus?: string[];
};

/**
 * listCatalogProducts silently clamps pageSize to 120 (see scanCatalogMediaHealth
 * for the same pattern) — one call can never return the full catalog, so we
 * page through it. collapseBySku stays off: each row here must remain one
 * size/color variant, since that is exactly the granularity Ananas expects.
 */
async function loadFullCatalogForAnanas(options: {
  /**
   * Restrict to products admin explicitly flagged "Posalji na Ananas" in
   * /admin/webshop — separate from `isExported`, which drives the storefront
   * and is overwritten by every mOffice sync (stock > 0). Skipped for
   * SKU-scoped test runs, since naming exact SKUs is itself the curation.
   */
  ananasExportOnly: boolean;
}): Promise<{ items: CatalogProductView[]; totalCount: number }> {
  const items: CatalogProductView[] = [];
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;
  do {
    const listed = await listCatalogProducts({
      page,
      pageSize: 120,
      activeOnly: true,
      exportOnly: true,
      ananasExportOnly: options.ananasExportOnly,
      includeHidden: true,
      applyPromotions: false,
    });
    items.push(...listed.items);
    totalCount = Number(listed.total) || items.length;
    totalPages = Math.max(1, Number(listed.totalPages) || 1);
    page += 1;
  } while (page <= totalPages && page <= 200);
  return { items, totalCount };
}

export async function runAnanasSync({ context, phases, skus }: RunAnanasOptions) {
  const selected = phases?.length ? phases : DEFAULT_ANANAS_PHASES;
  const now = new Date();

  const skuFilter = skus?.length ? new Set(skus) : null;
  const catalog = await loadFullCatalogForAnanas({ ananasExportOnly: !skuFilter });
  const items = skuFilter ? catalog.items.filter((item) => skuFilter.has(item.sku)) : catalog.items;

  const states = await listAnanasProductStates();
  const stateByLegacyId = new Map(states.map((state) => [state.legacyProductId, state]));
  const input: PhaseInput = { context, items, stateByLegacyId, now, skuScoped: Boolean(skuFilter) };

  const runners: Record<AnanasPhase, (phaseInput: PhaseInput) => Promise<PhaseResult>> = {
    catalog: phaseCatalog,
    listings: phaseListings,
    prices: phasePrices,
    stock: phaseStock,
    discounts: phaseDiscounts,
    publish: phasePublish,
  };

  let counters = emptyCounters();
  const meta: Record<string, unknown> = {
    phases: selected,
    catalogCount: items.length,
    catalogTotalCount: catalog.totalCount,
    skuFilter: skuFilter ? [...skuFilter] : null,
    ananasExportOnly: !skuFilter,
    listedCount: states.filter((state) => state.merchantInventoryId).length,
  };

  for (const phase of selected) {
    try {
      // `listings` refreshes the map the later phases read from.
      const result = await runners[phase]({ ...input, stateByLegacyId });
      counters = mergeCounters(counters, result.counters);
      Object.assign(meta, result.meta);
      if (phase === "listings") {
        const refreshed = await listAnanasProductStates();
        stateByLegacyId.clear();
        for (const state of refreshed) stateByLegacyId.set(state.legacyProductId, state);
        meta.listedCount = refreshed.filter((state) => state.merchantInventoryId).length;
      }
    } catch (error: any) {
      counters.failed += 1;
      meta[`${phase}Error`] = error?.message || String(error);
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "phase",
        entityId: phase,
        status: "failed",
        message: error?.message || `Phase ${phase} failed.`,
        payloadHash: null,
        payload: { phase },
        response: null,
      });
    }
  }

  return { counters, meta };
}
