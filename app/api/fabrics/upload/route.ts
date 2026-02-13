import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const bucketName = process.env.SUPABASE_FABRICS_BUCKET || "fabrics";

const ensureBucket = async (supabase: ReturnType<typeof getServiceSupabase>) => {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.getBucket(bucketName);
    if (data) return;
    await supabase.storage.createBucket(bucketName, { public: true });
  } catch {
    // bucket may already exist or creation failed; continue and let upload surface errors
  }
};

const parseNumber = (value: FormDataEntryValue | null) => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const parseText = (value: FormDataEntryValue | null) => {
  if (value == null) return null;
  const raw = String(value).trim();
  return raw ? raw : null;
};

const normalizePhotoVariant = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "blue" || normalized === "black" || normalized === "light") {
    return normalized;
  }
  return null;
};

const normalizeRenderMode = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "fabricspecific" ||
    normalized === "fabric_specific" ||
    normalized === "fabric-specific"
  ) {
    return "fabricSpecific";
  }
  if (
    normalized === "photovariant" ||
    normalized === "photo_variant" ||
    normalized === "photo-variant"
  ) {
    return "photoVariant";
  }
  return null;
};

const normalizeHex = (value: string | null) => {
  if (!value) return null;
  const raw = value.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(raw)) return null;
  return `#${raw}`;
};

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = String(form.get("name") || "").trim();
  const tone = (form.get("tone") as string) || "medium";
  const priceRaw = form.get("price");
  const code = String(form.get("code") || "").trim() || null;
  const id = String(form.get("id") || "").trim() || randomUUID();
  const textureOverride = String(form.get("texture") || "").trim();
  const pattern = String(form.get("pattern") || "").trim() || null;
  const textureScale = parseNumber(form.get("textureScale") ?? form.get("texture_scale"));
  const textureStrength = parseNumber(form.get("textureStrength") ?? form.get("texture_strength"));
  const textureContrast = parseNumber(form.get("textureContrast") ?? form.get("texture_contrast"));
  const textureBrightness = parseNumber(form.get("textureBrightness") ?? form.get("texture_brightness"));
  const pantsTextureRotation = parseNumber(form.get("pantsTextureRotation") ?? form.get("pants_texture_rotation"));
  const stripeSpacing = parseNumber(form.get("stripeSpacing") ?? form.get("stripe_spacing"));
  const stripeSpacingJacket = parseNumber(
    form.get("stripeSpacingJacket") ?? form.get("stripe_spacing_jacket")
  );
  const stripeSpacingPants = parseNumber(
    form.get("stripeSpacingPants") ?? form.get("stripe_spacing_pants")
  );
  const photoVariant = normalizePhotoVariant(
    parseText(form.get("photoVariant") ?? form.get("photo_variant"))
  );
  const renderMode = normalizeRenderMode(
    parseText(form.get("renderMode") ?? form.get("render_mode"))
  );
  const renderBasePath = parseText(form.get("renderBasePath") ?? form.get("render_base_path"));
  const colorHex = normalizeHex(parseText(form.get("colorHex") ?? form.get("color_hex")));
  const detailFile = form.get("detailFile") as File | null;
  const detailImageOverride = String(form.get("detailImage") ?? form.get("detail_image") ?? "").trim();
  const detailText = String(form.get("detailText") ?? form.get("detail_text") ?? "").trim();

  if (!name) {
    return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
  }
  if (!file && !textureOverride) {
    return NextResponse.json({ success: false, message: "Provide a texture URL or upload a file" }, { status: 400 });
  }

  let textureUrl = textureOverride || "";
  let detailImageUrl = detailImageOverride || "";

  if (!textureUrl && file) {
    await ensureBucket(supabase);
    const path = `fabrics/${id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
    if (uploadError) {
      return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
    }
    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
    textureUrl = publicData?.publicUrl || "";
  }
  if (!detailImageUrl && detailFile) {
    await ensureBucket(supabase);
    const detailPath = `fabrics/details/${id}-${Date.now()}-${detailFile.name}`;
    const { error: detailUploadError } = await supabase.storage
      .from(bucketName)
      .upload(detailPath, detailFile, { upsert: true });
    if (detailUploadError) {
      return NextResponse.json({ success: false, message: detailUploadError.message }, { status: 500 });
    }
    const { data: detailPublic } = supabase.storage.from(bucketName).getPublicUrl(detailPath);
    detailImageUrl = detailPublic?.publicUrl || "";
  }

  const price = priceRaw ? Number(priceRaw) : null;

  const payload: Record<string, any> = {
    id,
    name,
    texture: textureUrl,
    tone,
    price,
    code,
  };
  payload.pattern = pattern;
  if (textureScale !== null) payload.texture_scale = textureScale;
  if (textureStrength !== null) payload.texture_strength = textureStrength;
  if (textureContrast !== null) payload.texture_contrast = textureContrast;
  if (textureBrightness !== null) payload.texture_brightness = textureBrightness;
  if (pantsTextureRotation !== null) payload.pants_texture_rotation = pantsTextureRotation;
  if (stripeSpacing !== null) payload.stripe_spacing = stripeSpacing;
  if (stripeSpacingJacket !== null) payload.stripe_spacing_jacket = stripeSpacingJacket;
  if (stripeSpacingPants !== null) payload.stripe_spacing_pants = stripeSpacingPants;
  if (photoVariant) payload.photo_variant = photoVariant;
  if (renderMode) payload.render_mode = renderMode;
  if (renderBasePath) payload.render_base_path = renderBasePath;
  if (colorHex) payload.color_hex = colorHex;
  if (detailImageUrl) payload.detail_image = detailImageUrl;
  if (detailText) payload.detail_text = detailText;

  const { data, error } = await supabase.from("fabrics").upsert(payload, { onConflict: "id" }).select("*").single();

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
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing fabric id" }, { status: 400 });
  }
  const { error } = await supabase.from("fabrics").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
