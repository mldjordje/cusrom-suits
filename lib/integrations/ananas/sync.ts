import {
  cancelAnanasDiscountFor,
  getAnanasDiscountsFor,
  getAnanasProductsFor,
  importAnanasProductsFor,
  scheduleAnanasDiscountsFor,
  updateAnanasDiscountsFor,
} from "@/lib/integrations/ananas/client";
import { type AnanasDiscountInput, type AnanasDiscountUpdateInput } from "@/lib/integrations/ananas/types";
import { listCatalogProducts } from "@/lib/catalog/store";
import { createPayloadHash } from "@/lib/integrations/core/hash";
import {
  addSyncRunItem,
  deactivateAnanasDiscountStateByDiscountId,
  getDeltaHash,
  setDeltaState,
  upsertAnanasDiscountState,
  upsertAnanasProductState,
} from "@/lib/integrations/core/store";
import type { IntegrationContext, SyncCounters } from "@/lib/integrations/core/types";
import type { AnanasImportProduct } from "@/lib/legacy/types";

type RunAnanasOptions = {
  context: IntegrationContext;
};

const toFixed = (value: number, digits = 2) => Number.parseFloat(Number(value || 0).toFixed(digits));

const toAnanasProduct = (item: Awaited<ReturnType<typeof listCatalogProducts>>["items"][number]): AnanasImportProduct => {
  const category = item.categories[0]?.name || "Ostalo";
  const stock = Math.max(0, Math.floor(item.stockWarehouse1 || 0));
  const attributes: Record<string, string[]> = {};
  const sizes = item.attributes?.size;
  if (Array.isArray(sizes) && sizes.length) {
    attributes["Velicina"] = sizes.map((entry) => String(entry));
  }
  return {
    name: item.name || item.sku,
    description: item.description || item.name || item.sku,
    coverImage: item.coverImage || "https://santos.rs/fajlovi/product/no-image.jpg",
    ean: item.ean || item.sku,
    brand: item.brand || "Santos&Santorini",
    gallery: item.images?.length ? item.images : item.coverImage ? [item.coverImage] : [],
    parentEan: item.ean || item.sku,
    packageWeightValue: "0.52",
    packageWeightUnit: "kg",
    basePrice: toFixed(item.priceGross || item.priceFinalGross, 2).toFixed(2),
    vat: toFixed(item.taxPercent || 20, 2).toFixed(2),
    stockLevel: stock,
    sku: item.sku,
    externalId: item.legacyId,
    productType: category,
    category,
    attributes,
  };
};

const normalizeDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const normalizeIsoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseDiscountRows = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.discounts)) return payload.discounts;
  return [];
};

const parseScheduleResults = (payload: any): Array<{ merchantInventoryId: number; discountId: string }> => {
  const rows: any[] = Array.isArray(payload?.scheduleResult) ? payload.scheduleResult : [];
  return rows
    .map((entry: any) => entry?.data || entry)
    .map((entry: any) => ({
      merchantInventoryId: Number(entry?.merchantInventoryId || 0),
      discountId: String(entry?.discountId || "").trim(),
    }))
    .filter((entry) => entry.merchantInventoryId > 0 && entry.discountId.length > 0);
};

