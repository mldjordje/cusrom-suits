"use client";
import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

type Reco = {
  size: string;
  chest: number;
  waist: number;
  sleeve: number;
  inseam: number;
};

export default function MeasurePage() {
  const [h, setH] = useState<number | "">(180);
  const [w, setW] = useState<number | "">(80);
  const [age, setAge] = useState<number | "">(30);
  const [ime, setIme] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [napomena, setNapomena] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const searchParams = useSearchParams();
  const configParam = searchParams.get("config");
  const parsedConfig: SuitState | null = useMemo(() => {
    if (!configParam) return null;
    try {
      return JSON.parse(configParam) as SuitState;
    } catch (err) {
      console.warn("Config parse failed", err);
      return null;
    }
  }, [configParam]);

  const reco: Reco | null = useMemo(() => {
    if (!h || !w) return null;
    const height = Number(h);
    const weight = Number(w);
    const bmi = weight / Math.pow(height / 100, 2);
    let size = "M";
    if (bmi < 21) size = "S";
    else if (bmi > 27) size = "L";
    if (bmi > 31) size = "XL";
    const chest = Math.round(0.52 * height + (bmi - 23) * 1.2);
    const waist = Math.round(0.45 * height + (bmi - 23) * 1.5);
    const sleeve = Math.round(0.40 * height + 2);
    const inseam = Math.round(0.47 * height);
    return { size, chest, waist, sleeve, inseam };
  }, [h, w]);

  const summary = useMemo(() => {
    if (!parsedConfig) return null;
    const suit = suits.find((s) => s.id === parsedConfig.styleId);
    const fabric = fallbackFabrics.find((f) => String(f.id) === String(parsedConfig.colorId));
    const lapel = suit?.lapels?.find((l) => l.id === parsedConfig.lapelId) || suit?.lapels?.[0];
    const lapelWidth = lapel?.widths?.find((w) => w.id === parsedConfig.lapelWidthId) || lapel?.widths?.[0];
    const pocket = suit?.pockets?.find((p) => p.id === parsedConfig.pocketId);
    const breastPocket = suit?.breastPocket?.find((p) => p.id === parsedConfig.breastPocketId);
    const interior = suit?.interiors?.find((i) => i.id === parsedConfig.interiorId);
    const cuff = suit?.cuffs?.find((c) => c.id === parsedConfig.cuffId);
    return {
      suitName: suit?.name || "Model nije izabran",
      fabricName: fabric?.name || "Tkanina nije izabrana",
      lapel: lapel?.name,
      lapelWidth: lapelWidth?.name,
      pocket: pocket?.name,
      breastPocket: breastPocket?.name,
      interior: interior?.name,
      cuff: cuff?.name,
    };
  }, [parsedConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existingRaw = localStorage.getItem("suitOrders");
      const parsed = existingRaw ? JSON.parse(existingRaw) : [];
      const payload = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        config: parsedConfig,
        measurements: { height: h, weight: w, age, reco },
        contact: { ime, email, telefon, napomena },
        savedAt: new Date().toISOString(),
      };
      parsed.unshift(payload);
      localStorage.setItem("suitOrders", JSON.stringify(parsed));
      setStatus("saved");
      alert("Porudzbina je sacuvana. Kontaktiracemo vas u najkracem roku.");
    } catch (err) {
      console.error("Saving order failed", err);
      alert("Trenutno nije moguce sacuvati porudzbinu. Pokusajte ponovo.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 md:p-10">
      <h1 className="mb-6 text-2xl font-semibold">Mere i porudzbina</h1>

      <div className="grid gap-8 md:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              Visina (cm)
              <input
                className="mt-1 w-full rounded border p-2"
                type="number"
                value={h as any}
                onChange={(e) => setH(e.target.value ? Number(e.target.value) : "")}
                required
              />
            </label>
            <label className="text-sm">
              Teina (kg)
              <input
                className="mt-1 w-full rounded border p-2"
                type="number"
                value={w as any}
                onChange={(e) => setW(e.target.value ? Number(e.target.value) : "")}
                required
              />
            </label>
            <label className="text-sm">
              Godine
              <input
                className="mt-1 w-full rounded border p-2"
                type="number"
                value={age as any}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              Ime i prezime
              <input
                className="mt-1 w-full rounded border p-2"
                type="text"
                value={ime}
                onChange={(e) => setIme(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Email
              <input
                className="mt-1 w-full rounded border p-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Telefon
              <input
                className="mt-1 w-full rounded border p-2"
                type="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+381..."
                required
              />
            </label>
            <label className="text-sm">
              Napomena (termin, posebne zelje)
              <textarea
                className="mt-1 w-full rounded border p-2"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                rows={2}
              />
            </label>
          </div>

          <p className="text-xs text-[#666]">Preporuka se automatski rauna i kasnije je moete izmeniti.</p>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              type="submit"
              className="w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-gray-800 md:w-auto"
            >
              Posalji porudzbinu
            </button>
            {status === "saved" && (
              <span className="text-sm font-semibold text-emerald-600">Sacuvano u lokalnu korpu.</span>
            )}
          </div>
        </form>

        <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Preporuene mere</h2>
            {!reco ? (
              <p className="text-sm text-[#777]">Unesite visinu i teinu.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                <li>
                  Veliina: <b>{reco.size}</b>
                </li>
                <li>
                  Grudi: <b>{reco.chest}</b> cm
                </li>
                <li>
                  Struk: <b>{reco.waist}</b> cm
                </li>
                <li>
                  Rukav: <b>{reco.sleeve}</b> cm
                </li>
                <li>
                  Duina nogavice (inseam): <b>{reco.inseam}</b> cm
                </li>
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Vas dizajn</h2>
            {!parsedConfig ? (
              <p className="text-sm text-[#777]">Dizajn nije poslat iz konfiguratora.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                <li>
                  Model: <b>{summary?.suitName}</b>
                </li>
                <li>
                  Tkanina: <b>{summary?.fabricName}</b>
                </li>
                {summary?.lapel && (
                  <li>
                    Rever: <b>{summary.lapel}</b> ({summary.lapelWidth || "irina"})
                  </li>
                )}
                {summary?.pocket && (
                  <li>
                    Depovi: <b>{summary.pocket}</b>
                  </li>
                )}
                {summary?.breastPocket && (
                  <li>
                    Dep na grudima: <b>{summary.breastPocket}</b>
                  </li>
                )}
                {summary?.interior && (
                  <li>
                    Postava: <b>{summary.interior}</b>
                  </li>
                )}
                {summary?.cuff && (
                  <li>
                    Zavrnica: <b>{summary.cuff}</b>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            Nakon slanja porudzbine, nas tim proverava mere i kontaktira vas radi potvrde termina i finalne cene.
          </div>
        </div>
      </div>
    </div>
  );
}

