"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_IMAGE_RATIO_OPTIONS,
  CATEGORY_IMAGE_RATIO_VALUES,
  DEFAULT_CATEGORY_CONTENT,
  makeCategoryContentEntry,
  type CategoryContentEntry,
  type CategoryImageFit,
  type CategoryImageFocus,
  type CategoryImageRatio,
  type CategoryHeroMedia,
  type CategorySizeGuideMode,
} from "@/lib/catalog/categoryContent";

type ConfigurableCategory = {
  key: string;
  label: string;
  parent: string;
};

const FIT_OPTIONS: Array<{ value: CategoryImageFit; label: string; hint: string }> = [
  {
    value: "cover",
    label: "Popuni okvir (cover)",
    hint: "Slika popunjava ceo okvir. Ako nije istog oblika kao okvir, višak se seče.",
  },
  {
    value: "contain",
    label: "Cela slika (contain)",
    hint: "Ništa se ne seče. Ako slika nije istog oblika kao okvir, ostaje prazan prostor u boji ispod.",
  },
];

const FOCUS_OPTIONS: Array<{ value: CategoryImageFocus; label: string }> = [
  { value: "top", label: "Vrh — zadrži glavu i gornji deo" },
  { value: "center", label: "Sredina" },
  { value: "bottom", label: "Dno — zadrži cipele i donji deo" },
];

const SIZE_GUIDE_OPTIONS: Array<{ value: CategorySizeGuideMode; label: string; hint: string }> = [
  {
    value: "auto",
    label: "Automatski (tabela mera)",
    hint: "Dugme „Odredite veličinu\" sa tabelama i kalkulatorom — kao do sada.",
  },
  {
    value: "text",
    label: "Naš tekst",
    hint: "Umesto tabele prikazuje se tekst koji sami napišete ispod.",
  },
  {
    value: "off",
    label: "Isključeno",
    hint: "Nema dugmeta ni tabele. Za manžetne, lančiće, kaiševe i sve bez veličine.",
  },
];

const HERO_OPTIONS: Array<{ value: CategoryHeroMedia; label: string; hint: string }> = [
  { value: "inherit", label: "Zajednički hero", hint: "Kao do sada — ista slika kao na /web-shop." },
  { value: "image", label: "Slika za ovu kategoriju", hint: "Svoja hero slika samo za ovu kategoriju." },
  { value: "video", label: "Video za ovu kategoriju", hint: "Video se vrti u petlji, bez zvuka." },
];

const RATIO_LABEL = new Map(CATEGORY_IMAGE_RATIO_OPTIONS.map((o) => [o.value, o.label]));

