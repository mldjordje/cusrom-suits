import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { uploadSiteAsset } from "@/lib/storage/siteAssets";

const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx"]);

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
  const outputDir = path.join(process.cwd(), "public", "site-assets", today);
  let localMirrorAvailable = true;
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch {
    localMirrorAvailable = false;
  }

  const urls: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `"${file.name}" prelazi limit od 20MB.` },
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

    const baseName = sanitizeFileSegment(path.basename(file.name || "fajl", ext)) || "fajl";
    const cleanExt = ext ? `.${sanitizeFileSegment(ext.replace(/^\./, "")) || ext.replace(/^\./, "").toLowerCase()}` : "";
    const finalName = `${Date.now()}-${randomUUID()}-${baseName}${cleanExt}`;
    const storagePath = `${today}/${finalName}`;
    const outputPath = path.join(outputDir, finalName);
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadSiteAsset(storagePath, buffer, file.type || null);
    if (!uploaded) {
      if (!localMirrorAvailable) {
        return NextResponse.json(
          { success: false, message: `"${file.name}" nije mogao da se sacuva na storage-u.` },
          { status: 500 },
        );
      }
      await fs.writeFile(outputPath, buffer);
    } else if (localMirrorAvailable) {
      try {
        await fs.writeFile(outputPath, buffer);
      } catch {
        // Local mirror is best-effort only on read-only deployments.
      }
    }

    urls.push(`/site-assets/${storagePath}`);
  }

  return NextResponse.json({ success: true, urls });
}
