import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import {
  DEFAULT_FONT_LIBRARY,
  normalizeFontFamilyName,
  normalizeFontLibrary,
  slugifyFontFamily,
  type FontFamilyRecord,
  type FontFallback,
  type FontWeight,
} from "@/lib/storefront/fontLibraryDefaults";

const FONT_LIBRARY_PATH = "data/font-library.json";

export const getFontLibrary = async () => normalizeFontLibrary(
  await readPersistentJsonFile<unknown>(FONT_LIBRARY_PATH, DEFAULT_FONT_LIBRARY),
);

const saveFontLibrary = async (library: FontFamilyRecord[]) => {
  const normalized = normalizeFontLibrary(library);
  await writePersistentJsonFile(FONT_LIBRARY_PATH, normalized);
  return normalized;
};

/**
 * Ask Google Fonts whether the family actually exists.
 *
 * The admin font picker is a free-text field, so a typo used to be saved happily and
 * then silently served a dead stylesheet — every heading on the storefront fell back
 * to the system sans. Google answers 400 for an unknown family, so one HEAD-ish
 * request is enough to catch it at write time.
 */
const verifyGoogleFontFamily = async (name: string, weights: FontWeight[]) => {
  const family = encodeURIComponent(name).replace(/%20/g, "+");
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}&display=swap`;

  try {
    const response = await fetch(url, {
      // Google serves a different (legacy, no-variable-font) stylesheet to unknown UAs.
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
      cache: "no-store",
    });
    if (response.ok) return;
    if (response.status === 400) {
      throw new Error(`Google Fonts nema porodicu "${name}". Proveri tacan naziv na fonts.google.com.`);
    }
    throw new Error(`Google Fonts nije potvrdio "${name}" (HTTP ${response.status}). Pokusaj ponovo.`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Google Fonts")) throw error;
    throw new Error(`Provera fonta "${name}" nije uspela (mreza). Pokusaj ponovo.`);
  }
};

export const addGoogleFontFamily = async (nameValue: unknown, fallback: FontFallback, weights: FontWeight[]) => {
  const name = normalizeFontFamilyName(nameValue);
  if (!name) throw new Error("Naziv Google fonta nije ispravan.");
  await verifyGoogleFontFamily(name, weights);
  const library = await getFontLibrary();
  const id = slugifyFontFamily(name);
  const record: FontFamilyRecord = { id, name, source: "google", fallback, weights };
  return saveFontLibrary([...library.filter((font) => font.id !== id), record]);
};

export const addUploadedFontFamily = async (record: FontFamilyRecord) => {
  const library = await getFontLibrary();
  return saveFontLibrary([...library.filter((font) => font.id !== record.id), record]);
};
