import { NextRequest, NextResponse } from "next/server";
import { getAdminViewerFromRequest, hasAdminPermission } from "@/lib/adminAuth";
import { uploadSiteAsset } from "@/lib/storage/siteAssets";
import {
  addGoogleFontFamily,
  addUploadedFontFamily,
  getFontLibrary,
} from "@/lib/storefront/fontLibrary";
import {
  ALLOWED_FONT_WEIGHTS,
  normalizeFontFamilyName,
  slugifyFontFamily,
  type FontFallback,
  type FontWeight,
} from "@/lib/storefront/fontLibraryDefaults";
import { buildUploadedFontStoragePath, validateWoff2Upload } from "@/lib/storefront/fontUpload";

export const maxDuration = 60;

const authorize = async (req: NextRequest) => {
  const viewer = await getAdminViewerFromRequest(req);
  return hasAdminPermission(viewer, "content.manage")
    ? null
    : NextResponse.json({ success: false, message: "Nemate dozvolu za upravljanje fontovima." }, { status: viewer ? 403 : 401 });
};

const parseFallback = (value: unknown): FontFallback | null =>
  value === "serif" || value === "sans-serif" ? value : null;

const parseWeights = (value: unknown): FontWeight[] | null => {
  if (!Array.isArray(value)) return null;
  const weights = Array.from(new Set(value.map(String))) as FontWeight[];
  return weights.length && weights.every((weight) => ALLOWED_FONT_WEIGHTS.includes(weight)) ? weights : null;
};

export async function GET(req: NextRequest) {
  const denied = await authorize(req);
  if (denied) return denied;
  return NextResponse.json({ success: true, fonts: await getFontLibrary() });
}

export async function POST(req: NextRequest) {
  const denied = await authorize(req);
  if (denied) return denied;

  try {
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      const row = await req.json().catch(() => null) as Record<string, unknown> | null;
      const fallback = parseFallback(row?.fallback);
      const weights = parseWeights(row?.weights);
      if (row?.source !== "google" || !fallback || !weights) {
        return NextResponse.json({ success: false, message: "Google font podaci nisu ispravni." }, { status: 400 });
      }
      const fonts = await addGoogleFontFamily(row.name, fallback, weights);
      return NextResponse.json({ success: true, fonts });
    }

    const form = await req.formData();
    const name = normalizeFontFamilyName(form.get("familyName"));
    const fallback = parseFallback(form.get("fallback"));
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const weights = form.getAll("weights").map(String);
    if (!name || !fallback || !files.length || files.length !== weights.length) {
      return NextResponse.json({ success: false, message: "Dodajte naziv i WOFF2 fajl za svaku težinu." }, { status: 400 });
    }

    const id = `${slugifyFontFamily(name)}-uploaded`;
    const prepared: Array<{ buffer: Buffer; weight: FontWeight; path: string }> = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validateWoff2Upload({ name: file.name, type: file.type, size: file.size, bytes: buffer, weight: weights[index] });
      if (!validation.ok) return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
      prepared.push({ buffer, weight: validation.weight, path: buildUploadedFontStoragePath(id, validation.weight) });
    }

    for (const item of prepared) {
      if (!await uploadSiteAsset(item.path, item.buffer, "font/woff2")) {
        return NextResponse.json({ success: false, message: "Font nije mogao da se sačuva na storage-u." }, { status: 500 });
      }
    }

    const fontWeights = prepared.map((item) => item.weight);
    const filesByWeight = Object.fromEntries(prepared.map((item) => [item.weight, item.path]));
    const fonts = await addUploadedFontFamily({ id, name, source: "uploaded", fallback, weights: fontWeights, files: filesByWeight });
    return NextResponse.json({ success: true, fonts });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Čuvanje fonta nije uspelo." }, { status: 500 });
  }
}
