import { describe, expect, it } from "vitest";
import {
  buildMofficeExportRows,
  buildMofficeSyncPlan,
  buildPostSyncStaleIds,
  collectUnknownFeedFields,
  excludeProtectedStaleIds,
  type MofficeExistingRow,
  type MofficeItem,
  type MofficePostSyncRow,
} from "@/lib/integrations/moffice/sync";
import { extractModelCode } from "@/lib/integrations/moffice/modelCode";

const row = (overrides: Partial<MofficeExistingRow> = {}): MofficeExistingRow => ({
  legacy_id: 1,
  sku: "133051",
  ean: "013305145",
  name_sr: "316 BLUE WHITE EVA",
  raw_payload: {
    legacyRaw: {},
    attributes: { size: ["45"] },
    categories: [{ id: 1, name: "Obuca", path: ["Obuca"] }],
    stockWarehouses: [],
  },
  ...overrides,
});

const item = (overrides: Partial<MofficeItem> = {}): MofficeItem => ({
  ARTIKAL_ID: 79404,
  ARTIKAL_SIFRA: "133051",
  ARTIKAL_BARKOD: "013305144",
  ARTIKAL_NAZIV: "316 BLUE WHITE EVA                 M.Cipele",
  ARTIKAL_MP_CENA: 9900,
  ARTIKAL_VP_CENA: 8250,
  ARTIKAL_PDV_STOPA: 20,
  ARTIKAL_ZALIHE: 2,
  ARTIKAL_GRUPA: "M.Cipele",
  ARTIKAL_VELICINA: "44",
  ...overrides,
});

