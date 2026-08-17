import { describe, expect, it, vi, beforeEach } from "vitest";

const store = new Map<string, unknown>();

vi.mock("@/lib/storage/persistentJson", () => ({
  readPersistentJsonFile: async (path: string, fallback: unknown) => store.get(path) ?? fallback,
  writePersistentJsonFile: async (path: string, value: unknown) => {
    store.set(path, value);
  },
}));

/** One legacy product carrying a category that has no registry row of its own. */
const legacyProducts = [
  {
    legacyId: 1,
    categories: [{ id: 290, name: "Manžetne", path: ["Aksesoari", "Manžetne"], parentId: 0 }],
  },
];

vi.mock("@/lib/storage/jsonStore", () => ({
  readJsonFile: async (path: string, fallback: unknown) =>
    path === "data/legacy-products.json" ? legacyProducts : fallback,
  writeJsonFile: async () => {},
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => null,
  getAnonSupabase: () => null,
}));

import {
  createCategoryRegistryEntry,
  listCategoryRegistry,
  updateCategoryRegistryEntry,
} from "@/lib/catalog/categories";

describe("category parent group", () => {
  beforeEach(() => {
    store.clear();
  });

  it("files a new category under its parent group and prefixes the path", async () => {
    const created = await createCategoryRegistryEntry({ name: "Manzetne", parentGroup: "aksesoari" });
    expect(created.parentGroup).toBe("aksesoari");
    expect(created.path).toEqual(["Aksesoari", "Manzetne"]);

    const [stored] = await listCategoryRegistry();
    expect(stored.parentGroup).toBe("aksesoari");
  });

  it("replaces the prefix when the category is re-parented", async () => {
    const created = await createCategoryRegistryEntry({ name: "Manzetne", parentGroup: "aksesoari" });
    const moved = await updateCategoryRegistryEntry(created.id, { parentGroup: "obuca" });
    expect(moved.path).toEqual(["Obuća", "Manzetne"]);
  });

  it("drops the prefix when the parent group is cleared", async () => {
    const created = await createCategoryRegistryEntry({ name: "Manzetne", parentGroup: "aksesoari" });
    const detached = await updateCategoryRegistryEntry(created.id, { parentGroup: "" });
    expect(detached.parentGroup).toBe("");
    expect(detached.path).toEqual(["Manzetne"]);
  });

  it("keeps the name of a catalog category that has no registry row yet", async () => {
    // Filing a legacy category under a parent used to rename it to "Kategorija 290",
    // because the lookup only checked the registry.
    const moved = await updateCategoryRegistryEntry(290, { parentGroup: "aksesoari" });
    expect(moved.name).toBe("Manžetne");
    expect(moved.path).toEqual(["Aksesoari", "Manžetne"]);
  });

  it("ignores a parent group that is not a known shop group", async () => {
    const created = await createCategoryRegistryEntry({ name: "Manzetne", parentGroup: "izmisljeno" });
    expect(created.parentGroup).toBe("");
    expect(created.path).toEqual(["Manzetne"]);
  });
});
