/**
 * Footwear is entered by hand in the admin, not synced from mOffice, and it is
 * sized by something no garment table describes: an EU number plus the insole
 * (gaziste) length in cm.
 *
 * Three things had to hold for that to reach the storefront:
 *  - the ticked ladder has to survive normalisation as clean, ordered numbers,
 *  - the "this is a shoe" flag has to survive an unrelated save (productType is
 *    one slot shared with the business-uniform flag, and clearing it blindly is
 *    what would silently turn a shoe back into a name-matched guess),
 *  - an explicitly marked shoe must get the footwear size table only — models
 *    are named after the last ("Derbi 042"), which matches no garment regex and
 *    used to be handed every table in the guide.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_SHOE_SPEC,
  normalizeShoeSpec,
  shoeMaterialSummary,
  shoeSizeLabels,
  shoeSpecToSizeGuideTable,
  shoeTotalStock,
} from "@/lib/catalog/shoeSpecs";
import {
  BUSINESS_UNIFORM_PRODUCT_TYPE,
  FOOTWEAR_PRODUCT_TYPE,
  isBusinessUniformProduct,
  isFootwearProduct,
} from "@/lib/catalog/productTypes";

describe("normalizeShoeSpec", () => {
  it("orders the ladder and accepts comma decimals for the insole", () => {
    const spec = normalizeShoeSpec({
      sizes: [
        { size: "44", insoleCm: "28", stock: 2 },
        { size: "41", insoleCm: "23,5", stock: 1 },
        { size: "42", insoleCm: "25 cm", stock: "3" },
      ],
      upper: "  Prirodna   koža ",
    });

    expect(shoeSizeLabels(spec)).toEqual(["41", "42", "44"]);
    expect(spec?.sizes[0].insoleCm).toBe("23.5");
    expect(spec?.sizes[2].insoleCm).toBe("28");
    expect(spec?.sizes[1].stock).toBe(3);
    expect(spec?.upper).toBe("Prirodna koža");
  });

  it("drops junk sizes and de-duplicates rather than emitting two ladders", () => {
    const spec = normalizeShoeSpec({
      sizes: [
        { size: "42", insoleCm: "25", stock: 1 },
        { size: "42", insoleCm: "25", stock: 9 },
        { size: "XL", insoleCm: "25", stock: 1 },
        { size: "", insoleCm: "25", stock: 1 },
      ],
    });

    expect(shoeSizeLabels(spec)).toEqual(["42"]);
    expect(shoeTotalStock(spec)).toBe(1);
  });

  it("rejects an implausible insole instead of printing it as a measurement", () => {
    const spec = normalizeShoeSpec({ sizes: [{ size: "42", insoleCm: "250", stock: 1 }] });
    expect(spec?.sizes[0].insoleCm).toBe("");
  });

  it("returns null for an untouched form so nothing is written to the payload", () => {
    expect(normalizeShoeSpec(EMPTY_SHOE_SPEC)).toBeNull();
    expect(normalizeShoeSpec(null)).toBeNull();
    expect(normalizeShoeSpec("cipele")).toBeNull();
  });

  it("negative stock reads as zero, not as a discount on the total", () => {
    const spec = normalizeShoeSpec({
      sizes: [
        { size: "42", insoleCm: "25", stock: -5 },
        { size: "43", insoleCm: "26.5", stock: 2 },
      ],
    });
    expect(shoeTotalStock(spec)).toBe(2);
  });
});

describe("shoeMaterialSummary", () => {
  it("renders only the fields the admin filled in", () => {
    const spec = normalizeShoeSpec({ upper: "Prirodna koža", sole: "Guma" });
    expect(shoeMaterialSummary(spec)).toBe("Lice: Prirodna koža, Đon: Guma");
    expect(shoeMaterialSummary(spec, "en")).toBe("Upper: Prirodna koža, Sole: Guma");
  });

  it("is empty when no material was entered, so the old specification still wins", () => {
    expect(shoeMaterialSummary(normalizeShoeSpec({ sizes: [{ size: "42", insoleCm: "", stock: 1 }] }))).toBe("");
  });
});

describe("shoeSpecToSizeGuideTable", () => {
  it("builds a per-model table from the entered insole lengths", () => {
    const spec = normalizeShoeSpec({
      sizes: [
        { size: "42", insoleCm: "25", stock: 1 },
        { size: "43", insoleCm: "26.5", stock: 1 },
      ],
    });
    const table = shoeSpecToSizeGuideTable(spec, 1234);

    expect(table?.group).toBe("shoes");
    expect(table?.headers).toEqual(["Broj", "Dužina gazišta (cm)"]);
    expect(table?.rows.map((row) => row.cells)).toEqual([
      ["42", "25"],
      ["43", "26.5"],
    ]);
  });

  it("falls back to the global shoes table when the cm column was left blank", () => {
    const spec = normalizeShoeSpec({
      sizes: [
        { size: "42", insoleCm: "", stock: 1 },
        { size: "43", insoleCm: "", stock: 1 },
      ],
    });
    expect(shoeSpecToSizeGuideTable(spec, 1)).toBeNull();
  });

  it("does not render a one-row table — a single number teaches the buyer nothing", () => {
    const spec = normalizeShoeSpec({ sizes: [{ size: "42", insoleCm: "25", stock: 1 }] });
    expect(shoeSpecToSizeGuideTable(spec, 1)).toBeNull();
  });
});

describe("isFootwearProduct", () => {
  it("trusts the admin flag over the product name", () => {
    expect(
      isFootwearProduct({ name: "Derbi 042", rawPayload: { productType: FOOTWEAR_PRODUCT_TYPE } }),
    ).toBe(true);
  });

  it("still recognises mOffice shoes by name when nothing was flagged", () => {
    expect(isFootwearProduct({ name: "Cipele Marco crne", rawPayload: {} })).toBe(true);
    expect(isFootwearProduct({ name: "Mokasine Enzo", rawPayload: null })).toBe(true);
    expect(isFootwearProduct({ name: "Odelo Allesio", rawPayload: {} })).toBe(false);
  });

  it("matches on the category when the name alone gives nothing away", () => {
    expect(
      isFootwearProduct({ name: "Model 042", categories: [{ name: "Obuća", path: ["Obuća", "Elegantna"] }] }),
    ).toBe(true);
  });

  it("does not claim shirt-fabric names — Kosulja Oxford is not footwear", () => {
    expect(isFootwearProduct({ name: "Kosulja Oxford bela", rawPayload: {} })).toBe(false);
    expect(isFootwearProduct({ name: "Košulja Derby plava", rawPayload: {} })).toBe(false);
  });

  it("a business uniform is never a shoe, whatever it is called", () => {
    const uniform = {
      name: "Uniforma cipele recepcija",
      rawPayload: { productType: BUSINESS_UNIFORM_PRODUCT_TYPE },
    };
    expect(isFootwearProduct(uniform)).toBe(false);
    expect(isBusinessUniformProduct(uniform)).toBe(true);
  });
});
