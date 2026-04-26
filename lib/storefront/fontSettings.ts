/**
 * SERVER-ONLY font settings module.
 * Do NOT import values from this file in "use client" components —
 * import defaults from fontSettingsDefaults.ts instead.
 */
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import { DEFAULT_FONT_SETTINGS } from "@/lib/storefront/fontSettingsDefaults";
import type { FontSettingsShape as FontSettings } from "@/lib/storefront/fontSettingsDefaults";

export type { FontSettingsShape as FontSettings } from "@/lib/storefront/fontSettingsDefaults";

const FONT_SETTINGS_PATH = "data/font-settings.json";

const str = (v: unknown, fallback = "") => String(v || "").trim() || fallback;

export async function getFontSettings(): Promise<FontSettings> {
  const saved = await readPersistentJsonFile<Partial<FontSettings>>(
    FONT_SETTINGS_PATH,
    DEFAULT_FONT_SETTINGS,
  );
  return {
    updatedAt: str(saved.updatedAt) || null,
    bodyFont: str(saved.bodyFont) || DEFAULT_FONT_SETTINGS.bodyFont,
    displayFont: str(saved.displayFont) || DEFAULT_FONT_SETTINGS.displayFont,
    bodyFontWeight: str(saved.bodyFontWeight) || DEFAULT_FONT_SETTINGS.bodyFontWeight,
    displayFontWeight: str(saved.displayFontWeight) || DEFAULT_FONT_SETTINGS.displayFontWeight,
    letterSpacingBase: str(saved.letterSpacingBase) || DEFAULT_FONT_SETTINGS.letterSpacingBase,
  };
}

export async function updateFontSettings(patch: Partial<FontSettings>): Promise<FontSettings> {
  const current = await getFontSettings();
  const next: FontSettings = {
    updatedAt: new Date().toISOString(),
    bodyFont: str(patch.bodyFont) || current.bodyFont,
    displayFont: str(patch.displayFont) || current.displayFont,
    bodyFontWeight: str(patch.bodyFontWeight) || current.bodyFontWeight,
    displayFontWeight: str(patch.displayFontWeight) || current.displayFontWeight,
    letterSpacingBase: str(patch.letterSpacingBase, "0") !== "" ? str(patch.letterSpacingBase, "0") : current.letterSpacingBase,
  };
  await writePersistentJsonFile(FONT_SETTINGS_PATH, next);
  return next;
}

/** Build the Google Fonts URL for a single family */
export function googleFontsUrl(family: string, weights: string[]): string {
  const encoded = encodeURIComponent(family).replace(/%20/g, "+");
  const wts = weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@${wts}&display=swap`;
}

/** Build inline CSS for font overrides — injected in storefront <head> */
export function buildFontOverrideCss(settings: FontSettings): string {
  const body = settings.bodyFont;
  const display = settings.displayFont;

  const isDefaultBody = body.toLowerCase() === "montserrat";
  const isDefaultDisplay = display.toLowerCase() === "playfair display";

  const lines: string[] = [];

  if (!isDefaultBody || settings.bodyFontWeight !== DEFAULT_FONT_SETTINGS.bodyFontWeight) {
    lines.push(`body { font-family: "${body}", sans-serif !important; font-weight: ${settings.bodyFontWeight}; }`);
    lines.push(`:root { --font-family-base: "${body}", sans-serif; }`);
  }
  if (!isDefaultDisplay || settings.displayFontWeight !== DEFAULT_FONT_SETTINGS.displayFontWeight) {
    lines.push(`:root { --font-display: "${display}", serif; }`);
    lines.push(`.ss-header-logo-text, h1, h2, .block-title { font-family: "${display}", serif !important; font-weight: ${settings.displayFontWeight}; }`);
  }
  if (settings.letterSpacingBase && settings.letterSpacingBase !== "0") {
    lines.push(`body { letter-spacing: ${settings.letterSpacingBase}em; }`);
  }

  return lines.join("\n");
}
