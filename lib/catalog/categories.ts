import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";

const CATEGORY_REGISTRY_PATH = "data/webshop-categories.json";
const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";
const AUTO_GROUP_SETTINGS_PATH = "data/auto-group-settings.json";

export const ALL_AUTO_GROUPS: Array<{ key: string; name: string }> = [
  { key: "odelo",     name: "Odela" },
  { key: "sako",      name: "Sakoi" },
  { key: "pantalone", name: "Pantalone" },
  { key: "kosulja",   name: "Košulje" },
  { key: "dzemper",   name: "Džemperi" },
  { key: "prsluk",    name: "Prsluci" },
  { key: "kaput",     name: "Kaputi" },
  { key: "jakna",     name: "Jakne" },
  { key: "obuca",     name: "Obuća" },
  { key: "aksesoari", name: "Aksesoari" },
];

export async function getAutoGroupSettings(): Promise<{ enabledGroups: string[]; detachedSubGroups: string[] }> {
  const data = await readPersistentJsonFile<{ enabledGroups?: unknown; detachedSubGroups?: unknown }>(
    AUTO_GROUP_SETTINGS_PATH,
    {},
  );
  const stored = Array.isArray(data.enabledGroups)
    ? (data.enabledGroups as unknown[]).map(String).filter(Boolean)
    : null;
  /* Auto sub-groups the admin took out of their parent (Kaisevi out of
     Aksesoari, say). Empty by default — the catalog folds them all in. */
  const detached = Array.isArray(data.detachedSubGroups)
    ? (data.detachedSubGroups as unknown[]).map(String).filter(Boolean)
    : [];
  // Default: all groups enabled
  return { enabledGroups: stored ?? ALL_AUTO_GROUPS.map((g) => g.key), detachedSubGroups: detached };
}

export async function setAutoGroupSettings(enabledGroups: string[], detachedSubGroups?: string[]): Promise<void> {
  const current = await getAutoGroupSettings();
  await writePersistentJsonFile(AUTO_GROUP_SETTINGS_PATH, {
    enabledGroups,
    detachedSubGroups: detachedSubGroups ?? current.detachedSubGroups,
  });
}

