import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken, hasCronSecret } from "@/lib/auth/admin";
import { scanCatalogMediaHealth } from "@/lib/catalog/store";
import { getMediaHealth, saveMediaHealth } from "@/lib/catalog/mediaHealth";

export const dynamic = "force-dynamic";
// Scanning hundreds of products against the remote image host can take a while; give it
// room. The scan is intentionally gentle (low concurrency + spacing) so it never floods.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req) && !hasCronSecret(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const doc = await getMediaHealth();
  return NextResponse.json({ success: true, mediaHealth: doc });
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req) && !hasCronSecret(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { totalChecked, brokenLegacyIds } = await scanCatalogMediaHealth();
    const doc = await saveMediaHealth({ totalChecked, brokenLegacyIds });
    return NextResponse.json({ success: true, mediaHealth: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
