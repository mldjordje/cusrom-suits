import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_LININGS_BUCKET || "linings";

const ensureBucket = async (supabase: ReturnType<typeof getServiceSupabase>) => {
  if (!supabase) return;
  try {
    const { data } = await supabase.storage.getBucket(bucketName);
    if (data) return;
    await supabase.storage.createBucket(bucketName, { public: true });
  } catch {
    // ignore; real errors surface on upload
  }
};

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }

  const form = await req.formData();
  const id = String(form.get("id") || "").trim() || randomUUID();
  const name = String(form.get("name") || "").trim();
  const baseOverride = String(form.get("base") || "").trim();
  const leftOverride = String(form.get("left") || "").trim();
  const rightOverride = String(form.get("right") || "").trim();
  const textureOverride = String(form.get("texture") || "").trim();
  const priceRaw = form.get("price");

  if (!name) return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });

  const files = {
    base: form.get("base_file") as File | null,
    left: form.get("left_file") as File | null,
    right: form.get("right_file") as File | null,
    texture: form.get("texture_file") as File | null,
  };

  await ensureBucket(supabase);

  const upload = async (key: "base" | "left" | "right" | "texture") => {
    const override =
      key === "base"
        ? baseOverride
        : key === "left"
          ? leftOverride
          : key === "right"
            ? rightOverride
            : textureOverride;
    if (override) return override;
    const file = files[key];
    if (!file) return "";
    const path = `linings/${id}-${key}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
    return publicData?.publicUrl || "";
  };

  let baseUrl = "";
  let leftUrl = "";
  let rightUrl = "";
  let textureUrl = "";

  try {
    baseUrl = await upload("base");
    leftUrl = await upload("left");
    rightUrl = await upload("right");
    textureUrl = await upload("texture");
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || "Upload failed" }, { status: 500 });
  }

  if (!baseUrl && !leftUrl && !rightUrl && !textureUrl) {
    return NextResponse.json({ success: false, message: "Provide at least one lining image or texture" }, { status: 400 });
  }

  const price = priceRaw ? Number(priceRaw) : null;

  const { data, error } = await supabase
    .from("linings")
    .upsert(
      {
        id,
        name,
        base_url: baseUrl,
        left_url: leftUrl,
        right_url: rightUrl,
        texture_url: textureUrl,
        price,
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
  if (!id) return NextResponse.json({ success: false, message: "Missing lining id" }, { status: 400 });
  const { error } = await supabase.from("linings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
