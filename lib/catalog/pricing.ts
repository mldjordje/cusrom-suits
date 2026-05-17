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
  const pool = variants.length > 0 ? variants : [product];
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
  const pool = variants.length > 0 ? variants : [product];
  return Math.max(...pool.map((v) => Number(v.priceGross || 0)));
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
export const applyMaxPriceFromMap = <T extends PriceVariant & { sku: string; legacyId: number }>(
  item: T,
  map: Map<string, PriceVariant>,
): T => {
  const key = String(item.sku || item.legacyId).trim().toLowerCase();
  const mp = map.get(key);
  if (!mp || item.priceFinalGross >= mp.priceFinalGross) return item;
  return { ...item, priceFinalGross: mp.priceFinalGross, priceGross: mp.priceGross };
};
