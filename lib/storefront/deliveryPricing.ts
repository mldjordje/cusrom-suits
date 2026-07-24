/**
 * Free-delivery threshold maths.
 *
 * Deliberately dependency-free so the checkout client component can import it
 * without pulling in fulfillment.ts (which reaches for `crypto`, `next/cache`
 * and the persistent-JSON store, none of which can cross into the browser).
 *
 * Both the server (/api/orders) and the checkout summary call these, which is
 * what keeps the advertised promise and the charged total in agreement.
 */

/** Delivery cost after the threshold is applied. A threshold of 0 disables the offer. */
export const applyFreeDeliveryThreshold = (
  subtotal: number,
  deliveryCost: number,
  threshold: number,
): number => {
  const safeCost = Math.max(0, Number(deliveryCost || 0));
  const safeThreshold = Number(threshold || 0);
  if (safeThreshold <= 0) return safeCost;
  return Number(subtotal || 0) >= safeThreshold ? 0 : safeCost;
};

/** Amount still missing before delivery becomes free, or 0 when it already is. */
export const getRemainingForFreeDelivery = (subtotal: number, threshold: number): number => {
  const safeThreshold = Number(threshold || 0);
  if (safeThreshold <= 0) return 0;
  return Math.max(0, safeThreshold - Number(subtotal || 0));
};
