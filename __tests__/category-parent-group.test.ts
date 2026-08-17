import { describe, expect, it, vi, beforeEach } from "vitest";

const store = new Map<string, unknown>();

vi.mock("@/lib/storage/persistentJson", () => ({
  readPersistentJsonFile: async (path: string, fallback: unknown) => store.get(path) ?? fallback,
  writePersistentJsonFile: async (path: string, value: unknown) => {
    store.set(path, value);
  },
}));

vi.mock("@/lib/storage/jsonStore", () => ({
  readJsonFile: async (_path: string, fallback: unknown) => fallback,
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

  it("ignores a parent group that is not a known shop group", async () => {
    const created = await createCategoryRegistryEntry({ name: "Manzetne", parentGroup: "izmisljeno" });
    expect(created.parentGroup).toBe("");
    expect(created.path).toEqual(["Manzetne"]);
  });
});
