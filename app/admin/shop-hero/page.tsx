"use client";

import { useEffect, useState } from "react";

type ShopHeroState = {
  shopHeroImage: string;
  shopHeroShowPromo: boolean;
  shopHeroPromoLabel: string;
  shopHeroPromoHref: string;
};

const defaultState: ShopHeroState = {
  shopHeroImage: "/img/hero2.jpg",
  shopHeroShowPromo: false,
  shopHeroPromoLabel: "",
  shopHeroPromoHref: "/akcije",
};

export default function AdminShopHeroPage() {
  const [state, setState] = useState<ShopHeroState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings");
      const json = await res.json();
      if (!json?.success || !json?.settings) {
        setError(json?.message || "Ucitavanje nije uspelo");
        return;
      }
      const s = json.settings;
      setState({
        shopHeroImage: String(s.shopHeroImage || "/img/hero2.jpg"),
        shopHeroShowPromo: Boolean(s.shopHeroShowPromo),
        shopHeroPromoLabel: String(s.shopHeroPromoLabel || ""),
        shopHeroPromoHref: String(s.shopHeroPromoHref || "/akcije"),
      });
    } catch (e: any) {
      setError(e?.message || "Greška pri ucitavanju");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Čuvanje nije uspelo");
        return;
      }
      setNotice("Sačuvano!");
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<ShopHeroState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Web Shop Hero</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Kontrolisi hero sliku i promo poruku na web-shop stranici.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Čuvanje…" : "Sačuvaj"}
          </button>
        </div>
        {notice && (
          <div className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 border border-green-200">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center text-sm text-slate-400">
          Ucitavanje…
        </div>
      ) : (
        <>
          {/* Hero image */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700 uppercase tracking-wider">Slika Pozadine</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">URL slike</label>
                <input
                  type="text"
                  value={state.shopHeroImage}
                  onChange={(e) => set({ shopHeroImage: e.target.value })}
                  placeholder="/img/hero2.jpg"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Relativna putanja (/img/hero2.jpg) ili pun URL slike. Preporuka: 1760×620px ili slicno.
                </p>
              </div>
              {state.shopHeroImage && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.shopHeroImage}
                    alt="Hero preview"
                    className="h-32 w-full object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Promo badge */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Promo Badge</h2>
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <span className="text-sm text-slate-600">Prikazan</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={state.shopHeroShowPromo}
                    onChange={(e) => set({ shopHeroShowPromo: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition-colors ${state.shopHeroShowPromo ? "bg-slate-800" : "bg-slate-300"}`}
                    onClick={() => set({ shopHeroShowPromo: !state.shopHeroShowPromo })}
                  />
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${state.shopHeroShowPromo ? "left-[1.375rem]" : "left-0.5"}`}
                  />
                </div>
              </label>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Floating badge na sredini dna hero slike — za akcije, kolekcije, sezonske objave, itd.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Tekst badge-a</label>
                <input
                  type="text"
                  value={state.shopHeroPromoLabel}
                  onChange={(e) => set({ shopHeroPromoLabel: e.target.value })}
                  placeholder="Akcija — do 30% popusta"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  disabled={!state.shopHeroShowPromo}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Link (href)</label>
                <input
                  type="text"
                  value={state.shopHeroPromoHref}
                  onChange={(e) => set({ shopHeroPromoHref: e.target.value })}
                  placeholder="/akcije"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  disabled={!state.shopHeroShowPromo}
                />
              </div>
            </div>

            {/* Live preview */}
            {state.shopHeroShowPromo && state.shopHeroPromoLabel && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</p>
                <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/80 px-4 py-2 backdrop-blur-sm w-fit">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold text-white">{state.shopHeroPromoLabel}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
