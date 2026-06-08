import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listCategoryRegistry } from "@/lib/catalog/categories";
import { normalizeCatalogCategoryGroupKey } from "@/lib/catalog/store";
import { getServiceSupabase } from "@/lib/supabase/server";

const getProductGroupKeys = (
  name: string,
  manufCode: string,
  categories: Array<{ name: string; path: string[] }>,
): Set<string> => {
  const keys = new Set<string>();
  const nameKey = normalizeCatalogCategoryGroupKey(`${name} ${manufCode}`);
  if (nameKey) keys.add(nameKey);
  for (const cat of categories) {
    const candidates = [cat.name, ...(cat.path || [])];
    for (const c of candidates) {
      const k = normalizeCatalogCategoryGroupKey(c);
      if (k) keys.add(k);
    }
  }
  return keys;
};

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not available" }, { status: 503 });
  }

  const registry = await listCategoryRegistry();
  const visibleCategories = registry.filter((cat) => cat.isVisible);

  // Map: groupKey -> admin category records (multiple categories may share a key)
  const keyToCategories = new Map<string, typeof visibleCategories>();
  for (const cat of visibleCategories) {
    const keys = new Set<string>();
    const nameKey = normalizeCatalogCategoryGroupKey(cat.name);
    if (nameKey) keys.add(nameKey);
    for (const part of cat.path) {
      const k = normalizeCatalogCategoryGroupKey(part);
      if (k) keys.add(k);
    }
    for (const k of keys) {
      const existing = keyToCategories.get(k) || [];
      keyToCategories.set(k, [...existing, cat]);
    }
  }

  if (keyToCategories.size === 0) {
    return NextResponse.json({
      success: true,
      message: "Nema vidljivih kategorija sa prepoznatim tipovima. Kreirajte kategorije sa imenima poput Odela, Sakoi, Pantalone itd.",
      productsUpdated: 0,
      assignmentsMade: 0,
      total: 0,
    });
  }

  const adminCategoryIds = new Set(registry.map((c) => c.id));
  const pageSize = 500;
  const allRows: Array<{ legacy_id: number; raw_payload: Record<string, unknown> }> = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("catalog_products")
      .select("legacy_id,raw_payload")
      .range(from, from + pageSize - 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    allRows.push(...((data || []) as typeof allRows));
    if ((data?.length || 0) < pageSize) break;
  }

  let assignmentsMade = 0;
  const updates: Array<{ legacy_id: number; raw_payload: Record<string, unknown> }> = [];

  for (const row of allRows) {
    const legacyId = Number(row.legacy_id);
    if (!legacyId) continue;

    const rawPayload = { ...(row.raw_payload as Record<string, unknown> || {}) };
    const existingCategories = Array.isArray(rawPayload.categories) ? (rawPayload.categories as unknown[]) : [];

    // Keep legacy (non-admin) categories, drop previously auto-assigned admin categories
    const legacyCategories = existingCategories.filter((cat) => {
      if (!cat || typeof cat !== "object") return true;
      const id = Number((cat as Record<string, unknown>).id);
      return !adminCategoryIds.has(id);
    });

    const productName = String(rawPayload.name || rawPayload.productName || "");
    const manufCode = String(rawPayload.manufCode || rawPayload.manuf_code || "");
    const legacyCategoryObjects = legacyCategories.map((cat) => {
      const c = cat as Record<string, unknown>;
      return {
        name: String(c.name || ""),
        path: Array.isArray(c.path) ? (c.path as unknown[]).map(String) : [],
      };
    });

    const productKeys = getProductGroupKeys(productName, manufCode, legacyCategoryObjects);
    const matched: typeof visibleCategories = [];
    const seen = new Set<number>();

    for (const [key, cats] of keyToCategories) {
      if (!productKeys.has(key)) continue;
      for (const cat of cats) {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          matched.push(cat);
        }
      }
    }

    if (matched.length === 0) continue;

    rawPayload.categories = [
      ...legacyCategories,
      ...matched.map((cat) => ({
        id: cat.id,
        name: cat.name,
        path: cat.path,
        parentId: cat.parentId || 0,
      })),
    ];

    updates.push({ legacy_id: legacyId, raw_payload: rawPayload });
    assignmentsMade += matched.length;
  }

  for (const update of updates) {
    await supabase
      .from("catalog_products")
      .update({ raw_payload: update.raw_payload, updated_at: new Date().toISOString() } as never)
      .eq("legacy_id", update.legacy_id);
  }

  return NextResponse.json({
    success: true,
    message: `Zavrseno. Azurirano ${updates.length} proizvoda, napravljena ${assignmentsMade} raspodela.`,
    productsUpdated: updates.length,
    assignmentsMade,
    total: allRows.length,
  });
}
