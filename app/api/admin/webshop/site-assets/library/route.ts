import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listSiteAssetLibrary } from "@/lib/storage/siteAssetLibrary";

export const dynamic = "force-dynamic";

/** Already-uploaded media, so the admin can reuse a file instead of uploading it twice. */
export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const kind = String(new URL(req.url).searchParams.get("kind") || "").trim();
  const items = await listSiteAssetLibrary();
  const filtered = kind === "image" || kind === "video" ? items.filter((item) => item.kind === kind) : items;

  return NextResponse.json({ success: true, items: filtered });
}
