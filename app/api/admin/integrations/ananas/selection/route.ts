import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { syncAnanasSelectionFromStorefront } from "@/lib/integrations/ananas/selection";

export const maxDuration = 300;

/**
 * Marks every product visible on /web-shop for the Ananas sync.
 * Without `confirmSelection` it only previews the counts.
 */
export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const apply = payload?.confirmSelection === "CONFIRM_ANANAS_SELECTION";

  try {
    const data = await syncAnanasSelectionFromStorefront({
      apply,
      unflagOthers: payload?.unflagOthers === true,
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Selekcija nije uspela." },
      { status: 500 },
    );
  }
}
