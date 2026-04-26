/**
 * Client-safe font settings defaults — no server imports.
 * Import this file in client components instead of fontSettings.ts.
 */

export type FontSettingsShape = {
  updatedAt: string | null;
  bodyFont: string;
  displayFont: string;
  bodyFontWeight: string;
  displayFontWeight: string;
  letterSpacingBase: string;
};

export const DEFAULT_FONT_SETTINGS: FontSettingsShape = {
  updatedAt: null,
  bodyFont: "Montserrat",
  displayFont: "Playfair Display",
  bodyFontWeight: "400",
  displayFontWeight: "700",
  letterSpacingBase: "0",
};
