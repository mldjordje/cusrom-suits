import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { parseAnanasPhases, parseSkuFilter } from "@/lib/integrations/ananas/sync";
import { parseSyncEnvironment, requireProductionConfirm } from "@/lib/integrations/core/config";
import { executeDomainSync, parseSyncInput } from "@/lib/integrations/orchestrator";

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const input = parseSyncInput(payload);
  const environment = parseSyncEnvironment(input.environment);
  if (environment === "production" && !requireProductionConfirm(payload)) {
    return NextResponse.json(
      {
        success: false,
        message: "Production sync requires confirmProduction=CONFIRM_PRODUCTION_SYNC.",
      },
      { status: 400 },
    );
  }

  const result = await executeDomainSync("ananas", {
    ...input,
    environment,
    trigger: "manual",
    // Admin can run a single phase (catalog / listings / prices / stock / discounts / publish)
    // and/or restrict to specific SKUs (e.g. the Ananas-requested pilot test).
    meta: { ...input.meta, phases: parseAnanasPhases(payload?.phases), skus: parseSkuFilter(payload?.skus) },
  });
  return NextResponse.json({ success: true, data: result });
}

