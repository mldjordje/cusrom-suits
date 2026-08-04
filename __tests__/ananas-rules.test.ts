import { describe, expect, it } from "vitest";
import {
  addDays,
  basePriceEffectiveDay,
  canUpdateBasePrice,
  canUpdateDiscount,
  chunkPayload,
  durationInDays,
  formatAnanasDate,
  isSeasonalStartAllowed,
  isValidEan,
  parseAnanasDate,
  validateDiscountWindow,
} from "@/lib/integrations/ananas/rules";
import {
  mapCatalogItemToAnanas,
  mapCatalogToAnanas,
  resolvePackageWeightKg,
  toAbsoluteImageUrl,
} from "@/lib/integrations/ananas/mapper";
import { resolveLegacyProductId, shouldZeroOrphanStock } from "@/lib/integrations/ananas/sync";
import type { CatalogProductView } from "@/lib/catalog/store";

const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

describe("dates", () => {
  it("formats discounts as dd/MM/yyyy", () => {
    expect(formatAnanasDate(day("2026-07-05"))).toBe("05/07/2026");
  });

  it("round-trips their format", () => {
    expect(formatAnanasDate(parseAnanasDate("29/07/2026")!)).toBe("29/07/2026");
  });

  it("counts an inclusive day span", () => {
    expect(durationInDays(day("2026-07-01"), day("2026-07-01"))).toBe(1);
    expect(durationInDays(day("2026-07-01"), day("2026-07-30"))).toBe(30);
  });
});

describe("base price cutoff", () => {
  it("applies tomorrow when sent during the day", () => {
    const now = new Date(2026, 6, 28, 14, 0, 0);
    expect(basePriceEffectiveDay(now)).toBe("2026-07-29");
  });

  it("applies today inside the 00:00-03:00 window", () => {
    const now = new Date(2026, 6, 28, 0, 30, 0);
    expect(basePriceEffectiveDay(now)).toBe("2026-07-28");
  });

  it("is frozen while a campaign runs", () => {
    const active = { dateFrom: day("2026-07-20"), dateTo: day("2026-07-30") };
    expect(canUpdateBasePrice(active, day("2026-07-25"))).toBe(false);
    expect(canUpdateBasePrice(active, day("2026-07-31"))).toBe(true);
    expect(canUpdateBasePrice(null, day("2026-07-25"))).toBe(true);
  });
});

describe("EAN validation", () => {
  it("accepts real GTIN-13 and GTIN-8 codes", () => {
    expect(isValidEan("9788644105886")).toBe(true);
    expect(isValidEan("96385074")).toBe(true);
  });

  it("rejects the 9-digit internal mOffice code", () => {
    expect(isValidEan("013302060")).toBe(false);
    expect(isValidEan("012384354")).toBe(false);
  });

  it("rejects wrong check digits and non-digits", () => {
    expect(isValidEan("9788644105887")).toBe(false);
    expect(isValidEan("978864410588X")).toBe(false);
    expect(isValidEan("")).toBe(false);
  });
});

describe("chunking", () => {
  it("splits on item count", () => {
    const batches = chunkPayload([1, 2, 3, 4, 5], { maxItems: 2 });
    expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
  });

  it("splits on byte budget", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i, blob: "x".repeat(100) }));
    const batches = chunkPayload(rows, { maxItems: 1000, maxBytes: 400 });
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(Buffer.byteLength(JSON.stringify(batch), "utf8")).toBeLessThanOrEqual(400);
    }
  });

  it("never drops rows", () => {
    const rows = Array.from({ length: 1234 }, (_, i) => i);
    const batches = chunkPayload(rows, { maxItems: 500 });
    expect(batches.flat()).toEqual(rows);
  });
});

