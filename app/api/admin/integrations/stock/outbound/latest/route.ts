import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getLatestOutboundArtifact } from "@/lib/integrations/core/store";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const latest = await getLatestOutboundArtifact();
  return NextResponse.json({ success: true, data: latest });
}

