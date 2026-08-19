import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { ALL_AUTO_GROUPS, getAutoGroupSettings, setAutoGroupSettings } from "@/lib/catalog/categories";
import { CATALOG_CATEGORY_GROUP_CATALOGUE } from "@/lib/catalog/store";
import { invalidateCatalogCaches } from "@/lib/catalog/store";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const settings = await getAutoGroupSettings();
  /* The sub-group list ships with the response so the admin can put a detached
     one back — once detached it is gone from the tree and nothing else names it. */
  const allSubGroups = CATALOG_CATEGORY_GROUP_CATALOGUE.flatMap((group) =>
    group.children.map((child) => ({ key: child.key, name: child.label, parentKey: group.key })),
  );
  return NextResponse.json({ success: true, ...settings, allGroups: ALL_AUTO_GROUPS, allSubGroups });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  const enabledGroups: string[] = Array.isArray(payload?.enabledGroups)
    ? (payload.enabledGroups as unknown[]).map(String).filter(Boolean)
    : [];
  const detachedSubGroups: string[] | undefined = Array.isArray(payload?.detachedSubGroups)
    ? (payload.detachedSubGroups as unknown[]).map(String).filter(Boolean)
    : undefined;
  await setAutoGroupSettings(enabledGroups, detachedSubGroups);
  /* The roll-up feeds product filtering, so a stale cache would keep serving
     belts under Aksesoari after the switch. */
  if (detachedSubGroups) invalidateCatalogCaches();
  return NextResponse.json({ success: true, enabledGroups, detachedSubGroups });
}
