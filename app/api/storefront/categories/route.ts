import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog/store";
import { listCategoryRegistry } from "@/lib/catalog/categories";
import { applyPublicCache } from "@/lib/http/cache";

/* One minute, not ten. This is the menu feed: when an admin files the first
   product into a new category, the category should appear in the menu on the
   next look, not after a coffee break. The edge cache above still absorbs the
   traffic. */
export const revalidate = 60;

export async function GET() {
  const result = await listCatalogProducts({
    page: 1,
    pageSize: 1,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireImages: true,
  });

  /* Two sources feed a group's children:
   *  - the built-in accessory sub-keys (kais, kravata, novcanik, …), which the
   *    catalog already folds into "Aksesoari" and which filter by categoryGroup
   *  - categories the admin created under a group, which filter by categoryId
   * Both are exposed the same way so the nav does not care which it renders. */
  const registry = await listCategoryRegistry();
  const stockedCategoryIds = new Set(result.categories.map((category) => category.id));

  const categories = result.categoryGroups.map((group) => {
    const children: Array<{ id: string; name: string; href: string }> = [];

    for (const child of group.children || []) {
      if (child.count <= 0) continue;
      children.push({ id: child.key, name: child.name, href: `/web-shop?categoryGroup=${child.key}` });
    }

    for (const entry of registry) {
      if (entry.parentGroup !== group.key || !entry.isVisible) continue;
      // A category with nothing in it is a dead link in the menu.
      if (!stockedCategoryIds.has(entry.id)) continue;
      children.push({
        id: String(entry.id),
        name: entry.name,
        href: `/web-shop?categoryId=${entry.id}`,
      });
    }

    return {
      id: group.key,
      name: group.name,
      children,
    };
  });

  /* Short edge TTL on purpose: this drives the shop menu, and an admin who has
     just filled a new category should not wait an hour to see it there. The
     stale window keeps it cheap. */
  return applyPublicCache(NextResponse.json({ success: true, categories }), {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 86400,
  });
}
