import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listCategoryRegistry } from "@/lib/catalog/categories";
import { getServiceSupabase } from "@/lib/supabase/server";
import { invalidateCatalogCaches, normalizeCatalogCategoryGroupKey } from "@/lib/catalog/store";

/**
 * Put a product into a category by typing its SKU.
 *
 * An SKU in mOffice is a style code shared by every size of that style, so one
 * SKU is several catalog rows. Filing "the product" means filing all of them —
 * otherwise the M shows up in the category and the L does not.
 *
 * Two targets, matching the two levels the shop has:
 *  - groupKey: an auto-group (Aksesoari, Kaisevi …). Written as a forced group
 *    override, which is what the group matcher already reads.
 *  - categoryId: an admin category from the registry. Appended to the product's
 *    categories[], the same field the category editor writes.
 */
export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const sku = String(payload?.sku || "").trim();
  const groupKey = normalizeCatalogCategoryGroupKey(String(payload?.groupKey || ""));
  const categoryId = Number(payload?.categoryId || 0);
  const action = String(payload?.action || "add");

  if (!sku) {
    return NextResponse.json({ success: false, message: "Unesi SKU." }, { status: 400 });
  }
  if (!groupKey && (!Number.isFinite(categoryId) || categoryId <= 0)) {
    return NextResponse.json(
      { success: false, message: "Izaberi kategoriju ili grupu u koju se dodaje." },
      { status: 400 },
    );
  }
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ success: false, message: "action mora biti 'add' ili 'remove'." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not available" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("catalog_products")
    .select("legacy_id,sku,name_sr,raw_payload")
    .eq("sku", sku);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  const rows = (data || []) as Array<{
    legacy_id: number;
    sku: string;
    name_sr: string | null;
    raw_payload: Record<string, unknown> | null;
  }>;

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, message: `Nijedan artikal sa SKU "${sku}" nije pronadjen.` },
      { status: 404 },
    );
  }

  const registryEntry = categoryId > 0 ? (await listCategoryRegistry()).find((item) => item.id === categoryId) : null;
  if (categoryId > 0 && !registryEntry) {
    return NextResponse.json({ success: false, message: "Kategorija nije pronadjena." }, { status: 404 });
  }

  let updated = 0;
  for (const row of rows) {
    const rawPayload = { ...(row.raw_payload || {}) };

    if (registryEntry) {
      const categories = Array.isArray(rawPayload.categories) ? [...(rawPayload.categories as unknown[])] : [];
      const withoutTarget = categories.filter(
        (entry) => !entry || typeof entry !== "object" || Number((entry as Record<string, unknown>).id) !== categoryId,
      );
      rawPayload.categories =
        action === "add"
          ? [
              {
                id: registryEntry.id,
                name: registryEntry.name,
                path: registryEntry.path,
                parentId: registryEntry.parentId || 0,
              },
              ...withoutTarget,
            ]
          : withoutTarget;
    }

    if (groupKey) {
      const forced = Array.isArray(rawPayload.forcedCategoryGroups)
        ? (rawPayload.forcedCategoryGroups as unknown[]).map(String).filter(Boolean)
        : [];
      const excluded = Array.isArray(rawPayload.excludedCategoryGroups)
        ? (rawPayload.excludedCategoryGroups as unknown[]).map(String).filter(Boolean)
        : [];
      const nextForced =
        action === "add"
          ? forced.includes(groupKey)
            ? forced
            : [...forced, groupKey]
          : forced.filter((key) => key !== groupKey);
      const nextExcluded =
        action === "add"
          ? excluded.filter((key) => key !== groupKey)
          : excluded.includes(groupKey)
            ? excluded
            : [...excluded, groupKey];
      rawPayload.forcedCategoryGroups = nextForced.length > 0 ? nextForced : undefined;
      rawPayload.excludedCategoryGroups = nextExcluded.length > 0 ? nextExcluded : undefined;
    }

    const { error: updateError } = await supabase
      .from("catalog_products")
      .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() } as never)
      .eq("legacy_id", row.legacy_id);

    if (updateError) {
      return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
    }
    updated += 1;
  }

  invalidateCatalogCaches();

  return NextResponse.json({
    success: true,
    sku,
    updated,
    productName: rows[0]?.name_sr || sku,
    variants: rows.map((row) => row.legacy_id),
  });
}
