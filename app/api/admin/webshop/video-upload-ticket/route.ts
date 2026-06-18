import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  buildProductVideoStoragePath,
  validateProductVideoUpload,
} from "@/lib/catalog/productMediaUpload";
import { getServiceSupabase } from "@/lib/supabase/server";

const BUCKET_NAME = process.env.SUPABASE_PRODUCTS_BUCKET || "products";

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const file = {
    name: String(payload?.name || ""),
    type: String(payload?.type || ""),
    size: Number(payload?.size || 0),
  };
  const validationError = validateProductVideoUpload(file);
  if (validationError) {
    return NextResponse.json({ success: false, message: validationError }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase service key missing" }, { status: 503 });
  }

  const path = buildProductVideoStoragePath(file.name, randomUUID());
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(path, { upsert: true });
  if (error || !data?.token) {
    return NextResponse.json(
      { success: false, message: error?.message || "Nije moguće pripremiti video upload." },
      { status: 500 },
    );
  }

  const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return NextResponse.json({
    success: true,
    bucket: BUCKET_NAME,
    path,
    token: data.token,
    publicUrl: publicData.publicUrl,
  });
}
