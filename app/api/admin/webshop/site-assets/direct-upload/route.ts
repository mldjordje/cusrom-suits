import { randomUUID } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/server";
import { SITE_ASSET_BUCKET, ensureSiteAssetBucket } from "@/lib/storage/siteAssets";

/**
 * Hands the browser a short-lived signed upload URL so big files (hero videos)
 * go straight to Supabase Storage. The regular /site-assets route runs inside a
 * serverless function, whose request body is capped at ~4.5MB on Vercel — that
 * cap is what made every real video upload fail, regardless of our own limit.
 */

export const maxDuration = 30;

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mpeg",
  ".mpg",
  ".m4v",
  ".pdf",
]);

const sanitizeFileSegment = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: { filename?: string; size?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Neispravan zahtev." }, { status: 400 });
  }

  const filename = String(body.filename || "").trim();
  const size = Number(body.size || 0);

  if (!filename) {
    return NextResponse.json({ success: false, message: "Nedostaje ime fajla." }, { status: 400 });
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, message: `"${filename}" prelazi limit od 500MB.` },
      { status: 400 },
    );
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { success: false, message: `"${filename}" nije podrzan tip fajla.` },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: "Supabase storage nije konfigurisan." },
      { status: 500 },
    );
  }

  const ready = await ensureSiteAssetBucket();
  if (!ready) {
    return NextResponse.json(
      { success: false, message: "Storage bucket nije dostupan." },
      { status: 500 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const baseName = sanitizeFileSegment(path.basename(filename, ext)) || "fajl";
  const cleanExt = `.${sanitizeFileSegment(ext.replace(/^\./, ""))}`;
  const storagePath = `${today}/${Date.now()}-${randomUUID()}-${baseName}${cleanExt}`;

  const { data, error } = await supabase.storage
    .from(SITE_ASSET_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { success: false, message: error?.message || "Nije moguce otvoriti upload." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    signedUrl: data.signedUrl,
    url: `/site-assets/${storagePath}`,
  });
}
