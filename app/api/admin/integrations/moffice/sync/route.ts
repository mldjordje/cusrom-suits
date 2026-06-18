import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { parseSyncEnvironment, requireProductionConfirm } from "@/lib/integrations/core/config";
import { buildMofficeProxyHeaders } from "@/lib/integrations/moffice/proxy";
import { runMofficeSync, runMofficeSyncWithItems, type MofficeItem } from "@/lib/integrations/moffice/sync";

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

  const proxyUrl = process.env.MOFFICE_PROXY_URL?.trim();
  const proxySecret = process.env.MOFFICE_PROXY_SECRET?.trim();

  // If a cPanel proxy is configured, use it — cPanel IP is whitelisted at mOffice, Vercel is not.
  if (proxyUrl && proxySecret) {
    let items: MofficeItem[];
    try {
      const proxyRes = await fetch(proxyUrl, {
        headers: buildMofficeProxyHeaders(proxySecret),
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      });
      if (!proxyRes.ok) {
        const errText = await proxyRes.text().catch(() => "");
        return NextResponse.json(
          { success: false, message: `cPanel proxy vratio ${proxyRes.status}. ${errText}`.trim() },
          { status: 502 },
        );
      }
      const body = await proxyRes.json();
      items = Array.isArray(body) ? body : body?.items;
      if (!Array.isArray(items)) {
        return NextResponse.json(
          { success: false, message: "cPanel proxy nije vratio ispravan niz artikala." },
          { status: 502 },
        );
      }
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return NextResponse.json(
        { success: false, message: `Greška pri pozivu cPanel proxy-a: ${msg}` },
        { status: 502 },
      );
    }

    try {
      const result = await runMofficeSyncWithItems({
        items,
        environment,
        mode: "full",
        trigger: "manual",
        source: "moffice-cpanel-proxy",
      });
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  }

  // Fallback: direct call (only works if Vercel IP is whitelisted at mOffice).
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
            "mOffice je odbio direktan Vercel poziv (403). Postavi MOFFICE_PROXY_URL i MOFFICE_PROXY_SECRET na Vercel da bi admin sync radio preko cPanel proxy-a.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
