/**
 * Pricing regression + unit tests.
 *
 * REGRESSION: product cards must always show the HIGHEST priceFinalGross
 * across all size variants — never the price of a single arbitrary variant.
 *
 * History: the bug caused sako (jacket) to show 4 900 RSD on the landing
 * page instead of 9 900 RSD because:
 *   1. collapseCatalogProductsByKey was picking the lowest-priced variant.
 *   2. Landing-page pinned products were fetched by one legacyId (one size)
 *      without any cross-variant price resolution.
 */

import { describe, it, expect } from "vitest";
import {
  selectMaxPriceVariant,
  resolveDisplayFinalPrice,
  resolveDisplayGrossPrice,
  calcDiscountPercent,
  hasUsableDisplayPrice,
  buildMaxPriceBySkuMap,
  applyMaxPriceFromMap,
  type PriceVariant,
} from "@/lib/catalog/pricing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const variant = (priceFinalGross: number, priceGross: number): PriceVariant => ({
  priceFinalGross,
  priceGross,
});

const catalogItem = (sku: string, legacyId: number, priceFinalGross: number, priceGross: number) => ({
  sku,
  legacyId,
  priceFinalGross,
  priceGross,
});

// ---------------------------------------------------------------------------
// selectMaxPriceVariant
// ---------------------------------------------------------------------------

describe("selectMaxPriceVariant", () => {
  it("returns null for an empty list", () => {
    expect(selectMaxPriceVariant([])).toBeNull();
  });

  it("returns the only element when list has one variant", () => {
    const v = variant(4900, 4900);
    expect(selectMaxPriceVariant([v])).toBe(v);
  });

  // REGRESSION: jacket (sako) S=4900, XL=9900 — must return XL
  it("REGRESSION: picks the variant with the highest priceFinalGross (sako S vs XL)", () => {
    const s  = variant(4900, 4900);
    const xl = variant(9900, 9900);
    expect(selectMaxPriceVariant([s, xl])).toBe(xl);
    expect(selectMaxPriceVariant([xl, s])).toBe(xl); // order-independent
  });

  it("when final prices are equal, prefers the higher priceGross", () => {
    const a = variant(5000, 6000);
    const b = variant(5000, 5000);
    expect(selectMaxPriceVariant([a, b])).toBe(a);
    expect(selectMaxPriceVariant([b, a])).toBe(a);
  });

  it("handles many variants and returns the global maximum", () => {
    const variants = [
      variant(3000, 3000),
      variant(7500, 8000),
      variant(9900, 9900),
      variant(4500, 5000),
      variant(2000, 2000),
    ];
    expect(selectMaxPriceVariant(variants)?.priceFinalGross).toBe(9900);
  });
});

// ---------------------------------------------------------------------------
// resolveDisplayFinalPrice
// ---------------------------------------------------------------------------

describe("resolveDisplayFinalPrice", () => {
  const product = variant(4900, 4900);

  // REGRESSION: product page showed selected-size price; must show max across all variants
  it("REGRESSION: returns max priceFinalGross across all variants, not the product itself", () => {
    const variants = [variant(4900, 4900), variant(9900, 9900), variant(6500, 6500)];
    expect(resolveDisplayFinalPrice(product, variants)).toBe(9900);
  });

  it("falls back to product price when variants list is empty", () => {
    expect(resolveDisplayFinalPrice(product, [])).toBe(4900);
  });

  it("handles numeric coercion (falsy-ish values treated as 0)", () => {
    const zero = { priceFinalGross: 0 as unknown as number, priceGross: 0 };
    expect(resolveDisplayFinalPrice(zero, [])).toBe(0);
  });

  it("uses only the variants pool when variants are non-empty (product is always inside variants in production)", () => {
    // In production, getCatalogProductVariantsBySku always includes the
    // product itself, so the product is never "missing" from the pool.
    const product = variant(12000, 12000);
    const variants = [variant(5000, 5000), variant(7000, 7000)];
    // Pool = variants only → max is 7000
    expect(resolveDisplayFinalPrice(product, variants)).toBe(7000);
  });
});

// ---------------------------------------------------------------------------
// resolveDisplayGrossPrice
// ---------------------------------------------------------------------------

describe("resolveDisplayGrossPrice", () => {
  it("returns max priceGross across all variants", () => {
    const product = variant(4900, 5500);
    const variants = [variant(4900, 5500), variant(9900, 11000)];
    expect(resolveDisplayGrossPrice(product, variants)).toBe(11000);
  });

  it("falls back to product priceGross when variants list is empty", () => {
    expect(resolveDisplayGrossPrice(variant(4900, 5500), [])).toBe(5500);
  });
});

// ---------------------------------------------------------------------------
// calcDiscountPercent
// ---------------------------------------------------------------------------

