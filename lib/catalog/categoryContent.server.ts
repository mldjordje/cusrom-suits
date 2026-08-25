import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import {
  normalizeCategoryContentEntry,
  type CategoryContentSettings,
} from "@/lib/catalog/categoryContent";

/* Split out of categoryContent.ts because the admin screen is a client
   component: importing the types from there used to drag `fs/promises` in
   through persistentJson and fail the production build. Types and pure helpers
   stay client-safe; only this module touches storage. */

const CATEGORY_CONTENT_PATH = "data/category-content.json";

export async function getCategoryContentSettings(): Promise<CategoryContentSettings> {
  const stored = await readPersistentJsonFile<Record<string, unknown>>(CATEGORY_CONTENT_PATH, {});
  const out: CategoryContentSettings = {};
  for (const [key, value] of Object.entries(stored || {})) {
    const entry = normalizeCategoryContentEntry(value, key);
    if (entry) out[entry.key] = entry;
  }
  return out;
}

export async function saveCategoryContentSettings(
  entries: unknown,
): Promise<CategoryContentSettings> {
  const rows = Array.isArray(entries) ? entries : Object.values(entries || {});
  const next: CategoryContentSettings = {};
  for (const row of rows) {
    const entry = normalizeCategoryContentEntry(row);
    if (entry) next[entry.key] = entry;
  }
  await writePersistentJsonFile(CATEGORY_CONTENT_PATH, next);
  return next;
}
