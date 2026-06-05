import { NextRequest, NextResponse } from "next/server";
import { runMofficeSync, runMofficeSyncWithItems, type MofficeItem } from "@/lib/integrations/moffice/sync";

function authorizeCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  return true;
}

function errorStatus(message: string) {
  return message.includes("MOFFICE_API_KEY") || message.includes("Supabase service role") ? 500 : 502;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
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
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) });
  }
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Expected mOffice items array." }, { status: 400 });
    }

    const result = await runMofficeSyncWithItems({
      items: items as MofficeItem[],
      environment: "production",
      mode: "full",
      trigger: "cron",
      source: "moffice-cpanel-payload",
    });
    return NextResponse.json({ success: true, ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) });
  }
}
