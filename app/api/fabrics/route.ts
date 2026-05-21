import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";
import { readJsonFile } from "@/lib/storage/jsonStore";
import { applyPublicCache } from "@/lib/http/cache";

const FALLBACK_PATH = "data/fabrics.json";
export const revalidate = 300;

const applyFilters = (list: any[], tone: string | null, sort: string, asc: boolean) => {
  let result = Array.isArray(list) ? [...list] : [];
  if (tone) {
    result = result.filter((fabric) => String(fabric?.tone || "") === tone);
  }
  if (sort) {
    const direction = asc ? 1 : -1;
    result.sort((a, b) => {
      const av = a?.[sort];
      const bv = b?.[sort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * direction;
      }
      if (av > bv) return direction;
      if (av < bv) return -direction;
      return 0;
    });
  }
  return result;
};

const normalizeFabric = (fabric: any) => ({
  ...fabric,
  id: fabric.id ? String(fabric.id) : fabric.uuid || fabric.code || fabric.name,
  price: fabric.price ?? 0,
  tone: fabric.tone || "medium",
  pattern: fabric.pattern ?? null,
  // Resolve texture image URL across common column name variants
  texture:
    fabric.texture ??
    fabric.texture_url ??
    fabric.image_url ??
    fabric.image ??
    fabric.textureUrl ??
    null,
  photoVariant: fabric.photoVariant ?? fabric.photo_variant ?? null,
  renderMode: fabric.renderMode ?? fabric.render_mode ?? null,
  renderBasePath:
    fabric.renderBasePath ??
    fabric.render_base_path ??
    fabric.render_path ??
    fabric.renderPath ??
    null,
  colorHex:
    fabric.colorHex ??
    fabric.color_hex ??
    fabric.hexColor ??
    fabric.hex_color ??
    fabric.hex ??
    null,
  textureScale: fabric.textureScale ?? fabric.texture_scale ?? null,
  textureStrength: fabric.textureStrength ?? fabric.texture_strength ?? null,
  textureContrast: fabric.textureContrast ?? fabric.texture_contrast ?? null,
  textureBrightness: fabric.textureBrightness ?? fabric.texture_brightness ?? null,
  pantsTextureRotation: fabric.pantsTextureRotation ?? fabric.pants_texture_rotation ?? null,
  pantsStripeAngleDelta: fabric.pantsStripeAngleDelta ?? fabric.pants_stripe_angle_delta ?? null,
  stripeSpacing: fabric.stripeSpacing ?? fabric.stripe_spacing ?? null,
  stripeSpacingJacket: fabric.stripeSpacingJacket ?? fabric.stripe_spacing_jacket ?? null,
  stripeSpacingPants: fabric.stripeSpacingPants ?? fabric.stripe_spacing_pants ?? null,
  detailImage:
    fabric.detailImage ??
    fabric.detail_image ??
    fabric.detailImageUrl ??
    fabric.detail_image_url ??
    fabric.zoom1 ??
    fabric.zoom2 ??
    null,
  detailText: fabric.detailText ?? fabric.detail_text ?? null,
});

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  const params = req.nextUrl.searchParams;
  const tone = params.get("tone");
  const sort = params.get("sort") || "created_at";
  const asc = params.get("order") === "asc";

  if (!supabase) {
    const fileData = await readJsonFile<any[]>(FALLBACK_PATH, []);
    const filtered = applyFilters(fileData, tone, sort, asc);
    const normalized = filtered.map((fabric: any) => normalizeFabric(fabric));
    return applyPublicCache(
      NextResponse.json({ success: true, data: normalized, source: "file" }, { status: 200 }),
      {
        maxAge: 300,
        sMaxAge: 1800,
        staleWhileRevalidate: 86400,
      },
    );
  }

  const query = supabase.from("fabrics").select("*");
  if (tone) query.eq("tone", tone);
  if (sort) query.order(sort, { ascending: asc });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 200 });
  }

  const normalized = Array.isArray(data) ? data.map((fabric: any) => normalizeFabric(fabric)) : [];

  return applyPublicCache(NextResponse.json({ success: true, data: normalized }), {
    maxAge: 300,
    sMaxAge: 1800,
    staleWhileRevalidate: 86400,
  });
}