describe("mOffice sync planning", () => {
  it("marks a legacy lager SKU absent from the latest mOffice feed as stale", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-1",
      items: [item({ ARTIKAL_SIFRA: "133051", ARTIKAL_BARKOD: "013305144", ARTIKAL_VELICINA: "44" })],
      existing: [
        row({
          legacy_id: 13040699,
          sku: "130406",
          ean: "013040699",
          name_sr: "Automatic black heels 4",
          raw_payload: { legacyRaw: {}, attributes: { size: [] }, stockWarehouses: [] },
        }),
      ],
    });

    expect(plan.staleLegacyIds).toEqual([13040699]);
  });

  it("marks only the missing size variant stale when the SKU is still present in mOffice", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-2",
      items: [
        item({ ARTIKAL_BARKOD: "013305144", ARTIKAL_VELICINA: "44", ARTIKAL_ZALIHE: 2 }),
      ],
      existing: [
        row({
          legacy_id: 13305144,
          sku: "133051",
          ean: "013305144",
          raw_payload: {
            legacyRaw: {},
            attributes: { size: ["44"] },
            moffice: { id: 79404, size: "44" },
          },
        }),
        row({
          legacy_id: 13305145,
          sku: "133051",
          ean: "013305145",
          raw_payload: {
            legacyRaw: {},
            attributes: { size: ["45"] },
            stockWarehouses: [],
          },
        }),
      ],
    });

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].legacy_id).toBe(13305144);
    expect(plan.staleLegacyIds).toEqual([13305145]);
  });

  it("keeps size variants separate when mOffice reuses the same article id", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-size-id",
      items: [
        item({ ARTIKAL_ID: 79404, ARTIKAL_BARKOD: "013305140", ARTIKAL_VELICINA: "40", ARTIKAL_ZALIHE: 2 }),
        item({ ARTIKAL_ID: 79404, ARTIKAL_BARKOD: "013305141", ARTIKAL_VELICINA: "41", ARTIKAL_ZALIHE: 3 }),
        item({ ARTIKAL_ID: 79404, ARTIKAL_BARKOD: "013305144", ARTIKAL_VELICINA: "44", ARTIKAL_ZALIHE: 1 }),
      ],
      existing: [
        row({ legacy_id: 13305140, ean: "013305140", raw_payload: { legacyRaw: {}, attributes: { size: ["40"] } } }),
        row({ legacy_id: 13305141, ean: "013305141", raw_payload: { legacyRaw: {}, attributes: { size: ["41"] } } }),
        row({ legacy_id: 13305144, ean: "013305144", raw_payload: { legacyRaw: {}, attributes: { size: ["44"] } } }),
        row({ legacy_id: 13305145, ean: "013305145", raw_payload: { legacyRaw: {}, attributes: { size: ["45"] } } }),
      ],
    });

    expect(plan.rows.map((entry) => entry.legacy_id).sort()).toEqual([13305140, 13305141, 13305144]);
    expect(plan.staleLegacyIds).toEqual([13305145]);
  });

  it("writes mOffice size into raw_payload.attributes.size for belts and other sized products", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-3",
      items: [
        item({
          ARTIKAL_ID: 90001,
          ARTIKAL_SIFRA: "KAIS-01",
          ARTIKAL_BARKOD: "090001105",
          ARTIKAL_NAZIV: "Kais braon",
          ARTIKAL_GRUPA: "M.Kais",
          ARTIKAL_VELICINA: "105",
        }),
      ],
      existing: [],
    });

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].raw_payload).toMatchObject({
      source: "moffice",
      attributes: { size: ["105"] },
      moffice: { size: "105", syncedRunId: "run-3" },
    });
  });

  it("keeps mOffice zero-stock rows hidden and not exported", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-zero",
      items: [
        item({
          ARTIKAL_ID: 55501,
          ARTIKAL_SIFRA: "55501",
          ARTIKAL_BARKOD: "055501001",
          ARTIKAL_VELICINA: "XL",
          ARTIKAL_ZALIHE: 0,
        }),
      ],
      existing: [],
    });

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({
      stock_total: 0,
      stock_warehouse_1: 0,
      is_active: false,
      is_exported: false,
    });
    expect(plan.rows[0].raw_payload).toMatchObject({
      moffice: { stock: 0, syncedRunId: "run-zero" },
    });
  });

  it("post-sync cleanup still sees stale rows after the first Supabase page", () => {
    const rows: MofficePostSyncRow[] = Array.from({ length: 1001 }, (_, index) => ({
      legacy_id: index + 1,
      sku: String(100000 + index),
      ean: `0${100000 + index}`,
      name_sr: `Product ${index + 1}`,
      raw_payload: { legacyRaw: {}, attributes: { size: ["UNI"] }, stockWarehouses: [] },
      is_active: true,
      is_exported: true,
      stock_total: 1,
      stock_warehouse_1: 1,
    }));
    rows.push({
      legacy_id: 12951354,
      sku: "129513",
      ean: "012951354",
      name_sr: "Stale product",
      raw_payload: { legacyRaw: {}, attributes: { size: ["54"] }, stockWarehouses: [] },
      is_active: true,
      is_exported: true,
      stock_total: 2,
      stock_warehouse_1: 2,
    });

    expect(buildPostSyncStaleIds(rows, "latest-run")).toContain(12951354);
  });

  it("never deactivates a row that was upserted in the current run", () => {
    // Regression: a duplicate legacy row for the same variant (small id + EAN-derived
    // id) used to let an upserted in-stock row be zeroed by the post-sync cleanup.
    const staleCandidates = [74197, 12824982, 999];
    const upsertedThisRun = [74197]; // mOffice gave it stock this run -> must survive
    const alreadyCleaned = new Set([12824982]);
    const result = excludeProtectedStaleIds(staleCandidates, [...alreadyCleaned, ...upsertedThisRun]);
    expect(result).toEqual([999]);
    expect(result).not.toContain(74197);
  });

  describe("extractModelCode (legacy manufcode grouping)", () => {
    it("extracts the same code for variants of one model regardless of name noise", () => {
      expect(extractModelCode(null, "M. Košulja C8/61")).toBe("c8/61");
      expect(extractModelCode(null, "C8/61")).toBe("c8/61");
      expect(extractModelCode("BRANDO/74                 M.Košulja", "BRANDO/74")).toBe("brando/74");
      expect(extractModelCode(null, "CASCAVEL/75 M.Košulja")).toBe("cascavel/75");
      expect(extractModelCode(null, "M. Pantalone P20/228/3N")).toBe("p20/228/3n");
    });

    it("keeps different colours of one model separate (no wrong-image merge)", () => {
      expect(extractModelCode(null, "M. Košulja C8/51")).not.toBe(extractModelCode(null, "M. Košulja C8/53"));
    });

    it("returns empty for generic names without a distinctive code", () => {
      expect(extractModelCode(null, "Kravata")).toBe("");
      expect(extractModelCode(null, "Kapa")).toBe("");
      expect(extractModelCode(null, "Čarapa")).toBe("");
      expect(extractModelCode(null, "75")).toBe("");
    });
  });

  it("exports visible and hidden mOffice mismatches with clear statuses", () => {
    const rows: MofficePostSyncRow[] = [
      {
        legacy_id: 12951354,
        sku: "129513",
        ean: "012951354",
        name_sr: "Missing from feed",
        raw_payload: { legacyRaw: {}, attributes: { size: ["54"] }, stockWarehouses: [] },
        is_active: true,
        is_exported: true,
        stock_total: 2,
        stock_warehouse_1: 2,
      },
      {
        legacy_id: 13040699,
        sku: "130406",
        ean: "013040699",
        name_sr: "Already hidden",
        raw_payload: { legacyRaw: {}, attributes: { size: ["99"] }, stockWarehouses: [] },
        is_active: false,
        is_exported: false,
        stock_total: 0,
        stock_warehouse_1: 0,
      },
      {
        legacy_id: 13305144,
        sku: "133051",
        ean: "013305144",
        name_sr: "316 BLUE WHITE EVA",
        raw_payload: {
          moffice: { id: 79404, size: "44", stock: 2, category: "M.Cipele", syncedRunId: "latest-run" },
          attributes: { size: ["44"] },
        },
        is_active: true,
        is_exported: true,
        stock_total: 1,
        stock_warehouse_1: 1,
      },
    ];

    expect(buildMofficeExportRows({ rows, latestRunId: "latest-run" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: "129513", status: "VISIBLE_BUT_MISSING_FROM_MOFFICE" }),
        expect.objectContaining({ sku: "130406", status: "MISSING_FROM_MOFFICE_HIDDEN" }),
        expect.objectContaining({ sku: "133051", status: "VISIBLE_WITH_WRONG_STOCK" }),
      ]),
    );
  });
});

