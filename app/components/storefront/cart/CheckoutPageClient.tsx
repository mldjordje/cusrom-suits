"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";

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

export default function CheckoutPageClient() {
  const { items, subtotal, clearCart, isReady } = useCart();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    return Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim());
  }, [form.email, form.fullName, form.phone, items.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Unesi ime, email i telefon pre slanja porudzbine.");
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
            quantity: items.reduce((sum, item) => sum + item.quantity, 0),
          },
          customer: form,
          note: form.note || null,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Slanje porudzbine nije uspelo.");
        return;
      }
      setOrderId(String(json.orderId || ""));
      clearCart();
      setForm(initialForm);
    } catch (e: any) {
      setError(e?.message || "Slanje porudzbine nije uspelo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <p className="text-center text-secondary">Ucitavam checkout...</p>;
  }

  if (orderId) {
    return (
      <div className="rounded-4 border bg-white p-4 p-lg-5 text-center shadow-sm">
        <p className="text-uppercase fw-medium text-secondary mb-2">Porudzbina je poslata</p>
        <h1 className="h3 mb-3">Hvala, javljamo se uskoro</h1>
        <p className="text-secondary mb-2">Evidentiran broj porudzbine: <strong>{orderId}</strong></p>
        <p className="text-secondary mb-4">Tim moze da potvrdi dostupnost, dostavu i finalne detalje direktno kroz admin.</p>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Link href="/web-shop" className="btn btn-primary text-uppercase fw-medium">
            Nastavi kupovinu
          </Link>
          <Link href="/kontakt" className="btn btn-outline-dark text-uppercase fw-medium">
            Kontakt
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-4 border bg-white p-4 p-lg-5 text-center shadow-sm">
        <p className="text-uppercase fw-medium text-secondary mb-2">Checkout je prazan</p>
        <h1 className="h3 mb-3">Dodaj proizvode u korpu pre checkout-a</h1>
        <Link href="/web-shop" className="btn btn-primary text-uppercase fw-medium">
          Idi na web shop
        </Link>
      </div>
    );
  }

  return (
    <div className="row g-4 align-items-start">
      <div className="col-lg-7">
        <form onSubmit={handleSubmit} className="rounded-4 border bg-white p-4 shadow-sm">
          <p className="text-uppercase fw-medium text-secondary mb-1">Checkout</p>
          <h1 className="h4 mb-4">Podaci za porudzbinu</h1>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Ime i prezime</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Telefon</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="form-control"
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
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Adresa</label>
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="col-md-7">
              <label className="form-label">Grad</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">Postanski broj</label>
              <input
                value={form.postalCode}
                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Napomena</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="form-control"
                rows={4}
                placeholder="Napomena za tim, velicine, vreme preuzimanja..."
              />
            </div>
          </div>

          {error ? <p className="text-danger mt-3 mb-0">{error}</p> : null}

          <div className="d-flex flex-wrap gap-2 mt-4">
            <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary text-uppercase fw-medium">
              {submitting ? "Slanje..." : "Posalji porudzbinu"}
            </button>
            <Link href="/cart" className="btn btn-outline-dark text-uppercase fw-medium">
              Nazad na korpu
            </Link>
          </div>
        </form>
      </div>

      <div className="col-lg-5">
        <div className="rounded-4 border bg-white p-4 shadow-sm">
          <p className="text-uppercase fw-medium text-secondary mb-1">Pregled porudzbine</p>
          <h2 className="h5 mb-4">Artikli</h2>
          <div className="d-flex flex-column gap-3">
            {items.map((item) => (
              <div key={item.legacyId} className="d-flex justify-content-between gap-3">
                <div>
                  <p className="mb-1 fw-medium">{item.name}</p>
                  <p className="small text-secondary mb-0">
                    {item.quantity} x {formatRsd(item.price)}
                  </p>
                </div>
                <div className="fw-medium">{formatRsd(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <hr />
          <div className="d-flex justify-content-between fw-semibold fs-5">
            <span>Ukupno</span>
            <span>{formatRsd(subtotal)}</span>
          </div>
          <p className="small text-secondary mt-3 mb-0">
            Ovo je finalni upit/porudzbina bez online placanja. Status porudzbine se dalje vodi kroz admin panel.
          </p>
        </div>
      </div>
    </div>
  );
}
