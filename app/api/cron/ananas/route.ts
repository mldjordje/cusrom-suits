import { NextRequest, NextResponse } from "next/server";
import { parseAnanasPhases } from "@/lib/integrations/ananas/sync";
import { executeDomainSync } from "@/lib/integrations/orchestrator";

/**
 * Phase-aware Ananas cron. Each schedule in vercel.json hits this route with the
 * phases it is allowed to run, because the platform caps how often each part of
 * the flow may be called (catalog 1×/day, stock ≥15 min apart, prices 1×/day).
 *
 *   /api/cron/ananas?phases=catalog
 *   /api/cron/ananas?phases=listings,discounts
 *   /api/cron/ananas?phases=stock
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phases = parseAnanasPhases(req.nextUrl.searchParams.get("phases"));
  const mode = req.nextUrl.searchParams.get("mode") === "full" ? "full" : "delta";

  try {
    const result = await executeDomainSync("ananas", {
      mode,
      environment: process.env.ANANAS_CRON_ENVIRONMENT?.trim() === "stage" ? "stage" : "production",
      trigger: "cron",
      meta: { phases },
    });
    return NextResponse.json({ ok: true, phases, data: result });
  } catch (err) {
    return NextResponse.json({ ok: false, phases, error: String(err) }, { status: 500 });
  }
}
