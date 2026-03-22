import { NextRequest, NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase/server";
import { readJsonFile } from "@/lib/storage/jsonStore";
import { applyPublicCache } from "@/lib/http/cache";

const FALLBACK_PATH = "data/linings.json";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const supabase = getAnonSupabase();
  if (!supabase) {
    const fileData = await readJsonFile<any[]>(FALLBACK_PATH, []);
    const normalized = fileData.map((row: any) => ({
      id: String(row.id || row.uuid || row.name),
      name: row.name || "Lining",
      base: row.base_url || row.base,
      left: row.left_url || row.left,
      right: row.right_url || row.right,
      texture: row.texture_url || row.texture || null,
      price: row.price ?? null,
    }));
    return applyPublicCache(
      NextResponse.json({ success: true, data: normalized, source: "file" }, { status: 200 }),
      {
        maxAge: 300,
        sMaxAge: 1800,
        staleWhileRevalidate: 86400,
      },
    );
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

  return applyPublicCache(NextResponse.json({ success: true, data: normalized }), {
    maxAge: 300,
    sMaxAge: 1800,
    staleWhileRevalidate: 86400,
  });
}
