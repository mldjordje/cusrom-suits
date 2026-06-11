import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/server";
import { invalidateCatalogCaches, normalizeCatalogCategoryGroupKey } from "@/lib/catalog/store";

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const legacyId = Number(payload?.legacyId);
  const groupKey = normalizeCatalogCategoryGroupKey(String(payload?.groupKey || ""));
  const action = String(payload?.action || "add");

  if (!legacyId || legacyId <= 0) {
    return NextResponse.json({ success: false, message: "legacyId je obavezan" }, { status: 400 });
  }
  if (!groupKey) {
    return NextResponse.json({ success: false, message: "groupKey je obavezan" }, { status: 400 });
  }
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ success: false, message: "action mora biti 'add' ili 'remove'" }, { status: 400 });
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
  const rawPayload = { ...(row.raw_payload || {}) };

  const existingForced: string[] = Array.isArray(rawPayload.forcedCategoryGroups)
    ? (rawPayload.forcedCategoryGroups as unknown[]).map(String).filter(Boolean)
    : [];
  const existingExcluded: string[] = Array.isArray(rawPayload.excludedCategoryGroups)
    ? (rawPayload.excludedCategoryGroups as unknown[]).map(String).filter(Boolean)
    : [];

  let updatedForced: string[];
  let updatedExcluded: string[];
  if (action === "add") {
    updatedForced = existingForced.includes(groupKey) ? existingForced : [...existingForced, groupKey];
    updatedExcluded = existingExcluded.filter((k) => k !== groupKey);
  } else {
    updatedForced = existingForced.filter((k) => k !== groupKey);
    updatedExcluded = existingExcluded.includes(groupKey) ? existingExcluded : [...existingExcluded, groupKey];
  }

  rawPayload.forcedCategoryGroups = updatedForced.length > 0 ? updatedForced : undefined;
  rawPayload.excludedCategoryGroups = updatedExcluded.length > 0 ? updatedExcluded : undefined;

  const { error: updateError } = await supabase
    .from("catalog_products")
    .update({ raw_payload: rawPayload, updated_at: new Date().toISOString() } as never)
    .eq("legacy_id", legacyId);

  if (updateError) {
    return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
  }

  invalidateCatalogCaches();

  return NextResponse.json({ success: true, groupKey, action, legacyId });
}
