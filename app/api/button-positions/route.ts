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
      ? data.map((row: any) => {
          const styleId = String(row.style_id || row.styleId || "");
          const area = (row.area as any) || "front";
          const fallback =
            fallbackButtonLayouts.find((item) => item.styleId === styleId && (item.area || "front") === area) ||
            (area === "back_pocket"
              ? fallbackButtonLayouts.find((item) => item.styleId === styleId && item.area === "pants")
              : null);
          const fallbackPositions = fallback?.positions ?? [];
          const incomingPositions = Array.isArray(row.positions) ? row.positions : [];
          const useFallback =
            fallbackPositions.length > 0 && incomingPositions.length !== fallbackPositions.length;
          return {
            styleId,
            layout: String(row.layout || fallback?.layout || "2"),
            area,
            positions: useFallback
              ? fallbackPositions
              : incomingPositions.length
                ? incomingPositions
                : fallbackPositions,
          };
        })
      : fallbackButtonLayouts;

  return NextResponse.json({ success: true, data: normalized });
}
