import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listCatalogProducts } from "@/lib/catalog/store";
import { listAdminCatalogCategories } from "@/lib/catalog/categories";
import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * How many products carry this category, and how many of those a customer can
 * actually reach. A freshly created category has zero of both, which is the
 * single most common reason for "I made a category and it does not show up" —
 * the menu hides empty categories so nobody clicks into a blank page.
 */
async function countAssignments(categoryIds: number[]) {
  const counts = new Map<number, { assigned: number; sellable: number }>();
  const supabase = getServiceSupabase();
  if (!supabase || categoryIds.length === 0) return counts;

  for (const id of categoryIds) {
    const filter = JSON.stringify([{ id }]);
    const [{ count: assigned }, { count: sellable }] = await Promise.all([
      supabase
        .from("catalog_products")
        .select("legacy_id", { count: "exact", head: true })
        .filter("raw_payload->categories", "cs", filter),
      supabase
        .from("catalog_products")
        .select("legacy_id", { count: "exact", head: true })
        .filter("raw_payload->categories", "cs", filter)
        .eq("is_active", true)
        .eq("is_exported", true)
        .gt("stock_total", 0),
    ]);
    counts.set(id, { assigned: assigned || 0, sellable: sellable || 0 });
  }

  return counts;
}

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
    /* Not just the registry: categories that arrived with the legacy catalog
       (Manžetne, Torbe, Šnale …) are assigned to real products and show in the
       shop, so an admin has to be able to see and manage them here too. */
    listAdminCatalogCategories(),
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
  const assignmentCounts = await countAssignments(registry.map((entry) => entry.id));

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
        assigned: assignmentCounts.get(entry.id)?.assigned ?? 0,
        sellable: assignmentCounts.get(entry.id)?.sellable ?? 0,
      })),
  }));

  /* Loose categories: no parent group, so they are not a subcategory of
     anything. Ones with products first — those are the ones worth filing. */
  const orphanRegistry = registry
    .filter((entry) => !entry.parentGroup)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path,
      isVisible: entry.isVisible,
      isLive: liveCategoryIds.has(entry.id),
      assigned: assignmentCounts.get(entry.id)?.assigned ?? 0,
      sellable: assignmentCounts.get(entry.id)?.sellable ?? 0,
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
