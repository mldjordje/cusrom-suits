"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CartPageClient({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart, isReady } = useCart();
  const isEn = lang === "en";

  if (!isReady) {
    return <p className="text-center text-secondary">{isEn ? "Loading cart..." : "Učitavam korpu..."}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-4 border bg-white p-4 p-lg-5 text-center shadow-sm">
        <p className="text-uppercase fw-medium text-secondary mb-2">{isEn ? "Your cart is empty" : "Korpa je prazna"}</p>
        <h1 className="h3 mb-3">{isEn ? "Choose products from the web shop" : "Izaberi proizvode iz web shop-a"}</h1>
        <p className="text-secondary mb-4">{isEn ? "Once you add items, this page will show your summary and next step to checkout." : "Kada dodaš artikle, ovde ćeš videti pregled i sledeći korak ka checkout-u."}</p>
        <Link href="/web-shop" className="btn btn-primary text-uppercase fw-medium">
          {isEn ? "Back to shop" : "Nazad na shop"}
        </Link>
      </div>
    );
  }

  return (
    <div className="row g-4 align-items-start">
      <div className="col-lg-8">
        <div className="rounded-4 border bg-white p-3 p-md-4 shadow-sm">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <p className="text-uppercase fw-medium text-secondary mb-1">{isEn ? "Cart" : "Korpa"}</p>
              <h1 className="h4 mb-0">{isEn ? `${itemCount} items in cart` : `${itemCount} artikala u korpi`}</h1>
            </div>
            <button type="button" onClick={clearCart} className="btn btn-outline-dark text-uppercase fw-medium">
              {isEn ? "Clear cart" : "Isprazni korpu"}
            </button>
          </div>

          <div className="d-flex flex-column gap-3">
            {items.map((item) => (
              <article key={item.legacyId} className="rounded-4 border p-3">
                <div className="row g-3 align-items-center">
                  <div className="col-4 col-md-2">
                    <Link href={`/web-shop/${item.legacyId}`}>
                      <Image
                        src={item.image || "/img/odela.jpg"}
                        alt={item.name}
                        width={180}
                        height={220}
                        className="w-100 h-auto rounded-3"
                      />
                    </Link>
                  </div>
                  <div className="col-8 col-md-5">
                    <p className="text-uppercase text-secondary small mb-1">{item.categoryLabel || item.sku}</p>
                    <h2 className="h6 mb-2">
                      <Link href={`/web-shop/${item.legacyId}`}>{item.name}</Link>
                    </h2>
                    {item.size ? <p className="small text-secondary mb-1">{isEn ? "Size" : "Veličina"}: {item.size}</p> : null}
                    {item.material ? <p className="small text-secondary mb-2">{isEn ? "Material" : "Materijal"}: {item.material}</p> : null}
                    <p className="mb-0 fw-medium">{formatRsd(item.price)}</p>
                  </div>
                  <div className="col-7 col-md-3">
                    <label className="form-label text-uppercase small text-secondary">{isEn ? "Quantity" : "Količina"}</label>
                    <input
                      type="number"
                      min={1}
                      max={item.maxQuantity && item.maxQuantity > 0 ? item.maxQuantity : undefined}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.legacyId, Number(e.target.value))}
                      className="form-control"
                    />
                    {item.maxQuantity && item.maxQuantity > 0 ? (
                      <p className="small text-secondary mt-1 mb-0">{isEn ? "Available" : "Dostupno"}: {item.maxQuantity}</p>
                    ) : null}
                  </div>
                  <div className="col-5 col-md-2 text-md-end">
                    <p className="fw-semibold mb-2">{formatRsd(item.price * item.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.legacyId)}
                      className="btn btn-link text-uppercase p-0 text-decoration-none"
                    >
                      {isEn ? "Remove" : "Ukloni"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="rounded-4 border bg-white p-4 shadow-sm">
          <p className="text-uppercase fw-medium text-secondary mb-1">{isEn ? "Summary" : "Pregled"}</p>
          <h2 className="h5 mb-4">{isEn ? "Total to be confirmed later" : "Ukupno za naplatu kasnije"}</h2>
          <div className="d-flex justify-content-between mb-2">
            <span>{isEn ? "Products" : "Proizvodi"}</span>
            <span>{formatRsd(subtotal)}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span>{isEn ? "Delivery" : "Dostava"}</span>
            <span>{isEn ? "To be agreed" : "Po dogovoru"}</span>
          </div>
          <hr />
          <div className="d-flex justify-content-between fw-semibold fs-5 mb-4">
            <span>{isEn ? "Total" : "Ukupno"}</span>
            <span>{formatRsd(subtotal)}</span>
          </div>
          <p className="small text-secondary mb-4">
            {isEn ? "Submitting checkout sends the order to admin as an inquiry for final confirmation and processing." : "Slanjem checkout forme porudžbina ide u admin kao upit za finalnu potvrdu i obradu."}
          </p>
          <Link href="/checkout" className="btn btn-primary w-100 text-uppercase fw-medium">
            {isEn ? "Continue to checkout" : "Nastavi na checkout"}
          </Link>
        </div>
      </div>
    </div>
  );
}
