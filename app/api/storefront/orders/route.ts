import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getStorefrontUserFromCookies } from "@/lib/supabase/storefront-server";
import { readPersistentJsonFile } from "@/lib/storage/persistentJson";

const ORDERS_PATH = "data/orders.json";

export type StorefrontOrderRow = {
  id: string | number;
  status?: string | null;
  price?: number | null;
  created_at?: string | null;
  contact?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
};

export async function GET() {
  const { user } = await getStorefrontUserFromCookies();
  if (!user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    const orders = await readPersistentJsonFile<
      {
        id?: string;
        source?: string;
        type?: string;
        created_at?: string;
        config?: Record<string, unknown> | null;
        status?: string | null;
        price?: number | null;
        contact?: Record<string, unknown> | null;
      }[]
    >(ORDERS_PATH, []);
    const filtered = orders.filter((o) => {
      const cfg = o.config;
      return (
        o.source === "storefront" &&
        o.type === "webshop" &&
        cfg &&
        typeof cfg === "object" &&
        String(cfg.storefrontUserId || "") === user.id
      );
    });
    filtered.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
    return NextResponse.json({
      success: true,
      data: filtered.slice(0, 50) as StorefrontOrderRow[],
      storage: "file",
    });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, price, created_at, contact, config")
    .contains("config", {
      storefrontUserId: user.id,
      source: "storefront",
      type: "webshop",
    })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: (data ?? []) as StorefrontOrderRow[] });
}
