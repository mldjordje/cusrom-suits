/**
 * The product detail page must quote the size the customer selected.
 *
 * History: the PDP rendered `resolveDisplayFinalPrice` (the max across all size
 * variants) while AddToCartButton and the Offer JSON-LD used the selected
 * variant's own price. A model whose sizes were priced differently therefore
 * showed one number on the page and charged another in the cart, and the
 * structured data disagreed with the visible price.
 */

import { describe, expect, it } from "vitest";
import {
  applyVariantPriceIndex,
  buildVariantPriceIndexBySku,
  resolveCardPrice,
  resolveSelectedVariantPrice,
  resolveVariantPriceRange,
} from "@/lib/catalog/pricing";

const variant = (priceFinalGross: number, priceGross = priceFinalGross) => ({
  priceFinalGross,
  priceGross,
});

describe("resolveSelectedVariantPrice", () => {
  it("quotes the selected variant, not the most expensive one", () => {
    const product = variant(19_900);
    const variants = [variant(19_900), variant(24_900), variant(29_900)];

    expect(resolveSelectedVariantPrice(variant(19_900), product, variants).priceFinalGross).toBe(19_900);
  });

  it("keeps the crossed-out price of the selected variant", () => {
    const selected = variant(19_900, 24_900);
    const result = resolveSelectedVariantPrice(selected, variant(19_900), [selected, variant(29_900)]);

    expect(result.priceFinalGross).toBe(19_900);
    expect(result.priceGross).toBe(24_900);
  });

  it("never reports a gross price below the final price", () => {
    const selected = variant(19_900, 0);
    const result = resolveSelectedVariantPrice(selected, selected, []);

    expect(result.priceGross).toBe(19_900);
  });

  it("falls back to the max when the selected variant carries a junk price", () => {
    const product = variant(24_900);
    const variants = [variant(24_900), variant(29_900)];

    // 1 RSD placeholders come from the legacy import — degrade to "too high"
    // rather than advertising a suit for 1 RSD.
    expect(resolveSelectedVariantPrice(variant(1), product, variants).priceFinalGross).toBe(29_900);
  });

  it("falls back to the product itself when nothing is selected", () => {
    const product = variant(24_900);
    expect(resolveSelectedVariantPrice(null, product, [variant(29_900)]).priceFinalGross).toBe(24_900);
  });

  it("handles a product with no variants", () => {
    const product = variant(24_900);
    expect(resolveSelectedVariantPrice(product, product, []).priceFinalGross).toBe(24_900);
  });
});

describe("resolveVariantPriceRange", () => {
  it("reports a range when sizes are priced differently", () => {
    const result = resolveVariantPriceRange(variant(19_900), [variant(24_900), variant(29_900)]);

    expect(result).toEqual({ min: 19_900, max: 29_900, hasRange: true });
  });

  it("reports no range when every size costs the same", () => {
    const result = resolveVariantPriceRange(variant(19_900), [variant(19_900), variant(19_900)]);

    expect(result.hasRange).toBe(false);
    expect(result.min).toBe(19_900);
  });

  it("ignores junk prices when computing the floor", () => {
    const result = resolveVariantPriceRange(variant(19_900), [variant(1), variant(0), variant(24_900)]);

    expect(result.min).toBe(19_900);
    expect(result.max).toBe(24_900);
  });

  it("falls back to the product price when every variant is junk", () => {
    const result = resolveVariantPriceRange(variant(0), [variant(1)]);

    expect(result).toEqual({ min: 0, max: 0, hasRange: false });
  });
});

/**
 * The landing page and the shop grid render prices from the same decision, so
 * one article can no longer show two different numbers depending on the page.
 */
describe("resolveCardPrice", () => {
  const withRange = (min: number | null, max: number | null, priceFinalGross = 19_900, priceGross = 19_900) => ({
    priceFinalGross,
    priceGross,
    rawPayload: { collapsedPriceMin: min, collapsedPriceMax: max },
  });

  it("shows a range when the collapsed variants differ", () => {
    expect(resolveCardPrice(withRange(19_900, 29_900))).toEqual({ kind: "range", from: 19_900 });
  });

  it("shows a single price when every variant costs the same", () => {
    expect(resolveCardPrice(withRange(19_900, 19_900))).toEqual({ kind: "single", final: 19_900 });
  });

  it("shows a sale pair when there is a discount and no range", () => {
    expect(resolveCardPrice(withRange(null, null, 19_900, 24_900))).toEqual({
      kind: "sale",
      gross: 24_900,
      final: 19_900,
    });
  });

  it("prefers the range over the sale pair", () => {
    // A "-20%" badge would only be true for one size.
    expect(resolveCardPrice(withRange(19_900, 29_900, 19_900, 24_900)).kind).toBe("range");
  });

  it("falls back to inquiry for uniforms and priceless items", () => {
    expect(resolveCardPrice(withRange(null, null), { businessUniform: true })).toEqual({ kind: "inquiry" });
    expect(resolveCardPrice(withRange(null, null, 0, 0))).toEqual({ kind: "inquiry" });
  });

  it("ignores a junk range floor", () => {
    expect(resolveCardPrice(withRange(1, 29_900)).kind).not.toBe("range");
  });
});

describe("buildVariantPriceIndexBySku / applyVariantPriceIndex", () => {
  const catalogItem = (sku: string, priceFinalGross: number, min: number, max: number) => ({
    sku,
    legacyId: 1,
    priceFinalGross,
    priceGross: priceFinalGross,
    rawPayload: { collapsedPriceMin: min, collapsedPriceMax: max },
  });

  it("carries the variant spread onto a pinned product", () => {
    const index = buildVariantPriceIndexBySku([catalogItem("SKU-1", 29_900, 19_900, 29_900)]);
    const pinned = applyVariantPriceIndex(
      { sku: "SKU-1", legacyId: 55, priceFinalGross: 19_900, priceGross: 19_900, rawPayload: {} },
      index,
    );

    expect(pinned.rawPayload.collapsedPriceMin).toBe(19_900);
    expect(resolveCardPrice(pinned)).toEqual({ kind: "range", from: 19_900 });
  });

  it("leaves an unknown sku untouched", () => {
    const index = buildVariantPriceIndexBySku([catalogItem("SKU-1", 29_900, 19_900, 29_900)]);
    const item = { sku: "OTHER", legacyId: 9, priceFinalGross: 5_000, priceGross: 5_000, rawPayload: {} };

    expect(applyVariantPriceIndex(item, index)).toBe(item);
  });

  it("merges duplicate sku rows into one widest range", () => {
    const index = buildVariantPriceIndexBySku([
      catalogItem("SKU-1", 19_900, 19_900, 19_900),
      catalogItem("SKU-1", 29_900, 24_900, 29_900),
    ]);

    expect(index.get("sku-1")).toMatchObject({ min: 19_900, max: 29_900, priceFinalGross: 29_900 });
  });
});
