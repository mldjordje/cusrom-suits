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

export const addGoogleFontFamily = async (nameValue: unknown, fallback: FontFallback, weights: FontWeight[]) => {
  const name = normalizeFontFamilyName(nameValue);
  if (!name) throw new Error("Naziv Google fonta nije ispravan.");
  const library = await getFontLibrary();
  const id = slugifyFontFamily(name);
  const record: FontFamilyRecord = { id, name, source: "google", fallback, weights };
  return saveFontLibrary([...library.filter((font) => font.id !== id), record]);
};

export const addUploadedFontFamily = async (record: FontFamilyRecord) => {
  const library = await getFontLibrary();
  return saveFontLibrary([...library.filter((font) => font.id !== record.id), record]);
};
