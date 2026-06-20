import { NextRequest, NextResponse } from "next/server";
import { getAdminViewerFromRequest, hasAdminPermission } from "@/lib/adminAuth";
import { getFontSettings, updateFontSettings } from "@/lib/storefront/fontSettings";
import { getFontLibrary } from "@/lib/storefront/fontLibrary";

const requireAdmin = async (req: NextRequest) => {
  const viewer = await getAdminViewerFromRequest(req);
  if (hasAdminPermission(viewer, "content.manage")) return null;
  return NextResponse.json({ success: false, message: "Nemate dozvolu za upravljanje fontovima." }, { status: viewer ? 403 : 401 });
};

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const settings = await getFontSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }

  const row = payload as Record<string, unknown>;
  const library = await getFontLibrary();
  const body = library.find((font) => font.id === row.bodyFontId);
  const heading = library.find((font) => font.id === row.displayFontId);
  if (!body || !heading || !body.weights.includes(String(row.bodyFontWeight) as never) || !heading.weights.includes(String(row.displayFontWeight) as never)) {
    return NextResponse.json({ success: false, message: "Izabrani font ili težina nisu dostupni." }, { status: 400 });
  }
  if (!/^-?\d+(\.\d+)?$/.test(String(row.letterSpacingBase ?? "0"))) {
    return NextResponse.json({ success: false, message: "Razmak slova nije ispravan." }, { status: 400 });
  }

  const settings = await updateFontSettings(payload);
  return NextResponse.json({ success: true, settings });
}
