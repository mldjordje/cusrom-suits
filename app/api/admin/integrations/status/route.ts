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
  const tableHealth: Record<string, { exists: boolean; count: number | null; error: string | null }> = {};

  if (supabase) {
    for (const table of ["integration_sync_runs", "integration_sync_items", "integration_stock_sync_log"]) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      tableHealth[table] = {
        exists: !error,
        count: count ?? null,
        error: error?.message || null,
      };
    }

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
      tableHealth,
      env: {
        supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
        supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        cronSecret: Boolean(process.env.CRON_SECRET),
        mofficeApiKey: Boolean(process.env.MOFFICE_API_KEY),
        stockZipUrl: Boolean(process.env.STOCK_SYNC_SOURCE_ZIP_URL),
        stockMd5Url: Boolean(process.env.STOCK_SYNC_SOURCE_MD5_URL),
        configBucket: process.env.SUPABASE_CONFIG_BUCKET || "site-config",
      },
      expectedCron: {
        schedule: "0 */2 * * *",
        label: "Na svaka 2 sata",
      },
    },
  });
}
