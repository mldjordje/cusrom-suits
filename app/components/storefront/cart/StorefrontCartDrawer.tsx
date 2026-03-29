"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontQuantityControl from "@/app/components/storefront/cart/StorefrontQuantityControl";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function StorefrontCartDrawer({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const pathname = usePathname();
  const {
    items,
    itemCount,
    subtotal,
    isReady,
    isDrawerOpen,
    updateQuantity,
    removeItem,
    closeCartDrawer,
  } = useCart();
  const [effectiveLang, setEffectiveLang] = useState<StorefrontLanguage>(lang);
  const isEn = effectiveLang === "en";

  useEffect(() => {
    const currentLang = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : lang;
    setEffectiveLang(currentLang);
  }, [lang, pathname]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  useEffect(() => {
    closeCartDrawer();
  }, [pathname, closeCartDrawer]);

  return (
    <>
      <aside className={`aside aside_right overflow-hidden cart-drawer ss-cart-drawer ${isDrawerOpen ? "aside_visible" : ""}`} id="cartDrawer">
        <div className="aside-header d-flex align-items-center">
          <h3 className="text-uppercase fs-6 mb-0">
            {isEn ? "Shopping bag" : "Korpa"} (
            <span className="cart-amount js-cart-items-count">{itemCount}</span>)
          </h3>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="btn-close-lg js-close-aside btn-close-aside ms-auto"
            aria-label={isEn ? "Close cart" : "Zatvori korpu"}
          />
        </div>

        <div className="aside-content cart-drawer-items-list">
          {!isReady ? (
            <div className="fs-18 mt-5 px-4">{isEn ? "Loading cart..." : "Ucitavam korpu..."}</div>
          ) : items.length ? (
            items.map((item) => (
              <div key={item.legacyId} className="ss-cart-drawer__item-wrap">
                <div className="cart-drawer-item d-flex position-relative ss-cart-drawer__item">
                  <Link href={withLang(`/web-shop/${item.legacyId}`)} className="position-relative">
                    <StorefrontSmartImage
                      sources={[item.image || "/img/odela.jpg"]}
                      className="cart-drawer-item__img"
                      width={330}
                      height={400}
                      alt={item.name}
                      sizes="110px"
                      unoptimized
                    />
                  </Link>

                  <div className="cart-drawer-item__info flex-grow-1">
                    <div className="ss-cart-drawer__headline">
                      <h6 className="cart-drawer-item__title fw-normal mb-1">
                        <Link href={withLang(`/web-shop/${item.legacyId}`)}>{item.name}</Link>
                      </h6>
                      <button
                        type="button"
                        onClick={() => removeItem(item.legacyId)}
                        className="ss-cart-drawer__remove"
                        aria-label={isEn ? "Remove item" : "Ukloni artikal"}
                      >
                        <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <span>{isEn ? "Remove" : "Ukloni"}</span>
                      </button>
                    </div>
                    {item.categoryLabel ? (
                      <p className="cart-drawer-item__option text-secondary mb-1">{item.categoryLabel}</p>
                    ) : null}
                    {item.size ? (
                      <p className="cart-drawer-item__option text-secondary mb-1">
                        {isEn ? "Size" : "Velicina"}: {item.size}
                      </p>
                    ) : null}
                    <div className="ss-cart-drawer__meta-row">
                      <StorefrontQuantityControl
                        value={item.quantity}
                        max={item.maxQuantity}
                        onChange={(nextValue) => updateQuantity(item.legacyId, nextValue)}
                        decreaseLabel={isEn ? "Decrease quantity" : "Smanji kolicinu"}
                        increaseLabel={isEn ? "Increase quantity" : "Povecaj kolicinu"}
                        className="ss-cart-drawer__quantity"
                      />

                      <div className="ss-cart-drawer__totals">
                        <span className="ss-cart-drawer__line-price">{formatRsd(item.price * item.quantity)}</span>
                        {item.maxQuantity && item.maxQuantity > 0 ? (
                          <span className="ss-cart-drawer__stock">
                            {isEn ? "Available" : "Dostupno"} {item.maxQuantity}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="cart-drawer-divider" />
              </div>
            ))
          ) : (
            <div className="fs-18 mt-5 px-4">
              {isEn ? "Your cart is empty. Start shopping!" : "Korpa je prazna. Dodaj proizvode iz shop-a."}
            </div>
          )}
        </div>

        <div className="cart-drawer-actions position-absolute start-0 bottom-0 w-100">
          <hr className="cart-drawer-divider" />
          <div className="d-flex justify-content-between align-items-center gap-3">
            <div>
              <h6 className="fs-base fw-medium mb-1">{isEn ? "Current total" : "Ukupno za sada"}</h6>
              <p className="ss-cart-drawer__summary-copy mb-0">
                {isEn ? `${itemCount} item(s) ready for checkout` : `${itemCount} artikala spremno za checkout`}
              </p>
            </div>
            <span className="cart-subtotal fw-medium">{formatRsd(subtotal)}</span>
          </div>
          {items.length ? (
            <>
              <Link href={withLang("/cart")} className="btn btn-light mt-3 d-block">
                {isEn ? "View cart" : "Pregledaj korpu"}
              </Link>
              <Link href={withLang("/checkout")} className="btn btn-primary mt-3 d-block">
                {isEn ? "Checkout" : "Nastavi na checkout"}
              </Link>
            </>
          ) : (
            <Link href={withLang("/web-shop")} className="btn btn-light mt-3 d-block">
              {isEn ? "Explore shop" : "Otvori web shop"}
            </Link>
          )}
        </div>
      </aside>

      <button
        type="button"
        aria-label={isEn ? "Close cart overlay" : "Zatvori overlay korpe"}
        className={`page-overlay ss-cart-drawer-overlay ${isDrawerOpen ? "page-overlay_visible" : ""}`}
        onClick={closeCartDrawer}
      />
    </>
  );
}
