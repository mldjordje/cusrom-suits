import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/adminAuth";
import {
  getSizeGuideSettings,
  updateSizeGuideSettings,
  type SizeGuideRow,
  type SizeGuideSettings,
  type SizeGuideTable,
} from "@/lib/catalog/sizeGuides";

const requireAdmin = async (req: NextRequest) => {
  if (await isAdminRequestAuthenticated(req)) return null;
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
};

const parseString = (value: unknown) => String(value || "").trim();

const parseHeaders = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => parseString(item)).filter(Boolean);
};

const parseNotes = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => parseString(item)).filter(Boolean).slice(0, 8);
};

const parseRows = (tableId: string, headers: string[], value: unknown): SizeGuideRow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const sourceCells = Array.isArray(entry.cells) ? entry.cells : [];
      const cells = headers.map((_, cellIndex) => parseString(sourceCells[cellIndex]));
      if (!cells.length || cells.every((cell) => !cell)) return null;
      return {
        id: parseString(entry.id) || `${tableId}-row-${index + 1}`,
        cells,
      };
    })
    .filter((row): row is SizeGuideRow => Boolean(row));
};

const parseTables = (value: unknown): SizeGuideTable[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((table, index) => {
      if (!table || typeof table !== "object") return null;
      const entry = table as Record<string, unknown>;
      const id = parseString(entry.id) || `table-${index + 1}`;
      const headers = parseHeaders(entry.headers);
      if (!headers.length) return null;
      return {
        id,
        title: parseString(entry.title) || `Tabela ${index + 1}`,
        group: (parseString(entry.group) || "shirt") as SizeGuideTable["group"],
        fit: (parseString(entry.fit) || "standard") as SizeGuideTable["fit"],
        headers,
        rows: parseRows(id, headers, entry.rows),
        notes: parseNotes(entry.notes),
      };
    })
    .filter((table): table is SizeGuideTable => Boolean(table));
};

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const settings = await getSizeGuideSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }

  const row = payload as Partial<SizeGuideSettings>;
  const tables = parseTables(row.tables);
  if (!tables.length) {
    return NextResponse.json({ success: false, message: "Tabela velicina ne sme biti prazna." }, { status: 400 });
  }

  const settings = await updateSizeGuideSettings({
    tables,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, settings });
}