describe("calcDiscountPercent", () => {
  it("returns 0 when there is no discount", () => {
    expect(calcDiscountPercent(5000, 5000)).toBe(0);
  });

  it("returns 0 for zero or negative gross price", () => {
    expect(calcDiscountPercent(0, 0)).toBe(0);
    expect(calcDiscountPercent(-100, 0)).toBe(0);
  });

  it("returns 0 when final price is higher than gross (data anomaly)", () => {
    expect(calcDiscountPercent(4000, 5000)).toBe(0);
  });

  it("calculates 20% discount correctly", () => {
    expect(calcDiscountPercent(5000, 4000)).toBe(20);
  });

  it("calculates 50% discount correctly", () => {
    expect(calcDiscountPercent(10000, 5000)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    // 1/3 discount ≈ 33.33 % → rounds to 33
    expect(calcDiscountPercent(3000, 2000)).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// hasUsableDisplayPrice
// ---------------------------------------------------------------------------

describe("hasUsableDisplayPrice", () => {
  it("rejects 0/1 RSD catalog anomalies", () => {
    expect(hasUsableDisplayPrice(variant(0, 1))).toBe(false);
    expect(hasUsableDisplayPrice(variant(0, 9900))).toBe(false);
  });

  it("accepts normal product prices", () => {
    expect(hasUsableDisplayPrice(variant(8756, 9950))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMaxPriceBySkuMap
// ---------------------------------------------------------------------------

describe("buildMaxPriceBySkuMap", () => {
  it("returns an empty map for an empty input", () => {
    expect(buildMaxPriceBySkuMap([])).toEqual(new Map());
  });

  it("builds a map keyed by normalised SKU", () => {
    const items = [catalogItem("SAKO-01", 1, 9900, 9900)];
    const map = buildMaxPriceBySkuMap(items);
    expect(map.get("sako-01")).toEqual({ priceFinalGross: 9900, priceGross: 9900 });
  });

  it("keeps the highest price when multiple items share a SKU", () => {
    const items = [
      catalogItem("SAKO-01", 1, 4900, 4900), // size S
      catalogItem("SAKO-01", 2, 9900, 9900), // size XL — winner
      catalogItem("SAKO-01", 3, 6500, 6500), // size L
    ];
    const mp = buildMaxPriceBySkuMap(items).get("sako-01");
    expect(mp?.priceFinalGross).toBe(9900);
  });

  it("falls back to legacyId as key when SKU is empty", () => {
    const items = [{ sku: "", legacyId: 42, priceFinalGross: 3000, priceGross: 3000 }];
    const map = buildMaxPriceBySkuMap(items);
    expect(map.get("42")).toEqual({ priceFinalGross: 3000, priceGross: 3000 });
  });

  it("is case-insensitive for SKU keys", () => {
    const items = [
      catalogItem("SAKO-01", 1, 4900, 4900),
      catalogItem("sako-01", 2, 9900, 9900),
    ];
    const mp = buildMaxPriceBySkuMap(items).get("sako-01");
    expect(mp?.priceFinalGross).toBe(9900);
  });
});

// ---------------------------------------------------------------------------
// applyMaxPriceFromMap
// ---------------------------------------------------------------------------

describe("applyMaxPriceFromMap", () => {
  const map = new Map([
    ["sako-01", { priceFinalGross: 9900, priceGross: 9900 }],
  ]);

  // REGRESSION: landing page pinned sako showed 4900 because it was
  // fetched by legacyId (size S = 4900) without cross-variant resolution.
  it("REGRESSION: overrides pinned product price with max from catalog map", () => {
    const pinned = catalogItem("SAKO-01", 1, 4900, 4900);
    const result = applyMaxPriceFromMap(pinned, map);
    expect(result.priceFinalGross).toBe(9900);
    expect(result.priceGross).toBe(9900);
  });

  it("does not modify the product when its price is already the max", () => {
    const pinned = catalogItem("SAKO-01", 1, 9900, 9900);
    const result = applyMaxPriceFromMap(pinned, map);
    expect(result).toBe(pinned); // same reference — untouched
  });

  it("returns the original object unchanged when SKU is not in the map", () => {
    const pinned = catalogItem("KOSULJ-01", 5, 3500, 3500);
    const result = applyMaxPriceFromMap(pinned, map);
    expect(result).toBe(pinned);
  });

  it("preserves all other product fields when overriding price", () => {
    const pinned = { ...catalogItem("SAKO-01", 1, 4900, 4900), name: "Sako test", stock: 3 };
    const result = applyMaxPriceFromMap(pinned, map);
    expect(result.name).toBe("Sako test");
    expect(result.stock).toBe(3);
    expect(result.priceFinalGross).toBe(9900);
  });
});
