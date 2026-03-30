"use client";

import { useEffect, useState } from "react";

type HeroSectionForm = {
  id: string;
  image: string;
  showPromo: boolean;
  promoLabel: string;
  promoHref: string;
};

const emptySection = (index: number): HeroSectionForm => ({
  id: `shop-hero-${index + 1}`,
  image: "/img/hero2.jpg",
  showPromo: false,
  promoLabel: "",
  promoHref: "/akcije",
});

function sectionsFromApi(settings: Record<string, unknown>): HeroSectionForm[] {
  const raw = settings.shopHeroSections;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, 2).map((row, i) => {
      if (!row || typeof row !== "object") return emptySection(i);
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id || `shop-hero-${i + 1}`).trim() || `shop-hero-${i + 1}`,
        image: String(r.image || "/img/hero2.jpg").trim() || "/img/hero2.jpg",
        showPromo: Boolean(r.showPromo),
        promoLabel: String(r.promoLabel || ""),
        promoHref: String(r.promoHref || "/akcije").trim() || "/akcije",
      };
    });
  }
  return [
    {
      id: "shop-hero-1",
      image: String(settings.shopHeroImage || "/img/hero2.jpg"),
      showPromo: Boolean(settings.shopHeroShowPromo),
      promoLabel: String(settings.shopHeroPromoLabel || ""),
      promoHref: String(settings.shopHeroPromoHref || "/akcije"),
    },
  ];
}

export default function AdminShopHeroPage() {
  const [sections, setSections] = useState<HeroSectionForm[]>([emptySection(0)]);
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
      setSections(sectionsFromApi(json.settings as Record<string, unknown>));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri ucitavanju");
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
        body: JSON.stringify({ shopHeroSections: sections }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Čuvanje nije uspelo");
        return;
      }
      if (json.settings) {
        setSections(sectionsFromApi(json.settings as Record<string, unknown>));
      }
      setNotice("Sačuvano!");
      setTimeout(() => setNotice(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (index: number, patch: Partial<HeroSectionForm>) => {
    setSections((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, ...patch };
      return next;
    });
  };

  const addSecond = () => {
    if (sections.length >= 2) return;
    setSections((prev) => [...prev, { ...emptySection(1), image: prev[0]?.image || "/img/hero2.jpg" }]);
  };

  const removeSecond = () => {
    setSections((prev) => (prev.length <= 1 ? prev : prev.slice(0, 1)));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Web Shop Hero</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Do dva hero bloka jedan ispod drugog — slika i opcioni promo badge po bloku.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sections.length < 2 ? (
              <button
                type="button"
                onClick={addSecond}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Dodaj drugi hero
              </button>
            ) : (
              <button
                type="button"
                onClick={removeSecond}
                disabled={loading}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                Ukloni drugi
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Čuvanje…" : "Sačuvaj"}
            </button>
          </div>
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
          {sections.map((sec, index) => (
            <div
              key={`${sec.id}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5"
            >
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Hero blok {index + 1}
                {index === 0 ? " (glavni)" : ""}
              </h2>

              <div>
                <h3 className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Slika</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">URL slike</label>
                    <input
                      type="text"
                      value={sec.image}
                      onChange={(e) => updateSection(index, { image: e.target.value })}
                      placeholder="/img/hero2.jpg"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Relativna putanja ili pun URL. Preporuka: široka panorama (npr. 1760×620px).
                    </p>
                  </div>
                  {sec.image ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sec.image}
                        alt={`Hero ${index + 1} preview`}
                        className="h-32 w-full object-cover"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Promo badge</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Prikazan</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sec.showPromo}
                      onClick={() => updateSection(index, { showPromo: !sec.showPromo })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${sec.showPromo ? "bg-slate-800" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sec.showPromo ? "left-[1.375rem]" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
                <p className="mb-4 text-sm text-slate-500">
                  Badge na dnu ovog hero bloka — akcije, kolekcije, sezonske objave.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Tekst badge-a</label>
                    <input
                      type="text"
                      value={sec.promoLabel}
                      onChange={(e) => updateSection(index, { promoLabel: e.target.value })}
                      placeholder="Akcija — do 30% popusta"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      disabled={!sec.showPromo}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Link (href)</label>
                    <input
                      type="text"
                      value={sec.promoHref}
                      onChange={(e) => updateSection(index, { promoHref: e.target.value })}
                      placeholder="/akcije"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      disabled={!sec.showPromo}
                    />
                  </div>
                </div>
                {sec.showPromo && sec.promoLabel ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</p>
                    <div className="flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm font-semibold text-white">{sec.promoLabel}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
