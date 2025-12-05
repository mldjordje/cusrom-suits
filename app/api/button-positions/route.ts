import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";
import { fallbackButtonLayouts } from "@/app/custom-suits/data/buttonPositions";

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ success: true, data: fallbackButtonLayouts });
  }

  const { data, error } = await supabase.from("button_positions").select("*");
  if (error) {
    return NextResponse.json({ success: false, message: error.message, data: fallbackButtonLayouts });
  }

  const normalized =
    Array.isArray(data) && data.length
      ? data.map((row: any) => ({
          styleId: String(row.style_id || row.styleId || ""),
          layout: String(row.layout || "2"),
          area: (row.area as any) || "front",
          positions: Array.isArray(row.positions) ? row.positions : [],
        }))
      : fallbackButtonLayouts;

  return NextResponse.json({ success: true, data: normalized });
}
