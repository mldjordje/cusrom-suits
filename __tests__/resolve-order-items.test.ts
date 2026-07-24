import { describe, expect, it } from "vitest";
import {
  MAX_ORDER_LINE_QUANTITY,
  normalizeIncomingItems,
  resolveOrderItems,
  type CatalogPriceSource,
} from "@/lib/orders/resolveOrderItems";

const product = (overrides: Partial<CatalogPriceSource> & { legacyId: number }): CatalogPriceSource => ({
  sku: `SKU-${overrides.legacyId}`,
  name: `Product ${overrides.legacyId}`,
  priceFinalGross: 10_000,
  isActive: true,
  isExported: true,
  stockWarehouse1: 0,
  stockTotal: 5,
  coverImage: "/fajlovi/product/1.jpg",
  images: [],
  categories: [{ name: "Odelo" }],
  ...overrides,
});

const catalog = (products: CatalogPriceSource[]) => {
  const byId = new Map(products.map((p) => [p.legacyId, p]));
  return async (legacyId: number) => byId.get(legacyId) ?? null;
};

describe("normalizeIncomingItems", () => {
  it("drops malformed legacy ids", () => {
    const result = normalizeIncomingItems([
      { legacyId: 0 },
      { legacyId: -5 },
      { legacyId: "abc" },
      { legacyId: 12 },
    ]);
    expect(result.map((r) => r.legacyId)).toEqual([12]);
  });

  it("merges duplicate lines and clamps quantity", () => {
    const result = normalizeIncomingItems([
      { legacyId: 7, quantity: 3 },
      { legacyId: 7, quantity: 4 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(7);
  });

  it("caps a single line at MAX_ORDER_LINE_QUANTITY", () => {
    const result = normalizeIncomingItems([{ legacyId: 7, quantity: 9999 }]);
    expect(result[0].quantity).toBe(MAX_ORDER_LINE_QUANTITY);
  });

  it("caps how many distinct lines a payload can request", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ legacyId: i + 1 }));
    expect(normalizeIncomingItems(items, { maxLines: 50 })).toHaveLength(50);
  });
});

describe("resolveOrderItems", () => {
  it("ignores the client price and uses the catalog price", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1, price: 1, quantity: 2 }],
      catalog([product({ legacyId: 1, priceFinalGross: 24_900 })]),
    );

    expect(result.items[0].price).toBe(24_900);
    expect(result.subtotal).toBe(49_800);
    expect(result.mismatches).toEqual([
      { legacyId: 1, clientPrice: 1, serverPrice: 24_900 },
    ]);
  });

  it("ignores a client-supplied name and sku", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1, name: "Free suit", sku: "HACKED" }],
      catalog([product({ legacyId: 1, name: "Karlo Hc/1", sku: "133342" })]),
    );

    expect(result.items[0].name).toBe("Karlo Hc/1");
    expect(result.items[0].sku).toBe("133342");
  });

  it("rejects products that are missing from the catalog", async () => {
    const result = await resolveOrderItems([{ legacyId: 999 }], catalog([]));
    expect(result.items).toHaveLength(0);
    expect(result.rejected).toEqual([{ legacyId: 999, reason: "not_found" }]);
  });

  it("rejects inactive or unexported products", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1 }, { legacyId: 2 }],
      catalog([
        product({ legacyId: 1, isActive: false }),
        product({ legacyId: 2, isExported: false }),
      ]),
    );
    expect(result.items).toHaveLength(0);
    expect(result.rejected.map((r) => r.reason)).toEqual(["unavailable", "unavailable"]);
  });

  it("rejects out-of-stock products", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1 }],
      catalog([product({ legacyId: 1, stockTotal: 0, stockWarehouse1: 0 })]),
    );
    expect(result.rejected).toEqual([{ legacyId: 1, reason: "out_of_stock" }]);
  });

  it("rejects products with no usable price", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1 }],
      catalog([product({ legacyId: 1, priceFinalGross: 0 })]),
    );
    expect(result.rejected).toEqual([{ legacyId: 1, reason: "no_price" }]);
  });

  it("clamps quantity to available stock", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1, quantity: 10 }],
      catalog([product({ legacyId: 1, stockTotal: 3 })]),
    );
    expect(result.items[0].quantity).toBe(3);
    expect(result.quantityAdjusted).toBe(true);
  });

  it("falls back to warehouse 1 stock when the total is zero", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1, quantity: 2 }],
      catalog([product({ legacyId: 1, stockTotal: 0, stockWarehouse1: 4 })]),
    );
    expect(result.items[0].quantity).toBe(2);
  });

  it("computes subtotal and quantity across lines", async () => {
    const result = await resolveOrderItems(
      [
        { legacyId: 1, quantity: 2 },
        { legacyId: 2, quantity: 1 },
      ],
      catalog([
        product({ legacyId: 1, priceFinalGross: 5_000, stockTotal: 10 }),
        product({ legacyId: 2, priceFinalGross: 12_500, stockTotal: 10 }),
      ]),
    );
    expect(result.subtotal).toBe(22_500);
    expect(result.quantity).toBe(3);
  });

  it("records no mismatch when the client price agrees", async () => {
    const result = await resolveOrderItems(
      [{ legacyId: 1, price: 24_900 }],
      catalog([product({ legacyId: 1, priceFinalGross: 24_900 })]),
    );
    expect(result.mismatches).toHaveLength(0);
  });
});
