import { describe, expect, it } from "vitest";
import { getCatalogProductDisplayName } from "@/lib/catalog/presentation";
import { buildMofficeSyncPlan, type MofficeExistingRow, type MofficeItem } from "@/lib/integrations/moffice/sync";

/**
 * The client renames a product in the admin and expects that exact name on the
 * shop, with stock and price still arriving from mOffice on the SKU. Two things
 * used to undo the rename: the display formatter, which treats a code-shaped
 * name as junk and swaps in the category label, and the sync, which creates a
 * brand-new row for a size mOffice reports for the first time.
 */

const existing = (overrides: Partial<MofficeExistingRow> = {}): MofficeExistingRow =>
  ({
    legacy_id: 1,
    sku: "82352",
    ean: "0823521",
    name_sr: "Mokasine E 601-4 crne",
    raw_payload: {
      nameOverride: true,
      attributes: { size: ["40"] },
      categories: [{ id: 1, name: "Obuca", path: ["Obuca"] }],
    },
    ...overrides,
  }) as MofficeExistingRow;

const feedItem = (overrides: Partial<MofficeItem> = {}): MofficeItem => ({
  ARTIKAL_ID: 134512,
  ARTIKAL_SIFRA: "82352",
  ARTIKAL_BARKOD: "0823522",
  ARTIKAL_NAZIV: "E 601-4 BLACK                 M.Cipele",
  ARTIKAL_MP_CENA: 5900,
  ARTIKAL_VP_CENA: 4900,
  ARTIKAL_PDV_STOPA: 20,
  ARTIKAL_ZALIHE: 3,
  ARTIKAL_GRUPA: "M.Cipele",
  ARTIKAL_VELICINA: "41",
  ...overrides,
});

describe("admin-typed product names", () => {
  it("shows a code-shaped name verbatim when the admin typed it", () => {
    const input = {
      name: "E 601-4 BLACK",
      sku: "82352",
      categories: [{ id: 1, name: "Obuca", path: ["Obuca"] }],
    };

    // Without the flag the formatter is free to rewrite it.
    expect(getCatalogProductDisplayName({ ...input, nameOverride: true })).toBe("E 601-4 BLACK");
  });

  it("still formats feed-supplied names", () => {
    const formatted = getCatalogProductDisplayName({
      name: "316 BLUE WHITE EVA                 M.Cipele",
      sku: "133051",
      categories: [{ id: 1, name: "Obuca", path: ["Obuca"] }],
    });
    expect(formatted).not.toBe("316 BLUE WHITE EVA                 M.Cipele");
  });

  it("keeps the typed name on a size mOffice reports for the first time", () => {
    /* Two stored sizes, so the SKU is ambiguous and the feed's new size 41 has
       no row to land on - the sync creates one. */
    const plan = buildMofficeSyncPlan({
      items: [feedItem()],
      existing: [
        existing(),
        existing({ legacy_id: 2, ean: "0823523", raw_payload: { nameOverride: true, attributes: { size: ["42"] } } } as Partial<MofficeExistingRow>),
      ],
      runId: "run-1",
    });

    const created = plan.rows.find((r) => ![1, 2].includes(Number(r.legacy_id)));
    expect(created).toBeTruthy();
    expect(created?.name_sr).toBe("Mokasine E 601-4 crne");
    expect((created?.raw_payload as Record<string, unknown>).nameOverride).toBe(true);
    // Stock and price still come from the feed.
    expect(created?.stock_total).toBe(3);
    expect(created?.price_gross).toBe(5900);
  });

  it("leaves a non-overridden SKU on the feed name", () => {
    const plan = buildMofficeSyncPlan({
      items: [feedItem()],
      existing: [
        existing({ raw_payload: { attributes: { size: ["40"] } } } as Partial<MofficeExistingRow>),
        existing({ legacy_id: 2, ean: "0823523", raw_payload: { attributes: { size: ["42"] } } } as Partial<MofficeExistingRow>),
      ],
      runId: "run-1",
    });

    const created = plan.rows.find((r) => ![1, 2].includes(Number(r.legacy_id)));
    expect(created?.name_sr).toBe("E 601-4 BLACK");
  });
});
