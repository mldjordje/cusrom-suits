"use client";

import { useEffect, useState } from "react";

type DeliveryService = {
  id: string;
  code: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  trackingUrl: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

type Voucher = {
  id: string;
  code: string;
  email: string;
  amount: number;
  type: "fixed" | "percent";
  isActive: boolean;
  createdAt: string;
  usedAt: string | null;
  usedOrderId: string | null;
};

type FulfillmentSettings = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupLabel: string;
  pickupLabelEn: string;
  deliveryLabel: string;
  deliveryLabelEn: string;
  pickupNote: string;
  pickupNoteEn: string;
  deliveryNote: string;
  deliveryNoteEn: string;
  deliveryServices: DeliveryService[];
  vouchers: Voucher[];
};

const fieldClass = "rounded-xl border border-slate-200 px-3 py-2 text-sm";
const actionClass =
  "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700";
const dangerClass =
  "rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700";

const createBrowserId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const emptyService = (): DeliveryService => ({
  id: createBrowserId(),
  code: "",
  name: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  trackingUrl: "",
  price: 0,
  sortOrder: 0,
  isActive: true,
});

const emptyVoucher = (): Voucher => ({
  id: createBrowserId(),
  code: "",
  email: "",
  amount: 0,
  type: "fixed",
  isActive: true,
  createdAt: new Date().toISOString(),
  usedAt: null,
  usedOrderId: null,
});

const defaultSettings: FulfillmentSettings = {
  pickupEnabled: true,
  deliveryEnabled: true,
  pickupLabel: "",
  pickupLabelEn: "",
  deliveryLabel: "",
  deliveryLabelEn: "",
  pickupNote: "",
  pickupNoteEn: "",
  deliveryNote: "",
  deliveryNoteEn: "",
  deliveryServices: [],
  vouchers: [],
};

