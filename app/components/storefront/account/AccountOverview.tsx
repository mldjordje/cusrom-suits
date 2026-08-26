"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import AccountNav from "@/app/components/storefront/account/AccountNav";
import {
  formatDate,
  formatRsd,
  makeWithLang,
  statusLabel,
  statusTone,
  useAccountOrders,
} from "@/app/components/storefront/account/accountShared";
import {
  getProfileCompleteness,
  profileFieldLabel,
  readStorefrontProfile,
} from "@/lib/storefront/accountProfile";
import { formatPublicOrderNumber } from "@/lib/orders/publicOrderNumber";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function AccountOverview({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const withLang = useMemo(() => makeWithLang(isEn), [isEn]);
  const { user, loading: authLoading } = useStorefrontAuth();
  const { orders, error, loading } = useAccountOrders(isEn, "/nalog");

  const profile = readStorefrontProfile(user?.user_metadata);
  const completeness = getProfileCompleteness(profile);

  const stats = useMemo(() => {
    const rows = orders ?? [];
    /* Cancelled orders still belong in the list, but counting them as money
       spent would tell the customer a number they never paid. */
    const paid = rows.filter((row) => String(row.status || "").toLowerCase() !== "cancelled");
    return {
      count: rows.length,
      spent: paid.reduce((sum, row) => sum + Number(row.price || 0), 0),
      last: rows[0] || null,
    };
  }, [orders]);

  if (authLoading || !user) {
    return <p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>;
  }

  return (
    <div className="ss-commerce-stack">
      <AccountNav isEn={isEn} withLang={withLang} />

      {error ? <div className="alert alert-warning py-2 small mb-0">{error}</div> : null}

      {!completeness.isComplete ? (
        <div className="ss-account-callout">
          <div>
            <p className="ss-order-panel__eyebrow mb-1">
              {isEn ? "Finish your profile" : "Dopuni profil"}
            </p>
            <p className="mb-2">
              {isEn
                ? "Add these once and checkout fills itself in from now on:"
                : "Dodaj ovo jednom i naplata se od sada popunjava sama:"}{" "}
              <strong>
                {completeness.missing.map((field) => profileFieldLabel(field, isEn)).join(", ")}
              </strong>
            </p>
            <div className="ss-account-progress-track" aria-hidden="true">
              <span style={{ width: `${completeness.percent}%` }} />
            </div>
          </div>
          <Link href={withLang("/nalog/profil")} className="btn btn-dark text-uppercase fw-medium">
            {isEn ? "Complete profile" : "Dopuni profil"}
          </Link>
        </div>
      ) : null}

      <div className="ss-account-stats">
        <div className="ss-account-stat">
          <p className="ss-account-stat__label">{isEn ? "Orders" : "Porudzbine"}</p>
          <p className="ss-account-stat__value">{loading ? "—" : stats.count}</p>
        </div>
        <div className="ss-account-stat">
          <p className="ss-account-stat__label">{isEn ? "Total spent" : "Ukupno potroseno"}</p>
          <p className="ss-account-stat__value">{loading ? "—" : formatRsd(stats.spent)}</p>
        </div>
        <div className="ss-account-stat">
          <p className="ss-account-stat__label">{isEn ? "Last order" : "Poslednja porudzbina"}</p>
          <p className="ss-account-stat__value ss-account-stat__value--small">
            {loading ? "—" : stats.last ? formatDate(stats.last.created_at, false) : isEn ? "None yet" : "Jos nema"}
          </p>
        </div>
      </div>

      <div className="ss-order-panel">
        <div className="ss-order-panel__header">
          <div>
            <p className="ss-order-panel__eyebrow">{isEn ? "Latest" : "Poslednje"}</p>
            <h2>{isEn ? "Your last order" : "Tvoja poslednja porudzbina"}</h2>
          </div>
          <Link href={withLang("/nalog/porudzbine")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
            {isEn ? "All orders" : "Sve porudzbine"}
          </Link>
        </div>

        {loading ? (
          <p className="text-secondary mb-0">{isEn ? "Loading orders..." : "Ucitavam porudzbine..."}</p>
        ) : stats.last ? (
          <div className="ss-account-last-order">
            <div>
              <p className="font-monospace small mb-1">#{formatPublicOrderNumber(stats.last)}</p>
              <p className="text-secondary small mb-0">{formatDate(stats.last.created_at)}</p>
            </div>
            <span className={`ss-account-status ss-account-status--${statusTone(stats.last.status)}`}>
              {statusLabel(stats.last.status, isEn)}
            </span>
            <p className="fw-semibold mb-0">{formatRsd(Number(stats.last.price || 0))}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-secondary">
              {isEn ? "No orders on this account yet." : "Jos nema porudzbina na ovom nalogu."}
            </p>
            <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
              {isEn ? "Browse shop" : "Otvori web shop"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
