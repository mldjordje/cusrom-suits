import { randomUUID } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { uploadViaCpanel, isFtpConfigured } from "@/lib/ftp/cpanel";
import { uploadSiteAsset } from "@/lib/storage/siteAssets";

export const maxDuration = 60;

const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
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
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const sanitizeFileSegment = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    if (mimeType === "image/png") {
      return await sharp(buffer).png({ compressionLevel: 8 }).toBuffer();
    }
    return await sharp(buffer).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return buffer;
  }
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return NextResponse.json({ success: false, message: "Dodaj bar jedan fajl." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { success: false, message: `Maksimalno ${MAX_FILES_PER_REQUEST} fajlova po uploadu.` },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];
  const useFtp = isFtpConfigured();

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `"${file.name}" prelazi limit od 80MB.` },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, message: `"${file.name}" nije podrzan tip fajla.` },
        { status: 400 },
      );
    }

    const isImage = IMAGE_TYPES.has(file.type);
    const baseName = sanitizeFileSegment(path.basename(file.name || "fajl", ext)) || "fajl";
    const cleanExt = ext
      ? `.${sanitizeFileSegment(ext.replace(/^\./, "")) || ext.replace(/^\./, "").toLowerCase()}`
      : "";
    const finalName = `${Date.now()}-${randomUUID()}-${baseName}${cleanExt}`;

    let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;

    if (isImage) {
      buffer = await compressImage(buffer, file.type);
    }

    if (useFtp) {
      const url = await uploadViaCpanel(buffer, finalName, today);
      if (!url) {
        return NextResponse.json(
          { success: false, message: `"${file.name}" nije mogao da se sacuva na serveru.` },
          { status: 500 },
        );
      }
      urls.push(url);
    } else {
      const storagePath = `${today}/${finalName}`;
      const uploaded = await uploadSiteAsset(storagePath, buffer, file.type || null);
      if (!uploaded) {
        return NextResponse.json(
          { success: false, message: `"${file.name}" nije mogao da se sacuva na storage-u.` },
          { status: 500 },
        );
      }
      urls.push(`/site-assets/${storagePath}`);
    }
  }

  return NextResponse.json({ success: true, urls });
}
