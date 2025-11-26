"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  fabric_id?: string | null;
  price?: number | null;
  status?: string | null;
  created_at?: string | null;
  contact?: any;
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Greška");
      } else {
        setOrders(json.data || []);
      }
    } catch (e: any) {
      setError(e?.message || "Greška");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Porudžbine</h1>
          <p className="text-sm text-gray-600">Lista poslednjih 200 unosa iz Supabase.</p>
        </div>
        <button
          onClick={load}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
        >
          Refresh
        </button>
      </div>
      {loading && <p className="text-sm text-gray-500">Učitavam...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">{o.id}</p>
            <p className="text-xs text-gray-500">Status: {o.status || "n/a"}</p>
            <p className="text-xs text-gray-500">
              Fabric: {o.fabric_id || "n/a"} {typeof o.price === "number" ? `• ${o.price} EUR` : ""}
            </p>
            {o.contact && (
              <pre className="mt-2 rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600">
                {JSON.stringify(o.contact, null, 2)}
              </pre>
            )}
            <p className="mt-1 text-[11px] text-gray-400">
              {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
            </p>
          </div>
        ))}
        {!orders.length && !loading && <p className="text-sm text-gray-500">Nema porudžbina.</p>}
      </div>
    </div>
  );
}
