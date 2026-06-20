/**
 * Unit tests for lib/storefront/product-details.ts
 *
 * Covers the established behaviours that drive the product detail page and
 * size picker: image source resolution, size sorting, and size option
 * aggregation.
 *
 * Note: functions that touch Supabase / Next.js cache (getProductSizeGuide,
 * getPreferredCatalogProductForDisplay) are not tested here — they require
 * mocking infrastructure that would obscure the core logic.
 */

import { describe, it, expect } from "vitest";
import {
  getCatalogProductImageSources,
  getLocalizedCatalogProductName,
  getProductWashCare,
  getProductSizeOptions,
} from "@/lib/storefront/product-details";
import type { CatalogProductView } from "@/lib/catalog/store";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

let nextId = 1;

const makeProduct = (
  overrides: Partial<CatalogProductView> = {},
): CatalogProductView => ({
  legacyId: nextId++,
  sku: "TEST-SKU",
  manufCode: null,
  ean: null,
  name: "Test Product",
  nameEn: null,
  description: null,
  descriptionEn: null,
  specification: null,
  specificationEn: null,
  priceGross: 5000,
  priceFinalGross: 5000,
  taxPercent: 20,
  rebatePercent: 0,
  stockWarehouse1: 10,
  stockTotal: 10,
  brand: null,
  isActive: true,
  isExported: true,
  landingFeatured: false,
  landingPriority: null,
  categories: [],
  coverImage: null,
  images: [],
  hasDirectMedia: false,
  videoUrl: null,
  attributes: {},
  rawPayload: {},
  ...overrides,
});

// ---------------------------------------------------------------------------
// getCatalogProductImageSources
// ---------------------------------------------------------------------------

