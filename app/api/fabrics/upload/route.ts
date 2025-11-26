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

  if (!name) {
    return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
  }
  if (!file && !textureOverride) {
    return NextResponse.json({ success: false, message: "Provide a texture URL or upload a file" }, { status: 400 });
  }

  let textureUrl = textureOverride || "";

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

  const price = priceRaw ? Number(priceRaw) : null;

  const { data, error } = await supabase
    .from("fabrics")
    .upsert(
      {
        id,
        name,
        texture: textureUrl,
        tone,
        price,
        code,
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
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing fabric id" }, { status: 400 });
  }
  const { error } = await supabase.from("fabrics").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
