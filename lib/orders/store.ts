import { getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile } from "@/lib/storage/jsonStore";

const ORDERS_PATH = "data/orders.json";

export type StoredOrder = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  price?: number | null;
  note?: string | null;
  contact?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  source?: string | null;
  type?: string | null;
};

export async function listRecentOrders(limit = 200): Promise<StoredOrder[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, limit));

    if (!error && Array.isArray(data)) {
      return data as StoredOrder[];
    }
  }

  const orders = await readJsonFile<StoredOrder[]>(ORDERS_PATH, []);
  return [...orders]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, Math.max(1, limit));
}
