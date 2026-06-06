import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getSyncRunById } from "@/lib/integrations/core/store";
import {
  loadMofficeExportRows,
  type MofficePulledRow,
} from "@/lib/integrations/moffice/sync";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toPulledRow = (value: unknown): MofficePulledRow | null => {
  if (!isRecord(value)) return null;
  return {
    moffice_id: Number(value.moffice_id || 0) || "",
    sku: String(value.sku || ""),
    ean: String(value.ean || ""),
    naziv: String(value.naziv || ""),
    kategorija: String(value.kategorija || ""),
    velicina: String(value.velicina || ""),
    moffice_kolicina: Number(value.moffice_kolicina || 0),
    mp_cena: Number(value.mp_cena || 0),
    vp_cena: Number(value.vp_cena || 0),
    pdv: Number(value.pdv || 0),
    raw: isRecord(value.raw) ? value.raw : {},
  } as MofficePulledRow;
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const runId = String(req.nextUrl.searchParams.get("runId") || "").trim();
  if (!runId) {
    return NextResponse.json({ success: false, message: "Missing runId." }, { status: 400 });
  }

  try {
    const { run, items } = await getSyncRunById(runId);
    if (!run) {
      return NextResponse.json({ success: false, message: "Run not found." }, { status: 404 });
    }

    const rows = items
      .filter((item) => item.entityType === "moffice_feed")
      .flatMap((item) => {
        const payloadRows = Array.isArray(item.payload?.rows) ? item.payload.rows : [];
        return payloadRows.map(toPulledRow).filter(Boolean) as MofficePulledRow[];
      });

    if (rows.length) {
      return NextResponse.json({
        success: true,
        data: {
          source: "snapshot",
          rows,
        },
      });
    }

    const reconstructed = await loadMofficeExportRows(runId);
    return NextResponse.json({
      success: true,
      data: {
        source: "reconstructed",
        rows: reconstructed.rows
          .filter((row) => row.last_synced_run === runId && row.moffice_id !== "")
          .map((row) => ({
            moffice_id: row.moffice_id,
            sku: row.sku,
            ean: row.ean,
            naziv: row.naziv,
            kategorija: row.kategorija,
            velicina: row.velicina,
            moffice_kolicina: Number(row.moffice_kolicina || 0),
            mp_cena: 0,
            vp_cena: 0,
            pdv: 0,
            raw: {},
            site_stock_total: row.site_stock_total,
            site_active: row.site_active,
            site_exported: row.site_exported,
            status: row.status,
            legacy_id: row.legacy_id,
          })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
