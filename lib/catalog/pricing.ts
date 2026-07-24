/**
 * Pure pricing utility functions.
 *
 * Keeping these separate from store.ts makes them importable in tests
 * without pulling in Supabase, Next.js caching, or other server-side
 * dependencies.
 */

export type PriceVariant = {
  priceFinalGross: number;
  priceGross: number;
};

/**
 * Given a list of product size variants, returns the one with the
 * highest priceFinalGross.  When two variants share the same final
 * price the one with the higher priceGross (original/crossed-out price)
 * is preferred.
 *
 * Returns null for an empty list.
 */
export const selectMaxPriceVariant = <T extends PriceVariant>(
  variants: T[],
): T | null => {
  if (!variants.length) return null;
  return variants.reduce((best, v) => {
    if (v.priceFinalGross > best.priceFinalGross) return v;
    if (v.priceFinalGross === best.priceFinalGross && v.priceGross > best.priceGross)
      return v;
    return best;
  });
};

/**
 * Highest priceFinalGross across all variants; falls back to the
 * product itself when the variants list is empty.
 */
export const resolveDisplayFinalPrice = <T extends PriceVariant>(
  product: T,
  variants: T[],
): number => {
  const pool = variants.length > 0 ? [product, ...variants] : [product];
  return Math.max(...pool.map((v) => Number(v.priceFinalGross || 0)));
};

/**
 * Highest priceGross (original / crossed-out price) across all
 * variants; falls back to the product itself when the variants list
 * is empty.
 */
export const resolveDisplayGrossPrice = <T extends PriceVariant>(
  product: T,
  variants: T[],
): number => {
  const pool = variants.length > 0 ? [product, ...variants] : [product];
  return Math.max(...pool.map((v) => Number(v.priceGross || 0)));
};

/**
 * Price actually shown on the product detail page.
 *
 * This must be the price of the variant the customer has selected, because
 * that is exactly what AddToCartButton puts in the cart and what the Offer
 * JSON-LD advertises. Showing the max across variants (the old behaviour) meant
 * a customer could read 24.900 on the page and find a different number in the
 * cart — and it made the visible price disagree with the structured data.
 *
 * The max is still used as a fallback for variants carrying junk prices (0 or
 * 1 RSD from the legacy import), so a data glitch degrades to "too high"
 * rather than "obviously broken".
 */
export const resolveSelectedVariantPrice = <T extends PriceVariant>(
  selected: T | null | undefined,
  product: T,
  variants: T[],
): { priceFinalGross: number; priceGross: number } => {
  const candidate = selected ?? product;
  if (hasUsableDisplayPrice(candidate)) {
    return {
      priceFinalGross: Number(candidate.priceFinalGross || 0),
      // A variant with no crossed-out price simply has no discount to show.
      priceGross: Math.max(Number(candidate.priceGross || 0), Number(candidate.priceFinalGross || 0)),
    };
  }

  const fallbackFinal = resolveDisplayFinalPrice(product, variants);
  return {
    priceFinalGross: fallbackFinal,
    // Clamp so a missing original price can never render as a crossed-out
    // value lower than what the customer pays.
    priceGross: Math.max(resolveDisplayGrossPrice(product, variants), fallbackFinal),
  };
};

/**
 * Lowest and highest usable final price across a model's variants.
 *
 * Listing cards use this to render "od X RSD" when sizes are priced
 * differently, instead of quoting one number that only some sizes honour.
 */
export const resolveVariantPriceRange = <T extends PriceVariant>(
  product: T,
  variants: T[],
): { min: number; max: number; hasRange: boolean } => {
  const pool = [product, ...variants].filter((entry) => hasUsableDisplayPrice(entry));
  if (!pool.length) {
    const single = Number(product.priceFinalGross || 0);
    return { min: single, max: single, hasRange: false };
  }

  const prices = pool.map((entry) => Number(entry.priceFinalGross || 0));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, hasRange: max > min };
};

/**
 * Discount percentage between the original and final price.
 * Returns 0 when there is no discount or inputs are invalid.
 */
export const calcDiscountPercent = (
  priceGross: number,
  priceFinalGross: number,
): number => {
  const gross = Number(priceGross || 0);
  const finalGross = Number(priceFinalGross || 0);
  if (gross <= 0 || gross <= finalGross) return 0;
  return Math.round(((gross - finalGross) / gross) * 100);
};

/**
 * Builds a SKU → max-price map from a list of already-collapsed
 * catalog items.  Used on the landing page to override individual
 * pinned-product prices so they always show the highest variant price.
 */
export const hasUsableDisplayPrice = (item: PriceVariant): boolean => {
  const gross = Number(item.priceGross || 0);
  const finalGross = Number(item.priceFinalGross || 0);
  return gross > 1 && finalGross > 0;
};

export const buildMaxPriceBySkuMap = (
  catalogItems: (PriceVariant & { sku: string; legacyId: number })[],
): Map<string, PriceVariant> => {
  const map = new Map<string, PriceVariant>();
  for (const item of catalogItems) {
    const key = String(item.sku || item.legacyId).trim().toLowerCase();
    const existing = map.get(key);
    if (!existing || item.priceFinalGross > existing.priceFinalGross) {
      map.set(key, {
        priceFinalGross: item.priceFinalGross,
        priceGross: item.priceGross,
      });
    }
  }
  return map;
};