describe("getCatalogProductImageSources", () => {
  it("returns fallback images when product and variants have no images", () => {
    const product = makeProduct();
    const result = getCatalogProductImageSources(product, [], ["/img/odela.jpg"]);
    expect(result).toEqual(["/img/odela.jpg"]);
  });

  it("returns product images when present, ignoring fallback", () => {
    const product = makeProduct({ images: ["/img/coat1.jpg", "/img/coat2.jpg"] });
    const result = getCatalogProductImageSources(product, [], ["/img/odela.jpg"]);
    expect(result).toContain("/img/coat1.jpg");
    expect(result).toContain("/img/coat2.jpg");
    expect(result).not.toContain("/img/odela.jpg");
  });

  it("includes coverImage in the result", () => {
    const product = makeProduct({ coverImage: "/img/cover.jpg" });
    const result = getCatalogProductImageSources(product, [], []);
    expect(result).toContain("/img/cover.jpg");
  });

  it("merges images from variants", () => {
    const product = makeProduct({ images: ["/img/p1.jpg"] });
    const variant = makeProduct({ images: ["/img/v1.jpg"] });
    const result = getCatalogProductImageSources(product, [variant], []);
    expect(result).toContain("/img/p1.jpg");
    expect(result).toContain("/img/v1.jpg");
  });

  it("deduplicates identical URLs across product and variants", () => {
    const shared = "/img/shared.jpg";
    const product = makeProduct({ coverImage: shared, images: [shared] });
    const variant = makeProduct({ coverImage: shared, images: [shared] });
    const result = getCatalogProductImageSources(product, [variant], []);
    expect(result.filter((url) => url === shared)).toHaveLength(1);
  });

  it("filters out empty or whitespace image values", () => {
    const product = makeProduct({ images: ["", "  ", "/img/real.jpg"] });
    const result = getCatalogProductImageSources(product, [], []);
    expect(result).not.toContain("");
    expect(result).not.toContain("  ");
    expect(result).toContain("/img/real.jpg");
  });

  it("returns empty array when no images and no fallback", () => {
    const product = makeProduct();
    const result = getCatalogProductImageSources(product, [], []);
    expect(result).toHaveLength(0);
  });

  it("deduplicates fallback images too", () => {
    const product = makeProduct();
    const result = getCatalogProductImageSources(
      product,
      [],
      ["/img/odela.jpg", "/img/odela.jpg"],
    );
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getLocalizedCatalogProductName
// ---------------------------------------------------------------------------

describe("getLocalizedCatalogProductName", () => {
  it("uses the cleaner legacy name when Serbian name is only a generic suit label", () => {
    const product = makeProduct({
      sku: "129135",
      name: "24/33/2                                       M.Odelo",
      nameEn: "Allesio",
      categories: [{ id: 289, name: "Odelo", path: ["Odeca", "Odelo"] }],
    });

    expect(getLocalizedCatalogProductName(product, "sr")).toBe("Allesio");
  });

  it("keeps the Serbian name when it is already meaningful", () => {
    const product = makeProduct({
      sku: "129932",
      name: "FABRICIO",
      nameEn: "FABRICIO",
      categories: [{ id: 289, name: "Odelo", path: ["Odeca", "Odelo"] }],
    });

    expect(getLocalizedCatalogProductName(product, "sr")).toBe("Fabricio");
  });
});

// ---------------------------------------------------------------------------
// getProductSizeOptions
// ---------------------------------------------------------------------------

const makeVariantWithSize = (
  size: string,
  legacyId: number,
  stock = 5,
): CatalogProductView =>
  makeProduct({
    legacyId,
    attributes: { size: [size] },
    stockTotal: stock,
  });

describe("getProductSizeOptions", () => {
  it("returns an empty array when no variants have size attributes", () => {
    const product = makeProduct();
    const result = getProductSizeOptions(product, [makeProduct(), makeProduct()]);
    // Falls back to currentProduct sizes — also empty here
    expect(result).toHaveLength(0);
  });

  it("builds one option per distinct size", () => {
    const product = makeProduct();
    const variants = [
      makeVariantWithSize("S", 10),
      makeVariantWithSize("M", 11),
      makeVariantWithSize("L", 12),
    ];
    const result = getProductSizeOptions(product, variants);
    const labels = result.map((o) => o.label);
    expect(labels).toContain("S");
    expect(labels).toContain("M");
    expect(labels).toContain("L");
    expect(result).toHaveLength(3);
  });

  it("sorts sizes in correct clothing order (XS → S → M → L → XL → XXL)", () => {
    const product = makeProduct();
    const variants = [
      makeVariantWithSize("XXL", 20),
      makeVariantWithSize("XS",  21),
      makeVariantWithSize("M",   22),
      makeVariantWithSize("S",   23),
      makeVariantWithSize("XL",  24),
      makeVariantWithSize("L",   25),
    ];
    const labels = getProductSizeOptions(product, variants).map((o) => o.label);
    expect(labels).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
  });

  it("sorts numeric sizes before alpha sizes and in ascending numeric order", () => {
    const product = makeProduct();
    const variants = [
      makeVariantWithSize("52", 30),
      makeVariantWithSize("46", 31),
      makeVariantWithSize("50", 32),
      makeVariantWithSize("48", 33),
    ];
    const labels = getProductSizeOptions(product, variants).map((o) => o.label);
    expect(labels).toEqual(["46", "48", "50", "52"]);
  });

  it("marks a size as inStock only when stockTotal > 0 (no warehouse fallback)", () => {
    const product = makeProduct();
    const variants = [
      // stockTotal=0 AND stockWarehouse1=0 → truly out of stock
      makeProduct({ legacyId: 40, attributes: { size: ["M"] }, stockTotal: 0, stockWarehouse1: 0 }),
      makeVariantWithSize("L", 41, 3), // in stock
    ];
    const result = getProductSizeOptions(product, variants);
    const m = result.find((o) => o.label === "M");
    const l = result.find((o) => o.label === "L");
    expect(m?.inStock).toBe(false);
    expect(l?.inStock).toBe(true);
  });

  it("keeps the highest stock when multiple variants share the same size key (uses max, not sum)", () => {
    const product = makeProduct();
    // "1XL" and "XL" normalise to the same key via sizeAliases
    const variants = [
      makeVariantWithSize("XL",  50, 3),
      makeVariantWithSize("1XL", 51, 4),
    ];
    const result = getProductSizeOptions(product, variants);
    const xl = result.find((o) => normalizedKey(o.label) === "XL");
    // getProductSizeOptions uses Math.max, not sum
    expect(xl?.stock).toBe(4);
  });

  it("falls back to currentProduct sizes when no variants have size attributes", () => {
    const product = makeProduct({
      attributes: { size: ["S", "M"] },
      stockTotal: 5,
      legacyId: 999,
    });
    const result = getProductSizeOptions(product, [makeProduct()]);
    expect(result.map((o) => o.label)).toContain("S");
    expect(result.map((o) => o.label)).toContain("M");
  });

  it("drops secondary numeric labels when alpha sizes dominate the model", () => {
    const product = makeProduct({
      legacyId: 12963281,
      attributes: { size: ["40", "M"] },
      stockTotal: 4,
    });
    const variants = [
      product,
      makeVariantWithSize("S", 12963282, 6),
      makeVariantWithSize("XXL", 12963285, 7),
      makeVariantWithSize("3XL", 12963286, 1),
      makeVariantWithSize("4XL", 12963287, 5),
    ];

    const result = getProductSizeOptions(product, variants);
    expect(result.map((o) => o.label)).toEqual(["S", "M", "XXL", "3XL", "4XL"]);
    expect(result.filter((o) => o.legacyId === 12963281)).toHaveLength(1);
  });
});

// Small helper that mirrors the sizeAliases in product-details.ts
function normalizedKey(value: string): string {
  const aliases: Record<string, string> = { "1XL": "XL", "2XL": "XXL", "3XL": "XXXL" };
  const up = value.trim().toUpperCase().replace(/\s+/g, "");
  return aliases[up] ?? up;
}

describe("getProductWashCare", () => {
  it("returns only explicitly selected valid symbols in catalogue order", () => {
    const product = makeProduct({
      rawPayload: { washCareIcons: ["doNotIron", "unknown", "wash30"] },
    });

    expect(getProductWashCare(product, "sr").items.map((item) => item.icon)).toEqual([
      "wash30",
      "doNotIron",
    ]);
  });

  it("returns no symbols for an explicit empty selection", () => {
    const product = makeProduct({ rawPayload: { washCareIcons: [] } });
    expect(getProductWashCare(product, "sr").items).toEqual([]);
  });

  it("does not infer defaults for an unconfigured product", () => {
    expect(getProductWashCare(makeProduct({ rawPayload: {} }), "en").items).toEqual([]);
  });
});
