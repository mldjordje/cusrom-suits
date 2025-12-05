import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 200 });
  }

  const { data, error } = await supabase.from("linings").select("*").order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 200 });
  }

  const normalized = Array.isArray(data)
    ? data.map((row: any) => ({
        id: String(row.id || row.uuid || row.name),
        name: row.name || "Lining",
        base: row.base_url || row.base,
        left: row.left_url || row.left,
        right: row.right_url || row.right,
        texture: row.texture_url || row.texture || null,
        price: row.price ?? null,
      }))
    : [];

  return NextResponse.json({ success: true, data: normalized });
}
