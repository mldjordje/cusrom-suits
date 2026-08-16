/**
 * Client-safe font settings defaults — no server imports.
 * Import this file in client components instead of fontSettings.ts.
 */

import {
  DEFAULT_FONT_LIBRARY,
  findFontByLegacyName,
  type FontFamilyRecord,
  type FontWeight,
} from "@/lib/storefront/fontLibraryDefaults";

export type FontSettingsShape = {
  updatedAt: string | null;
  bodyFontId: string;
  displayFontId: string;
  bodyFont: string;
  displayFont: string;
  bodyFontWeight: string;
  displayFontWeight: string;
  letterSpacingBase: string;
};

export const DEFAULT_FONT_SETTINGS: FontSettingsShape = {
  updatedAt: null,
  bodyFontId: "montserrat",
  displayFontId: "playfair-display",
  bodyFont: "Montserrat",
  displayFont: "Playfair Display",
  bodyFontWeight: "400",
  displayFontWeight: "700",
  letterSpacingBase: "0",
};

export type ResolvedFontSettings = {
  body: FontFamilyRecord;
  heading: FontFamilyRecord;
  bodyWeight: FontWeight;
  headingWeight: FontWeight;
  letterSpacingBase: string;
};

const validWeight = (font: FontFamilyRecord, value: unknown, fallback: FontWeight): FontWeight =>
  font.weights.includes(String(value) as FontWeight) ? String(value) as FontWeight : font.weights.includes(fallback) ? fallback : font.weights[0];

export const resolveFontSettings = (
  input: Partial<FontSettingsShape>,
  library: FontFamilyRecord[] = DEFAULT_FONT_LIBRARY,
): ResolvedFontSettings => {
  const body = library.find((font) => font.id === input.bodyFontId)
    || findFontByLegacyName(library, input.bodyFont)
    || library.find((font) => font.id === DEFAULT_FONT_SETTINGS.bodyFontId)
    || DEFAULT_FONT_LIBRARY[0];
  const heading = library.find((font) => font.id === input.displayFontId)
    || findFontByLegacyName(library, input.displayFont)
    || library.find((font) => font.id === DEFAULT_FONT_SETTINGS.displayFontId)
    || DEFAULT_FONT_LIBRARY[1];
  return {
    body,
    heading,
    bodyWeight: validWeight(body, input.bodyFontWeight, "400"),
    headingWeight: validWeight(heading, input.displayFontWeight, "700"),
    letterSpacingBase: /^-?\d+(\.\d+)?$/.test(String(input.letterSpacingBase || "0")) ? String(input.letterSpacingBase || "0") : "0",
  };
};

const cssString = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ");

/**
 * Build the font-family stack for a record.
 *
 * The brand defaults (Montserrat / Playfair Display) are always kept in the chain
 * ahead of the generic fallback. If the configured family fails to load — a typo in
 * the admin font picker, a Google Fonts outage, a deleted upload — the page lands on
 * the brand serif/sans instead of the browser's Times/Arial.
 */
const fontStack = (font: FontFamilyRecord) => {
  const brandDefault = font.fallback === "serif" ? "Playfair Display" : "Montserrat";
  const names = [font.name];
  if (font.name.toLowerCase() !== brandDefault.toLowerCase()) names.push(brandDefault);
  return `${names.map((name) => `"${cssString(name)}"`).join(",")},${font.fallback}`;
};

export const buildGoogleFontUrls = (settings: ResolvedFontSettings) => {
  const unique = new Map([settings.body, settings.heading].filter((font) => font.source === "google").map((font) => [font.id, font]));
  return Array.from(unique.values()).map((font) => {
    const family = encodeURIComponent(font.name).replace(/%20/g, "+");
    return `https://fonts.googleapis.com/css2?family=${family}:wght@${font.weights.join(";")}&display=swap`;
  });
};

export const buildStorefrontFontCss = (settings: ResolvedFontSettings) => {
  const faces = [settings.body, settings.heading].filter((font) => font.source === "uploaded").flatMap((font) =>
    font.weights.map((weight) => font.files?.[weight] ? `@font-face{font-family:"${cssString(font.name)}";src:url("/site-assets/${font.files[weight]}") format("woff2");font-style:normal;font-weight:${weight};font-display:swap;}` : "").filter(Boolean),
  );
  const body = fontStack(settings.body);
  const heading = fontStack(settings.heading);
  faces.push(`.ss-storefront-font-scope{--font-montserrat:${body};--font-playfair-display:${heading};--font-family-base:${body};--font-heading:${heading};--font-display:${heading};--pf:${heading};font-family:${body};font-weight:${settings.bodyWeight};letter-spacing:${settings.letterSpacingBase}em}.ss-storefront-font-scope h1,.ss-storefront-font-scope h2,.ss-storefront-font-scope h3,.ss-storefront-font-scope .block-title,.ss-storefront-font-scope .ss-header-logo-text{font-family:${heading}!important;font-weight:${settings.headingWeight}}`);
  return faces.join("\n");
};
