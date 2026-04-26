"use client";

import { useEffect, useRef, useState } from "react";
import type { FontSettings } from "@/lib/storefront/fontSettings";
import { DEFAULT_FONT_SETTINGS } from "@/lib/storefront/fontSettings";

const POPULAR_BODY_FONTS = [
  "Montserrat",
  "Inter",
  "Lato",
  "Open Sans",
  "Raleway",
  "Poppins",
  "Nunito",
  "Source Sans 3",
  "DM Sans",
  "Roboto",
];

const POPULAR_DISPLAY_FONTS = [
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Lora",
  "Merriweather",
  "EB Garamond",
  "Crimson Text",
  "Abril Fatface",
  "Josefin Sans",
  "Oswald",
];

const emptySettings: FontSettings = { ...DEFAULT_FONT_SETTINGS };

export default function AdminFontsPage() {
  const [settings, setSettings] = useState<FontSettings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/font-settings");
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Ucitavanje nije uspelo.");
      setSettings(json.settings || emptySettings);
    } catch (e: any) {
      setError(e?.message || "Ucitavanje nije uspelo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /** Inject Google Font preview link into document head */
  useEffect(() => {
    const families = [settings.bodyFont, settings.displayFont]
      .filter(Boolean)
      .map((f) => `${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`)
      .join("&family=");

    const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    const existing = document.getElementById("ss-admin-font-preview-link") as HTMLLinkElement | null;
    if (existing) {
      existing.href = href;
    } else {
      const link = document.createElement("link");
      link.id = "ss-admin-font-preview-link";
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [settings.bodyFont, settings.displayFont]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/font-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Cuvanje nije uspelo.");
      setSettings(json.settings || settings);
      setNotice("Podešavanja fontova su sačuvana. Promena je aktivna na storefrontu.");
    } catch (e: any) {
      setError(e?.message || "Cuvanje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FontSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const reset = () => setSettings({ ...DEFAULT_FONT_SETTINGS });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Storefront appearance</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Upravljanje fontovima</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ovde možeš promeniti fontove koji se koriste na storefrontu. Fontovi se učitavaju sa Google Fonts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
            >
              Osvezi
            </button>
            <button
              onClick={reset}
              className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700"
            >
              Reset na default
            </button>
            <button
              onClick={save}
              disabled={saving || loading}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-60"
            >
              {saving ? "Cuvanje..." : "Sacuvaj"}
            </button>
          </div>
        </div>
        {settings.updatedAt ? (
          <p className="mt-3 text-xs text-slate-500">
            Poslednje cuvanje: {new Date(settings.updatedAt).toLocaleString("sr-RS")}
          </p>
        ) : null}
        {loading ? <p className="mt-3 text-sm text-slate-500">Ucitavanje...</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Body font */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Osnovni font</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Body font</h2>
          <p className="mt-1 text-sm text-slate-600">Koristi se za sav tekst na stranici (opisi, dugmad, navigacija).</p>

          <div className="mt-4 grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Google Fonts naziv
              </label>
              <input
                value={settings.bodyFont}
                onChange={(e) => set("bodyFont", e.target.value)}
                placeholder="npr. Montserrat"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Brzi izbor
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_BODY_FONTS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => set("bodyFont", font)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      settings.bodyFont === font
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                    style={{ fontFamily: `"${font}", sans-serif` }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Težina (font weight)
              </label>
              <select
                value={settings.bodyFontWeight}
                onChange={(e) => set("bodyFontWeight", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {["300", "400", "500", "600"].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Display font */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Display font</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Heading / display font</h2>
          <p className="mt-1 text-sm text-slate-600">Koristi se za naslove i prominentne tekstove (logo, section titles).</p>

          <div className="mt-4 grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Google Fonts naziv
              </label>
              <input
                value={settings.displayFont}
                onChange={(e) => set("displayFont", e.target.value)}
                placeholder="npr. Playfair Display"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Brzi izbor
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_DISPLAY_FONTS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => set("displayFont", font)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      settings.displayFont === font
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                    style={{ fontFamily: `"${font}", serif` }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                Težina (font weight)
              </label>
              <select
                value={settings.displayFontWeight}
                onChange={(e) => set("displayFontWeight", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {["400", "600", "700", "800"].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Letter spacing */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Razmak slova</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Letter spacing (base)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Osnovna vrednost razmaka slova za body tekst u em jedinicama. <code className="rounded bg-slate-100 px-1 text-xs">0</code> = bez izmena,{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">0.02</code> = malo rašireno.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={settings.letterSpacingBase}
            onChange={(e) => set("letterSpacingBase", e.target.value)}
            placeholder="0"
            className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          {["0", "0.01", "0.02", "0.04", "0.06"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("letterSpacingBase", v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                settings.letterSpacingBase === v
                  ? "border-slate-800 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pregled</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Live preview</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">Promena je vidljiva odmah — fontovi se učitavaju sa Google Fonts.</p>

        <div
          ref={previewRef}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-6"
          style={{ letterSpacing: settings.letterSpacingBase !== "0" ? `${settings.letterSpacingBase}em` : undefined }}
        >
          <p
            className="mb-1 text-xs uppercase text-slate-500"
            style={{ fontFamily: `"${settings.bodyFont}", sans-serif` }}
          >
            Display font — {settings.displayFont}
          </p>
          <h3
            className="mb-4 text-3xl"
            style={{
              fontFamily: `"${settings.displayFont}", serif`,
              fontWeight: settings.displayFontWeight,
            }}
          >
            Santos &amp; Santorini — Muška moda
          </h3>
          <p
            className="mb-3 text-base leading-relaxed text-slate-700"
            style={{
              fontFamily: `"${settings.bodyFont}", sans-serif`,
              fontWeight: settings.bodyFontWeight,
            }}
          >
            Elegantna odela, košulje i obuća za modernog muškarca. Kolekcija obuhvata slim i regular fit modele
            prilagođene svim prilikama — od poslovnih do svečanih.
          </p>
          <p
            className="text-xs uppercase tracking-[0.14em] text-slate-500"
            style={{ fontFamily: `"${settings.bodyFont}", sans-serif` }}
          >
            Body font — {settings.bodyFont} / weight {settings.bodyFontWeight}
          </p>
        </div>
      </div>
    </div>
  );
}
