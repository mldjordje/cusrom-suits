import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listCatalogProducts } from "@/lib/catalog/store";
import { listCategoryRegistry } from "@/lib/catalog/categories";

/**
 * The category tree exactly as customers see it.
 *
 * The admin screen used to list only the registry (categories someone typed in
 * by hand), which is not what the shop navigates by. The shop's first level is
 * the derived auto-group list, so an admin could not tell which categories are
 * live, how many products are in each, or why a product shows up where it does.
 *
 * Counts come from the same query the storefront uses (active + exported +
 * collapsed by SKU + must have an image), so a number here is the number a
 * customer sees on the category page.
 */
export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const [storefront, registry] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 1,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireImages: true,
    }),
    listCategoryRegistry(),
  ]);

  // Same query without the storefront's visibility filters — the difference
  // between the two counts is what an admin needs to see to understand why a
  // product they assigned is not showing up.
  const everything = await listCatalogProducts({
    page: 1,
    pageSize: 1,
    includeHidden: true,
  });

  const liveCategoryIds = new Set(storefront.categories.map((category) => category.id));

  const groups = storefront.categoryGroups.map((group) => ({
    key: group.key,
    name: group.name,
    count: group.count,
    /** Derived sub-groups the catalog folds into this one (Kaisevi, Novcanici …). */
    subGroups: (group.children || []).map((child) => ({
      key: child.key,
      name: child.name,
      count: child.count,
    })),
    /** Admin-created categories filed under this group. */
    registryChildren: registry
      .filter((entry) => entry.parentGroup === group.key)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path,
        isVisible: entry.isVisible,
        isLive: liveCategoryIds.has(entry.id),
      })),
  }));

  const orphanRegistry = registry
    .filter((entry) => !entry.parentGroup)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path,
      isVisible: entry.isVisible,
      isLive: liveCategoryIds.has(entry.id),
    }));

  return NextResponse.json({
    success: true,
    groups,
    orphanRegistry,
    totals: {
      liveProducts: storefront.total,
      allProducts: everything.total,
    },
  });
}
