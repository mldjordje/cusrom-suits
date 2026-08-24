import { describe, expect, it } from "vitest";
import {
  CATALOG_SELECT_TRIMMED_PAYLOAD,
  RAW_PAYLOAD_LIST_KEYS,
  compactRawPayload,
  isSelectShapeError,
  rehydrateRawPayloadAliases,
} from "@/lib/catalog/store";

/* The catalog snapshot query stopped selecting the whole raw_payload column and
   now asks Supabase for only the keys compactRawPayload keeps. These tests guard
   the two ways that can silently go wrong: the key list drifting away from
   compactRawPayload, and the rp_* aliases not being folded back into the shape
   the rest of the module reads. */

/* Every key compactRawPayload knows how to keep, with a value that survives its
   type checks, so the "kept set" can be derived rather than restated. */
const FULL_PAYLOAD: Record<string, unknown> = {
  categories: [{ id: 1, name: "Kosulje", path: ["Kosulje"] }],
  landing: { featured: true, priority: 3 },
  attributes: { size: ["50", "52"] },
  media: { videoUrl: "https://assets.santos.rs/fajlovi/v.mp4", mediaOrder: ["a.jpg"] },
  seo: { title: "Kosulja" },
  washCareIcons: ["wash-30"],
  declaration: "100% pamuk",
  packageWeightKg: 0.4,
  forcedCategoryGroups: ["kosulje"],
  excludedCategoryGroups: ["odela"],
  hiddenFromShop: true,
  ananasExport: true,
  productType: "shirt",
  source: "moffice",
  moffice: { id: 12, size: "52", stock: 3, category: "KOSULJE", syncedRunId: "run-1" },
  syncSource: "moffice",
  imageFallback: { legacyId: 77 },
};

describe("raw_payload projection", () => {
  it("selects exactly the keys compactRawPayload keeps", () => {
    const kept = Object.keys(compactRawPayload(FULL_PAYLOAD)).sort();
    expect([...RAW_PAYLOAD_LIST_KEYS].sort()).toEqual(kept);
  });

  it("asks Supabase for each key as an aliased JSON path", () => {
    for (const key of RAW_PAYLOAD_LIST_KEYS) {
      expect(CATALOG_SELECT_TRIMMED_PAYLOAD).toContain(`rp_${key}:raw_payload->${key}`);
    }
  });

  it("does not transfer the whole raw_payload column", () => {
    /* The fat this change removes: legacyRaw, stockWarehouses and friends. */
    expect(CATALOG_SELECT_TRIMMED_PAYLOAD).not.toMatch(/(^|,)raw_payload(,|$)/);
  });

  it("still selects the plain product columns", () => {
    for (const column of ["legacy_id", "sku", "price_final_gross", "stock_total", "is_exported"]) {
      expect(CATALOG_SELECT_TRIMMED_PAYLOAD).toContain(column);
    }
  });
});

describe("rehydrateRawPayloadAliases", () => {
  it("folds rp_* aliases back into raw_payload", () => {
    const row = rehydrateRawPayloadAliases({
      legacy_id: 42,
      sku: "SKU-42",
      rp_categories: FULL_PAYLOAD.categories,
      rp_hiddenFromShop: true,
      rp_moffice: FULL_PAYLOAD.moffice,
    });

    expect(row.legacy_id).toBe(42);
    expect(row.sku).toBe("SKU-42");
    expect(row.raw_payload).toEqual({
      categories: FULL_PAYLOAD.categories,
      hiddenFromShop: true,
      moffice: FULL_PAYLOAD.moffice,
    });
  });

  it("leaves no rp_* keys behind", () => {
    const row = rehydrateRawPayloadAliases({ legacy_id: 1, rp_seo: { title: "x" } });
    expect(Object.keys(row).some((key) => key.startsWith("rp_"))).toBe(false);
  });

  it("drops keys the product does not have instead of storing nulls", () => {
    /* A JSON key that is absent comes back as null, and a stored null must not
       become an own property — code reads these with `hasOwnProperty`. */
    const row = rehydrateRawPayloadAliases({
      legacy_id: 1,
      rp_declaration: null,
      rp_packageWeightKg: undefined,
      rp_productType: "shirt",
    });
    expect(row.raw_payload).toEqual({ productType: "shirt" });
  });

  it("passes through a row that already carries raw_payload", () => {
    /* The fallback path selects the full column; it must not be re-processed. */
    const original = { legacy_id: 1, raw_payload: { categories: [], legacyRaw: { a: 1 } } };
    expect(rehydrateRawPayloadAliases({ ...original })).toEqual(original);
  });

  it("produces a payload compactRawPayload leaves untouched", () => {
    /* End to end: what the trimmed query returns must compact to the same thing
       the full column did, or the projection changed behaviour. */
    const aliased: Record<string, unknown> = { legacy_id: 1 };
    for (const key of RAW_PAYLOAD_LIST_KEYS) aliased[`rp_${key}`] = FULL_PAYLOAD[key];

    const fromTrimmed = compactRawPayload(
      rehydrateRawPayloadAliases(aliased).raw_payload as Record<string, unknown>,
    );
    const fromFullColumn = compactRawPayload({ ...FULL_PAYLOAD, legacyRaw: { big: "x" } });

    expect(fromTrimmed).toEqual(fromFullColumn);
  });
});

describe("isSelectShapeError", () => {
  /* The trimmed select falls back to the full raw_payload column when the server
     did not understand the projection. It must not fall back on anything else:
     a retry against a database that is down or restricted just sends the heavy
     query a second time, per page, per snapshot. */
  it.each([
    ["an undefined column", { code: "42703", message: 'column "rp_seo" does not exist' }],
    ["a PostgREST parse failure", { code: "PGRST100", message: "failed to parse select parameter" }],
    ["a plain does-not-exist message", { code: null, message: "relation does not exist" }],
  ])("retries on %s", (_label, error) => {
    expect(isSelectShapeError(error)).toBe(true);
  });

  it.each([
    [
      "an exceeded egress quota",
      {
        code: null,
        message:
          "Service for this project is restricted due to the following violations: exceed_egress_quota.",
      },
    ],
    ["a timeout", { code: "57014", message: "canceling statement due to statement timeout" }],
    ["a permission error", { code: "42501", message: "permission denied for table catalog_products" }],
    ["an empty error", {}],
  ])("does not retry on %s", (_label, error) => {
    expect(isSelectShapeError(error)).toBe(false);
  });
});
