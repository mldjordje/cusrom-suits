import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { hasAdminToken } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_PRODUCTS_BUCKET || "products";
const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION = 1800;

const ensureBucket = async (supabase: ReturnType<typeof getServiceSupabase>) => {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.getBucket(bucketName);
    if (data) return;
    await supabase.storage.createBucket(bucketName, { public: true });
  } catch {
    // Ignore and let upload surface errors.
  }
};

const normalizeImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" nije slika.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`"${file.name}" prelazi limit od 12MB.`);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input, { limitInputPixels: false }).rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (file.type === "image/webp") {
    const buffer = await pipeline.webp({ quality: 84 }).toBuffer();
    return { buffer, ext: "webp", contentType: "image/webp" };
  }

  const buffer = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  return { buffer, ext: "jpg", contentType: "image/jpeg" };
};

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return NextResponse.json({ success: false, message: "Dodaj bar jednu sliku." }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { success: false, message: `Maksimalno ${MAX_FILES_PER_REQUEST} slika po uploadu.` },
      { status: 400 },
    );
  }

  await ensureBucket(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  try {
    for (const file of files) {
      const normalized = await normalizeImage(file);
      const path = `webshop/${today}/${Date.now()}-${randomUUID()}.${normalized.ext}`;
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, normalized.buffer, {
        upsert: true,
        contentType: normalized.contentType,
      });
      if (uploadError) {
        return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
      }
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
      if (publicData?.publicUrl) {
        urls.push(publicData.publicUrl);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }

  return NextResponse.json({ success: true, urls });
}
