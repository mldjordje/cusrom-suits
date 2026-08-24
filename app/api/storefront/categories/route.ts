import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog/store";
import { listCategoryRegistry, resolveShowInMenu } from "@/lib/catalog/categories";
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

  const categories = result.categoryGroups.map((group) => {
    const children: Array<{ id: string; name: string; href: string }> = [];

    for (const child of group.children || []) {
      if (child.count <= 0) continue;
      children.push({ id: child.key, name: child.name, href: `/web-shop?categoryGroup=${child.key}` });
    }

    for (const entry of registry) {
      if (entry.parentGroup !== group.key || !entry.isVisible) continue;
      /* The menu used to also require the category to hold a sellable product,
         which made "I switched it on and it still is not there" the normal
         outcome. The admin's checkbox decides now — an empty category in the
         menu is a choice someone made, not a bug. */
      if (!resolveShowInMenu(entry)) continue;
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

  /* Categories the admin put in the menu without filing them under a main
     group sit at the top level of the dropdown, next to Odela and Sakoi. */
  const topLevelRegistry = registry
    .filter((entry) => !entry.parentGroup && entry.isVisible && resolveShowInMenu(entry))
    .map((entry) => ({
      id: `id:${entry.id}`,
      name: entry.name,
      children: [] as Array<{ id: string; name: string; href: string }>,
      href: `/web-shop?categoryId=${entry.id}`,
    }));

  const payload = { success: true, categories: [...categories, ...topLevelRegistry] };

  /* Never cache an outage. With the normal headers below a menu emptied by an
     unreadable catalog would be served from the edge for a day
     (staleWhileRevalidate), so the shop would stay menu-less long after the
     database came back. */
  if (result.degraded) {
    return NextResponse.json(
      { ...payload, degraded: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  /* Short edge TTL on purpose: this drives the shop menu, and an admin who has
     just filled a new category should not wait an hour to see it there. The
     stale window keeps it cheap. */
  return applyPublicCache(NextResponse.json(payload), {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 86400,
  });
}
