"use client";

import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  fabric_id?: string | null;
  price?: number | null;
  status?: string | null;
  created_at?: string | null;
  contact?: any;
  note?: string | null;
  config?: any;
  source?: string | null;
  type?: string | null;
};

const STATUS_OPTIONS = ["draft", "pending", "confirmed", "completed", "cancelled"];

const statusBadge = (status?: string | null) => {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const normalize = (value: any) => String(value || "").toLowerCase();

const getContactValue = (contact: any, key: string) => {
  if (!contact) return "";
  return contact[key] || contact?.contact?.[key] || "";
};

const getOrderSource = (order: Order) =>
  String(order.source || order.type || order?.config?.source || order?.config?.type || "custom").toLowerCase();

const getOrderItems = (order: Order) => {
  const items = order?.config?.items;
  return Array.isArray(items) ? items : [];
};

const formatPrice = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(value);
};

const buildCsv = (rows: Order[]) => {
  const headers = ["id", "source", "status", "price", "items", "fabric_id", "created_at", "name", "email", "phone"];
  const escape = (value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((row) => {
    const name = getContactValue(row.contact, "ime");
    const email = getContactValue(row.contact, "email");
    const phone = getContactValue(row.contact, "telefon");
    return [
      row.id,
      getOrderSource(row),
      row.status || "draft",
      typeof row.price === "number" ? row.price : "",
      getOrderItems(row).length,
      row.fabric_id || "",
      row.created_at || "",
      name,
      email,
      phone,
    ].map(escape);
  });
  return [headers.map(escape), ...lines].map((line) => line.join(",")).join("\n");
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Greska");
      } else {
        setOrders(json.data || []);
      }
    } catch (e: any) {
      setError(e?.message || "Greska");
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
        setError(json?.message || "Greska pri azuriranju");
      } else {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      }
    } catch (e: any) {
      setError(e?.message || "Greska");
    } finally {
      setSavingId(null);
    }
  };

  const visibleOrders = useMemo(() => {
    const q = normalize(query.trim());
    return orders.filter((order) => {
      const status = order.status || "draft";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      const contact = order.contact || {};
      const items = getOrderItems(order);
      const haystack = [
        order.id,
        order.fabric_id,
        status,
        getOrderSource(order),
        ...items.map((item: any) => `${item?.name || ""} ${item?.sku || ""}`),
        getContactValue(contact, "ime"),
        getContactValue(contact, "email"),
        getContactValue(contact, "telefon"),
      ]
        .map(normalize)
        .join(" ");
      return haystack.includes(q);
    });
  }, [orders, query, statusFilter]);

  const exportCsv = () => {
    const csv = buildCsv(visibleOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Porudzbine</h1>
          <p className="text-sm text-gray-600">Lista poslednjih 200 unosa iz Supabase ili lokalnog fajla.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraga po ID, email ili telefonu"
              className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none sm:max-w-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            >
              <option value="all">Svi statusi</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Prikazano {visibleOrders.length} od {orders.length}
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Ucitavam...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleOrders.map((o) => {
          const contactName = getContactValue(o.contact, "ime");
          const contactEmail = getContactValue(o.contact, "email");
          const contactPhone = getContactValue(o.contact, "telefon");
          const contactLine = [contactName, contactEmail, contactPhone].filter(Boolean).join(" | ");
          const source = getOrderSource(o);
          const items = getOrderItems(o);
          return (
            <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{o.id}</p>
                  <p className="text-xs text-gray-500">
                    Izvor: {source === "storefront" || source === "webshop" ? "web shop" : "custom"} | Fabric: {o.fabric_id || "n/a"}
                  </p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusBadge(o.status)}`}>
                  {o.status || "draft"}
                </span>
              </div>
              {typeof o.price === "number" && (
                <p className="mt-2 text-sm font-semibold text-gray-900">{formatPrice(o.price)}</p>
              )}
              {contactLine && <p className="mt-2 text-xs text-gray-500">{contactLine}</p>}
              {items.length > 0 ? (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Artikli ({items.length})
                  </p>
                  <div className="space-y-1 text-xs text-gray-600">
                    {items.slice(0, 5).map((item: any) => (
                      <p key={`${o.id}-${item?.legacyId || item?.sku}`}>
                        {item?.quantity || 1}x {item?.name || "Proizvod"} {item?.sku ? `(${item.sku})` : ""}
                      </p>
                    ))}
                    {items.length > 5 ? <p>+ jos {items.length - 5} artikala</p> : null}
                  </div>
                </div>
              ) : null}
              {o.note ? <p className="mt-2 text-xs text-gray-500">Napomena: {o.note}</p> : null}

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
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

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <button
                  onClick={() => updateStatus(o.id, "confirmed")}
                  disabled={savingId === o.id}
                  className="rounded-full border border-emerald-200 px-3 py-1 font-semibold text-emerald-700 transition hover:border-emerald-300"
                >
                  Potvrdi
                </button>
                <button
                  onClick={() => updateStatus(o.id, "cancelled")}
                  disabled={savingId === o.id}
                  className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-700 transition hover:border-rose-300"
                >
                  Otkazi
                </button>
              </div>

              {o.contact && (
                <pre className="mt-3 rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600">
                  {JSON.stringify(o.contact, null, 2)}
                </pre>
              )}
              <p className="mt-2 text-[11px] text-gray-400">
                {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
              </p>
            </div>
          );
        })}
        {!visibleOrders.length && !loading && (
          <p className="text-sm text-gray-500">Nema porudzbina za odabrane filtere.</p>
        )}
      </div>
    </div>
  );
}




