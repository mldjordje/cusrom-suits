"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import StorefrontOrderSteps from "@/app/components/storefront/StorefrontOrderSteps";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import type { CheckoutCopy } from "@/lib/storefront/checkoutCopy";
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
  copy,
  freeDeliveryThreshold = 0,
}: {
  lang?: StorefrontLanguage;
  pickupStores: PickupStoreOption[];
  deliveryServices: DeliveryServiceOption[];
  fulfillmentCopy: FulfillmentCopy;
  /** Page wording for this language, admin overrides already applied. */
  copy: CheckoutCopy;
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
        setVoucherError(json?.message || (copy.invalidVoucher));
        setVoucherDiscount(0);
        return;
      }
      setVoucherDiscount(Number(json.discountAmount || 0));
      setAppliedVoucherCode(code);
    } catch {
      setVoucherError(copy.couldNotValidateVoucher);
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
      setError(copy.enterNameEmailAndPhoneBeforeSubmittingTh);
      return;
    }
    if (form.deliveryMethod === "pickup" && !form.pickupStoreSlug) {
      setError(copy.selectAPickupStoreBeforeSendingTheOrder);
      return;
    }
    if (form.deliveryMethod === "delivery" && !selectedDeliveryService) {
      setError(copy.selectADeliveryServiceBeforeSendingTheOr);
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
        setError(json?.message || (copy.orderSubmissionFailed));
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
      setError(e?.message || (copy.orderSubmissionFailed));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <div className="ss-commerce-loading" aria-busy="true" aria-label={copy.loadingOrderForm} />;
  }

  if (orderId) {
    return (
      <div className="ss-commerce-stack">
        <StorefrontOrderSteps lang={lang} current="checkout" />
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{copy.orderReceived}</p>
          <h1>
            {copy.thankYouWeReceivedYourOrder}
          </h1>
          <p className="fs-6 mt-2">
            {copy.ourTeamWillCallYouWithin2HoursMonSat0920}
          </p>
          <p className="mt-3">
            {copy.orderNumber}: <strong>{orderNumber || orderId}</strong>
          </p>
          {submittedTotal != null ? (
            <p>
              {copy.total}: <strong>{formatRsd(submittedTotal)}</strong>
            </p>
          ) : null}
          {appliedVoucherCode ? (
            <p>
              {copy.voucherApplied}: <strong>{appliedVoucherCode}</strong>
            </p>
          ) : null}
          <p className="text-secondary small mt-2">
            {copy.tipSaveTheOrderNumberIfYouDonTHearFromUs}
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
            <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
              {copy.continueShopping}
            </Link>
            <Link href={withLang("/kontakt")} className="btn btn-outline-dark text-uppercase fw-medium">
              {copy.contactUs}
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
          <p className="ss-order-state-card__eyebrow">{copy.orderFormIsEmpty}</p>
          <h1>{copy.addProductsToTheCartBeforeSendingTheOrde}</h1>
          <p>
            {copy.theSimplestRouteIsProductCartReviewThenT}
          </p>
          <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
            {copy.goToWebShop}
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
          <p className="ss-commerce-intro__eyebrow">{copy.step3}</p>
          <h1 className="ss-commerce-intro__title">
            {copy.sendTheOrderWithOnlyTheEssentialDetails}
          </h1>
        </div>
        <p className="ss-commerce-intro__copy">
          {copy.enterYourContactDetailsAndIfYouLikeADeli}
        </p>
      </div>

      <div className="ss-checkout-mini-summary" aria-label={copy.orderOverview}>
        <div className="ss-checkout-mini-summary__item">
          <span>{copy.items}</span>
          <strong>{totalUnits}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item">
          <span>{copy.products}</span>
          <strong>{formatRsd(subtotal)}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item">
          <span>{copy.delivery}</span>
          <strong>
            {freeDeliveryApplied ? (copy.free) : formatRsd(deliveryCost)}
          </strong>
        </div>
        <div className="ss-checkout-mini-summary__item ss-checkout-mini-summary__item--wide">
          <span>{copy.currentTotal}</span>
          <strong>{formatRsd(checkoutTotal)}</strong>
        </div>
        {missingForFreeDelivery > 0 ? (
          <div className="ss-checkout-mini-summary__item ss-checkout-mini-summary__item--wide">
            <span>
              {copy.freeDeliveryNudge.replace("{iznos}", formatRsd(missingForFreeDelivery))}
            </span>
          </div>
        ) : null}
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="ss-order-panel ss-order-panel--form">
            <div className="ss-order-panel__header">
              <div>
                <p className="ss-order-panel__eyebrow">{copy.orderForm}</p>
                <h2>{copy.customerDetails}</h2>
              </div>
              <Link href={withLang("/cart")} className="btn btn-outline-dark text-uppercase fw-medium">
                {copy.backToCart}
              </Link>
            </div>

            <div className="ss-order-form-section">
              <h3>{copy.requiredContact}</h3>
              <p className="ss-order-form-section__copy">
                {copy.theseThreeFieldsAreEnoughForTheTeamToCon}
              </p>
              {authUser && !authLoading ? (
                <p className="small text-success mb-3 mb-md-4">
                  {copy.youAreSignedInTheOrderIsLinkedToYourAcco}
                </p>
              ) : null}
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="checkout-full-name" className="form-label">{copy.fullName}</label>
                  <input
                    id="checkout-full-name"
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    onBlur={() => markTouched("fullName")}
                    className={`form-control${fieldError("fullName") ? " is-invalid" : touched.fullName && form.fullName.trim() ? " is-valid" : ""}`}
                    placeholder={copy.firstAndLastName}
                    autoComplete="name"
                    required
                  />
                  {fieldError("fullName") ? (
                    <div className="invalid-feedback">{copy.nameIsRequired}</div>
                  ) : null}
                </div>
                <div className="col-md-6">
                  <label htmlFor="checkout-phone" className="form-label">{copy.phone}</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    onBlur={() => markTouched("phone")}
                    className={`form-control${fieldError("phone") ? " is-invalid" : touched.phone && form.phone.trim() ? " is-valid" : ""}`}
                    placeholder={copy.mobileOrLandlineNumber}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                  {fieldError("phone") ? (
                    <div className="invalid-feedback">{copy.phoneIsRequired}</div>
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
                    <div className="invalid-feedback">{copy.enterAValidEmailAddress}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ss-order-form-section">
              <h3>{copy.deliveryOrPickup}</h3>
              <p className="ss-order-form-section__copy">
                {form.deliveryMethod === "pickup" ? fulfillmentCopy.pickupNote : fulfillmentCopy.deliveryNote}
              </p>
              <div className="row g-3">
                {fulfillmentCopy.pickupEnabled ? (
                  <div className="col-md-6">
                    <label className="form-label d-block">{copy.option}</label>
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
                    <label className="form-label d-block">{copy.option}</label>
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
                      {copy.pickupStore}
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
                      {copy.deliveryService}
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
              <h3>{copy.optionalDeliveryDetails}</h3>
              <p className="ss-order-form-section__copy">
                {copy.addAddressDetailsNowOnlyIfYouAlreadyKnow}
              </p>
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="checkout-address" className="form-label">
                    {copy.address}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({copy.optional})</span>
                  </label>
                  <input
                    id="checkout-address"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="form-control"
                    placeholder={copy.streetAndNumber}
                    autoComplete="street-address"
                  />
                </div>
                <div className="col-md-7">
                  <label htmlFor="checkout-city" className="form-label">
                    {copy.city}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({copy.optional})</span>
                  </label>
                  <input
                    id="checkout-city"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="form-control"
                    placeholder={copy.city}
                    autoComplete="address-level2"
                  />
                </div>
                <div className="col-md-5">
                  <label htmlFor="checkout-postal-code" className="form-label">
                    {copy.postalCode}{" "}
                    <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({copy.optional})</span>
                  </label>
                  <input
                    id="checkout-postal-code"
                    value={form.postalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    className="form-control"
                    placeholder={copy.postalCode}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <div className="ss-order-form-section">
              <h3>{copy.noteForTheTeam}</h3>
              <p className="ss-order-form-section__copy">
                {copy.useThisForSizeRemarksPickupPreferenceOrA}
              </p>
              <label htmlFor="checkout-note" className="visually-hidden">
                {copy.noteForTheTeam}
              </label>
              <textarea
                id="checkout-note"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="form-control"
                rows={4}
                placeholder={copy.sizesPickupTimeDeliveryNote}
              />
            </div>

            {error ? <p className="text-danger mt-3 mb-0">{error}</p> : null}

            <div className="ss-order-panel__footer">
              <p className="ss-order-panel__hint">
                {copy.afterYouSendTheOrderOurTeamCallsYouToCon}
              </p>
              <p className="ss-order-panel__hint mt-1">
                {copy.weAcceptCashOnDeliveryCardBankTransfer}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary text-uppercase fw-medium">
                  {submitting ? (copy.sending) : (copy.sendOrder)}
                </button>
                <Link href={withLang("/cart")} className="btn btn-outline-dark text-uppercase fw-medium">
                  {copy.editCart}
                </Link>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="ss-order-summary ss-order-summary--sticky">
            <p className="ss-order-panel__eyebrow">{copy.orderSummary}</p>
            <h2>{copy.everythingYouReSending}</h2>

            <div className="ss-order-summary__items">
              {items.map((item) => (
                <div key={item.legacyId} className="ss-order-summary__item">
                  <div>
                    <p className="ss-order-summary__item-title">{item.name}</p>
                    {item.size ? <p className="ss-order-summary__item-meta">{copy.size}: {item.size}</p> : null}
                    {item.material ? <p className="ss-order-summary__item-meta">{copy.material}: {item.material}</p> : null}
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
                {copy.voucherCode}{" "}
                <span className="text-secondary fw-normal" style={{ fontSize: "0.78em" }}>({copy.optional})</span>
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
                  placeholder={copy.enterVoucherCode}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => void applyVoucher()}
                  disabled={!form.voucherCode.trim() || voucherApplying}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {voucherApplying ? "..." : copy.apply}
                </button>
              </div>
              {voucherError ? (
                <p style={{ marginTop: "4px", fontSize: "0.82em", color: "#c0392b" }}>{voucherError}</p>
              ) : null}
              {voucherDiscount > 0 && appliedVoucherCode ? (
                <p style={{ marginTop: "4px", fontSize: "0.82em", color: "#27ae60" }}>
                  {copy.discountApplied}: &minus;{formatRsd(voucherDiscount)}
                </p>
              ) : null}
            </div>

            <div className="ss-order-summary__total">
              {voucherDiscount > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#555", marginBottom: "4px" }}>
                    <span>{copy.subtotal}</span>
                    <span>{formatRsd(subtotal + deliveryCost)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9em", color: "#27ae60", marginBottom: "4px" }}>
                    <span>{copy.voucherDiscount}</span>
                    <span>&minus;{formatRsd(voucherDiscount)}</span>
                  </div>
                </>
              ) : null}
              <span>{copy.total}</span>
              <strong>{formatRsd(checkoutTotal)}</strong>
            </div>

            <div className="ss-order-summary__note">
              <p>
                {copy.paymentOnDeliveryByCardOrBankTransferYou}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
