"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import StorefrontOrderSteps from "@/app/components/storefront/StorefrontOrderSteps";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import { trackBeginCheckout, trackPurchase, type AnalyticsProduct } from "@/lib/analytics/ecommerce";
import { applyFreeDeliveryThreshold, getRemainingForFreeDelivery } from "@/lib/storefront/deliveryPricing";
import type { StorefrontCartItem } from "@/lib/cart/types";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type PickupStoreOption = {
  slug: string;
  label: string;
  address: string;
};

type DeliveryServiceOption = {
  id: string;
  name: string;
  description: string;
  price: number;
};

type FulfillmentCopy = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupLabel: string;
  deliveryLabel: string;
  pickupNote: string;
  deliveryNote: string;
};

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toAnalyticsProduct = (item: StorefrontCartItem): AnalyticsProduct => ({
  legacyId: item.legacyId,
  sku: item.sku,
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  category: item.categoryLabel,
  size: item.size,
});

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  note: "",
  deliveryMethod: "delivery" as "pickup" | "delivery",
  pickupStoreSlug: "",
  deliveryServiceId: "",
  voucherCode: "",
};

export default function CheckoutPageClient({
  lang = "sr",
  pickupStores,
  deliveryServices,
  fulfillmentCopy,
  freeDeliveryThreshold = 0,
}: {
  lang?: StorefrontLanguage;
  pickupStores: PickupStoreOption[];
  deliveryServices: DeliveryServiceOption[];
  fulfillmentCopy: FulfillmentCopy;
  freeDeliveryThreshold?: number;
}) {
  const { items, subtotal, clearCart, isReady } = useCart();
  const { user: authUser, loading: authLoading } = useStorefrontAuth();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    deliveryMethod: fulfillmentCopy.deliveryEnabled ? "delivery" : "pickup",
    pickupStoreSlug: pickupStores[0]?.slug || "",
    deliveryServiceId: deliveryServices[0]?.id || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const isEn = lang === "en";

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) return false;
    if (form.deliveryMethod === "pickup") return Boolean(form.pickupStoreSlug);
    return Boolean(form.deliveryServiceId);
  }, [form.deliveryMethod, form.deliveryServiceId, form.email, form.fullName, form.phone, form.pickupStoreSlug, items.length]);
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const selectedDeliveryService = useMemo(
    () => deliveryServices.find((service) => service.id === form.deliveryServiceId) || deliveryServices[0] || null,
    [deliveryServices, form.deliveryServiceId],
  );
  const baseDeliveryCost =
    form.deliveryMethod === "delivery" ? Number(selectedDeliveryService?.price || 0) : 0;
  // Mirrors the server calculation in /api/orders so the summary matches the
  // total the customer is actually charged.
  const deliveryCost = applyFreeDeliveryThreshold(subtotal, baseDeliveryCost, freeDeliveryThreshold);
  const freeDeliveryApplied =
    form.deliveryMethod === "delivery" && baseDeliveryCost > 0 && deliveryCost === 0;
  const missingForFreeDelivery =
    form.deliveryMethod === "delivery" && baseDeliveryCost > 0
      ? getRemainingForFreeDelivery(subtotal, freeDeliveryThreshold)
      : 0;
  const checkoutTotal = Math.max(0, subtotal + deliveryCost - voucherDiscount);

  // begin_checkout fires once, after the cart has hydrated from localStorage.
  const beginCheckoutSent = useRef(false);
  useEffect(() => {
    if (!isReady || beginCheckoutSent.current || !items.length) return;
    beginCheckoutSent.current = true;
    trackBeginCheckout(items.map(toAnalyticsProduct));
  }, [isReady, items]);

  useEffect(() => {
    if (!authUser) return;
    const metaName =
      typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
    const mail = authUser.email?.trim() || "";
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName.trim() ? prev.fullName : metaName,
      email: prev.email.trim() ? prev.email : mail,
    }));
  }, [authUser]);

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const applyVoucher = async () => {
    const code = form.voucherCode.trim().toUpperCase();
    if (!code) return;
    setVoucherApplying(true);
    setVoucherError(null);
    try {
      const res = await fetch("/api/storefront/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: form.email, subtotal, deliveryCost }),
      });
      const json = await res.json();
      if (!json?.success) {
        setVoucherError(json?.message || (isEn ? "Invalid voucher." : "Neispravan vaucer."));
        setVoucherDiscount(0);
        return;
      }
      setVoucherDiscount(Number(json.discountAmount || 0));
      setAppliedVoucherCode(code);
    } catch {
      setVoucherError(isEn ? "Could not validate voucher." : "Greska pri proveri vaucera.");
    } finally {
      setVoucherApplying(false);
    }
  };

  const fieldError = (field: keyof typeof form, required = true): boolean => {
    if (!touched[field]) return false;
    if (required && !form[field].trim()) return true;
    if (field === "email" && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return true;
    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ fullName: true, email: true, phone: true });
    if (!canSubmit) {
      setError(isEn ? "Enter name, email and phone before submitting the order." : "Unesi ime, email i telefon pre slanja porudzbine.");
      return;
    }
    if (form.deliveryMethod === "pickup" && !form.pickupStoreSlug) {
      setError(isEn ? "Select a pickup store before sending the order." : "Izaberi radnju za preuzimanje pre slanja porudzbine.");
      return;
    }
    if (form.deliveryMethod === "delivery" && !selectedDeliveryService) {
      setError(isEn ? "Select a delivery service before sending the order." : "Izaberi kurirsku sluzbu pre slanja porudzbine.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "storefront",
          items,
          totals: {
            subtotal,
            quantity: totalUnits,
            deliveryCost,
            total: checkoutTotal,
          },
          customer: form,
          note: form.note || null,
          fulfillment: {
            method: form.deliveryMethod,
            pickupStoreSlug: form.deliveryMethod === "pickup" ? form.pickupStoreSlug : null,
            deliveryServiceId: form.deliveryMethod === "delivery" ? selectedDeliveryService?.id || null : null,
            voucherCode: form.voucherCode || null,
          },
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || (isEn ? "Order submission failed." : "Slanje porudzbine nije uspelo."));
        return;
      }
      const confirmedTotal = Number(json.finalTotal || checkoutTotal);
      setOrderId(String(json.orderId || ""));
      setOrderNumber(String(json.orderNumber || json.orderId || ""));
      setSubmittedTotal(confirmedTotal);
      setAppliedVoucherCode(json.voucherCode ? String(json.voucherCode) : null);
      // Report the server's total, not the client's — the server re-prices every
      // line, so these can legitimately differ.
      trackPurchase({
        orderId: String(json.orderNumber || json.orderId || ""),
        products: items.map(toAnalyticsProduct),
        value: confirmedTotal,
        shipping: deliveryCost,
        discount: voucherDiscount,
        coupon: json.voucherCode ? String(json.voucherCode) : null,
      });
      clearCart();
      setForm({
        ...initialForm,
        deliveryMethod: fulfillmentCopy.deliveryEnabled ? "delivery" : "pickup",
        pickupStoreSlug: pickupStores[0]?.slug || "",
        deliveryServiceId: deliveryServices[0]?.id || "",
      });
    } catch (e: any) {
      setError(e?.message || (isEn ? "Order submission failed." : "Slanje porudzbine nije uspelo."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <div className="ss-commerce-loading" aria-busy="true" aria-label={isEn ? "Loading order form" : "Ucitavam formu za porudzbinu"} />;
  }

  if (orderId) {
    return (
      <div className="ss-commerce-stack">
        <StorefrontOrderSteps lang={lang} current="checkout" />
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{isEn ? "Order received" : "Porudzbina primljena"}</p>
          <h1>
            {isEn
              ? "Thank you! We received your order."
              : "Hvala! Tvoja porudzbina je primljena."}
          </h1>
          <p className="fs-6 mt-2">
            {isEn
              ? "Our team will call you within 2 hours (Mon-Sat, 09-20h) to confirm size, delivery and payment method."
              : "Nas tim ce te pozvati u roku od 2 sata (Pon-Sub, 09-20h) radi potvrde velicine, dostave i nacina placanja."}
          </p>
          <p className="mt-3">
            {isEn ? "Order number" : "Broj porudzbine"}: <strong>{orderNumber || orderId}</strong>
          </p>
          {submittedTotal != null ? (
            <p>
              {isEn ? "Total" : "Ukupno"}: <strong>{formatRsd(submittedTotal)}</strong>
            </p>
          ) : null}
          {appliedVoucherCode ? (
            <p>
              {isEn ? "Voucher applied" : "Primenjen vaucer"}: <strong>{appliedVoucherCode}</strong>
            </p>
          ) : null}
          <p className="text-secondary small mt-2">
            {isEn
              ? "Tip: save the order number. If you don't hear from us within 2 hours, please contact us directly."
              : "Savet: sacuvaj broj porudzbine. Ako se ne javimo u roku od 2 sata, slobodno nas pozovi."}
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
            <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
              {isEn ? "Continue shopping" : "Nastavi kupovinu"}
            </Link>
            <Link href={withLang("/kontakt")} className="btn btn-outline-dark text-uppercase fw-medium">
              {isEn ? "Contact us" : "Kontaktiraj nas"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="ss-commerce-stack">
        <StorefrontOrderSteps lang={lang} current="checkout" />
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{isEn ? "Order form is empty" : "Forma za porudzbinu je prazna"}</p>
          <h1>{isEn ? "Add products to the cart before sending the order." : "Dodaj proizvode u korpu pre slanja porudzbine."}</h1>
          <p>
            {isEn
              ? "The simplest route is product, cart review, then this order form."
              : "Najjednostavniji put je proizvod, pregled korpe, pa tek onda forma za porudzbinu."}
          </p>
          <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
            {isEn ? "Go to web shop" : "Idi na web shop"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-commerce-stack">
      <StorefrontOrderSteps lang={lang} current="checkout" />

      <div className="ss-commerce-intro">
        <div>
          <p className="ss-commerce-intro__eyebrow">{isEn ? "Step 3" : "Korak 3"}</p>
          <h1 className="ss-commerce-intro__title">
            {isEn ? "Send the order with only the essential details." : "Posalji porudzbinu uz samo neophodne podatke."}
          </h1>
        </div>
        <p className="ss-commerce-intro__copy">
          {isEn
            ? "Enter your contact details and, if you like, a delivery address or note. No online payment is required upfront."
            : "Unesi kontakt podatke i po zelji adresu ili napomenu. Placanje unapred nije potrebno."}
        </p>
      </div>

      <div className="ss-checkout-mini-summary" aria-label={isEn ? "Order overview" : "Pregled porudzbine"}>
        <div className="ss-checkout-mini-summary__item">
          <span>{isEn ? "Items" : "Artikli"}</span>
          <strong>{totalUnits}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item">
          <span>{isEn ? "Products" : "Proizvodi"}</span>
          <strong>{formatRsd(subtotal)}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item">
          <span>{isEn ? "Delivery" : "Dostava"}</span>
          <strong>
            {freeDeliveryApplied ? (isEn ? "Free" : "Besplatno") : formatRsd(deliveryCost)}
          </strong>
        </div>
        <div className="ss-checkout-mini-summary__item ss-checkout-mini-summary__item--wide">
          <span>{isEn ? "Current total" : "Trenutni ukupno"}</span>
          <strong>{formatRsd(checkoutTotal)}</strong>
        </div>
        {missingForFreeDelivery > 0 ? (
          <div className="ss-checkout-mini-summary__item ss-checkout-mini-summary__item--wide">
            <span>
              {isEn
                ? `Add ${formatRsd(missingForFreeDelivery)} more for free delivery`
                : `Dodaj jos ${formatRsd(missingForFreeDelivery)} za besplatnu dostavu`}
            </span>
          </div>
        ) : null}
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="ss-order-panel ss-order-panel--form">
            <div className="ss-order-panel__header">
              <div>
                <p className="ss-order-panel__eyebrow">{isEn ? "Order form" : "Porudzbina"}</p>
                <h2>{isEn ? "Customer details" : "Podaci kupca"}</h2>
              </div>
              <Link href={withLang("/cart")} className="btn btn-outline-dark text-uppercase fw-medium">
                {isEn ? "Back to cart" : "Nazad na korpu"}
              </Link>
            </div>

            <div className="ss-order-form-section">
              <h3>{isEn ? "Required contact" : "Obavezni kontakt podaci"}</h3>
              <p className="ss-order-form-section__copy">
                {isEn
                  ? "These three fields are enough for the team to confirm the order quickly."
                  : "Ova tri polja su dovoljna da tim brzo potvrdi porudzbinu."}
              </p>
              {authUser && !authLoading ? (
                <p className="small text-success mb-3 mb-md-4">
                  {isEn
                    ? "You are signed in. The order is linked to your account when the email matches your login."
                    : "Ulogovan si. Porudzbina se vezuje za nalog kada email u formi odgovara prijavi."}
                </p>
              ) : null}
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="checkout-full-name" className="form-label">{isEn ? "Full name" : "Ime i prezime"}</label>
                  <input
                    id="checkout-full-name"
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    onBlur={() => markTouched("fullName")}
                    className={`form-control${fieldError("fullName") ? " is-invalid" : touched.fullName && form.fullName.trim() ? " is-valid" : ""}`}
                    placeholder={isEn ? "First and last name" : "Ime i prezime"}
                    autoComplete="name"
                    required
                  />
                  {fieldError("fullName") ? (
                    <div className="invalid-feedback">{isEn ? "Name is required." : "Ime je obavezno."}</div>
                  ) : null}
                </div>
                <div className="col-md-6">
                  <label htmlFor="checkout-phone" className="form-label">{isEn ? "Phone" : "Telefon"}</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    onBlur={() => markTouched("phone")}
                    className={`form-control${fieldError("phone") ? " is-invalid" : touched.phone && form.phone.trim() ? " is-valid" : ""}`}
                    placeholder={isEn ? "Mobile or landline number" : "Mobilni ili fiksni broj"}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                  {fieldError("phone") ? (
                    <div className="invalid-feedback">{isEn ? "Phone is required." : "Telefon je obavezan."}</div>
                  ) : null}
                </div>
                <div className="col-12">
                  <label htmlFor="checkout-email" className="form-label">Email</label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    onBlur={() => markTouched("email")}
                    className={`form-control${fieldError("email") ? " is-invalid" : touched.email && form.email.trim() ? " is-valid" : ""}`}
                    placeholder="ime@email.com"
                    autoComplete="email"
                    required
                  />
                  {fieldError("email") ? (
                    <div className="invalid-feedback">{isEn ? "Enter a valid email address." : "Unesite ispravnu email adresu."}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ss-order-form-section">
              <h3>{isEn ? "Delivery or pickup" : "Dostava ili preuzimanje"}</h3>
              <p className="ss-order-form-section__copy">
                {form.deliveryMethod === "pickup" ? fulfillmentCopy.pickupNote : fulfillmentCopy.deliveryNote}
              </p>
              <div className="row g-3">
                {fulfillmentCopy.pickupEnabled ? (
                  <div className="col-md-6">
                    <label className="form-label d-block">{isEn ? "Option" : "Opcija"}</label>
                    <label className="d-flex gap-2 align-items-center">
                      <input
                        type="radio"
                        checked={form.deliveryMethod === "pickup"}
                        onChange={() => setForm((prev) => ({ ...prev, deliveryMethod: "pickup" }))}
                      />
                      <span>{fulfillmentCopy.pickupLabel}</span>
                    </label>
                  </div>
                ) : null}
                {fulfillmentCopy.deliveryEnabled ? (
                  <div className="col-md-6">
                    <label className="form-label d-block">{isEn ? "Option" : "Opcija"}</label>
                    <label className="d-flex gap-2 align-items-center">
                      <input
                        type="radio"
                        checked={form.deliveryMethod === "delivery"}
                        onChange={() => setForm((prev) => ({ ...prev, deliveryMethod: "delivery" }))}
                      />
                      <span>{fulfillmentCopy.deliveryLabel}</span>
                    </label>
                  </div>
                ) : null}

                {form.deliveryMethod === "pickup" ? (
                  <div className="col-12">
                    <label htmlFor="checkout-pickup-store" className="form-label">
                      {isEn ? "Pickup store" : "Radnja za preuzimanje"}
                    </label>
                    <select
                      id="checkout-pickup-store"
                      value={form.pickupStoreSlug}
                      onChange={(e) => setForm((prev) => ({ ...prev, pickupStoreSlug: e.target.value }))}
                      className="form-control"
                    >
                      {pickupStores.map((store) => (
                        <option key={store.slug} value={store.slug}>
                          {store.label} - {store.address}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {form.deliveryMethod === "delivery" ? (
                  <div className="col-12">
                    <label htmlFor="checkout-delivery-service" className="form-label">
                      {isEn ? "Delivery service" : "Kurirska sluzba"}
                    </label>
                    <select
                      id="checkout-delivery-service"
                      value={form.deliveryServiceId}
                      onChange={(e) => setForm((prev) => ({ ...prev, deliveryServiceId: e.target.value }))}
                      className="form-control"
                    >
                      {deliveryServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} {service.price > 0 ? `- ${formatRsd(service.price)}` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedDeliveryService?.description ? (
                      <p className="mt-2 mb-0 text-secondary small">{selectedDeliveryService.description}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ss-order-form-section">
              <h3>{isEn ? "Optional delivery details" : "Opcioni podaci za dostavu"}</h3>
              <p className="ss-order-form-section__copy">
                {isEn
                  ? "Add address details now only if you already know them."
                  : "Dodaj podatke za dostavu sada samo ako ih vec znas."}
              </p>
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="checkout-address" className="form-label">
                    {isEn ? "Address" : "Adresa"}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({isEn ? "optional" : "opciono"})</span>
                  </label>
                  <input
                    id="checkout-address"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "Street and number" : "Ulica i broj"}
                    autoComplete="street-address"
                  />
                </div>
                <div className="col-md-7">
                  <label htmlFor="checkout-city" className="form-label">
                    {isEn ? "City" : "Grad"}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({isEn ? "optional" : "opciono"})</span>
                  </label>
                  <input
                    id="checkout-city"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "City" : "Grad"}
                    autoComplete="address-level2"
                  />
                </div>
                <div className="col-md-5">
                  <label htmlFor="checkout-postal-code" className="form-label">
                    {isEn ? "Postal code" : "Postanski broj"}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({isEn ? "optional" : "opciono"})</span>
                  </label>
                  <input
                    id="checkout-postal-code"
                    value={form.postalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "Postal code" : "Postanski broj"}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <div className="ss-order-form-section">
              <h3>{isEn ? "Note for the team" : "Napomena za tim"}</h3>
              <p className="ss-order-form-section__copy">
                {isEn
                  ? "Use this for size remarks, pickup preference or anything the team should know."
                  : "Ovde upisi napomenu o velicini, nacinu preuzimanja ili bilo sta sto tim treba da zna."}
              </p>
              <label htmlFor="checkout-note" className="visually-hidden">
                {isEn ? "Note for the team" : "Napomena za tim"}
              </label>
              <textarea
                id="checkout-note"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="form-control"
                rows={4}
                placeholder={isEn ? "Sizes, pickup time, delivery note..." : "Velicine, vreme preuzimanja, napomena za dostavu..."}
              />
            </div>

            {error ? <p className="text-danger mt-3 mb-0">{error}</p> : null}

            <div className="ss-order-panel__footer">
              <p className="ss-order-panel__hint">
                {isEn
                  ? "After you send the order, our team calls you to confirm availability, delivery and payment."
                  : "Nakon slanja porudzbine nas tim te poziva da potvrdi dostupnost, dostavu i placanje."}
              </p>
              <p className="ss-order-panel__hint mt-1">
                {isEn
                  ? "We accept: cash on delivery, card, bank transfer."
                  : "Prihvatamo: placanje pouzecam, karticom, uplatnicom."}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary text-uppercase fw-medium">
                  {submitting ? (isEn ? "Sending..." : "Slanje...") : (isEn ? "Send order" : "Posalji porudzbinu")}
                </button>
                <Link href={withLang("/cart")} className="btn btn-outline-dark text-uppercase fw-medium">
                  {isEn ? "Edit cart" : "Izmeni korpu"}
                </Link>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="ss-order-summary ss-order-summary--sticky">
            <p className="ss-order-panel__eyebrow">{isEn ? "Order summary" : "Pregled porudzbine"}</p>
            <h2>{isEn ? "Everything you're sending." : "Sve sto upravo saljes."}</h2>

            <div className="ss-order-summary__items">
              {items.map((item) => (
                <div key={item.legacyId} className="ss-order-summary__item">
                  <div>
                    <p className="ss-order-summary__item-title">{item.name}</p>
                    {item.size ? <p className="ss-order-summary__item-meta">{isEn ? "Size" : "Velicina"}: {item.size}</p> : null}
                    {item.material ? <p className="ss-order-summary__item-meta">{isEn ? "Material" : "Materijal"}: {item.material}</p> : null}
                    <p className="ss-order-summary__item-meta">
                      {item.quantity} x {formatRsd(item.price)}
                    </p>
                  </div>
                  <strong>{formatRsd(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="ss-order-summary__voucher">
              <label htmlFor="checkout-voucher" className="form-label">
                {isEn ? "Voucher code" : "Vaučer kod"}{" "}
                <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({isEn ? "optional" : "opciono"})</span>
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  id="checkout-voucher"
                  value={form.voucherCode}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, voucherCode: e.target.value.toUpperCase() }));
                    setVoucherDiscount(0);
                    setVoucherError(null);
                    setAppliedVoucherCode(null);
                  }}
                  className="form-control form-control-sm"
                  placeholder={isEn ? "Enter voucher code" : "Unesi vaučer kod"}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => void applyVoucher()}
                  disabled={!form.voucherCode.trim() || voucherApplying}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {voucherApplying ? "..." : isEn ? "Apply" : "Primeni"}
                </button>
              </div>
              {voucherError ? (
                <p style={{ marginTop: "4px", fontSize: "0.82em", color: "#c0392b" }}>{voucherError}</p>
              ) : null}
              {voucherDiscount > 0 && appliedVoucherCode ? (
                <p style={{ marginTop: "4px", fontSize: "0.82em", color: "#27ae60" }}>
                  {isEn ? "Discount applied" : "Popust primenjen"}: &minus;{formatRsd(voucherDiscount)}
                </p>
              ) : null}
            </div>

            <div className="ss-order-summary__total">
              {voucherDiscount > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#555", marginBottom: "4px" }}>
                    <span>{isEn ? "Subtotal" : "Međuzbir"}</span>
                    <span>{formatRsd(subtotal + deliveryCost)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#27ae60", marginBottom: "4px" }}>
                    <span>{isEn ? "Voucher discount" : "Popust (vaučer)"}</span>
                    <span>&minus;{formatRsd(voucherDiscount)}</span>
                  </div>
                </>
              ) : null}
              <span>{isEn ? "Total" : "Ukupno"}</span>
              <strong>{formatRsd(checkoutTotal)}</strong>
            </div>

            <div className="ss-order-summary__note">
              <p>
                {isEn
                  ? "Payment on delivery, by card or bank transfer — you choose when our team calls to confirm the order."
                  : "Placanje pouzecem, karticom ili uplatnicom — biras kada te nas tim pozove radi potvrde porudzbine."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
