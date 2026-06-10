import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";

const CATEGORY_REGISTRY_PATH = "data/webshop-categories.json";
const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";

export type CatalogCategoryRecord = {
  id: number;
  name: string;
  path: string[];
  parentId: number;
  description: string | null;
  mainColor: string | null;
  isVisible: boolean;
  /** If true the category appears in the horizontal chip navigation bar above the product list. */
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCatalogCategory = CatalogCategoryRecord & {
  usageCount: number;
  source: "registry" | "catalog" | "merged";
};

const normalizePath = (value: unknown, fallbackName: string) => {
  const path = Array.isArray(value)
    ? value.map((part) => String(part || "").trim()).filter(Boolean)
    : [];
  if (path.length > 0) return path;
  return fallbackName ? [fallbackName] : [];
};

const normalizeRegistryRecord = (
  value: unknown,
  fallbackId = 0,
): CatalogCategoryRecord | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = Number(row.id ?? fallbackId);
  const name = String(row.name || "").trim();
  if (!Number.isFinite(id) || id <= 0 || !name) return null;
  const createdAt = String(row.createdAt || row.updatedAt || new Date().toISOString());
  const updatedAt = String(row.updatedAt || createdAt);
  return {
    id,
    name,
    path: normalizePath(row.path, name),
    parentId: Number.isFinite(Number(row.parentId)) ? Number(row.parentId) : 0,
    description: row.description == null ? null : String(row.description),
    mainColor: row.mainColor == null ? null : String(row.mainColor),
    isVisible: row.isVisible !== false,
    isFeatured: row.isFeatured === true,
    createdAt,
    updatedAt,
  };
};

export async function listCategoryRegistry() {
  const rows = await readPersistentJsonFile<unknown[]>(CATEGORY_REGISTRY_PATH, []);
  return rows
    .map((row, index) => normalizeRegistryRecord(row, index + 1))
    .filter((row): row is CatalogCategoryRecord => Boolean(row))
    .sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / "), "sr"));
}

async function writeCategoryRegistry(rows: CatalogCategoryRecord[]) {
  await writePersistentJsonFile(CATEGORY_REGISTRY_PATH, rows);
}

async function loadCategoriesFromSupabase() {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  const usage = new Map<number, AdminCatalogCategory>();
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("catalog_products")
      .select("raw_payload")
      .range(from, to);

    if (error) return null;

    const rows = (data || []) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const rawPayload =
        row.raw_payload && typeof row.raw_payload === "object"
          ? (row.raw_payload as Record<string, unknown>)
          : {};
      const categories = Array.isArray(rawPayload.categories) ? rawPayload.categories : [];
      const categoryIdsSeen = new Set<number>();
      for (const category of categories) {
        if (!category || typeof category !== "object") continue;
        const current = category as Record<string, unknown>;
        const id = Number(current.id);
        const name = String(current.name || "").trim();
        if (!Number.isFinite(id) || id <= 0 || !name || categoryIdsSeen.has(id)) continue;
        categoryIdsSeen.add(id);
        const existing = usage.get(id);
        usage.set(id, {
          id,
          name,
          path: normalizePath(current.path, name),
          parentId: Number.isFinite(Number(current.parentId)) ? Number(current.parentId) : 0,
          description: existing?.description || null,
          mainColor: existing?.mainColor || null,
          isVisible: existing?.isVisible ?? true,
          isFeatured: existing?.isFeatured ?? false,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: existing?.updatedAt || new Date().toISOString(),
          usageCount: (existing?.usageCount || 0) + 1,
          source: "catalog",
        });
      }
    }

    if (rows.length < pageSize) break;
  }

  return Array.from(usage.values());
}

async function loadCategoriesFromFile() {
  const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  const usage = new Map<number, AdminCatalogCategory>();

  for (const product of products) {
    const categoryIdsSeen = new Set<number>();
    for (const category of product.categories || []) {
      const id = Number(category.id);
      const name = String(category.name || "").trim();
      if (!Number.isFinite(id) || id <= 0 || !name || categoryIdsSeen.has(id)) continue;
      categoryIdsSeen.add(id);
      const existing = usage.get(id);
      usage.set(id, {
        id,
        name,
        path: normalizePath(category.path, name),
        parentId: Number.isFinite(Number(category.parentId)) ? Number(category.parentId) : 0,
        description: existing?.description || null,
        mainColor: existing?.mainColor || null,
        isVisible: existing?.isVisible ?? true,
        isFeatured: existing?.isFeatured ?? false,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: existing?.updatedAt || new Date().toISOString(),
        usageCount: (existing?.usageCount || 0) + 1,
        source: "catalog",
      });
    }
  }

  return Array.from(usage.values());
}

async function loadCatalogCategoryUsage() {
  return (await loadCategoriesFromSupabase()) || (await loadCategoriesFromFile());
}

