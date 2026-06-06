import { describe, expect, it } from "vitest";
import {
  buildMofficeExportRows,
  buildMofficeSyncPlan,
  buildPostSyncStaleIds,
  type MofficeExistingRow,
  type MofficeItem,
  type MofficePostSyncRow,
} from "@/lib/integrations/moffice/sync";

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
