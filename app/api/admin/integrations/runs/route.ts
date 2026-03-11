import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listSyncRuns } from "@/lib/integrations/core/store";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("limit") || 50)));
  const runs = await listSyncRuns(limit);
  return NextResponse.json({ success: true, data: runs });
}

