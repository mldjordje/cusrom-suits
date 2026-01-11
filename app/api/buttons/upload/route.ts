import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_BUTTONS_BUCKET || "buttons";
const BUTTON_TARGET_SIZE = 512;
const ALPHA_THRESHOLD = 6;
const OUTLIER_TRIM_RATIO = 0.002;
const BOUNDS_PADDING = 2;
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };
const DEFAULT_VISIBLE_RATIO = 0.78;
const REFERENCE_BUTTON_NAME = process.env.BUTTON_REFERENCE_NAME || "crno sivo";
const REFERENCE_BUTTON_ID = process.env.BUTTON_REFERENCE_ID || "7161d701-8292-4909-8e26-35be977b2ddd";
const REFERENCE_CACHE_TTL_MS = 10 * 60 * 1000;

let referenceRatioCache: { ratio: number; ts: number } | null = null;

type AlphaBounds = { left: number; top: number; width: number; height: number };
type RatioData = { ratio: number; bounds: AlphaBounds; buffer: Buffer };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const isRatioValid = (value: number | null) => typeof value === "number" && value > 0.3 && value < 0.98;

const getAlphaBounds = (data: Buffer, width: number, height: number): AlphaBounds | null => {
  const xCounts = new Uint32Array(width);
  const yCounts = new Uint32Array(height);
  let total = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        xCounts[x] += 1;
        yCounts[y] += 1;
        total += 1;
      }
    }
  }

  if (!total) return null;
  const trimCount = total > 500 ? Math.floor(total * OUTLIER_TRIM_RATIO) : 0;

  const findEdge = (counts: Uint32Array, fromStart: boolean) => {
    let sum = 0;
    if (fromStart) {
      for (let i = 0; i < counts.length; i++) {
        sum += counts[i];
        if (sum > trimCount) return i;
      }
      return 0;
    }
    for (let i = counts.length - 1; i >= 0; i--) {
      sum += counts[i];
      if (sum > trimCount) return i;
    }
    return counts.length - 1;
  };

  let left = findEdge(xCounts, true);
  let right = findEdge(xCounts, false);
  let top = findEdge(yCounts, true);
  let bottom = findEdge(yCounts, false);

  left = Math.max(0, left - BOUNDS_PADDING);
  top = Math.max(0, top - BOUNDS_PADDING);
  right = Math.min(width - 1, right + BOUNDS_PADDING);
  bottom = Math.min(height - 1, bottom + BOUNDS_PADDING);

  if (right < left || bottom < top) return null;
  const cropWidth = Math.max(1, right - left + 1);
  const cropHeight = Math.max(1, bottom - top + 1);
  return { left, top, width: cropWidth, height: cropHeight };
};

const getVisibleRatioFromBuffer = async (buffer: Buffer): Promise<RatioData | null> => {
  const trimmed = sharp(buffer, { limitInputPixels: false }).rotate().ensureAlpha().trim({ threshold: 2 });
  const { data, info } = await trimmed.raw().toBuffer({ resolveWithObject: true });
  const bounds = getAlphaBounds(data, info.width, info.height);
  if (!bounds) return null;
  const maxDim = Math.max(bounds.width, bounds.height);
  const canvasDim = Math.max(info.width, info.height);
  if (!canvasDim) return null;
  const normalizedBuffer = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
  return { ratio: maxDim / canvasDim, bounds, buffer: normalizedBuffer };
};

const normalizeButtonImage = async (
  buffer: Buffer,
  targetVisibleRatio: number | null,
  ratioData?: RatioData | null
) => {
  try {
    const resolvedRatioData = ratioData ?? (await getVisibleRatioFromBuffer(buffer));
    if (!resolvedRatioData) {
      return await sharp(buffer, { limitInputPixels: false })
        .rotate()
        .resize(BUTTON_TARGET_SIZE, BUTTON_TARGET_SIZE, {
          fit: "contain",
          background: TRANSPARENT_BG,
        })
        .png()
        .toBuffer();
    }

    const bounds = resolvedRatioData.bounds;
    const maxDim = Math.max(bounds.width, bounds.height);
    const desiredRatio = isRatioValid(targetVisibleRatio)
      ? clamp(targetVisibleRatio as number, 0.3, 0.98)
      : DEFAULT_VISIBLE_RATIO;
    const targetVisiblePx = Math.max(1, Math.round(desiredRatio * BUTTON_TARGET_SIZE));
    const scale = targetVisiblePx / Math.max(1, maxDim);
    const scaledWidth = Math.max(1, Math.round(bounds.width * scale));
    const scaledHeight = Math.max(1, Math.round(bounds.height * scale));
    const contentBuffer = await sharp(resolvedRatioData.buffer, { limitInputPixels: false })
      .ensureAlpha()
      .extract(bounds)
      .resize(scaledWidth, scaledHeight, { fit: "fill" })
      .png()
      .toBuffer();
    const left = Math.max(0, Math.floor((BUTTON_TARGET_SIZE - scaledWidth) / 2));
    const top = Math.max(0, Math.floor((BUTTON_TARGET_SIZE - scaledHeight) / 2));
    return await sharp({
      create: { width: BUTTON_TARGET_SIZE, height: BUTTON_TARGET_SIZE, channels: 4, background: TRANSPARENT_BG },
    })
      .composite([{ input: contentBuffer, left, top }])
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

const getReferenceVisibleRatio = async (supabase: ReturnType<typeof getServiceSupabase>) => {
  if (!REFERENCE_BUTTON_NAME || !supabase) return null;
  const now = Date.now();
  if (referenceRatioCache && now - referenceRatioCache.ts < REFERENCE_CACHE_TTL_MS) {
    return referenceRatioCache.ratio;
  }

  try {
    const trimmedName = REFERENCE_BUTTON_NAME.trim();
    let data: { image_url?: string | null } | null = null;
    if (REFERENCE_BUTTON_ID.trim()) {
      const response = await supabase
        .from("buttons")
        .select("image_url")
        .eq("id", REFERENCE_BUTTON_ID.trim())
        .limit(1)
        .maybeSingle();
      data = response.data ?? null;
    }
    if (!data && trimmedName) {
      const response = await supabase
        .from("buttons")
        .select("image_url")
        .ilike("name", `%${trimmedName}%`)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      data = response.data ?? null;
    }
    const imageUrl = data?.image_url;
    if (!imageUrl) return null;
    const buffer = await downloadImageBuffer(imageUrl);
    const ratioData = await getVisibleRatioFromBuffer(buffer);
    if (!ratioData || !isRatioValid(ratioData.ratio)) return null;
    referenceRatioCache = { ratio: ratioData.ratio, ts: now };
    return ratioData.ratio;
  } catch {
    return null;
  }
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
  let ratioData: RatioData | null = null;
  try {
    ratioData = await getVisibleRatioFromBuffer(sourceBuffer);
  } catch {
    ratioData = null;
  }
  const refName = REFERENCE_BUTTON_NAME.trim().toLowerCase();
  const isReferenceUpload = refName && name.trim().toLowerCase() === refName;
  const referenceRatio = isReferenceUpload ? ratioData?.ratio ?? null : await getReferenceVisibleRatio(supabase);
  const normalized = await normalizeButtonImage(sourceBuffer, referenceRatio, ratioData);
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
