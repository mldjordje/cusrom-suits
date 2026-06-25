"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALLOWED_FONT_WEIGHTS,
  type FontFallback,
  type FontFamilyRecord,
  type FontWeight,
} from "@/lib/storefront/fontLibraryDefaults";
import {
  DEFAULT_FONT_SETTINGS,
  buildGoogleFontUrls,
  buildStorefrontFontCss,
  resolveFontSettings,
  type FontSettingsShape,
} from "@/lib/storefront/fontSettingsDefaults";

type UploadRow = { weight: FontWeight; file: File | null };
const buttonClass = "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-50";

export default function AdminFontsPage() {
  const [settings, setSettings] = useState<FontSettingsShape>({ ...DEFAULT_FONT_SETTINGS });
  const [fonts, setFonts] = useState<FontFamilyRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState("");
  const [googleFallback, setGoogleFallback] = useState<FontFallback>("sans-serif");
  const [uploadName, setUploadName] = useState("");
  const [uploadFallback, setUploadFallback] = useState<FontFallback>("sans-serif");
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([{ weight: "400", file: null }]);

  const load = async () => {
    setBusy(true); setError(null);
    try {
      const [settingsRes, fontsRes] = await Promise.all([fetch("/api/admin/font-settings"), fetch("/api/admin/fonts")]);
      const [settingsJson, fontsJson] = await Promise.all([settingsRes.json(), fontsRes.json()]);
      if (!settingsJson?.success) throw new Error(settingsJson?.message || "Podešavanja nisu učitana.");
      if (!fontsJson?.success) throw new Error(fontsJson?.message || "Biblioteka fontova nije učitana.");
      setSettings({ ...DEFAULT_FONT_SETTINGS, ...settingsJson.settings });
      setFonts(fontsJson.fonts || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Učitavanje nije uspelo."); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, []);

  const resolved = useMemo(() => resolveFontSettings(settings, fonts.length ? fonts : undefined), [settings, fonts]);
  const previewCss = useMemo(() => buildStorefrontFontCss(resolved), [resolved]);
  const previewUrls = useMemo(() => buildGoogleFontUrls(resolved), [resolved]);

  useEffect(() => {
    document.querySelectorAll("[data-admin-font-preview]").forEach((node) => node.remove());
    previewUrls.forEach((href) => {
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; link.dataset.adminFontPreview = "true"; document.head.appendChild(link);
    });
    return () => document.querySelectorAll("[data-admin-font-preview]").forEach((node) => node.remove());
  }, [previewUrls]);

  const selectedFont = (role: "body" | "heading") => fonts.find((font) => font.id === (role === "body" ? settings.bodyFontId : settings.displayFontId));
  const selectRole = (role: "body" | "heading", id: string) => {
    const font = fonts.find((item) => item.id === id); if (!font) return;
    const weightKey = role === "body" ? "bodyFontWeight" : "displayFontWeight";
    const currentWeight = settings[weightKey];
    setSettings((current) => ({ ...current, ...(role === "body" ? { bodyFontId: id, bodyFont: font.name } : { displayFontId: id, displayFont: font.name }), [weightKey]: font.weights.includes(currentWeight as FontWeight) ? currentWeight : font.weights[0] }));
  };

  const save = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/font-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const json = await response.json(); if (!json?.success) throw new Error(json?.message || "Čuvanje nije uspelo.");
      setSettings(json.settings); setMessage("Globalni fontovi su sačuvani i aktivni na storefrontu.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Čuvanje nije uspelo."); }
    finally { setBusy(false); }
  };

  const addGoogle = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/fonts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "google", name: googleName, fallback: googleFallback, weights: [...ALLOWED_FONT_WEIGHTS] }) });
      const json = await response.json(); if (!json?.success) throw new Error(json?.message || "Google font nije dodat.");
      setFonts(json.fonts); setGoogleName(""); setMessage("Google font je dodat u biblioteku.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Google font nije dodat."); }
    finally { setBusy(false); }
  };

  const upload = async () => {
    const completeRows = uploadRows.filter((row): row is UploadRow & { file: File } => Boolean(row.file));
    if (!uploadName.trim() || completeRows.length !== uploadRows.length) { setError("Unesite naziv i izaberite WOFF2 fajl za svaku težinu."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const form = new FormData(); form.append("familyName", uploadName); form.append("fallback", uploadFallback);
      completeRows.forEach((row) => { form.append("files", row.file); form.append("weights", row.weight); });
      const response = await fetch("/api/admin/fonts", { method: "POST", body: form });
      const json = await response.json(); if (!json?.success) throw new Error(json?.message || "Upload nije uspeo.");
      const nextFonts = json.fonts || [];
      const uploadedFont = nextFonts.find((font: FontFamilyRecord) => font.source === "uploaded" && font.name === uploadName.trim());
      setFonts(nextFonts);
      if (uploadedFont) {
        setSettings((current) => ({
          ...current,
          displayFontId: uploadedFont.id,
          displayFont: uploadedFont.name,
          displayFontWeight: uploadedFont.weights.includes(current.displayFontWeight as FontWeight)
            ? current.displayFontWeight
            : uploadedFont.weights[0],
        }));
      }
      setUploadName(""); setUploadRows([{ weight: "400", file: null }]); setMessage("WOFF2 font je dodat i izabran za naslove. Kliknite Sačuvaj da bude aktivan na sajtu.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload nije uspeo."); }
    finally { setBusy(false); }
  };

  const RoleCard = ({ role, title }: { role: "body" | "heading"; title: string }) => {
    const font = selectedFont(role);
    const weightKey = role === "body" ? "bodyFontWeight" : "displayFontWeight";
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <label className="mt-4 block text-xs font-semibold text-slate-600">Porodica fonta</label>
      <select value={role === "body" ? settings.bodyFontId : settings.displayFontId} onChange={(event) => selectRole(role, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {fonts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.source === "google" ? "Google" : "Upload"}</option>)}
      </select>
      <label className="mt-4 block text-xs font-semibold text-slate-600">Podrazumevana težina</label>
      <select value={settings[weightKey]} onChange={(event) => setSettings((current) => ({ ...current, [weightKey]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {(font?.weights || []).map((weight) => <option key={weight} value={weight}>{weight}</option>)}
      </select>
      {font ? <p className="mt-3 text-xs text-slate-500">Izvor: {font.source} · Dostupno: {font.weights.join(", ")}</p> : null}
    </section>;
  };

  return <div className="flex flex-col gap-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Storefront</p><h1 className="text-2xl font-bold text-slate-900">Globalni fontovi</h1><p className="mt-1 text-sm text-slate-600">Dva fonta kontrolišu sav tekst i naslove na javnom sajtu.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => setSettings({ ...DEFAULT_FONT_SETTINGS })} className={`${buttonClass} border-amber-200 bg-amber-50 text-amber-700`}>Reset</button><button type="button" onClick={() => void save()} disabled={busy || !fonts.length} className={`${buttonClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{busy ? "Radim..." : "Sačuvaj"}</button></div></div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}{message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
    </header>

    <div className="grid gap-6 xl:grid-cols-2"><RoleCard role="body" title="Osnovni font" /><RoleCard role="heading" title="Font za naslove" /></div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Dodaj Google font</h2><p className="mt-1 text-sm text-slate-500">Unesite tačan naziv porodice sa Google Fonts.</p>
        <input value={googleName} onChange={(event) => setGoogleName(event.target.value)} placeholder="npr. Cormorant Garamond" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select value={googleFallback} onChange={(event) => setGoogleFallback(event.target.value as FontFallback)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="sans-serif">Sans-serif</option><option value="serif">Serif</option></select>
        <button type="button" onClick={() => void addGoogle()} disabled={busy || !googleName.trim()} className={`${buttonClass} mt-4 border-indigo-200 bg-indigo-50 text-indigo-700`}>Dodaj Google font</button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Upload WOFF2 fonta</h2><p className="mt-1 text-sm text-slate-500">Dodajte poseban fajl za svaku dostupnu težinu, maksimalno 5 MB.</p>
        <input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="Naziv porodice" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select value={uploadFallback} onChange={(event) => setUploadFallback(event.target.value as FontFallback)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="sans-serif">Sans-serif</option><option value="serif">Serif</option></select>
        <div className="mt-3 space-y-2">{uploadRows.map((row, index) => <div key={index} className="grid grid-cols-[100px_1fr_auto] gap-2"><select value={row.weight} onChange={(event) => setUploadRows((rows) => rows.map((item, i) => i === index ? { ...item, weight: event.target.value as FontWeight } : item))} className="rounded-xl border border-slate-200 px-2 text-sm">{ALLOWED_FONT_WEIGHTS.map((weight) => <option key={weight}>{weight}</option>)}</select><input type="file" accept=".woff2,font/woff2" onChange={(event) => setUploadRows((rows) => rows.map((item, i) => i === index ? { ...item, file: event.target.files?.[0] || null } : item))} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs" /><button type="button" disabled={uploadRows.length === 1} onClick={() => setUploadRows((rows) => rows.filter((_, i) => i !== index))} className="px-2 text-rose-500">×</button></div>)}</div>
        <div className="mt-3 flex gap-2"><button type="button" onClick={() => setUploadRows((rows) => [...rows, { weight: "700", file: null }])} className={`${buttonClass} border-slate-200 text-slate-700`}>+ Težina</button><button type="button" onClick={() => void upload()} disabled={busy} className={`${buttonClass} border-indigo-200 bg-indigo-50 text-indigo-700`}>Upload</button></div>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Live preview</h2><style>{previewCss}</style><div className="ss-storefront-font-scope mt-4 rounded-xl bg-slate-50 p-6"><h2 className="text-3xl">Santos &amp; Santorini</h2><p className="mt-3">Elegantna odela, košulje i obuća za modernog muškarca. Proverite izgled osnovnog teksta, dugmadi i naslova pre čuvanja.</p><button type="button" className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm text-white">Pogledaj kolekciju</button></div></section>
  </div>;
}
