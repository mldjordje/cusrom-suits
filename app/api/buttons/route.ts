import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";
import { applyPublicCache } from "@/lib/http/cache";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 200 });
  }

  const { data, error } = await supabase.from("buttons").select("*").order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 200 });
  }

  const normalized = Array.isArray(data)
    ? data.map((row: any) => ({
        id: String(row.id || row.uuid || row.name),
        name: row.name || "Button",
        image_url: row.image_url || row.imageUrl || row.url,
        color_hex: row.color_hex || row.colorHex || null,
        diameter: row.diameter || null,
      }))
    : [];

  return applyPublicCache(NextResponse.json({ success: true, data: normalized }), {
    maxAge: 300,
    sMaxAge: 1800,
    staleWhileRevalidate: 86400,
  });
}
