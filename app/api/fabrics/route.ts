import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  const params = req.nextUrl.searchParams;
  const tone = params.get("tone");
  const sort = params.get("sort") || "created_at";
  const order = params.get("order") === "asc" ? { ascending: true } : { ascending: false };

  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 200 });
  }

  const query = supabase.from("fabrics").select("*");
  if (tone) query.eq("tone", tone);
  if (sort) query.order(sort, order);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 200 });
  }

  const normalized = Array.isArray(data)
    ? data.map((fabric: any) => ({
        ...fabric,
        id: fabric.id ? String(fabric.id) : fabric.uuid || fabric.code || fabric.name,
        price: fabric.price ?? 0,
        tone: fabric.tone || "medium",
      }))
    : [];

  return NextResponse.json({ success: true, data: normalized });
}