/**
 * Applies the max-price map to a single product.  If the map has a
 * higher price for the same SKU the product is returned with updated
 * prices; otherwise the original object is returned unchanged.
 */
/**
 * What a listing card should print for one catalog item.
 *
 * Both the landing page and the shop grid go through this so the same article
 * can never be quoted at two different prices on two pages. `collapsedPriceMin`
 * / `collapsedPriceMax` are written by the catalog collapse step.
 */
export type CardPriceView =
  | { kind: "inquiry" }
  | { kind: "range"; from: number }
  | { kind: "sale"; gross: number; final: number }
  | { kind: "single"; final: number };

export type CardPriceInput = PriceVariant & {
  rawPayload?: Record<string, unknown> | null;
};

export const resolveCardPrice = (
  item: CardPriceInput,
  options?: { businessUniform?: boolean },
): CardPriceView => {
  const finalGross = Number(item.priceFinalGross || 0);
  if (options?.businessUniform || !(finalGross > 0)) return { kind: "inquiry" };

  const min = Number(item.rawPayload?.collapsedPriceMin);
  const max = Number(item.rawPayload?.collapsedPriceMax);
  // Only a genuine spread earns "od X" — an equal min/max is just one price.
  if (Number.isFinite(min) && Number.isFinite(max) && min > 1 && max > min) {
    return { kind: "range", from: min };
  }

  const gross = Number(item.priceGross || 0);
  if (gross > finalGross) return { kind: "sale", gross, final: finalGross };

  return { kind: "single", final: finalGross };
};

/**
 * Per-SKU price index built from the collapsed catalog.
 *
 * Supersedes `buildMaxPriceBySkuMap` for the landing page: it carries the
 * variant spread as well as the headline price, so a pinned product fetched by
 * a single legacyId renders exactly like the same article in the shop grid.
 */
export type SkuPriceEntry = PriceVariant & { min: number | null; max: number | null };

export const buildVariantPriceIndexBySku = (
  catalogItems: (PriceVariant & { sku: string; legacyId: number; rawPayload?: Record<string, unknown> | null })[],
): Map<string, SkuPriceEntry> => {
  const map = new Map<string, SkuPriceEntry>();
  for (const item of catalogItems) {
    const key = String(item.sku || item.legacyId).trim().toLowerCase();
    const min = Number(item.rawPayload?.collapsedPriceMin);
    const max = Number(item.rawPayload?.collapsedPriceMax);
    const entry: SkuPriceEntry = {
      priceFinalGross: item.priceFinalGross,
      priceGross: item.priceGross,
      min: Number.isFinite(min) && min > 1 ? min : null,
      max: Number.isFinite(max) && max > 1 ? max : null,
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
      continue;
    }

    map.set(key, {
      priceFinalGross: Math.max(existing.priceFinalGross, entry.priceFinalGross),
      priceGross:
        entry.priceFinalGross > existing.priceFinalGross ? entry.priceGross : existing.priceGross,
      min: [existing.min, entry.min].filter((v): v is number => v != null).length
        ? Math.min(...[existing.min, entry.min].filter((v): v is number => v != null))
        : null,
      max: [existing.max, entry.max].filter((v): v is number => v != null).length
        ? Math.max(...[existing.max, entry.max].filter((v): v is number => v != null))
        : null,
    });
  }
  return map;
};

/** Applies the index to one item, carrying the spread onto rawPayload so
 *  `resolveCardPrice` sees it. */
export const applyVariantPriceIndex = <
  T extends PriceVariant & { sku: string; legacyId: number; rawPayload?: Record<string, unknown> | null },
>(
  item: T,
  index: Map<string, SkuPriceEntry>,
): T => {
  const key = String(item.sku || item.legacyId).trim().toLowerCase();
  const entry = index.get(key);
  if (!entry) return item;

  const priceFinalGross = Math.max(Number(item.priceFinalGross || 0), entry.priceFinalGross);
  const priceGross =
    entry.priceFinalGross > Number(item.priceFinalGross || 0) ? entry.priceGross : item.priceGross;

  return {
    ...item,
    priceFinalGross,
    priceGross,
    rawPayload: {
      ...(item.rawPayload || {}),
      collapsedPriceMin: entry.min ?? item.rawPayload?.collapsedPriceMin ?? null,
      collapsedPriceMax: entry.max ?? item.rawPayload?.collapsedPriceMax ?? null,
    },
  };
};

export const applyMaxPriceFromMap = <T extends PriceVariant & { sku: string; legacyId: number }>(
  item: T,
  map: Map<string, PriceVariant>,
): T => {
  const key = String(item.sku || item.legacyId).trim().toLowerCase();
  const mp = map.get(key);
  if (!mp || item.priceFinalGross >= mp.priceFinalGross) return item;
  return { ...item, priceFinalGross: mp.priceFinalGross, priceGross: mp.priceGross };
};
