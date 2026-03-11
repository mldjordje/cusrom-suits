import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { executeDomainSync, parseSyncInput } from "@/lib/integrations/orchestrator";

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => ({}));
  const input = parseSyncInput(payload);
  const result = await executeDomainSync("stock_inbound", {
    ...input,
    trigger: "manual",
  });
  return NextResponse.json({ success: true, data: result });
}