describe("mOffice size collapse", () => {
  it("gives every feed size its own row when the SKU has a single sized row in the catalog", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-collapse",
      items: [
        item({ ARTIKAL_ID: 1, ARTIKAL_SIFRA: "134274", ARTIKAL_BARKOD: "013427448", ARTIKAL_VELICINA: "48", ARTIKAL_ZALIHE: 4 }),
        item({ ARTIKAL_ID: 2, ARTIKAL_SIFRA: "134274", ARTIKAL_BARKOD: "013427450", ARTIKAL_VELICINA: "50", ARTIKAL_ZALIHE: 1 }),
        item({ ARTIKAL_ID: 3, ARTIKAL_SIFRA: "134274", ARTIKAL_BARKOD: "013427452", ARTIKAL_VELICINA: "52", ARTIKAL_ZALIHE: 2 }),
      ],
      existing: [
        row({
          legacy_id: 82084,
          sku: "134274",
          ean: "013427450",
          name_sr: "Sako",
          raw_payload: { moffice: { size: "50" }, attributes: { size: ["50"] } },
        }),
      ],
    });

    expect(plan.rows).toHaveLength(3);
    expect(plan.rows.map((r) => r.ean).sort()).toEqual(["013427448", "013427450", "013427452"]);
    expect(plan.rows.find((r) => r.ean === "013427450")?.legacy_id).toBe(82084);
    expect(plan.rows.map((r) => r.stock_total).sort()).toEqual([1, 2, 4]);
  });

  it("still matches a sizeless legacy row by SKU alone", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-sizeless",
      items: [item({ ARTIKAL_ID: 9, ARTIKAL_SIFRA: "100189", ARTIKAL_BARKOD: "010018999", ARTIKAL_VELICINA: "", ARTIKAL_ZALIHE: 5 })],
      existing: [
        row({
          legacy_id: 20014,
          sku: "100189",
          ean: "",
          name_sr: "Kapa",
          raw_payload: { moffice: {}, attributes: { size: [] } },
        }),
      ],
    });

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].legacy_id).toBe(20014);
    expect(plan.rows[0].stock_total).toBe(5);
  });
});

