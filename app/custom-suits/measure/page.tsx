"use client";
import React, { useEffect, useMemo, useState } from "react";

type Reco = {
  size: string;
  chest: number;
  waist: number;
  sleeve: number;
  inseam: number;
};

type StoredOrder = {
  config: Record<string, any>;
  lineItems: { label: string; price: number; type: string }[];
  total: number;
};

export default function MeasurePage() {
  const [h, setH] = useState<number | "">(180);
  const [w, setW] = useState<number | "">(80);
  const [age, setAge] = useState<number | "">(30);
  const [chest, setChest] = useState<number | "">(96);
  const [waist, setWaist] = useState<number | "">(82);
  const [sleeve, setSleeve] = useState<number | "">(62);
  const [inseam, setInseam] = useState<number | "">(76);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("suitOrder");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setOrder(parsed);
      } catch (err) {
        console.error("Unable to read order", err);
      }
    }
  }, []);

  const reco: Reco | null = useMemo(() => {
    if (!h || !w) return null;
    const height = Number(h);
    const weight = Number(w);
    const bmi = weight / Math.pow(height / 100, 2);
    let size = "M";
    if (bmi < 21) size = "S";
    else if (bmi > 27) size = "L";
    if (bmi > 31) size = "XL";
    const chestCalc = Math.round(0.52 * height + (bmi - 23) * 1.2);
    const waistCalc = Math.round(0.45 * height + (bmi - 23) * 1.5);
    const sleeveCalc = Math.round(0.4 * height + 2);
    const inseamCalc = Math.round(0.47 * height);
    return { size, chest: chestCalc, waist: waistCalc, sleeve: sleeveCalc, inseam: inseamCalc };
  }, [h, w]);

  useEffect(() => {
    if (!reco) return;
    setChest(reco.chest);
    setWaist(reco.waist);
    setSleeve(reco.sleeve);
    setInseam(reco.inseam);
  }, [reco]);

  const handleSendEmail = () => {
    const lineItems = order?.lineItems || [];
    const total = order?.total || 0;
    const summaryLines = [
      `Klijent: ${customerName || "Nepoznato"}`,
      `Email: ${customerEmail || "Nije unet"}`,
      "",
      "Stavke:",
      ...lineItems.map((item) => `- ${item.label}: ${item.price} EUR (${item.type})`),
      `Ukupno: ${total} EUR`,
      "",
      "Mere:",
      `Visina: ${h || "-"} cm | Težina: ${w || "-"} kg | Godine: ${age || "-"}`,
      `Grudi: ${chest || "-"} cm`,
      `Struk: ${waist || "-"} cm`,
      `Rukav: ${sleeve || "-"} cm`,
      `Inseam: ${inseam || "-"} cm`,
      "",
      `Napomena: ${notes || "Nema"}`,
    ].join("%0D%0A");

    const mailto = `mailto:${customerEmail || ""}?subject=Porudžbina custom odela&body=${summaryLines}`;
    window.location.href = mailto;
  };

  const handlePayment = () => {
    alert(`Plaćanje (${paymentMethod === "card" ? "kartica" : "gotovina"}) evidentirano.`);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Korak 2</p>
          <h1 className="text-2xl font-semibold text-gray-900">Mere i naplata</h1>
          <p className="text-sm text-gray-500">Sačuvajte mere, stavke i pošaljite ih klijentu.</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>Ukupno za naplatu</p>
          <p className="text-2xl font-semibold text-gray-900">{order?.total ?? 0} EUR</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-700">
              Ime i prezime
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </label>
            <label className="text-sm text-gray-700">
              Email klijenta
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </label>
            <label className="text-sm text-gray-700">
              Visina (cm)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={h as any}
                onChange={(e) => setH(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Težina (kg)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={w as any}
                onChange={(e) => setW(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Godine
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={age as any}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Grudi (cm)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={chest as any}
                onChange={(e) => setChest(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Struk (cm)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={waist as any}
                onChange={(e) => setWaist(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Rukav (cm)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={sleeve as any}
                onChange={(e) => setSleeve(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
            <label className="text-sm text-gray-700">
              Inseam (cm)
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                type="number"
                value={inseam as any}
                onChange={(e) => setInseam(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-700">
              Napomena / dodatni zahtevi
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSendEmail}
              className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.25em] text-white hover:bg-gray-800"
            >
              Pošalji na email klijenta
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(notes)}
              className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.25em] text-gray-700 hover:border-gray-400"
            >
              Sačuvaj belešku
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-gray-900">Sažetak stavki</h2>
            {!order ? (
              <p className="mt-2 text-sm text-gray-500">Nema podataka o konfiguraciji. Vratite se korak nazad.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {order.lineItems.map((item, idx) => (
                  <li key={`${item.label}-${idx}`} className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-gray-900">{item.price} EUR</span>
                  </li>
                ))}
                <li className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2 font-semibold text-gray-900">
                  <span>Ukupno</span>
                  <span>{order.total} EUR</span>
                </li>
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-gray-900">Plaćanje</h2>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 p-3">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  Kartica / online
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 p-3">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  Gotovina / uplata
                </label>
              </div>
              {paymentMethod === "card" && (
                <input
                  type="text"
                  placeholder="Broj kartice (dummy)"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-gray-400 focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={handlePayment}
                className="w-full rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.25em] text-white hover:bg-emerald-500"
              >
                Potvrdi naplatu
              </button>
              <p className="text-xs text-gray-500">Naplata je simulirana i služi za evidenciju iznosa.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

