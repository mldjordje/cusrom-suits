import { NextRequest, NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/auth/admin";
import { executeDomainSync } from "@/lib/integrations/orchestrator";

const runCron = async (req: NextRequest) => {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const environment = payload?.environment || "stage";
  const mode = payload?.mode || "delta";

  const result = await executeDomainSync("orchestrator", {
    environment,
    mode,
    trigger: "cron",
    meta: {
      schedule: "*/30 * * * *",
      source: "cron_endpoint",
    },
  });

  return NextResponse.json({ success: true, data: result });
};

export async function POST(req: NextRequest) {
  return runCron(req);
}

export async function GET(req: NextRequest) {
  return runCron(req);
}
