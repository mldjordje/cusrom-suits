import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { retryFailedRun } from "@/lib/integrations/orchestrator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { runId } = await context.params;
  const result = await retryFailedRun(runId);
  return NextResponse.json({ success: true, data: result });
}