export async function listAdminCatalogCategories() {
  const [registry, catalog] = await Promise.all([listCategoryRegistry(), loadCatalogCategoryUsage()]);
  const merged = new Map<number, AdminCatalogCategory>();

  for (const item of catalog) {
    merged.set(item.id, item);
  }

  for (const item of registry) {
    const existing = merged.get(item.id);
    merged.set(item.id, {
      ...item,
      usageCount: existing?.usageCount || 0,
      source: existing ? "merged" : "registry",
      name: item.name || existing?.name || `Kategorija ${item.id}`,
      path: item.path.length > 0 ? item.path : existing?.path || [item.name],
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / "), "sr"));
}

async function propagateCategoryUpdateInFile(categoryId: number, patch: Partial<CatalogCategoryRecord>) {
  const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  let changed = false;
  const nextProducts = products.map((product) => {
    let productChanged = false;
    const nextCategories = (product.categories || []).map((category) => {
      if (Number(category.id) !== categoryId) return category;
      changed = true;
      productChanged = true;
      return {
        ...category,
        name: patch.name ?? category.name,
        parentId: patch.parentId ?? category.parentId,
        path: patch.path ?? category.path,
      };
    });
    return productChanged ? { ...product, categories: nextCategories } : product;
  });
  if (changed) {
    await writeJsonFile(LEGACY_PRODUCTS_PATH, nextProducts);
  }
}

async function propagateCategoryUpdateInSupabase(categoryId: number, patch: Partial<CatalogCategoryRecord>) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    await propagateCategoryUpdateInFile(categoryId, patch);
    return;
  }

  const pageSize = 500;
  const updates: Array<{ legacy_id: number; raw_payload: Record<string, unknown> }> = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("catalog_products")
      .select("legacy_id,raw_payload")
      .range(from, to);

    if (error) throw new Error(error.message);

    const rows = (data || []) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const legacyId = Number(row.legacy_id);
      const rawPayload =
        row.raw_payload && typeof row.raw_payload === "object"
          ? { ...(row.raw_payload as Record<string, unknown>) }
          : {};
      const categories = Array.isArray(rawPayload.categories) ? rawPayload.categories : [];
      let changed = false;
      const nextCategories = categories.map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const category = entry as Record<string, unknown>;
        if (Number(category.id) !== categoryId) return entry;
        changed = true;
        return {
          ...category,
          name: patch.name ?? category.name,
          parentId: patch.parentId ?? category.parentId ?? 0,
          path: patch.path ?? category.path ?? [],
        };
      });
      if (changed && Number.isFinite(legacyId) && legacyId > 0) {
        updates.push({
          legacy_id: legacyId,
          raw_payload: {
            ...rawPayload,
            categories: nextCategories,
          },
        });
      }
    }

    if (rows.length < pageSize) break;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("catalog_products")
      .update({
        raw_payload: update.raw_payload,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("legacy_id", update.legacy_id);
    if (error) throw new Error(error.message);
  }
}

export async function createCategoryRegistryEntry(input: {
  name: string;
  path?: string[];
  parentId?: number;
  description?: string | null;
  mainColor?: string | null;
  isVisible?: boolean;
  isFeatured?: boolean;
}) {
  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Naziv kategorije je obavezan.");
  }

  const registry = await listCategoryRegistry();
  const catalog = await loadCatalogCategoryUsage();
  const nextId = [...registry, ...catalog].reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const now = new Date().toISOString();
  const created: CatalogCategoryRecord = {
    id: nextId,
    name,
    path: normalizePath(input.path, name),
    parentId: Number.isFinite(Number(input.parentId)) ? Number(input.parentId) : 0,
    description: input.description == null ? null : String(input.description),
    mainColor: input.mainColor == null ? null : String(input.mainColor),
    isVisible: input.isVisible !== false,
    isFeatured: input.isFeatured === true,
    createdAt: now,
    updatedAt: now,
  };

  await writeCategoryRegistry([...registry, created]);
  return created;
}

export async function updateCategoryRegistryEntry(
  categoryId: number,
  patch: Partial<Pick<CatalogCategoryRecord, "name" | "path" | "parentId" | "description" | "mainColor" | "isVisible" | "isFeatured">>,
) {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error("ID kategorije nije validan.");
  }

  const registry = await listCategoryRegistry();
  const existing = registry.find((item) => item.id === categoryId);
  const now = new Date().toISOString();
  const nextPath = patch.path && patch.path.length > 0 ? normalizePath(patch.path, patch.name || existing?.name || "") : undefined;
  const nextName = patch.name == null ? existing?.name || "" : String(patch.name).trim();

  const nextRegistryEntry: CatalogCategoryRecord = {
    id: categoryId,
    name: nextName || existing?.name || `Kategorija ${categoryId}`,
    path: nextPath || existing?.path || [nextName || existing?.name || `Kategorija ${categoryId}`],
    parentId: patch.parentId == null ? existing?.parentId || 0 : Number(patch.parentId) || 0,
    description: patch.description === undefined ? existing?.description || null : patch.description,
    mainColor: patch.mainColor === undefined ? existing?.mainColor || null : patch.mainColor,
    isVisible: patch.isVisible === undefined ? existing?.isVisible ?? true : patch.isVisible,
    isFeatured: patch.isFeatured === undefined ? existing?.isFeatured ?? false : patch.isFeatured,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextRegistry = existing
    ? registry.map((item) => (item.id === categoryId ? nextRegistryEntry : item))
    : [...registry, nextRegistryEntry];

  await writeCategoryRegistry(nextRegistry);
  await propagateCategoryUpdateInSupabase(categoryId, {
    name: nextRegistryEntry.name,
    path: nextRegistryEntry.path,
    parentId: nextRegistryEntry.parentId,
  });

  return nextRegistryEntry;
}

export async function deleteCategoryRegistryEntry(categoryId: number) {
  const categories = await listAdminCatalogCategories();
  const target = categories.find((item) => item.id === categoryId);
  if (!target) {
    throw new Error("Kategorija nije pronadjena.");
  }
  if (target.usageCount > 0) {
    throw new Error("Kategorija je dodeljena proizvodima. Prvo prebaci ili obrisi te proizvode.");
  }

  const registry = await listCategoryRegistry();
  await writeCategoryRegistry(registry.filter((item) => item.id !== categoryId));
}