export type CatalogCategoryRecord = {
  id: number;
  name: string;
  path: string[];
  parentId: number;
  /**
   * Auto-group key this category hangs under ("aksesoari", "odelo", …), or "".
   * The shop's top level is the auto-group list in ALL_AUTO_GROUPS, not the
   * registry, so a registry category cannot express "child of Aksesoari"
   * through parentId — there is no registry row for Aksesoari to point at.
   * This is that link, and it is what the storefront nav reads to build the
   * second-level dropdown.
   */
  parentGroup: string;
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

const VALID_GROUP_KEYS = new Set(ALL_AUTO_GROUPS.map((group) => group.key));

const normalizeParentGroup = (value: unknown) => {
  const key = String(value || "").trim().toLowerCase();
  return VALID_GROUP_KEYS.has(key) ? key : "";
};

/**
 * Path with the parent group as its first segment. Any leading segment that is
 * itself a group name is dropped first, so re-parenting a category from one
 * group to another replaces the prefix instead of stacking a second one.
 */
const applyParentGroupToPath = (path: string[], parentGroup: string) => {
  const groupNames = new Set(ALL_AUTO_GROUPS.map((group) => group.name));
  const bare = path.length > 1 && groupNames.has(path[0]) ? path.slice(1) : path;
  const parentName = ALL_AUTO_GROUPS.find((group) => group.key === parentGroup)?.name || "";
  return parentName ? [parentName, ...bare] : bare;
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
    parentGroup: normalizeParentGroup(row.parentGroup),
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
          parentGroup: existing?.parentGroup || normalizeParentGroup(current.parentGroup),
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
        parentGroup: existing?.parentGroup || "",
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
  parentGroup?: string;
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
  const parentGroup = normalizeParentGroup(input.parentGroup);
  /* A child's path starts at its parent group, so the storefront breadcrumb and
     the group matcher (which reads name + path) both place it correctly without
     the admin having to type "Aksesoari / Manžetne" by hand. */
  const path = applyParentGroupToPath(normalizePath(input.path, name), parentGroup);

  const created: CatalogCategoryRecord = {
    id: nextId,
    name,
    path,
    parentId: Number.isFinite(Number(input.parentId)) ? Number(input.parentId) : 0,
    parentGroup,
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
  patch: Partial<
    Pick<
      CatalogCategoryRecord,
      "name" | "path" | "parentId" | "parentGroup" | "description" | "mainColor" | "isVisible" | "isFeatured"
    >
  >,
) {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error("ID kategorije nije validan.");
  }

  const registry = await listCategoryRegistry();
  /* Categories that came in with the legacy catalog have no registry row until
     the first edit. Falling back to the catalog copy is what keeps their name
     and path when an admin only changes, say, the parent group — otherwise the
     edit would rename them to "Kategorija <id>". */
  const registryRow = registry.find((item) => item.id === categoryId);
  const existing =
    registryRow || (await loadCatalogCategoryUsage()).find((item) => item.id === categoryId);
  const now = new Date().toISOString();
  const nextPath = patch.path && patch.path.length > 0 ? normalizePath(patch.path, patch.name || existing?.name || "") : undefined;
  const nextName = patch.name == null ? existing?.name || "" : String(patch.name).trim();

  const parentGroup =
    patch.parentGroup === undefined ? existing?.parentGroup || "" : normalizeParentGroup(patch.parentGroup);
  const resolvedName = nextName || existing?.name || `Kategorija ${categoryId}`;
  /* Same rule as on create: the parent group is the first path segment. Applied
     here too so re-parenting an existing category moves its path with it. */
  const finalPath = applyParentGroupToPath(nextPath || existing?.path || [resolvedName], parentGroup);

  const nextRegistryEntry: CatalogCategoryRecord = {
    id: categoryId,
    name: resolvedName,
    path: finalPath,
    parentId: patch.parentId == null ? existing?.parentId || 0 : Number(patch.parentId) || 0,
    parentGroup,
    description: patch.description === undefined ? existing?.description || null : patch.description,
    mainColor: patch.mainColor === undefined ? existing?.mainColor || null : patch.mainColor,
    isVisible: patch.isVisible === undefined ? existing?.isVisible ?? true : patch.isVisible,
    isFeatured: patch.isFeatured === undefined ? existing?.isFeatured ?? false : patch.isFeatured,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  /* Test the registry, not `existing` — `existing` also matches a category that
     only exists on products. Mapping over a registry that has no such row wrote
     nothing at all, so every edit to a legacy category (the ones with no row
     yet, which is most of them) reported success and changed nothing. */
  const nextRegistry = registryRow
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

/**
 * Strip a category from every product that carries it. Deleting a category the
 * shop still references would leave products pointing at a name that no longer
 * exists, so this runs first when a delete is forced.
 */
export async function detachCategoryFromProducts(categoryId: number) {
  const supabase = getServiceSupabase();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("catalog_products")
    .select("legacy_id,raw_payload")
    .filter("raw_payload->categories", "cs", JSON.stringify([{ id: categoryId }]));

  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<{ legacy_id: number; raw_payload: Record<string, unknown> | null }>;
  let detached = 0;

  for (const row of rows) {
    const rawPayload = { ...(row.raw_payload || {}) };
    const categories = Array.isArray(rawPayload.categories) ? (rawPayload.categories as unknown[]) : [];
    rawPayload.categories = categories.filter(
      (entry) => !entry || typeof entry !== "object" || Number((entry as Record<string, unknown>).id) !== categoryId,
    );

    const { error: updateError } = await supabase
      .from("catalog_products")
      .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() } as never)
      .eq("legacy_id", row.legacy_id);
    if (updateError) throw new Error(updateError.message);
    detached += 1;
  }

  return detached;
}

/**
 * Fold one category into another: every product carrying `sourceId` gets
 * `targetId` instead, then the source registry row goes away.
 *
 * The catalog grew two names for the same thing — a legacy mOffice "Odelo" next
 * to the shop's "Odela" — and the only tools were delete (which drops the
 * products' tag entirely) or re-tagging hundreds of products by hand. Neither
 * is what "these are the same category" means.
 */
export async function mergeCategoryRegistryEntries(sourceId: number, targetId: number) {
  if (!sourceId || !targetId) throw new Error("Nedostaje kategorija za spajanje.");
  if (sourceId === targetId) throw new Error("Ne moze da se spoji sama sa sobom.");

  const categories = await listAdminCatalogCategories();
  const source = categories.find((item) => item.id === sourceId);
  const target = categories.find((item) => item.id === targetId);
  if (!source) throw new Error("Kategorija koja se spaja nije pronadjena.");
  if (!target) throw new Error("Ciljna kategorija nije pronadjena.");

  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Baza nije dostupna.");

  const { data, error } = await supabase
    .from("catalog_products")
    .select("legacy_id,raw_payload")
    .filter("raw_payload->categories", "cs", JSON.stringify([{ id: sourceId }]));
  if (error) throw new Error(error.message);

  const targetEntry = { id: target.id, name: target.name, path: target.path, parentId: target.parentId || 0 };
  const rows = (data || []) as Array<{ legacy_id: number; raw_payload: Record<string, unknown> | null }>;
  let moved = 0;

  for (const row of rows) {
    const rawPayload = { ...(row.raw_payload || {}) };
    const existing = Array.isArray(rawPayload.categories) ? (rawPayload.categories as unknown[]) : [];

    /* Swap in place so the product keeps its category order — categories[0] is
       the label the storefront shows, and reordering it would silently move
       products to a different group. Duplicates collapse. */
    const seen = new Set<number>();
    rawPayload.categories = existing
      .map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const id = Number((entry as Record<string, unknown>).id);
        return id === sourceId ? targetEntry : entry;
      })
      .filter((entry) => {
        if (!entry || typeof entry !== "object") return true;
        const id = Number((entry as Record<string, unknown>).id);
        if (!Number.isFinite(id)) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    const { error: updateError } = await supabase
      .from("catalog_products")
      .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() } as never)
      .eq("legacy_id", row.legacy_id);
    if (updateError) throw new Error(updateError.message);
    moved += 1;
  }

  /* A category discovered off products has no registry row to drop — once no
     product references it, it stops existing on its own. */
  const registry = await listCategoryRegistry();
  if (registry.some((item) => item.id === sourceId)) {
    await writeCategoryRegistry(registry.filter((item) => item.id !== sourceId));
  }

  return { moved, sourceName: source.name, targetName: target.name };
}

export async function deleteCategoryRegistryEntry(categoryId: number, options?: { force?: boolean }) {
  const categories = await listAdminCatalogCategories();
  const target = categories.find((item) => item.id === categoryId);
  if (!target) {
    throw new Error("Kategorija nije pronadjena.");
  }

  let detached = 0;
  if (target.usageCount > 0) {
    if (!options?.force) {
      throw new Error("Kategorija je dodeljena proizvodima. Prvo prebaci ili obrisi te proizvode.");
    }
    detached = await detachCategoryFromProducts(categoryId);
  }

  const registry = await listCategoryRegistry();
  await writeCategoryRegistry(registry.filter((item) => item.id !== categoryId));
  return { detached };
}
