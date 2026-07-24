"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import StorefrontOrderSteps from "@/app/components/storefront/StorefrontOrderSteps";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontQuantityControl from "@/app/components/storefront/cart/StorefrontQuantityControl";
import { trackViewCart } from "@/lib/analytics/ecommerce";
import { getRemainingForFreeDelivery } from "@/lib/storefront/deliveryPricing";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CartPageClient({
  lang = "sr",
  freeDeliveryThreshold = 0,
}: {
  lang?: StorefrontLanguage;
  freeDeliveryThreshold?: number;
}) {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart, isReady } = useCart();
  const isEn = lang === "en";
  const remainingForFreeDelivery = getRemainingForFreeDelivery(subtotal, freeDeliveryThreshold);

  // Once per visit to the cart, after localStorage hydration.
  const viewCartSent = useRef(false);
  useEffect(() => {
    if (!isReady || viewCartSent.current || !items.length) return;
    viewCartSent.current = true;
    trackViewCart(
      items.map((item) => ({
        legacyId: item.legacyId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.categoryLabel,
        size: item.size,
      })),
    );
  }, [isReady, items]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  if (!isReady) {
    return <div className="ss-commerce-loading" aria-busy="true" aria-label={isEn ? "Loading cart" : "Ucitavam korpu"} />;
  }

  if (items.length === 0) {
    return (
      <div className="ss-commerce-stack">
        <StorefrontOrderSteps lang={lang} current="cart" />
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{isEn ? "Cart is empty" : "Korpa je prazna"}</p>
          <h1>{isEn ? "Start with the products you want to order." : "Kreni od proizvoda koje zelis da porucis."}</h1>
          <p>
            {isEn
              ? "Add items from the web shop and review them here before placing the order."
              : "Dodaj artikle iz web shop-a i pregledaj ih ovde pre slanja porudzbine."}
          </p>
          <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
            {isEn ? "Back to shop" : "Nazad na shop"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-commerce-stack">
      <StorefrontOrderSteps lang={lang} current="cart" />

      <div className="ss-commerce-intro">
        <div>
          <p className="ss-commerce-intro__eyebrow">{isEn ? "Step 2" : "Korak 2"}</p>
          <h1 className="ss-commerce-intro__title">
            {isEn ? "Review your cart before sending the order." : "Pregledaj korpu pre slanja porudzbine."}
          </h1>
        </div>
        <p className="ss-commerce-intro__copy">
          {isEn
            ? "Check sizes and quantities, then continue to checkout — no upfront online payment required."
            : "Proveri velicine i kolicine, zatim nastavi na porudzbinu — bez obaveznog placanja unapred."}
        </p>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <div className="ss-order-panel">
            <div className="ss-order-panel__header">
              <div>
                <p className="ss-order-panel__eyebrow">{isEn ? "Cart" : "Korpa"}</p>
                <h2>{isEn ? `${itemCount} items ready for review` : `${itemCount} artikala spremno za pregled`}</h2>
              </div>
              <button type="button" onClick={clearCart} className="btn btn-outline-dark text-uppercase fw-medium">
                {isEn ? "Clear cart" : "Isprazni korpu"}
              </button>
            </div>

            <div className="ss-cart-items">
              {items.map((item) => (
                <article key={item.legacyId} className="ss-cart-item">
                  <div className="row g-3 align-items-center">
                    <div className="col-4 col-md-3">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)} className="ss-cart-item__image-link">
                        <Image
                          src={item.image || "/img/odela.jpg"}
                          alt={item.name}
                          width={180}
                          height={220}
                          className="w-100 h-auto rounded-4"
                        />
                      </Link>
                    </div>
                    <div className="col-8 col-md-5">
                      <p className="ss-cart-item__eyebrow">{item.categoryLabel || item.sku}</p>
                      <h3 className="ss-cart-item__title">
                        <Link href={withLang(`/web-shop/${item.legacyId}`)}>{item.name}</Link>
                      </h3>
                      <div className="ss-cart-item__meta">
                        {item.size ? <span>{isEn ? "Size" : "Velicina"}: {item.size}</span> : null}
                        {item.material ? <span>{isEn ? "Material" : "Materijal"}: {item.material}</span> : null}
                      </div>
                      <p className="ss-cart-item__price mb-0">{formatRsd(item.price)}</p>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="ss-cart-item__purchase">
                        <div className="ss-cart-item__quantity-block">
                          <label className="ss-cart-item__label">{isEn ? "Quantity" : "Kolicina"}</label>
                          <StorefrontQuantityControl
                            value={item.quantity}
                            max={item.maxQuantity}
                            onChange={(nextValue) => updateQuantity(item.legacyId, nextValue)}
                            decreaseLabel={isEn ? "Decrease quantity" : "Smanji kolicinu"}
                            increaseLabel={isEn ? "Increase quantity" : "Povecaj kolicinu"}
                          />
                          {item.maxQuantity && item.maxQuantity > 0 ? (
                            <p className="ss-cart-item__stock mb-0">{isEn ? "Available" : "Dostupno"}: {item.maxQuantity}</p>
                          ) : null}
                        </div>

                        <div className="ss-cart-item__actions">
                          <p className="ss-cart-item__total">{formatRsd(item.price * item.quantity)}</p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.legacyId)}
                            className="btn btn-link text-uppercase p-0 text-decoration-none ss-cart-item__remove"
                          >
                            {isEn ? "Remove" : "Ukloni"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="ss-order-summary ss-order-summary--sticky">
            <p className="ss-order-panel__eyebrow">{isEn ? "Summary" : "Pregled"}</p>
            <h2>{isEn ? "Everything before the final send." : "Sve pre finalnog slanja."}</h2>

            <div className="ss-order-summary__rows">
              <div className="ss-order-summary__row">
                <span>{isEn ? "Products" : "Proizvodi"}</span>
                <strong>{formatRsd(subtotal)}</strong>
              </div>
              <div className="ss-order-summary__row">
                <span>{isEn ? "Quantity" : "Kolicina"}</span>
                <strong>{itemCount}</strong>
              </div>
              <div className="ss-order-summary__row">
                <span>{isEn ? "Delivery" : "Dostava"}</span>
                <strong>
                  {freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold
                    ? isEn
                      ? "Free"
                      : "Besplatno"
                    : isEn
                      ? "Confirmed on order"
                      : "Potvrda pri porudzbini"}
                </strong>
              </div>
              {/* Real progress against the cart subtotal — the announcement bar
                  promises this, so the cart has to show where the customer stands. */}
              {remainingForFreeDelivery > 0 ? (
                <div className="ss-order-summary__row">
                  <span>
                    {isEn
                      ? `Add ${formatRsd(remainingForFreeDelivery)} more for free delivery`
                      : `Dodaj jos ${formatRsd(remainingForFreeDelivery)} za besplatnu dostavu`}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="ss-order-summary__total">
              <span>{isEn ? "Current total" : "Ukupno za sada"}</span>
              <strong>{formatRsd(subtotal)}</strong>
            </div>

            <div className="ss-order-summary__note">
              <p>
                {isEn
                  ? "Delivery cost (typically 350–500 RSD) is confirmed by our team when they call to verify your order."
                  : "Troskovi dostave (obicno 350–500 RSD) potvrduju se kada nas tim pozove radi provere porudzbine."}
              </p>
              <p className="mt-2 mb-0">
                {isEn
                  ? "Free delivery on orders over 15,000 RSD."
                  : "Besplatna dostava za porudzbine preko 15.000 RSD."}
              </p>
            </div>

            <div className="ss-order-summary__actions">
              <Link href={withLang("/checkout")} className="btn btn-primary w-100 text-uppercase fw-medium">
                {isEn ? "Continue to checkout" : "Nastavi na porudzbinu"}
              </Link>
              <Link href={withLang("/web-shop")} className="btn btn-outline-dark w-100 text-uppercase fw-medium">
                {isEn ? "Add more products" : "Dodaj jos proizvoda"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
