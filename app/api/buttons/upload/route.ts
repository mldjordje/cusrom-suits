import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_BUTTONS_BUCKET || "buttons";
const BUTTON_TARGET_SIZE = 512;
const ALPHA_THRESHOLD = 12;
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

type AlphaBounds = { left: number; top: number; width: number; height: number };

const getAlphaBounds = (data: Buffer, width: number, height: number): AlphaBounds | null => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const left = Math.max(0, minX);
  const top = Math.max(0, minY);
  const right = Math.min(width - 1, maxX);
  const bottom = Math.min(height - 1, maxY);
  const cropWidth = Math.max(1, right - left + 1);
  const cropHeight = Math.max(1, bottom - top + 1);
  return { left, top, width: cropWidth, height: cropHeight };
};

const normalizeButtonImage = async (buffer: Buffer) => {
  try {
    const { data, info } = await sharp(buffer, { limitInputPixels: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bounds = getAlphaBounds(data, info.width, info.height);
    let pipeline = sharp(buffer, { limitInputPixels: false });
    if (bounds) {
      pipeline = pipeline.extract(bounds);
    }
    return await pipeline
      .resize(BUTTON_TARGET_SIZE, BUTTON_TARGET_SIZE, {
        fit: "contain",
        background: TRANSPARENT_BG,
      })
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
};

const downloadImageBuffer = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const ensureBucket = async (supabase: ReturnType<typeof getServiceSupabase>) => {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.getBucket(bucketName);
    if (data) return;
    await supabase.storage.createBucket(bucketName, { public: true });
  } catch {
    // ignore; surface real upload errors later
  }
};

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const imageOverride = String(form.get("image_url") || form.get("imageUrl") || "").trim();
  const name = String(form.get("name") || "").trim();
  const colorHex = String(form.get("color_hex") || form.get("colorHex") || "").trim() || null;
  const diameterRaw = form.get("diameter");
  const id = String(form.get("id") || "").trim() || randomUUID();

  if (!name) return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
  if (!file && !imageOverride) {
    return NextResponse.json({ success: false, message: "Provide an image URL or upload a file" }, { status: 400 });
  }

  let sourceBuffer: Buffer | null = null;
  try {
    if (file) {
      sourceBuffer = Buffer.from(await file.arrayBuffer());
    } else if (imageOverride) {
      sourceBuffer = await downloadImageBuffer(imageOverride);
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Image download failed" },
      { status: 400 }
    );
  }

  if (!sourceBuffer) {
    return NextResponse.json({ success: false, message: "Missing image buffer" }, { status: 400 });
  }

  await ensureBucket(supabase);
  const normalized = await normalizeButtonImage(sourceBuffer);
  const path = `buttons/${id}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, normalized, {
    upsert: true,
    contentType: "image/png",
  });
  if (uploadError) {
    return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
  }
  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
  const imageUrl = publicData?.publicUrl || "";

  const diameter = diameterRaw ? Number(diameterRaw) : null;

  const { data, error } = await supabase
    .from("buttons")
    .upsert(
      {
        id,
        name,
        image_url: imageUrl,
        color_hex: colorHex,
        diameter,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }
  const payload = await req.json().catch(() => null);
  const id = payload?.id;
  if (!id) return NextResponse.json({ success: false, message: "Missing button id" }, { status: 400 });
  const { error } = await supabase.from("buttons").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