export default function AdminFulfillmentPage() {
  const [settings, setSettings] = useState<FulfillmentSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fulfillment");
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Ne mogu da ucitam fulfillment.");
      setSettings(json.settings || defaultSettings);
    } catch (err: any) {
      setError(err?.message || "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        ...settings,
        deliveryServices: settings.deliveryServices
          .map((service) => ({
            ...service,
            code: service.code.trim().toUpperCase(),
            name: service.name.trim(),
            description: service.description.trim(),
            phone: service.phone.trim(),
            email: service.email.trim(),
            website: service.website.trim(),
            trackingUrl: service.trackingUrl.trim(),
            price: Number(service.price || 0),
            sortOrder: Number(service.sortOrder || 0),
          }))
          .filter((service) => service.id && service.code && service.name),
        vouchers: settings.vouchers
          .map((voucher) => ({
            ...voucher,
            code: voucher.code.trim().toUpperCase(),
            email: voucher.email.trim().toLowerCase(),
            amount: Number(voucher.amount || 0),
          }))
          .filter((voucher) => voucher.id && voucher.code && voucher.amount > 0),
      };

      const res = await fetch("/api/admin/fulfillment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Snimanje nije uspelo.");
      setSettings(json.settings || defaultSettings);
      setNotice("Fulfillment podesavanja su sacuvana.");
    } catch (err: any) {
      setError(err?.message || "Snimanje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Operativa</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Fulfillment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kurirske sluzbe, preuzimanje u radnji i vauceri za novi checkout tok.
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Osnovna checkout pravila</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.pickupEnabled} onChange={(e) => setSettings((prev) => ({ ...prev, pickupEnabled: e.target.checked }))} />
            Omoguci preuzimanje u radnji
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.deliveryEnabled} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryEnabled: e.target.checked }))} />
            Omoguci kurirsku dostavu
          </label>
          <input value={settings.pickupLabel} onChange={(e) => setSettings((prev) => ({ ...prev, pickupLabel: e.target.value }))} placeholder="Pickup label SR" className={fieldClass} />
          <input value={settings.pickupLabelEn} onChange={(e) => setSettings((prev) => ({ ...prev, pickupLabelEn: e.target.value }))} placeholder="Pickup label EN" className={fieldClass} />
          <input value={settings.deliveryLabel} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryLabel: e.target.value }))} placeholder="Delivery label SR" className={fieldClass} />
          <input value={settings.deliveryLabelEn} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryLabelEn: e.target.value }))} placeholder="Delivery label EN" className={fieldClass} />
          <textarea value={settings.pickupNote} onChange={(e) => setSettings((prev) => ({ ...prev, pickupNote: e.target.value }))} placeholder="Pickup note SR" className={`${fieldClass} min-h-[90px]`} />
          <textarea value={settings.pickupNoteEn} onChange={(e) => setSettings((prev) => ({ ...prev, pickupNoteEn: e.target.value }))} placeholder="Pickup note EN" className={`${fieldClass} min-h-[90px]`} />
          <textarea value={settings.deliveryNote} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryNote: e.target.value }))} placeholder="Delivery note SR" className={`${fieldClass} min-h-[90px]`} />
          <textarea value={settings.deliveryNoteEn} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryNoteEn: e.target.value }))} placeholder="Delivery note EN" className={`${fieldClass} min-h-[90px]`} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Kurirske sluzbe</h2>
            <p className="text-sm text-slate-600">Ovo direktno puni izbor u checkout-u.</p>
          </div>
          <button onClick={() => setSettings((prev) => ({ ...prev, deliveryServices: [...prev.deliveryServices, emptyService()] }))} className={actionClass}>
            Dodaj kurira
          </button>
        </div>
        <div className="space-y-4">
          {settings.deliveryServices.map((service, index) => (
            <div key={service.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button onClick={() => setSettings((prev) => ({ ...prev, deliveryServices: prev.deliveryServices.filter((_, rowIndex) => rowIndex !== index) }))} className={dangerClass}>
                  Obrisi kurira
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(["code","name","description","phone","email","website","trackingUrl"] as Array<keyof DeliveryService>).map((field) => (
                  <input
                    key={`${service.id}-${String(field)}`}
                    value={String(service[field] || "")}
                    onChange={(e) => setSettings((prev) => ({ ...prev, deliveryServices: prev.deliveryServices.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: e.target.value } : row) }))}
                    placeholder={String(field)}
                    className={fieldClass}
                  />
                ))}
                <input type="number" value={service.price} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryServices: prev.deliveryServices.map((row, rowIndex) => rowIndex === index ? { ...row, price: Number(e.target.value || 0) } : row) }))} placeholder="price" className={fieldClass} />
                <input type="number" value={service.sortOrder} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryServices: prev.deliveryServices.map((row, rowIndex) => rowIndex === index ? { ...row, sortOrder: Number(e.target.value || 0) } : row) }))} placeholder="sortOrder" className={fieldClass} />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={service.isActive} onChange={(e) => setSettings((prev) => ({ ...prev, deliveryServices: prev.deliveryServices.map((row, rowIndex) => rowIndex === index ? { ...row, isActive: e.target.checked } : row) }))} />
                  Aktivna u checkout-u
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Vauceri</h2>
            <p className="text-sm text-slate-600">Kod, email ogranicenje, vrednost i status iskoriscenja.</p>
          </div>
          <button onClick={() => setSettings((prev) => ({ ...prev, vouchers: [emptyVoucher(), ...prev.vouchers] }))} className={actionClass}>
            Dodaj vaucer
          </button>
        </div>
        <div className="space-y-4">
          {settings.vouchers.map((voucher, index) => (
            <div key={voucher.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button onClick={() => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.filter((_, rowIndex) => rowIndex !== index) }))} className={dangerClass}>
                  Obrisi vaucer
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={voucher.code} onChange={(e) => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.map((row, rowIndex) => rowIndex === index ? { ...row, code: e.target.value.toUpperCase() } : row) }))} placeholder="Kod" className={fieldClass} />
                <input value={voucher.email} onChange={(e) => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.map((row, rowIndex) => rowIndex === index ? { ...row, email: e.target.value } : row) }))} placeholder="Email ogranicenje (opciono)" className={fieldClass} />
                <select value={voucher.type} onChange={(e) => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.map((row, rowIndex) => rowIndex === index ? { ...row, type: e.target.value as Voucher["type"] } : row) }))} className={fieldClass}>
                  <option value="fixed">Fiksni iznos</option>
                  <option value="percent">Procenat</option>
                </select>
                <input type="number" value={voucher.amount} onChange={(e) => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.map((row, rowIndex) => rowIndex === index ? { ...row, amount: Number(e.target.value || 0) } : row) }))} placeholder="Vrednost" className={fieldClass} />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={voucher.isActive} onChange={(e) => setSettings((prev) => ({ ...prev, vouchers: prev.vouchers.map((row, rowIndex) => rowIndex === index ? { ...row, isActive: e.target.checked } : row) }))} />
                  Aktivno
                </label>
                <div className="text-sm text-slate-500">
                  {voucher.usedAt ? `Iskoriscen: ${new Date(voucher.usedAt).toLocaleString("sr-RS")}` : "Nije iskoriscen"}
                  {voucher.usedOrderId ? ` | Order: ${voucher.usedOrderId}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={saving} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          {saving ? "Cuvanje..." : "Sacuvaj"}
        </button>
        <button onClick={() => void load()} className={actionClass}>
          Osvezi
        </button>
      </div>
    </div>
  );
}
