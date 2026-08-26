"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import type { StorefrontOrderRow } from "@/app/api/storefront/orders/route";

export const makeWithLang = (isEn: boolean) => (href: string) => {
  if (!isEn) return href;
  if (href.includes("lang=")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=en`;
};

export const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (iso: string | null | undefined, withTime = true) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-RS", {
      dateStyle: "medium",
      ...(withTime ? { timeStyle: "short" as const } : {}),
    });
  } catch {
    return iso;
  }
};

export const statusLabel = (status: string | null | undefined, isEn: boolean) => {
  const s = String(status || "pending").toLowerCase();
  const map: Record<string, [string, string]> = {
    pending: ["Na cekanju", "Pending"],
    draft: ["Nacrt", "Draft"],
    confirmed: ["Potvrdjena", "Confirmed"],
    completed: ["Zavrsena", "Completed"],
    cancelled: ["Otkazana", "Cancelled"],
  };
  const pair = map[s] || [s, s];
  return isEn ? pair[1] : pair[0];
};

/** Which dot colour the status pill gets — green done, red cancelled, amber in flight. */
export const statusTone = (status: string | null | undefined): "pending" | "done" | "cancelled" => {
  const s = String(status || "pending").toLowerCase();
  if (s === "completed") return "done";
  if (s === "cancelled") return "cancelled";
  return "pending";
};

export type OrderItemLine = {
  legacyId: number;
  sku: string;
  name: string;
  size: string | null;
  material: string | null;
  price: number;
  quantity: number;
  image: string | null;
  categoryLabel: string | null;
};

/** Lines as they were stored on the order, narrowed back to something renderable. */
export const readOrderItems = (order: StorefrontOrderRow): OrderItemLine[] => {
  const raw = order.config?.items;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const line = entry as Record<string, unknown>;
    const legacyId = Number(line.legacyId);
    if (!Number.isFinite(legacyId) || legacyId <= 0) return [];
    return [
      {
        legacyId,
        sku: String(line.sku || ""),
        name: String(line.name || ""),
        size: line.size ? String(line.size) : null,
        material: line.material ? String(line.material) : null,
        price: Number(line.price || 0),
        quantity: Math.max(1, Number(line.quantity) || 1),
        image: line.image ? String(line.image) : null,
        categoryLabel: line.categoryLabel ? String(line.categoryLabel) : null,
      },
    ];
  });
};

export type OrderFulfillment = {
  method: "delivery" | "pickup";
  pickupStoreLabel: string | null;
  deliveryServiceName: string | null;
  deliveryCost: number;
  voucherCode: string | null;
  voucherDiscount: number;
  subtotal: number;
};

export const readOrderFulfillment = (order: StorefrontOrderRow): OrderFulfillment => {
  const f = (order.config?.fulfillment || {}) as Record<string, unknown>;
  const totals = (order.config?.totals || {}) as Record<string, unknown>;
  return {
    method: f.method === "pickup" ? "pickup" : "delivery",
    pickupStoreLabel: f.pickupStoreLabel ? String(f.pickupStoreLabel) : null,
    deliveryServiceName: f.deliveryServiceName ? String(f.deliveryServiceName) : null,
    deliveryCost: Number(f.deliveryCost || 0),
    voucherCode: f.voucherCode ? String(f.voucherCode) : null,
    voucherDiscount: Number(f.voucherDiscount || 0),
    subtotal: Number(totals.subtotal || 0),
  };
};

type OrdersState = {
  orders: StorefrontOrderRow[] | null;
  error: string | null;
  /** True until the auth session and the first fetch have both settled. */
  loading: boolean;
};

/**
 * Loads the signed-in customer's orders, sending anyone without a session to
 * the login page first. Every account screen needs both halves, and having them
 * in one place is what keeps the redirect from racing the fetch.
 */
export function useAccountOrders(isEn: boolean, returnTo: string): OrdersState {
  const router = useRouter();
  const { user, loading: authLoading } = useStorefrontAuth();
  const [orders, setOrders] = useState<StorefrontOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withLang = useCallback((href: string) => makeWithLang(isEn)(href), [isEn]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(withLang(`/nalog/prijava?next=${encodeURIComponent(returnTo)}`));
      return;
    }

    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/storefront/orders", { credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          router.replace(withLang(`/nalog/prijava?next=${encodeURIComponent(returnTo)}`));
          return;
        }
        if (!json?.success) {
          setError(json?.message || (isEn ? "Could not load orders." : "Porudzbine se ne mogu ucitati."));
          setOrders([]);
          return;
        }
        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (cancelled) return;
        setError(isEn ? "Could not load orders." : "Porudzbine se ne mogu ucitati.");
        setOrders([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, isEn, returnTo, withLang]);

  return { orders, error, loading: authLoading || (Boolean(user) && orders === null) };
}
