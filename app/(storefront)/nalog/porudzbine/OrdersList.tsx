"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StorefrontOrderRow } from "@/app/api/storefront/orders/route";
import AccountNav from "@/app/components/storefront/account/AccountNav";
import {
  formatDate,
  formatRsd,
  makeWithLang,
  readOrderFulfillment,
  readOrderItems,
  statusLabel,
  statusTone,
  useAccountOrders,
} from "@/app/components/storefront/account/accountShared";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import { formatPublicOrderNumber } from "@/lib/orders/publicOrderNumber";
import type { StorefrontLanguage } from "@/lib/storefront/language";

function OrderCard({
  order,
  isEn,
  withLang,
}: {
  order: StorefrontOrderRow;
  isEn: boolean;
  withLang: (href: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [reordered, setReordered] = useState(false);
  const { addItem, openCartDrawer } = useCart();

  const items = useMemo(() => readOrderItems(order), [order]);
  const fulfillment = useMemo(() => readOrderFulfillment(order), [order]);
  const orderNumber = formatPublicOrderNumber(order);

  /* Prices are deliberately not carried over from the old order — the cart
     re-reads them from the catalog, and /api/orders re-prices everything again
     server-side, so a year-old order cannot resurrect a year-old price. */
  const handleReorder = () => {
    for (const line of items) {
      addItem(
        {
          legacyId: line.legacyId,
          sku: line.sku,
          name: line.name,
          size: line.size,
          material: line.material,
          price: line.price,
          image: line.image,
          maxQuantity: null,
          categoryLabel: line.categoryLabel,
        },
        line.quantity,
      );
    }
    setReordered(true);
    openCartDrawer();
  };

  return (
    <div className={`ss-account-order ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="ss-account-order__summary"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="ss-account-order__number">#{orderNumber}</span>
        <span className="ss-account-order__date">{formatDate(order.created_at)}</span>
        <span className={`ss-account-status ss-account-status--${statusTone(order.status)}`}>
          {statusLabel(order.status, isEn)}
        </span>
        <span className="ss-account-order__total">{formatRsd(Number(order.price || 0))}</span>
        <svg
          className="ss-account-order__chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M3.5 6L8 10.5L12.5 6"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="ss-account-order__body">
          {order.matchedBy === "email" ? (
            <p className="ss-account-order__note">
              {isEn
                ? "Placed as a guest with your email address, and matched to this account."
                : "Poslata kao gost sa tvoje email adrese i povezana sa ovim nalogom."}
            </p>
          ) : null}

          {items.length ? (
            <ul className="ss-account-order__items list-unstyled mb-0">
              {items.map((line) => (
                <li key={`${line.legacyId}-${line.size || ""}-${line.material || ""}`}>
                  <span className="ss-account-order__thumb">
                    {line.image ? (
                      <StorefrontImage
                        sources={[line.image]}
                        alt={line.name}
                        width={64}
                        height={85}
                      />
                    ) : null}
                  </span>
                  <span className="ss-account-order__item-main">
                    <Link href={withLang(`/web-shop/${line.legacyId}`)} className="ss-account-order__item-name">
                      {line.name}
                    </Link>
                    <span className="ss-account-order__item-meta">
                      {[
                        line.size ? `${isEn ? "Size" : "Velicina"}: ${line.size}` : "",
                        line.material || "",
                        `${line.quantity} ×`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="ss-account-order__item-price">
                    {formatRsd(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-secondary small mb-0">
              {isEn ? "No item details stored for this order." : "Za ovu porudzbinu nema sacuvanih stavki."}
            </p>
          )}

          <dl className="ss-account-order__meta">
            <div>
              <dt>{isEn ? "Delivery" : "Dostava"}</dt>
              <dd>
                {fulfillment.method === "pickup"
                  ? `${isEn ? "Pickup" : "Preuzimanje"}${fulfillment.pickupStoreLabel ? ` — ${fulfillment.pickupStoreLabel}` : ""}`
                  : fulfillment.deliveryServiceName || (isEn ? "Courier" : "Kurirska sluzba")}
              </dd>
            </div>
            {fulfillment.subtotal ? (
              <div>
                <dt>{isEn ? "Subtotal" : "Medjuzbir"}</dt>
                <dd>{formatRsd(fulfillment.subtotal)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{isEn ? "Delivery cost" : "Cena dostave"}</dt>
              <dd>{fulfillment.deliveryCost ? formatRsd(fulfillment.deliveryCost) : isEn ? "Free" : "Besplatno"}</dd>
            </div>
            {fulfillment.voucherDiscount ? (
              <div>
                <dt>
                  {isEn ? "Voucher" : "Vaucer"}
                  {fulfillment.voucherCode ? ` (${fulfillment.voucherCode})` : ""}
                </dt>
                <dd>−{formatRsd(fulfillment.voucherDiscount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{isEn ? "Total" : "Ukupno"}</dt>
              <dd className="fw-semibold">{formatRsd(Number(order.price || 0))}</dd>
            </div>
          </dl>

          {items.length ? (
            <div className="ss-account-order__actions">
              <button
                type="button"
                className="btn btn-outline-dark btn-sm text-uppercase fw-medium"
                onClick={handleReorder}
              >
                {reordered
                  ? isEn
                    ? "Added to cart"
                    : "Dodato u korpu"
                  : isEn
                    ? "Order again"
                    : "Poruci ponovo"}
              </button>
              <Link
                href={withLang("/kontakt")}
                className="btn btn-link btn-sm text-uppercase fw-medium"
              >
                {isEn ? "Ask about this order" : "Pitanje o porudzbini"}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function OrdersList({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const withLang = useMemo(() => makeWithLang(isEn), [isEn]);
  const { user, loading: authLoading } = useStorefrontAuth();
  const { orders, error, loading } = useAccountOrders(isEn, "/nalog/porudzbine");

  if (authLoading || !user) {
    return <p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>;
  }

  return (
    <div className="ss-commerce-stack">
      <AccountNav isEn={isEn} withLang={withLang} />

      {error ? <div className="alert alert-warning py-2 small mb-0">{error}</div> : null}

      {loading ? (
        <p className="text-secondary">{isEn ? "Loading orders..." : "Ucitavam porudzbine..."}</p>
      ) : !orders?.length ? (
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{isEn ? "No orders yet" : "Jos nema porudzbina"}</p>
          <h2 className="h4">
            {isEn
              ? "Your web shop orders will appear here."
              : "Tvoje web shop porudzbine ce se pojaviti ovde."}
          </h2>
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
            <span className="text-secondary small">
              {orders.length} {isEn ? (orders.length === 1 ? "order" : "orders") : "kom."}
            </span>
          </div>

          <div className="ss-account-orders">
            {orders.map((order) => (
              <OrderCard key={String(order.id)} order={order} isEn={isEn} withLang={withLang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
