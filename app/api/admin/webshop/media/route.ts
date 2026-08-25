import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { hasAdminToken } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_PRODUCTS_BUCKET || "products";
const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION = 1800;
// A border spread above this means the photo bleeds to its edge, so it cannot be
// padded with a flat colour without showing a seam.
const BORDER_UNIFORM_TOLERANCE = 12;

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

/**
 * Reads the 1px frame of the image and reports its median colour plus how
 * uniform that frame is. A studio cut-out has a dead-flat border; a lifestyle
 * shot that bleeds to the edge does not.
 *
 * Kept in step with scripts/normalize-legacy-images.mjs, which applies the same
 * treatment to the legacy fajlovi/ archive. Both must agree, or newly uploaded
 * photos would sit in the grid at a different shape than the old ones.
 */
const detectBorderColour = async (input: Buffer) => {
  const { data, info } = await sharp(input, { limitInputPixels: false })
    .resize(64, 64, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const samples: number[][] = [];
  const push = (x: number, y: number) => {
    const offset = (y * width + x) * channels;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const colour = [0, 1, 2].map((channel) => median(samples.map((sample) => sample[channel])));
  const spread = Math.max(
    ...[0, 1, 2].map((channel) => {
      const deltas = samples.map((sample) => Math.abs(sample[channel] - colour[channel])).sort((a, b) => a - b);
      return deltas[Math.floor(deltas.length * 0.9)];
    }),
  );

  return { r: colour[0], g: colour[1], b: colour[2], spread };
};

/**
 * Fits the photo inside a square canvas without ever cropping or scaling it up.
 * The storefront paints every product image into a 1:1 stage
 * (`--ss-product-ratio`), so squaring at rest is what lets `object-fit: cover`
 * fill the card exactly — no letterbox bars, no crop.
 *
 * Flat-bordered photos are padded with their own backdrop colour, which is
 * invisible. Full-bleed photos get their edge mirrored into the pad and blurred,
 * because a flat band across a textured background reads as a stripe — the very
 * artefact this change removes. The subject is composited back on top untouched,
 * so it never blurs.
 */
const squareCanvas = async (input: Buffer) => {
  const meta = await sharp(input, { limitInputPixels: false }).metadata();
  if (!meta.width || !meta.height) throw new Error("Slika je nečitljiva.");

  const border = await detectBorderColour(input);
  const flatBorder = border.spread <= BORDER_UNIFORM_TOLERANCE;
  const side = Math.min(Math.max(meta.width, meta.height), MAX_DIMENSION);

  const fitted = await sharp(input, { limitInputPixels: false })
    .rotate()
    .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const left = Math.floor((side - fitted.info.width) / 2);
  const top = Math.floor((side - fitted.info.height) / 2);
  const extend = { left, top, right: side - fitted.info.width - left, bottom: side - fitted.info.height - top };
  const background = { r: border.r, g: border.g, b: border.b };

  if (extend.left === 0 && extend.top === 0 && extend.right === 0 && extend.bottom === 0) {
    return sharp(fitted.data).flatten({ background });
  }

  if (flatBorder) {
    return sharp(fitted.data)
      .extend({ ...extend, background: { ...background, alpha: 1 } })
      .flatten({ background });
  }

  const padPx = Math.max(extend.left, extend.right, extend.top, extend.bottom);
  const sigma = Math.min(40, Math.max(8, padPx / 5));
  const backdrop = await sharp(fitted.data)
    .extend({ ...extend, extendWith: "mirror" })
    .blur(sigma)
    .toBuffer();

  return sharp(backdrop)
    .composite([{ input: fitted.data, left: extend.left, top: extend.top }])
    .flatten({ background });
};

const normalizeImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" nije slika.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`"${file.name}" prelazi limit od 12MB.`);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = await squareCanvas(input);

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
        // Storage defaults to one hour, so every product photo was being
        // re-fetched all day. The path carries a timestamp and a UUID and is
        // never reused, which makes a year safe.
        cacheControl: "31536000",
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
