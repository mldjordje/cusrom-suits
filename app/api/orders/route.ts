import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, getAnonSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 503 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || !payload.config) {
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
  }

  const { config, price, fabricId, contact, note, status } = payload;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      config,
      price: price ?? null,
      fabric_id: fabricId ?? null,
      contact: contact ?? null,
      note: note ?? null,
      status: status ?? "draft",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: data?.id });
}

export async function GET() {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
