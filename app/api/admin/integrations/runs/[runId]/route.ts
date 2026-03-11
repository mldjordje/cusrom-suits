import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getSyncRunById } from "@/lib/integrations/core/store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { runId } = await context.params;
  const result = await getSyncRunById(runId);
  if (!result.run) {
    return NextResponse.json({ success: false, message: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: result });
}

