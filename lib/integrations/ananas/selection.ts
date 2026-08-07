/**
 * Keeps the Ananas selection (`ananasExport`) in step with what a customer
 * actually sees on /web-shop.
 *
 * The storefront listing stacks several filters (active, exported, own image,
 * media-health blacklist, not hidden) and then collapses variants into one card
 * per model. Reproducing that in SQL would drift the moment the storefront
 * changes, so we run the very same `listCatalogProducts` query the page runs and
 * flag every size variant behind each visible model — Ananas lists per variant,
 * not per model.
 */
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { invalidateCatalogCaches, listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import { getServiceSupabase } from "@/lib/supabase/server";

const PAGE_SIZE = 120;

/** Same filters as app/(storefront)/web-shop/page.tsx with no user-facing filters applied. */
async function loadStorefrontPages(collapseBySku: boolean): Promise<CatalogProductView[]> {
  const brokenProductIds = await getBrokenProductIdSet();
  const excludeLegacyIds = brokenProductIds.size ? Array.from(brokenProductIds) : undefined;
  const items: CatalogProductView[] = [];

  for (let page = 1; page <= 200; page += 1) {
    const result = await listCatalogProducts({
      page,
      pageSize: PAGE_SIZE,
      activeOnly: true,
      exportOnly: true,
      collapseBySku,
      requireDirectImages: true,
      excludeLegacyIds,
      applyPromotions: false,
    });
    items.push(...result.items);
    if (page >= result.totalPages || !result.items.length) break;
  }

  return items;
}

export type AnanasSelectionPreview = {
  visibleModels: number;
  variants: number;
  alreadyFlagged: number;
  toFlag: number;
  toUnflag: number;
  sampleSkus: string[];
  /** Sizes that are listed on the card but currently sold out. */
  variantsWithoutStock: number;
};

export type AnanasSelectionResult = AnanasSelectionPreview & {
  flagged: number;
  unflagged: number;
  applied: boolean;
};

/**
 * @param unflagOthers drop the flag from products that are no longer visible on
 *   the storefront. Off by default so a manually curated extra stays put.
 */
export async function syncAnanasSelectionFromStorefront(options: {
  apply: boolean;
  unflagOthers?: boolean;
}): Promise<AnanasSelectionResult> {
  const collapsed = await loadStorefrontPages(true);
  const allVariants = await loadStorefrontPages(false);

  // Cards collapse by MODEL, not by SKU — "C8/51" and "C8/53" share one card —
  // so the SKU of the representative would miss its siblings. The collapse
  // itself records every variant it merged, which is the exact set Ananas needs
  // (they list per variant).
  const visibleVariantIds = new Set<number>();
  for (const item of collapsed) {
    const merged = item.rawPayload?.collapsedVariantIds as number[] | undefined;
    if (Array.isArray(merged) && merged.length) merged.forEach((id) => visibleVariantIds.add(Number(id)));
    else visibleVariantIds.add(item.legacyId);
  }

  const shouldFlag = allVariants.filter((item) => visibleVariantIds.has(item.legacyId));

  const shouldFlagIds = new Set(shouldFlag.map((item) => item.legacyId));
  const toFlag = shouldFlag.filter((item) => !item.ananasExport);
  const staleFlagged = options.unflagOthers
    ? allVariants.filter((item) => item.ananasExport && !shouldFlagIds.has(item.legacyId))
    : [];

  const preview: AnanasSelectionPreview = {
    visibleModels: collapsed.length,
    variants: shouldFlag.length,
    alreadyFlagged: shouldFlag.length - toFlag.length,
    toFlag: toFlag.length,
    toUnflag: staleFlagged.length,
    sampleSkus: Array.from(new Set(collapsed.slice(0, 10).map((item) => item.sku))).filter(Boolean),
    variantsWithoutStock: shouldFlag.filter((item) => Number(item.stockTotal || 0) <= 0).length,
  };

  if (!options.apply) {
    return { ...preview, flagged: 0, unflagged: 0, applied: false };
  }

  const flagged = await writeAnanasExportFlag(toFlag, true);
  const unflagged = await writeAnanasExportFlag(staleFlagged, false);
  if (flagged || unflagged) invalidateCatalogCaches();

  return { ...preview, flagged, unflagged, applied: true };
}

/** raw_payload is jsonb, so each row is rewritten from the payload we already hold. */
async function writeAnanasExportFlag(items: CatalogProductView[], value: boolean): Promise<number> {
  if (!items.length) return 0;
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Supabase nije konfigurisan — selekcija se ne moze upisati.");

  const updatedAt = new Date().toISOString();
  let written = 0;

  for (const item of items) {
    const rawPayload = { ...(item.rawPayload || {}), ananasExport: value };
    const { error } = await supabase
      .from("catalog_products")
      .update({ raw_payload: rawPayload, updated_at: updatedAt } as never)
      .eq("legacy_id", item.legacyId);
    if (error) throw new Error(`Upis flag-a nije uspeo za legacyId ${item.legacyId}: ${error.message}`);
    written += 1;
  }

  return written;
}
