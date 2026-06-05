import { NextRequest, NextResponse } from "next/server";
import { runMofficeSync } from "@/lib/integrations/moffice/sync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMofficeSync({
      environment: "production",
      mode: "full",
      trigger: "cron",
    });
    return NextResponse.json({ success: true, ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("MOFFICE_API_KEY") || message.includes("Supabase service role") ? 500 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
