import { describe, expect, it } from "vitest";
import { DEFAULT_FONT_LIBRARY } from "@/lib/storefront/fontLibraryDefaults";
import { buildGoogleFontUrls, buildStorefrontFontCss, resolveFontSettings } from "@/lib/storefront/fontSettingsDefaults";

describe("font settings resolution", () => {
  it("migrates legacy names to stable IDs", () => {
    const resolved = resolveFontSettings({ bodyFont: "Montserrat", displayFont: "Playfair Display" }, DEFAULT_FONT_LIBRARY);
    expect(resolved.body.id).toBe("montserrat");
    expect(resolved.heading.id).toBe("playfair-display");
  });

  it("falls back when IDs do not exist", () => {
    const resolved = resolveFontSettings({ bodyFontId: "missing", displayFontId: "missing" }, DEFAULT_FONT_LIBRARY);
    expect(resolved.body.id).toBe("montserrat");
    expect(resolved.heading.id).toBe("playfair-display");
  });

  it("builds encoded Google URLs and all compatibility variables", () => {
    const resolved = resolveFontSettings({}, DEFAULT_FONT_LIBRARY);
    expect(buildGoogleFontUrls(resolved)[0]).toContain("family=Montserrat");
    const css = buildStorefrontFontCss(resolved);
    for (const variable of ["--font-montserrat", "--font-playfair-display", "--font-family-base", "--font-heading", "--font-display", "--pf"]) {
      expect(css).toContain(variable);
    }
  });

  it("generates font-face rules for uploaded weights", () => {
    const library = [...DEFAULT_FONT_LIBRARY, { id: "brand", name: "Brand Font", source: "uploaded" as const, fallback: "sans-serif" as const, weights: ["400" as const, "700" as const], files: { "400": "fonts/brand/400.woff2", "700": "fonts/brand/700.woff2" } }];
    const resolved = resolveFontSettings({ bodyFontId: "brand" }, library);
    expect(buildStorefrontFontCss(resolved)).toContain("/site-assets/fonts/brand/700.woff2");
  });
});