/** A stand-in photo shaped like a full-length shot, so the preview shows what gets cut. */
const PREVIEW_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
      <rect width="200" height="300" fill="#e7e2d8"/>
      <circle cx="100" cy="46" r="24" fill="#8a7f6d"/>
      <rect x="66" y="76" width="68" height="104" rx="12" fill="#3f4552"/>
      <rect x="74" y="180" width="24" height="86" fill="#2b3039"/>
      <rect x="102" y="180" width="24" height="86" fill="#2b3039"/>
      <rect x="68" y="266" width="34" height="14" rx="5" fill="#15181d"/>
      <rect x="98" y="266" width="34" height="14" rx="5" fill="#15181d"/>
      <text x="100" y="296" font-family="sans-serif" font-size="11" fill="#8a7f6d" text-anchor="middle">cipele</text>
    </svg>`,
  );

const labelClass = "mb-1 block text-sm font-medium text-slate-600";
const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";
const hintClass = "mt-1 text-xs text-slate-400";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-slate-800" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

export default function AdminCategoryContentPage() {
  const [categories, setCategories] = useState<ConfigurableCategory[]>([]);
  const [entries, setEntries] = useState<Record<string, CategoryContentEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/category-content");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Učitavanje nije uspelo.");
        return;
      }
      setCategories(Array.isArray(json.categories) ? json.categories : []);
      setEntries((json.settings || {}) as Record<string, CategoryContentEntry>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri učitavanju.");
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
      const res = await fetch("/api/admin/webshop/category-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: Object.values(entries) }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Čuvanje nije uspelo.");
        return;
      }
      setEntries((json.settings || {}) as Record<string, CategoryContentEntry>);
      setNotice("Sačuvano. Promene se vide na sajtu odmah.");
      setTimeout(() => setNotice(null), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri čuvanju.");
    } finally {
      setSaving(false);
    }
  };

  /* Falls back to the shipped preset, not to a blank row, so the screen shows
     the framing the shop is actually using — a suit category reads "2:3" here
     even before anyone has saved anything. */
  const entryFor = (category: ConfigurableCategory) =>
    entries[category.key] ||
    makeCategoryContentEntry(
      category.key,
      category.label,
      DEFAULT_CATEGORY_CONTENT[category.key] || {},
    );

  const patch = (category: ConfigurableCategory, next: Partial<CategoryContentEntry>) => {
    setEntries((prev) => {
      const current =
        prev[category.key] ||
        makeCategoryContentEntry(
          category.key,
          category.label,
          DEFAULT_CATEGORY_CONTENT[category.key] || {},
        );
      return {
        ...prev,
        [category.key]: {
          ...current,
          ...next,
          label: category.label,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const resetCategory = (category: ConfigurableCategory) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[category.key];
      return next;
    });
  };

  const grouped = useMemo(() => {
    const main = categories.filter((category) => !category.parent);
    const children = categories.filter((category) => category.parent);
    return { main, children };
  }, [categories]);

  const summarize = (entry: CategoryContentEntry, configured: boolean) => {
    const bits: string[] = [];
    if (entry.imageRatio !== "auto") bits.push(RATIO_LABEL.get(entry.imageRatio) || entry.imageRatio);
    if (entry.imageFit === "contain") bits.push("cela slika");
    if (entry.heroMedia === "video") bits.push("hero video");
    if (entry.heroMedia === "image") bits.push("hero slika");
    if (entry.sizeGuideMode === "off") bits.push("bez tabele veličina");
    if (entry.sizeGuideMode === "text") bits.push("svoj tekst");
    const summary = bits.length ? bits.join(" · ") : "1:1 kvadrat";
    return configured ? summary : `${summary} (podrazumevano)`;
  };

  const renderCategory = (category: ConfigurableCategory) => {
    const entry = entryFor(category);
    const configured = Boolean(entries[category.key]);
    const isOpen = openKey === category.key;
    const previewRatio =
      entry.imageRatio === "auto" ? 1 : CATEGORY_IMAGE_RATIO_VALUES[entry.imageRatio];

    return (
      <div
        key={category.key}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setOpenKey(isOpen ? null : category.key)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{category.label}</span>
              {category.parent ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {category.parent}
                </span>
              ) : null}
              {configured ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  podešeno
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-400">{summarize(entry, configured)}</p>
          </div>
          <span className="shrink-0 text-slate-400">{isOpen ? "▲" : "▼"}</span>
        </button>

        {isOpen ? (
          <div className="border-t border-slate-100 px-5 py-5 space-y-7">
            {/* ---------------- Slike ---------------- */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Prikaz slika proizvoda
              </h3>
              <div className="grid gap-5 md:grid-cols-[1fr_200px]">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Oblik okvira</label>
                    <select
                      value={entry.imageRatio}
                      onChange={(e) =>
                        patch(category, { imageRatio: e.target.value as CategoryImageRatio })
                      }
                      className={inputClass}
                    >
                      {CATEGORY_IMAGE_RATIO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} — {option.hint}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Kako slika popunjava okvir</label>
                    <select
                      value={entry.imageFit}
                      onChange={(e) => patch(category, { imageFit: e.target.value as CategoryImageFit })}
                      className={inputClass}
                    >
                      {FIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className={hintClass}>
                      {FIT_OPTIONS.find((option) => option.value === entry.imageFit)?.hint}
                    </p>
                  </div>

                  {entry.imageFit === "cover" ? (
                    <div>
                      <label className={labelClass}>Šta zadržati kad se slika seče</label>
                      <select
                        value={entry.imageFocus}
                        onChange={(e) =>
                          patch(category, { imageFocus: e.target.value as CategoryImageFocus })
                        }
                        className={inputClass}
                      >
                        {FOCUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass}>Boja praznog prostora</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={entry.imageBackground}
                          onChange={(e) => patch(category, { imageBackground: e.target.value })}
                          className="h-10 w-14 rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={entry.imageBackground}
                          onChange={(e) => patch(category, { imageBackground: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Kako će izgledati</p>
                  <div
                    className="w-full overflow-hidden rounded-xl border border-slate-200"
                    style={{
                      aspectRatio: String(previewRatio),
                      backgroundColor: entry.imageFit === "contain" ? entry.imageBackground : "#fff",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PREVIEW_IMAGE}
                      alt="Primer kadriranja"
                      className="h-full w-full"
                      style={{
                        objectFit: entry.imageFit,
                        objectPosition: `center ${entry.imageFocus}`,
                      }}
                    />
                  </div>
                  <p className={hintClass}>
                    Primer je uspravna fotografija 2:3. Ako se cipele ne vide ovde, neće se videti ni na
                    sajtu.
                  </p>
                </div>
              </div>
            </section>

            {/* ---------------- Hero ---------------- */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hero na vrhu kategorije
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Šta se prikazuje</label>
                  <select
                    value={entry.heroMedia}
                    onChange={(e) => patch(category, { heroMedia: e.target.value as CategoryHeroMedia })}
                    className={inputClass}
                  >
                    {HERO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className={hintClass}>
                    {HERO_OPTIONS.find((option) => option.value === entry.heroMedia)?.hint}
                  </p>
                </div>

                {entry.heroMedia === "image" ? (
                  <div>
                    <label className={labelClass}>URL slike</label>
                    <input
                      type="text"
                      value={entry.heroImage}
                      onChange={(e) => patch(category, { heroImage: e.target.value })}
                      placeholder="/img/hero-odela.jpg"
                      className={inputClass}
                    />
                    <p className={hintClass}>Preporuka: široka panorama, oko 1760×620px.</p>
                  </div>
                ) : null}

                {entry.heroMedia === "video" ? (
                  <>
                    <div>
                      <label className={labelClass}>URL videa (.mp4 ili .webm)</label>
                      <input
                        type="text"
                        value={entry.heroVideoUrl}
                        onChange={(e) => patch(category, { heroVideoUrl: e.target.value })}
                        placeholder="https://assets.santos.rs/fajlovi/video/odela.mp4"
                        className={inputClass}
                      />
                      <p className={hintClass}>
                        Vrti se u petlji, bez zvuka. Držite fajl ispod ~8 MB da se strana brzo učita.
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Naslovna slika videa (poster)</label>
                      <input
                        type="text"
                        value={entry.heroVideoPoster}
                        onChange={(e) => patch(category, { heroVideoPoster: e.target.value })}
                        placeholder="/img/hero-odela.jpg"
                        className={inputClass}
                      />
                      <p className={hintClass}>
                        Prikazuje se dok se video učitava i posetiocima koji su isključili animacije.
                      </p>
                    </div>
                  </>
                ) : null}

                {entry.heroMedia !== "inherit" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Naslov (SR)</label>
                      <input
                        type="text"
                        value={entry.heroTitle}
                        onChange={(e) => patch(category, { heroTitle: e.target.value })}
                        placeholder={category.label}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Naslov (EN)</label>
                      <input
                        type="text"
                        value={entry.heroTitleEn}
                        onChange={(e) => patch(category, { heroTitleEn: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Podnaslov (SR)</label>
                      <textarea
                        rows={2}
                        value={entry.heroLead}
                        onChange={(e) => patch(category, { heroLead: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Podnaslov (EN)</label>
                      <textarea
                        rows={2}
                        value={entry.heroLeadEn}
                        onChange={(e) => patch(category, { heroLeadEn: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}

                <Toggle
                  checked={entry.showHeroActions}
                  onChange={(next) => patch(category, { showHeroActions: next })}
                  label="Prikaži dugmad „Kolekcija” i „Akcija”"
                />
                <p className={hintClass}>
                  Isključeno po pravilu — ta dugmad vode nazad na ceo shop, pa nemaju smisla unutar
                  kategorije.
                </p>
              </div>
            </section>

            {/* ---------------- Tabela veličina ---------------- */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                „Odredite veličinu” na strani proizvoda
              </h3>
              <div className="space-y-4">
                <div>
                  <select
                    value={entry.sizeGuideMode}
                    onChange={(e) =>
                      patch(category, { sizeGuideMode: e.target.value as CategorySizeGuideMode })
                    }
                    className={inputClass}
                  >
                    {SIZE_GUIDE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className={hintClass}>
                    {SIZE_GUIDE_OPTIONS.find((option) => option.value === entry.sizeGuideMode)?.hint}
                  </p>
                </div>

                {entry.sizeGuideMode === "text" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Tekst (SR)</label>
                      <textarea
                        rows={6}
                        value={entry.sizeGuideText}
                        onChange={(e) => patch(category, { sizeGuideText: e.target.value })}
                        placeholder={"Dužina lančića je 55 cm.\n\nMaterijal: hirurški čelik, ne tamni."}
                        className={inputClass}
                      />
                      <p className={hintClass}>Prazan red pravi novi pasus.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Tekst (EN)</label>
                      <textarea
                        rows={6}
                        value={entry.sizeGuideTextEn}
                        onChange={(e) => patch(category, { sizeGuideTextEn: e.target.value })}
                        className={inputClass}
                      />
                      <p className={hintClass}>
                        Ako je prazno, dugme se ne prikazuje na engleskoj verziji sajta.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {configured ? (
              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => resetCategory(category)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                >
                  Vrati na podrazumevano
                </button>
                <p className={hintClass}>Briše sva podešavanja za ovu kategoriju. Sačuvajte da potvrdite.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Kategorije — izgled i sadržaj</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Po kategoriji: kako se kadriraju slike proizvoda, šta stoji u hero bloku na vrhu, i da li
              se nudi tabela veličina.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Čuvanje…" : "Sačuvaj sve"}
          </button>
        </div>
        {notice ? (
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
          Učitavanje…
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Glavne kategorije
            </h2>
            {grouped.main.map(renderCategory)}
          </div>

          {grouped.children.length ? (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Podkategorije
              </h2>
              <p className="-mt-1 text-xs text-slate-400">
                Podešavanje podkategorije ima prednost nad glavnom kategorijom u kojoj se nalazi.
              </p>
              {grouped.children.map(renderCategory)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
