import { describe, expect, it } from "vitest";
import {
  ALLOWED_FONT_WEIGHTS,
  DEFAULT_FONT_LIBRARY,
  findFontByLegacyName,
  normalizeFontLibrary,
  normalizeFontFamilyName,
} from "@/lib/storefront/fontLibraryDefaults";

describe("font library", () => {
  it("ships unique built-in body and heading families", () => {
    expect(DEFAULT_FONT_LIBRARY.map((font) => font.id)).toEqual(["montserrat", "playfair-display"]);
    expect(new Set(DEFAULT_FONT_LIBRARY.map((font) => font.id)).size).toBe(2);
    expect(DEFAULT_FONT_LIBRARY.every((font) => font.weights.every((weight) => ALLOWED_FONT_WEIGHTS.includes(weight)))).toBe(true);
  });

  it("normalizes safe family names and rejects CSS control characters", () => {
    expect(normalizeFontFamilyName("  Cormorant   Garamond ")).toBe("Cormorant Garamond");
    expect(normalizeFontFamilyName('Bad"; color:red')).toBeNull();
  });

  it("finds legacy names without case sensitivity", () => {
    expect(findFontByLegacyName(DEFAULT_FONT_LIBRARY, "PLAYFAIR DISPLAY")?.id).toBe("playfair-display");
  });

  it("merges built-ins and drops malformed stored records", () => {
    const library = normalizeFontLibrary([{ id: "brand", name: "Brand", source: "uploaded", fallback: "sans-serif", weights: ["400"], files: { "400": "fonts/brand/400.woff2" } }, { id: "bad" }]);
    expect(library.map((font) => font.id)).toEqual(["montserrat", "playfair-display", "brand"]);
  });
});
