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

const STATUS_OPTIONS = ["draft", "pending", "confirmed", "completed", "cancelled"];

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Greška pri ažuriranju");
      } else {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      }
    } catch (e: any) {
      setError(e?.message || "Greška");
    } finally {
      setSavingId(null);
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
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>Status:</span>
              <select
                value={o.status || "draft"}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                disabled={savingId === o.id}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
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
