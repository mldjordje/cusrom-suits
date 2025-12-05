import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/server";

const bucketName = process.env.SUPABASE_BUTTONS_BUCKET || "buttons";

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

  let imageUrl = imageOverride;
  if (!imageUrl && file) {
    await ensureBucket(supabase);
    const path = `buttons/${id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
    if (uploadError) {
      return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
    }
    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
    imageUrl = publicData?.publicUrl || "";
  }

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