const loadAllRemoteProducts = async (environment: IntegrationContext["environment"]) => {
  const result: any[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < 20; page += 1) {
    let rows: any[] = [];
    try {
      rows = (await getAnanasProductsFor(page, 2000, environment)) || [];
    } catch {
      break;
    }
    if (!rows.length) break;
    for (const row of rows) {
      const externalId = row?.externalId == null ? "" : String(row.externalId);
      const merchantInventoryId = Number(row?.id || 0);
      const key = `${merchantInventoryId}:${externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(row);
    }
    if (rows.length < 2000) break;
  }
  return result;
};

export async function runAnanasSync({ context }: RunAnanasOptions) {
  const counters: SyncCounters = { total: 0, success: 0, failed: 0, skipped: 0 };
  const catalog = await listCatalogProducts({
    page: 1,
    pageSize: 5000,
    activeOnly: true,
    exportOnly: true,
    applyPromotions: false,
  });

  const payloadByLegacyId = new Map<number, AnanasImportProduct>();
  const changedPayload: AnanasImportProduct[] = [];
  for (const item of catalog.items) {
    const payload = toAnanasProduct(item);
    payloadByLegacyId.set(item.legacyId, payload);
    const payloadHash = createPayloadHash(payload);
    const deltaKey = String(item.legacyId);
    const previousHash = context.mode === "delta" ? await getDeltaHash("ananas", "product", deltaKey) : null;
    if (context.mode === "full" || !previousHash || previousHash !== payloadHash) {
      changedPayload.push(payload);
    } else {
      counters.skipped += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "product",
        entityId: deltaKey,
        status: "skipped",
        message: "No payload changes detected (delta mode).",
        payloadHash,
        payload,
        response: null,
      });
    }
  }

  counters.total += payloadByLegacyId.size;

  if (changedPayload.length > 0) {
    try {
      const importResponse = await importAnanasProductsFor(changedPayload, context.environment);
      for (const payload of changedPayload) {
        const hash = createPayloadHash(payload);
        await setDeltaState("ananas", "product", String(payload.externalId), hash, context.runId);
        await upsertAnanasProductState({
          legacyProductId: Number(payload.externalId || 0),
          externalId: payload.externalId,
          payloadHash: hash,
          ananasStatus: "synced",
          syncError: null,
        });
        counters.success += 1;
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "product",
          entityId: String(payload.externalId),
          status: "success",
          message: "Product synced to Ananas.",
          payloadHash: hash,
          payload,
          response: (importResponse as Record<string, unknown>) || null,
        });
      }
    } catch (error: any) {
      counters.failed += changedPayload.length;
      for (const payload of changedPayload) {
        await upsertAnanasProductState({
          legacyProductId: Number(payload.externalId || 0),
          externalId: payload.externalId,
          payloadHash: createPayloadHash(payload),
          ananasStatus: "error",
          syncError: error?.message || "Product import failed.",
        });
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "product",
          entityId: String(payload.externalId),
          status: "failed",
          message: error?.message || "Product import failed.",
          payloadHash: createPayloadHash(payload),
          payload,
          response: null,
        });
      }
    }
  }

  const today = new Date();
  const tomorrow = new Date(today.getTime());
  tomorrow.setDate(today.getDate() + 1);
  const fromDisplay = normalizeDate(today);
  const toDisplay = normalizeDate(tomorrow);
  const fromIso = normalizeIsoDay(today);
  const toIso = normalizeIsoDay(tomorrow);

  const remoteProducts = await loadAllRemoteProducts(context.environment);

  const merchantByExternalId = new Map<string, number>();
  for (const row of remoteProducts) {
    const externalId = row?.externalId == null ? "" : String(row.externalId);
    const merchantInventoryId = Number(row?.id || 0);
    if (!externalId || !merchantInventoryId) continue;
    merchantByExternalId.set(externalId, merchantInventoryId);
    await upsertAnanasProductState({
      legacyProductId: Number(externalId || 0),
      merchantInventoryId,
      externalId,
      ananasStatus: row?.status ? String(row.status) : "listed",
      payloadHash: null,
      syncError: null,
    });
  }

  const desiredDiscounts: AnanasDiscountInput[] = [];
  const desiredByMerchantId = new Map<number, { legacyId: string; price: number }>();

  for (const item of catalog.items) {
    if (!(item.priceGross > item.priceFinalGross)) continue;
    const merchantInventoryId = merchantByExternalId.get(String(item.legacyId));
    if (!merchantInventoryId) continue;
    const discountPrice = toFixed(item.priceFinalGross, 2);
    desiredDiscounts.push({
      merchantInventoryId,
      discountPrice,
      discountPriceCurrency: "RSD",
      dateFrom: fromDisplay,
      dateTo: toDisplay,
      discountType: "SALE",
    });
    desiredByMerchantId.set(merchantInventoryId, { legacyId: String(item.legacyId), price: discountPrice });
  }

  let activeDiscountRows: any[] = [];
  try {
    const activeDiscounts = await getAnanasDiscountsFor(fromDisplay, toDisplay, context.environment);
    activeDiscountRows = parseDiscountRows(activeDiscounts);
  } catch {
    activeDiscountRows = [];
  }

  const existingByMerchant = new Map<number, any>();
  const merchantByDiscountId = new Map<string, number>();
  for (const row of activeDiscountRows) {
    const payload = row?.data || row;
    const merchantInventoryId = Number(payload?.merchantInventoryId || 0);
    if (!merchantInventoryId) continue;
    existingByMerchant.set(merchantInventoryId, payload);
    if (payload?.discountId) {
      merchantByDiscountId.set(String(payload.discountId), merchantInventoryId);
    }
  }

  const toCreate: AnanasDiscountInput[] = [];
  const toUpdate: AnanasDiscountUpdateInput[] = [];
  const toCancel: { discountId: string; merchantInventoryId: number }[] = [];

  for (const desired of desiredDiscounts) {
    const existing = existingByMerchant.get(desired.merchantInventoryId);
    if (!existing?.discountId) {
      toCreate.push(desired);
      continue;
    }
    toUpdate.push({
      discountId: String(existing.discountId),
      newDateFrom: fromDisplay,
      newDateTo: toDisplay,
      newDiscountPrice: desired.discountPrice,
      newDiscountPriceCurrency: "RSD",
      newDiscountType: "SALE",
    });
  }

  for (const [merchantInventoryId, existing] of existingByMerchant.entries()) {
    if (desiredByMerchantId.has(merchantInventoryId)) continue;
    if (existing?.discountId) {
      toCancel.push({ discountId: String(existing.discountId), merchantInventoryId });
    }
  }

  if (toCreate.length) {
    try {
      const response = await scheduleAnanasDiscountsFor(toCreate, context.environment);
      const scheduled = parseScheduleResults(response);
      const discountIdByMerchant = new Map<number, string>(
        scheduled.map((entry) => [entry.merchantInventoryId, entry.discountId]),
      );
      for (const row of toCreate) {
        const mapRow = desiredByMerchantId.get(row.merchantInventoryId);
        const discountId = discountIdByMerchant.get(row.merchantInventoryId) || null;
        if (mapRow) {
          await upsertAnanasDiscountState({
            legacyProductId: Number(mapRow.legacyId || 0),
            merchantInventoryId: row.merchantInventoryId,
            discountId,
            discountType: row.discountType,
            discountPrice: row.discountPrice,
            discountPriceCurrency: row.discountPriceCurrency,
            dateFrom: row.dateFrom,
            dateTo: row.dateTo,
            active: true,
          });
        }
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "discount",
          entityId: mapRow?.legacyId || String(row.merchantInventoryId),
          status: "success",
          message: "Discount scheduled.",
          payloadHash: createPayloadHash(row),
          payload: row as unknown as Record<string, unknown>,
          response: (response as Record<string, unknown>) || null,
        });
        counters.success += 1;
      }
    } catch (error: any) {
      counters.failed += toCreate.length;
      for (const row of toCreate) {
        const mapRow = desiredByMerchantId.get(row.merchantInventoryId);
        if (mapRow) {
          await upsertAnanasDiscountState({
            legacyProductId: Number(mapRow.legacyId || 0),
            merchantInventoryId: row.merchantInventoryId,
            discountId: null,
            discountType: row.discountType,
            discountPrice: row.discountPrice,
            discountPriceCurrency: row.discountPriceCurrency,
            dateFrom: row.dateFrom,
            dateTo: row.dateTo,
            active: false,
          });
        }
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "discount",
          entityId: String(row.merchantInventoryId),
          status: "failed",
          message: error?.message || "Discount schedule failed.",
          payloadHash: createPayloadHash(row),
          payload: row as unknown as Record<string, unknown>,
          response: null,
        });
      }
    }
  }

  if (toUpdate.length) {
    try {
      const response = await updateAnanasDiscountsFor(toUpdate, context.environment);
      for (const row of toUpdate) {
        const merchantInventoryId = merchantByDiscountId.get(row.discountId) || 0;
        const mapRow = merchantInventoryId ? desiredByMerchantId.get(merchantInventoryId) : null;
        if (merchantInventoryId && mapRow) {
          await upsertAnanasDiscountState({
            legacyProductId: Number(mapRow.legacyId || 0),
            merchantInventoryId,
            discountId: row.discountId,
            discountType: row.newDiscountType,
            discountPrice: row.newDiscountPrice,
            discountPriceCurrency: row.newDiscountPriceCurrency,
            dateFrom: row.newDateFrom,
            dateTo: row.newDateTo,
            active: true,
          });
        }
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
        counters.success += 1;
      }
    } catch (error: any) {
      counters.failed += toUpdate.length;
      for (const row of toUpdate) {
        const merchantInventoryId = merchantByDiscountId.get(row.discountId) || 0;
        const mapRow = merchantInventoryId ? desiredByMerchantId.get(merchantInventoryId) : null;
        if (merchantInventoryId && mapRow) {
          await upsertAnanasDiscountState({
            legacyProductId: Number(mapRow.legacyId || 0),
            merchantInventoryId,
            discountId: row.discountId,
            discountType: row.newDiscountType,
            discountPrice: row.newDiscountPrice,
            discountPriceCurrency: row.newDiscountPriceCurrency,
            dateFrom: row.newDateFrom,
            dateTo: row.newDateTo,
            active: false,
          });
        }
        await addSyncRunItem(context.runId, {
          domain: "ananas",
          entityType: "discount_update",
          entityId: row.discountId,
          status: "failed",
          message: error?.message || "Discount update failed.",
          payloadHash: createPayloadHash(row),
          payload: row as unknown as Record<string, unknown>,
          response: null,
        });
      }
    }
  }

  for (const row of toCancel) {
    try {
      const response = await cancelAnanasDiscountFor(row.discountId, context.environment);
      await deactivateAnanasDiscountStateByDiscountId(row.discountId);
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_cancel",
        entityId: row.discountId,
        status: "success",
        message: "Discount cancelled.",
        payloadHash: createPayloadHash(row),
        payload: row as unknown as Record<string, unknown>,
        response: (response as Record<string, unknown>) || null,
      });
      counters.success += 1;
    } catch (error: any) {
      counters.failed += 1;
      await addSyncRunItem(context.runId, {
        domain: "ananas",
        entityType: "discount_cancel",
        entityId: row.discountId,
        status: "failed",
        message: error?.message || "Discount cancellation failed.",
        payloadHash: createPayloadHash(row),
        payload: row as unknown as Record<string, unknown>,
        response: null,
      });
    }
  }

  await setDeltaState(
    "ananas",
    "discount_snapshot",
    `${fromIso}_${toIso}`,
    createPayloadHash({ toCreate, toUpdate, toCancel }),
    context.runId,
  );

  return {
    counters,
    meta: {
      catalogCount: catalog.items.length,
      changedProducts: changedPayload.length,
      discounts: {
        create: toCreate.length,
        update: toUpdate.length,
        cancel: toCancel.length,
      },
    },
  };
}
