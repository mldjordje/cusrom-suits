"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import StorefrontOrderSteps from "@/app/components/storefront/StorefrontOrderSteps";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  note: "",
};

export default function CheckoutPageClient({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const { items, subtotal, clearCart, isReady } = useCart();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const isEn = lang === "en";

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    return Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim());
  }, [form.email, form.fullName, form.phone, items.length]);
  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError(isEn ? "Enter name, email and phone before submitting the order." : "Unesi ime, email i telefon pre slanja porudzbine.");
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
          },
          customer: form,
          note: form.note || null,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || (isEn ? "Order submission failed." : "Slanje porudzbine nije uspelo."));
        return;
      }
      setOrderId(String(json.orderId || ""));
      clearCart();
      setForm(initialForm);
    } catch (e: any) {
      setError(e?.message || (isEn ? "Order submission failed." : "Slanje porudzbine nije uspelo."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <p className="text-center text-secondary">{isEn ? "Loading checkout..." : "Ucitavam checkout..."}</p>;
  }

  if (orderId) {
    return (
      <div className="ss-commerce-stack">
        <StorefrontOrderSteps lang={lang} current="checkout" />
        <div className="ss-order-state-card text-center">
          <p className="ss-order-state-card__eyebrow">{isEn ? "Order sent" : "Porudzbina poslata"}</p>
          <h1>{isEn ? "Thank you, your order request is recorded." : "Hvala, tvoj zahtev za porudzbinu je evidentiran."}</h1>
          <p>
            {isEn ? "Recorded order number" : "Evidentiran broj porudzbine"}: <strong>{orderId}</strong>
          </p>
          <p>
            {isEn
              ? "Our team will confirm availability, delivery and all final details directly with the customer."
              : "Nas tim ce direktno sa kupcem potvrditi dostupnost, dostavu i sve finalne detalje."}
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link href={withLang("/web-shop")} className="btn btn-primary text-uppercase fw-medium">
              {isEn ? "Continue shopping" : "Nastavi kupovinu"}
            </Link>
            <Link href={withLang("/kontakt")} className="btn btn-outline-dark text-uppercase fw-medium">
              {isEn ? "Contact" : "Kontakt"}
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
          <p className="ss-order-state-card__eyebrow">{isEn ? "Checkout is empty" : "Checkout je prazan"}</p>
          <h1>{isEn ? "Add products to the cart before sending the order." : "Dodaj proizvode u korpu pre slanja porudzbine."}</h1>
          <p>
            {isEn
              ? "The simplest route is product, cart review, then this checkout form."
              : "Najjednostavniji put je proizvod, pregled korpe, pa tek onda ova checkout forma."}
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
            ? "The customer only fills in contact details and an optional address or note. There is no online payment barrier in this flow."
            : "Kupac unosi samo kontakt podatke i po zelji adresu ili napomenu. U ovom toku nema barijere online placanja."}
        </p>
      </div>

      <div className="ss-checkout-mini-summary" aria-label={isEn ? "Checkout overview" : "Pregled checkout-a"}>
        <div className="ss-checkout-mini-summary__item">
          <span>{isEn ? "Items" : "Artikli"}</span>
          <strong>{totalUnits}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item">
          <span>{isEn ? "Total" : "Ukupno"}</span>
          <strong>{formatRsd(subtotal)}</strong>
        </div>
        <div className="ss-checkout-mini-summary__item ss-checkout-mini-summary__item--wide">
          <span>{isEn ? "Flow" : "Tok"}</span>
          <strong>{isEn ? "Direct inquiry, no online payment" : "Direktan upit, bez online placanja"}</strong>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="ss-order-panel ss-order-panel--form">
            <div className="ss-order-panel__header">
              <div>
                <p className="ss-order-panel__eyebrow">Checkout</p>
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
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">{isEn ? "Full name" : "Ime i prezime"}</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "First and last name" : "Ime i prezime"}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{isEn ? "Phone" : "Telefon"}</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "Mobile or landline number" : "Mobilni ili fiksni broj"}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                    placeholder="ime@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
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
                  <label className="form-label">{isEn ? "Address" : "Adresa"}</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "Street and number" : "Ulica i broj"}
                    autoComplete="street-address"
                  />
                </div>
                <div className="col-md-7">
                  <label className="form-label">{isEn ? "City" : "Grad"}</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="form-control"
                    placeholder={isEn ? "City" : "Grad"}
                    autoComplete="address-level2"
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label">{isEn ? "Postal code" : "Postanski broj"}</label>
                  <input
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
              <textarea
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
                  ? "Submitting creates an order inquiry in admin. The team confirms availability and next steps afterward."
                  : "Slanjem kreiras upit za porudzbinu u adminu. Tim potom potvrdjuje dostupnost i sledece korake."}
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
            <h2>{isEn ? "Everything the customer is sending." : "Sve sto kupac upravo salje."}</h2>

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

            <div className="ss-order-summary__total">
              <span>{isEn ? "Current total" : "Trenutni ukupno"}</span>
              <strong>{formatRsd(subtotal)}</strong>
            </div>

            <div className="ss-order-summary__note">
              <p>
                {isEn
                  ? "There is no online payment in this flow. That makes checkout simpler and keeps the focus on sending the request fast."
                  : "U ovom toku nema online placanja. To checkout cini jednostavnijim i drzi fokus na brzom slanju zahteva."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
