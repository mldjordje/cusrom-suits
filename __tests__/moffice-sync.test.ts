import { describe, expect, it } from "vitest";
import { buildMofficeSyncPlan, type MofficeExistingRow, type MofficeItem } from "@/lib/integrations/moffice/sync";

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
});
