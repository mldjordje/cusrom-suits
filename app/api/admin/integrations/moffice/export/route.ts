import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { loadMofficeExportRows, type MofficeExportRow } from "@/lib/integrations/moffice/sync";

const headers: Array<keyof MofficeExportRow> = [
  "sku",
  "ean",
  "velicina",
  "moffice_kolicina",
  "site_stock_total",
  "site_active",
  "site_exported",
  "status",
  "legacy_id",
  "moffice_id",
  "naziv",
  "kategorija",
  "last_synced_run",
];

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  if (!/[",\r\n;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (rows: MofficeExportRow[]) => {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const runId = req.nextUrl.searchParams.get("runId") || undefined;
    const { rows } = await loadMofficeExportRows(runId);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="moffice-lager-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
