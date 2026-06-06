import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { parseSyncEnvironment, requireProductionConfirm } from "@/lib/integrations/core/config";
import { runMofficeSync } from "@/lib/integrations/moffice/sync";

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const environment = parseSyncEnvironment(payload?.environment || "production");
  if (environment === "production" && !requireProductionConfirm(payload)) {
    return NextResponse.json(
      {
        success: false,
        message: "Production mOffice sync requires confirmProduction=CONFIRM_PRODUCTION_SYNC.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runMofficeSync({
      environment,
      mode: "full",
      trigger: "manual",
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("mOffice API returned 403")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "mOffice je odbio direktan admin/Vercel poziv (403). Pravi sync treba da ide preko cPanel cron-a jer je taj IP whitelistovan kod mOffice-a.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
