import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";
import { readJsonFile } from "@/lib/storage/jsonStore";

const FALLBACK_PATH = "data/fabrics.json";

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

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  const params = req.nextUrl.searchParams;
  const tone = params.get("tone");
  const sort = params.get("sort") || "created_at";
  const asc = params.get("order") === "asc";

  if (!supabase) {
    const fileData = await readJsonFile<any[]>(FALLBACK_PATH, []);
    const filtered = applyFilters(fileData, tone, sort, asc);
    const normalized = filtered.map((fabric: any) => ({
      ...fabric,
      id: fabric.id ? String(fabric.id) : fabric.uuid || fabric.code || fabric.name,
      price: fabric.price ?? 0,
      tone: fabric.tone || "medium",
    }));
    return NextResponse.json({ success: true, data: normalized, source: "file" }, { status: 200 });
  }

  const query = supabase.from("fabrics").select("*");
  if (tone) query.eq("tone", tone);
  if (sort) query.order(sort, { ascending: asc });

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
