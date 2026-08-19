import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { mergeCategoryRegistryEntries } from "@/lib/catalog/categories";
import { invalidateCatalogCaches } from "@/lib/catalog/store";

/** Fold `sourceId` into `targetId`: products move over, the source disappears. */
export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  try {
    const result = await mergeCategoryRegistryEntries(Number(payload?.sourceId), Number(payload?.targetId));
    invalidateCatalogCaches();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spajanje kategorija nije uspelo";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
