import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listCategoryRegistry } from "@/lib/catalog/categories";
import { getServiceSupabase } from "@/lib/supabase/server";
import { invalidateCatalogCaches } from "@/lib/catalog/store";

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const legacyId = Number(payload?.legacyId);
  const categoryIds: number[] = Array.isArray(payload?.categoryIds)
    ? (payload.categoryIds as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  if (!legacyId || legacyId <= 0) {
    return NextResponse.json({ success: false, message: "legacyId je obavezan" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not available" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("catalog_products")
    .select("raw_payload")
    .eq("legacy_id", legacyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, message: "Proizvod nije pronadjen" }, { status: 404 });
  }

  const row = data as unknown as { raw_payload: Record<string, unknown> };
  const registry = await listCategoryRegistry();
  const registryById = new Map(registry.map((c) => [c.id, c]));
  const adminCategoryIds = new Set(registry.map((c) => c.id));

  const rawPayload = { ...(row.raw_payload || {}) };
  const existingCategories = Array.isArray(rawPayload.categories)
    ? (rawPayload.categories as unknown[])
    : [];

  // Build the new admin category entries from the requested IDs.
  const newAdminCategories = categoryIds
    .map((id) => registryById.get(id))
    .filter(Boolean)
    .map((cat) => ({
      id: cat!.id,
      name: cat!.name,
      path: cat!.path,
      parentId: cat!.parentId || 0,
    }));

  // The category editor is the authority on a product's category. Admin-selected
  // categories go FIRST so `categories[0]` (the label shown on the storefront
  // detail page and the group the product filters under) matches the client's
  // choice. Any legacy (mOffice) category that also maps to a recognized shop
  // group is dropped so the product actually MOVES to the new category instead
  // of appearing under both the old and new one. Legacy tags that don't map to a
  // group carry no visible meaning and are dropped too, leaving the admin
  // selection as the single source of truth.
  const legacyCategories = existingCategories.filter((cat) => {
    if (!cat || typeof cat !== "object") return false;
    return !adminCategoryIds.has(Number((cat as Record<string, unknown>).id));
  });
  const keepLegacy = newAdminCategories.length === 0 ? legacyCategories : [];

  rawPayload.categories = [...newAdminCategories, ...keepLegacy];

  const { error: updateError } = await supabase
    .from("catalog_products")
    .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() } as never)
    .eq("legacy_id", legacyId);

  if (updateError) {
    return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
  }

  invalidateCatalogCaches();

  return NextResponse.json({ success: true });
}
