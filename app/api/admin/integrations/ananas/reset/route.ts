import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { resetAnanasIntegrationState } from "@/lib/integrations/core/store";

/**
 * Clears our local memory of the remote Ananas catalog (listing ids, payload
 * hashes, discount campaigns) so the next catalog run submits everything again.
 * Only run this after Ananas confirms they deleted our products on their side.
 */
export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  if (payload?.confirmReset !== "CONFIRM_ANANAS_RESET") {
    return NextResponse.json(
      { success: false, message: "Reset requires confirmReset=CONFIRM_ANANAS_RESET." },
      { status: 400 },
    );
  }

  const counts = await resetAnanasIntegrationState();
  return NextResponse.json({ success: true, data: counts });
}