describe("discount windows", () => {
  const base = {
    discountType: "SALE" as const,
    basePrice: 10_000,
    discountPrice: 8_000,
    today: day("2026-07-28"),
  };

  it("accepts a 7 day SALE starting today", () => {
    expect(
      validateDiscountWindow({ ...base, dateFrom: day("2026-07-28"), dateTo: day("2026-08-03") }),
    ).toEqual({ ok: true });
  });

  it("rejects SALE longer than 30 days", () => {
    const result = validateDiscountWindow({ ...base, dateFrom: day("2026-07-28"), dateTo: day("2026-09-01") });
    expect(result.ok).toBe(false);
  });

  it("rejects a start date in the past", () => {
    const result = validateDiscountWindow({ ...base, dateFrom: day("2026-07-27"), dateTo: day("2026-07-30") });
    expect(result.ok).toBe(false);
  });

  it("enforces the 1 day pause after the previous campaign", () => {
    const tooSoon = validateDiscountWindow({
      ...base,
      dateFrom: day("2026-07-28"),
      dateTo: day("2026-08-03"),
      previousDateTo: day("2026-07-27"),
    });
    expect(tooSoon.ok).toBe(false);

    const ok = validateDiscountWindow({
      ...base,
      dateFrom: day("2026-07-29"),
      dateTo: day("2026-08-03"),
      previousDateTo: day("2026-07-27"),
      today: day("2026-07-28"),
    });
    expect(ok).toEqual({ ok: true });
  });

  it("rejects a cut deeper than 95%", () => {
    const result = validateDiscountWindow({
      ...base,
      discountPrice: 400,
      dateFrom: day("2026-07-28"),
      dateTo: day("2026-08-03"),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a discount price at or above base price", () => {
    const result = validateDiscountWindow({
      ...base,
      discountPrice: 10_000,
      dateFrom: day("2026-07-28"),
      dateTo: day("2026-08-03"),
    });
    expect(result.ok).toBe(false);
  });

  it("only allows seasonal sales in their windows", () => {
    expect(isSeasonalStartAllowed(day("2026-07-10")).ok).toBe(true);
    expect(isSeasonalStartAllowed(day("2026-12-28")).ok).toBe(true);
    expect(isSeasonalStartAllowed(day("2026-01-05")).ok).toBe(true);
    expect(isSeasonalStartAllowed(day("2026-03-01")).ok).toBe(false);
  });
});

describe("running campaign updates", () => {
  const today = day("2026-07-28");

  it("allows lowering the price", () => {
    expect(
      canUpdateDiscount({ currentDateFrom: day("2026-07-20"), currentPrice: 900, nextPrice: 800, today }),
    ).toEqual({ ok: true });
  });

  it("blocks raising the price", () => {
    const result = canUpdateDiscount({
      currentDateFrom: day("2026-07-20"),
      currentPrice: 900,
      nextPrice: 950,
      today,
    });
    expect(result.ok).toBe(false);
  });

  it("blocks date changes once started", () => {
    const result = canUpdateDiscount({
      currentDateFrom: day("2026-07-20"),
      currentDateTo: day("2026-07-30"),
      currentPrice: 900,
      nextPrice: 800,
      nextDateTo: day("2026-08-05"),
      today,
    });
    expect(result.ok).toBe(false);
  });

  it("leaves pending campaigns fully editable", () => {
    expect(
      canUpdateDiscount({
        currentDateFrom: day("2026-08-01"),
        currentPrice: 900,
        nextPrice: 950,
        nextDateTo: day("2026-08-20"),
        today,
      }),
    ).toEqual({ ok: true });
  });
});

/* ------------------------------------------------------------------ mapper */

const catalogItem = (overrides: Partial<CatalogProductView> = {}): CatalogProductView =>
  ({
    legacyId: 1234,
    sku: "133020",
    manufCode: null,
    ean: "9788644105886",
    name: "Muško odelo Karlo",
    nameEn: null,
    description: "Opis odela",
    descriptionEn: null,
    specification: null,
    specificationEn: null,
    priceGross: 24_990,
    priceFinalGross: 19_990,
    taxPercent: 20,
    rebatePercent: 0,
    stockWarehouse1: 3,
    stockTotal: 3,
    brand: "Santos&Santorini",
    isActive: true,
    isExported: true,
    hiddenFromShop: false,
    ananasExport: true,
    landingFeatured: false,
    landingPriority: null,
    categories: [{ id: 1, name: "Odela" }],
    coverImage: "/fajlovi/product/074_crop.jpg",
    images: ["/fajlovi/product/074_crop.jpg"],
    hasDirectMedia: true,
    videoUrl: null,
    attributes: { size: ["50", "52"] },
    rawPayload: {},
    ...overrides,
  }) as CatalogProductView;

describe("catalog mapper", () => {
  it("makes legacy image paths absolute", () => {
    expect(toAbsoluteImageUrl("/fajlovi/product/074_crop.jpg")).toBe(
      "https://assets.santos.rs/fajlovi/product/074_crop.jpg",
    );
    expect(toAbsoluteImageUrl("https://assets.santos.rs/fajlovi/product/074_crop.jpg")).toBe(
      "https://assets.santos.rs/fajlovi/product/074_crop.jpg",
    );
  });

  it("maps a valid product", () => {
    const result = mapCatalogItemToAnanas(catalogItem());
    expect("product" in result).toBe(true);
    if (!("product" in result)) return;
    expect(result.product.payload).toMatchObject({
      ean: "9788644105886",
      // mOffice sku is a shared style code; Ananas requires it unique per variant.
      sku: "133020_1234",
      externalId: "1234",
      basePrice: 24_990,
      vat: 20,
      stockLevel: 3,
      packageWeightUnit: "kg",
      category: "Odela",
    });
    expect(result.product.payload.attributes["Veličina"]).toEqual(["50", "52"]);
    expect(result.product.payload.coverImage).toMatch(/^https:\/\//);
  });

  it("rejects the internal 9-digit code unless explicitly allowed", () => {
    const rejected = mapCatalogItemToAnanas(catalogItem({ ean: "013302060" }));
    expect("rejection" in rejected).toBe(true);

    const allowed = mapCatalogItemToAnanas(catalogItem({ ean: "013302060" }), { allowInternalEan: true });
    expect("product" in allowed).toBe(true);
  });

  it("rejects rows without an image or price", () => {
    expect("rejection" in mapCatalogItemToAnanas(catalogItem({ coverImage: null, images: [] }))).toBe(true);
    expect(
      "rejection" in mapCatalogItemToAnanas(catalogItem({ priceGross: 0, priceFinalGross: 0 })),
    ).toBe(true);
  });

  it("groups size variants under one parentEan via manuf_code, per Ananas' worked example", () => {
    // Real mOffice sku ("106338") is shared by every size — legacyId is what's
    // actually unique, and the group's lowest legacyId becomes the parent.
    const group = [
      catalogItem({ legacyId: 3, sku: "106338", ean: "6985698754785", manufCode: "106338" }), // XS
      catalogItem({ legacyId: 1, sku: "106338", ean: "1254698758987", manufCode: "106338" }), // L (parent)
      catalogItem({ legacyId: 2, sku: "106338", ean: "2564785987458", manufCode: "106338" }), // S
      catalogItem({ legacyId: 4, sku: "999999", ean: "9788644105886", manufCode: null }),
    ];
    // Ananas' own worked-example codes aren't real GTINs either; exercise the
    // now-default-on internal-code path the same way sync.ts does.
    const { products, rejected } = mapCatalogToAnanas(group, { allowInternalEan: true });
    expect(rejected).toEqual([]);

    const byLegacyId = new Map(products.map((p) => [p.legacyId, p.payload]));
    expect(byLegacyId.get(1)?.parentEan).toBe(""); // lowest legacyId => parent
    expect(byLegacyId.get(1)?.sku).toBe("106338_1");
    expect(byLegacyId.get(2)?.parentEan).toBe("1254698758987");
    expect(byLegacyId.get(3)?.parentEan).toBe("1254698758987");
    // No manuf_code / lone variant: never grouped.
    expect(byLegacyId.get(4)?.parentEan).toBe("");
  });

  it("picks shipping weight from the product group", () => {
    expect(resolvePackageWeightKg(catalogItem())).toBe(1.6);
    expect(
      resolvePackageWeightKg(catalogItem({ name: "Muška košulja", categories: [{ id: 2, name: "Košulje" }] as never })),
    ).toBe(0.45);
  });
});

describe("listing → catalog mapping", () => {
  // Shapes taken verbatim from the Ananas QA response on 2026-07-31.
  it("recovers legacyId from the sku suffix when externalId is null", () => {
    expect(
      resolveLegacyProductId({ id: 2512097, externalId: null, ean: null, sku: "133856_81092" }),
    ).toBe(81092);
    expect(
      resolveLegacyProductId({ id: 2512096, externalId: null, ean: null, sku: "133342_13334256" }),
    ).toBe(13334256);
  });

  it("prefers externalId when they do send it back", () => {
    expect(resolveLegacyProductId({ id: 1, externalId: "4242", sku: "133342_13334256" })).toBe(4242);
  });

  it("returns 0 for rows it cannot tie to our catalog", () => {
    expect(resolveLegacyProductId({ id: 1, externalId: null, sku: "133342" })).toBe(0);
    expect(resolveLegacyProductId({ id: 1, externalId: null, sku: null })).toBe(0);
    expect(resolveLegacyProductId({ id: 1 })).toBe(0);
  });
});

describe("sold-out listings", () => {
  const listed = { merchantInventoryId: 2512097, warehouse: "MERCHANT_WAREHOUSE", remoteStockLevel: 15 };

  it("zeroes a listing that dropped out of the catalog", () => {
    // mOffice sets is_active/is_exported to `stock > 0`, so a sold-out product
    // disappears from our catalog query entirely — this is the only signal.
    expect(shouldZeroOrphanStock(listed, false)).toBe(true);
  });

  it("leaves products still in the catalog alone", () => {
    expect(shouldZeroOrphanStock(listed, true)).toBe(false);
  });

  it("never touches Ananas-fulfilled inventory", () => {
    expect(shouldZeroOrphanStock({ ...listed, warehouse: "ANANAS_WAREHOUSE" }, false)).toBe(false);
  });

  it("skips listings that are already at zero", () => {
    expect(shouldZeroOrphanStock({ ...listed, remoteStockLevel: 0 }, false)).toBe(false);
  });

  it("skips products that were never listed", () => {
    expect(shouldZeroOrphanStock({ ...listed, merchantInventoryId: null }, false)).toBe(false);
  });
});

describe("addDays", () => {
  it("keeps the window inside SALE bounds", () => {
    const from = day("2026-07-28");
    expect(formatAnanasDate(addDays(from, 6))).toBe("03/08/2026");
  });
});