describe("mOffice feed discounts", () => {
  it("prices a row at full MP when the feed carries no discount field", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-nodisc",
      items: [item({ ARTIKAL_MP_CENA: 15900, ARTIKAL_VP_CENA: 13250 })],
      existing: [],
    });

    expect(plan.rows[0].price_gross).toBe(15900);
    expect(plan.rows[0].price_final_gross).toBe(15900);
    expect(plan.rows[0].rebate_percent).toBe(0);
  });

  it("turns a percent discount field into a crossed-out price the storefront can render", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-percent",
      items: [item({ ARTIKAL_MP_CENA: 15900, ARTIKAL_RABAT: 20 } as MofficeItem)],
      existing: [],
    });

    expect(plan.rows[0].price_gross).toBe(15900);
    expect(plan.rows[0].price_final_gross).toBe(12720);
    expect(plan.rows[0].rebate_percent).toBe(20);
  });

  it("accepts a discounted-price field and derives the percent from it", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-akcija",
      items: [item({ ARTIKAL_MP_CENA: 10000, ARTIKAL_AKCIJSKA_CENA: 7500 } as MofficeItem)],
      existing: [],
    });

    expect(plan.rows[0].price_final_gross).toBe(7500);
    expect(plan.rows[0].rebate_percent).toBe(25);
  });

  it("ignores a discount that is not a real reduction", () => {
    for (const bogus of [{ ARTIKAL_RABAT: 0 }, { ARTIKAL_RABAT: 120 }, { ARTIKAL_AKCIJSKA_CENA: 20000 }, { ARTIKAL_AKCIJSKA_CENA: "" }]) {
      const plan = buildMofficeSyncPlan({
        runId: "run-bogus",
        items: [item({ ARTIKAL_MP_CENA: 15900, ...bogus } as MofficeItem)],
        existing: [],
      });
      expect(plan.rows[0].price_final_gross).toBe(15900);
      expect(plan.rows[0].rebate_percent).toBe(0);
    }
  });

  it("reports feed fields it does not know about", () => {
    expect(collectUnknownFeedFields([item(), item({ ARTIKAL_RABAT: 10 } as MofficeItem)])).toEqual([]);
    expect(collectUnknownFeedFields([item({ ARTIKAL_NESTO_NOVO: 1 } as MofficeItem)])).toEqual(["ARTIKAL_NESTO_NOVO"]);
  });
});

describe("mOffice variant identity", () => {
  it("leaves an existing row with the variant whose barcode it carries", () => {
    const plan = buildMofficeSyncPlan({
      runId: "run-identity",
      items: [
        // Size 43 is listed first and the stale payload.size still says "43",
        // so without EAN priority it would take the row that belongs to size 41.
        item({ ARTIKAL_ID: 82354, ARTIKAL_SIFRA: "134514", ARTIKAL_BARKOD: "013451443", ARTIKAL_VELICINA: "43" }),
        item({ ARTIKAL_ID: 82354, ARTIKAL_SIFRA: "134514", ARTIKAL_BARKOD: "013451441", ARTIKAL_VELICINA: "41" }),
      ],
      existing: [
        row({
          legacy_id: 82354,
          sku: "134514",
          ean: "013451441",
          name_sr: "E 601-3 SUGGERO",
          raw_payload: { size: "43", moffice: { size: "41" }, attributes: { size: ["41"] } },
        }),
      ],
    });

    expect(plan.rows).toHaveLength(2);
    expect(plan.rows.find((r) => r.legacy_id === 82354)?.ean).toBe("013451441");
    expect(plan.rows.every((r) => Number(r.stock_total) === 2 && r.is_active === true)).toBe(true);
  });
});
