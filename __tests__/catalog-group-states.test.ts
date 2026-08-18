import { describe, expect, it } from "vitest";
import {
  CATALOG_CATEGORY_GROUP_CATALOGUE,
  describeCatalogProductGroups,
  type CatalogProductView,
} from "@/lib/catalog/store";

/** Minimal product shaped like a catalog row; only the grouping inputs matter. */
const makeProduct = (overrides: Partial<CatalogProductView> = {}): CatalogProductView =>
  ({
    legacyId: 1,
    sku: "100001",
    manufCode: null,
    ean: null,
    name: "Test",
    nameEn: null,
    description: null,
    descriptionEn: null,
    specification: null,
    specificationEn: null,
    priceGross: 1000,
    priceFinalGross: 1000,
    taxPercent: 20,
    rebatePercent: 0,
    stockWarehouse1: 1,
    stockTotal: 1,
    brand: null,
    isActive: true,
    isExported: true,
    hiddenFromShop: false,
    ananasExport: false,
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
  }) as CatalogProductView;

const stateOf = (item: CatalogProductView, key: string) =>
  describeCatalogProductGroups(item).find((group) => group.key === key);

describe("describeCatalogProductGroups", () => {
  it("marks a group resolved from the name as derived and active", () => {
    const sako = stateOf(makeProduct({ name: "BRANDO/74 M.Sako" }), "sako");
    expect(sako).toMatchObject({ state: "derived", active: true });
  });

  it("leaves unrelated groups off", () => {
    const obuca = stateOf(makeProduct({ name: "BRANDO/74 M.Sako" }), "obuca");
    expect(obuca).toMatchObject({ state: "off", active: false });
  });

  it("reports a hand-added group as forced, not derived", () => {
    const item = makeProduct({ name: "36/195/17", rawPayload: { forcedCategoryGroups: ["kravata"] } });
    expect(stateOf(item, "kravata")).toMatchObject({ state: "forced", active: true });
  });

  it("reports a hand-removed group as excluded and inactive even when the name resolves it", () => {
    const item = makeProduct({ name: "M. Prsluk MP6/5", rawPayload: { excludedCategoryGroups: ["prsluk"] } });
    expect(stateOf(item, "prsluk")).toMatchObject({ state: "excluded", active: false });
  });

  it("rolls a tie up into the accessories parent", () => {
    const item = makeProduct({ name: "Kravata Kravata2" });
    expect(stateOf(item, "kravata")).toMatchObject({ active: true });
    expect(stateOf(item, "aksesoari")).toMatchObject({ active: true });
  });

  it("counts bow ties as ties", () => {
    expect(stateOf(makeProduct({ name: "Leptir mašna LM3" }), "kravata")).toMatchObject({ active: true });
  });

  it("nests the accessory sub-groups under Aksesoari and nowhere else", () => {
    const accessories = CATALOG_CATEGORY_GROUP_CATALOGUE.find((entry) => entry.key === "aksesoari");
    expect(accessories?.children.map((child) => child.key).sort()).toEqual(
      ["card-holder", "kais", "kravata", "novcanik", "torba"].sort(),
    );
    const strays = CATALOG_CATEGORY_GROUP_CATALOGUE.filter(
      (entry) => entry.key !== "aksesoari" && entry.children.length > 0,
    );
    expect(strays).toEqual([]);
  });

  it("describes every group in the catalogue, parents and children alike", () => {
    const described = new Set(describeCatalogProductGroups(makeProduct()).map((group) => group.key));
    for (const entry of CATALOG_CATEGORY_GROUP_CATALOGUE) {
      expect(described.has(entry.key)).toBe(true);
      for (const child of entry.children) expect(described.has(child.key)).toBe(true);
    }
  });
});
