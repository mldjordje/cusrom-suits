import { NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { listSyncRuns } from "@/lib/integrations/core/store";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const runs = await listSyncRuns(20);
  const supabase = getServiceSupabase();
  let stockLog: unknown[] = [];
  let stockLogError: string | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("integration_stock_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    stockLog = data || [];
    stockLogError = error?.message || null;
  }

  return NextResponse.json({
    success: true,
    data: {
      latestRun: runs[0] || null,
      runs,
      stockLog,
      stockLogError,
    },
  });
}
