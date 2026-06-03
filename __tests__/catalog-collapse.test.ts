import { describe, expect, it } from "vitest";
import {
  collapseCatalogProductsByModel,
  getCatalogProductModelKey,
  type CatalogProductView,
} from "@/lib/catalog/store";

const makeProduct = (overrides: Partial<CatalogProductView> = {}): CatalogProductView => ({
  legacyId: 1,
  sku: "SKU-1",
  manufCode: "M. Kosulja C8/51",
  ean: null,
  name: "M. Kosulja C8/51",
  nameEn: null,
  description: null,
  descriptionEn: null,
  specification: null,
  specificationEn: null,
  priceGross: 3950,
  priceFinalGross: 3950,
  taxPercent: 20,
  rebatePercent: 0,
  stockWarehouse1: 1,
  stockTotal: 1,
  brand: null,
  isActive: true,
  isExported: true,
  landingFeatured: false,
  landingPriority: null,
  categories: [{ id: 10, name: "Kosulja", path: ["Odeca", "Kosulja"] }],
  coverImage: "/shirts/c8-51.webp",
  images: ["/shirts/c8-51.webp"],
  hasDirectMedia: true,
  videoUrl: null,
  attributes: { size: ["S"] },
  rawPayload: {},
  ...overrides,
});

describe("catalog model collapse", () => {
  it("strips trailing shirt color codes from the model key", () => {
    expect(getCatalogProductModelKey(makeProduct({ name: "M. Kosulja C8/51" }))).toBe("kosulja:c8");
    expect(getCatalogProductModelKey(makeProduct({ name: "M. Kosulja C8/53" }))).toBe("kosulja:c8");
  });

  it("collapses same-model products even when each size has a different SKU", () => {
    const collapsed = collapseCatalogProductsByModel([
      makeProduct({
        legacyId: 101,
        sku: "121198",
        name: "M. Kosulja C8/51",
        manufCode: "M. Kosulja C8/51",
        attributes: { size: ["S"] },
        stockTotal: 1,
      }),
      makeProduct({
        legacyId: 102,
        sku: "121199",
        name: "M. Kosulja C8/51",
        manufCode: "M. Kosulja C8/51",
        attributes: { size: ["M"] },
        stockTotal: 2,
      }),
      makeProduct({
        legacyId: 103,
        sku: "121200",
        name: "M. Kosulja C8/53",
        manufCode: "M. Kosulja C8/53",
        attributes: { size: ["L"] },
        stockTotal: 3,
      }),
    ]);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].stockTotal).toBe(6);
    expect(collapsed[0].attributes.size).toEqual(["S", "M", "L"]);
    expect(collapsed[0].rawPayload.collapsedVariantIds).toEqual([101, 102, 103]);
  });

  it("prefers a representative with cleaner direct media over a broken copy cover", () => {
    const collapsed = collapseCatalogProductsByModel([
      makeProduct({
        legacyId: 13257156,
        sku: "132571",
        name: "40/105/19 FWE 7-23 M.Odelo",
        manufCode: "40/105/19 FWE 7-23 M.Odelo",
        categories: [{ id: 289, name: "Odelo", path: ["Odeca", "Odelo"] }],
        coverImage: "https://santos.rs/fajlovi/product/or2 copy.jpg",
        images: [
          "https://santos.rs/fajlovi/product/or2 copy.jpg",
          "https://santos.rs/fajlovi/product/or3.jpg",
        ],
        attributes: { size: ["56"] },
        stockTotal: 4,
      }),
      makeProduct({
        legacyId: 13257152,
        sku: "132571",
        name: "40/105/19 FWE 7-23 M.Odelo",
        manufCode: "40/105/19 FWE 7-23 M.Odelo",
        categories: [{ id: 289, name: "Odelo", path: ["Odeca", "Odelo"] }],
        coverImage: "https://santos.rs/fajlovi/product/or1.jpg",
        images: [
          "https://santos.rs/fajlovi/product/or1.jpg",
          "https://santos.rs/fajlovi/product/or3.jpg",
        ],
        attributes: { size: ["52"] },
        stockTotal: 1,
      }),
    ]);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].legacyId).toBe(13257152);
    expect(collapsed[0].coverImage).toBe("https://santos.rs/fajlovi/product/or1.jpg");
    expect(collapsed[0].rawPayload.collapsedVariantIds).toEqual([13257152, 13257156]);
  });
});
