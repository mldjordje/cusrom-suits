"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import type { StorefrontOrderRow } from "@/app/api/storefront/orders/route";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { formatPublicOrderNumber } from "@/lib/orders/publicOrderNumber";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-RS", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

const statusLabel = (status: string | null | undefined, isEn: boolean) => {
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

export default function OrdersList({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useStorefrontAuth();
  const [orders, setOrders] = useState<StorefrontOrderRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const withLang = useCallback(
    (href: string) => {
      if (!isEn) return href;
      if (href.includes("?")) return `${href}&lang=en`;
      return `${href}?lang=en`;
    },
    [isEn],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(withLang(`/nalog/prijava?next=${encodeURIComponent("/nalog/porudzbine")}`));
      return;
    }

    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const res = await fetch("/api/storefront/orders", { credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          router.replace(withLang(`/nalog/prijava?next=${encodeURIComponent("/nalog/porudzbine")}`));
          return;
        }
        if (!json?.success) {
          setLoadError(json?.message || (isEn ? "Could not load orders." : "Porudzbine se ne mogu ucitati."));
          setOrders([]);
          return;
        }
        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) {
          setLoadError(isEn ? "Could not load orders." : "Porudzbine se ne mogu ucitati.");
          setOrders([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, isEn, withLang]);

  const handleSignOut = async () => {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.replace(withLang("/nalog/prijava"));
    } finally {
      setSigningOut(false);
    }
  };

  if (authLoading || (!user && !loadError)) {
    return <p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>;
  }

  if (!user) {
    return null;
  }

  if (orders === null) {
    return <p className="text-secondary">{isEn ? "Loading orders..." : "Ucitavam porudzbine..."}</p>;
  }

  return (
    <div className="ss-commerce-stack">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <p className="ss-commerce-intro__eyebrow mb-1">{isEn ? "Signed in as" : "Ulogovan kao"}</p>
          <p className="mb-0 fw-semibold">{user.email}</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-dark text-uppercase fw-medium"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? "..." : isEn ? "Sign out" : "Odjavi se"}
        </button>
      </div>

      {loadError ? <div className="alert alert-warning py-2 small mb-4">{loadError}</div> : null}

      {orders.length === 0 ? (
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">
            {isEn ? "No orders yet" : "Jos nema porudzbina"}
          </p>
          <h2 className="h4">{isEn ? "Your web shop orders will appear here." : "Tvoje web shop porudzbine ce se pojaviti ovde."}</h2>
          <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium mt-2">
            {isEn ? "Browse shop" : "Otvori web shop"}
          </Link>
        </div>
      ) : (
        <div className="ss-order-panel">
          <div className="ss-order-panel__header">
            <div>
              <p className="ss-order-panel__eyebrow">{isEn ? "History" : "Istorija"}</p>
              <h2>{isEn ? "Your orders" : "Tvoje porudzbine"}</h2>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">{isEn ? "Order" : "Porudzbina"}</th>
                  <th scope="col">{isEn ? "Date" : "Datum"}</th>
                  <th scope="col">{isEn ? "Status" : "Status"}</th>
                  <th scope="col" className="text-end">
                    {isEn ? "Total" : "Ukupno"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr key={String(row.id)}>
                    <td className="font-monospace small">#{formatPublicOrderNumber(row)}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{statusLabel(row.status, isEn)}</td>
                    <td className="text-end fw-semibold">{formatRsd(Number(row.price || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
