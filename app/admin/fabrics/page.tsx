"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Fabric = {
  id: string;
  name: string;
  texture: string;
  tone?: string;
  price?: number | null;
  code?: string | null;
  pattern?: string | null;
  textureScale?: number | null;
  textureStrength?: number | null;
  textureContrast?: number | null;
  textureBrightness?: number | null;
  stripeSpacing?: number | null;
  stripeSpacingJacket?: number | null;
  stripeSpacingPants?: number | null;
  pantsStripeAngleDelta?: number | null;
  detailImage?: string | null;
  detailText?: string | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };
type StripeOrientation = "vertical" | "horizontal" | "none";
type StripeHint = { strength: number; orientation: StripeOrientation; contrast: number };
type SortKey = "default" | "name" | "tone";

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS = ["light", "medium", "dark"] as const;
const TONE_LABELS: Record<string, string> = { light: "Svetla", medium: "Srednja", dark: "Tamna" };
const TONE_COLORS: Record<string, string> = {
  light: "bg-gray-100 text-gray-700",
  medium: "bg-gray-400 text-white",
  dark: "bg-gray-800 text-white",
};

const PATTERN_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "solid", label: "Puna" },
  { value: "pinstripe", label: "Pinstripe" },
  { value: "stripe", label: "Pruge" },
  { value: "check", label: "Karo" },
];

const EMPTY_FORM = {
  id: "", name: "", tone: "medium", price: "", code: "", texture: "",
  pattern: "", textureScale: "", textureStrength: "", textureContrast: "",
  textureBrightness: "", stripeSpacing: "", stripeSpacingJacket: "",
  stripeSpacingPants: "", pantsStripeAngleDelta: "", detailImage: "", detailText: "",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const computeStripeHint = (data: Uint8ClampedArray, w: number, h: number): StripeHint => {
  if (!data.length || w < 2 || h < 2) return { strength: 0, orientation: "none", contrast: 0 };
  const prevRow = new Float32Array(w);
  let edgeX = 0, edgeY = 0, sum = 0, sumSq = 0;
  const pixels = w * h;
  for (let y = 0; y < h; y++) {
    let prev = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum; sumSq += lum * lum;
      if (x > 0) edgeX += Math.abs(lum - prev);
      if (y > 0) edgeY += Math.abs(lum - prevRow[x]);
      prevRow[x] = lum; prev = lum;
    }
  }
  const mean = sum / pixels;
  const contrast = Math.min(1, Math.sqrt(Math.max(0, sumSq / pixels - mean * mean)) / 255);
  const edgeAvg = (edgeX + edgeY) / (pixels * 255);
  const ratio = edgeY < 0.0001 ? 999 : edgeX / edgeY;
  let orientation: StripeOrientation = "none";
  if (ratio > 1.2) orientation = "vertical";
  else if (ratio < 0.83) orientation = "horizontal";
  const strength = clamp(edgeAvg * 2.05 + contrast * 0.85, 0, 1);
  if (strength < 0.08) orientation = "none";
  return { strength, orientation, contrast };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FabricsAdminPage() {
  // State
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [suggestStatus, setSuggestStatus] = useState<Status>({ type: "idle" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [autoTone, setAutoTone] = useState<string | null>(null);
  const [seamlessEnabled, setSeamlessEnabled] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState({ render: false, stripe: false, details: false });
  const formRef = useRef<HTMLDivElement>(null);

  const isEditing = Boolean(form.id);
  const stripeSpacingDisplay = clamp(Number.parseFloat(form.stripeSpacing) || 6, 1, 10);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { loadFabrics(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast
  useEffect(() => {
    if (status.type === "success" || status.type === "error") {
      const t = setTimeout(() => setStatus({ type: "idle" }), 4000);
      return () => clearTimeout(t);
    }
  }, [status.type, status.message]);

  // Live texture preview URL
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadFabrics = async () => {
    const res = await fetch("/api/fabrics");
    const json = await res.json();
    if (json?.data) setFabrics(json.data);
  };

  const bumpRevision = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("fabrics:rev", String(Date.now()));
    window.dispatchEvent(new Event("fabrics:updated"));
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredFabrics = useMemo(() => {
    let list = [...fabrics];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.code ?? "").toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "tone") {
      const ord: Record<string, number> = { dark: 0, medium: 1, light: 2 };
      list.sort((a, b) => (ord[a.tone ?? ""] ?? 1) - (ord[b.tone ?? ""] ?? 1));
    }
    return list;
  }, [fabrics, search, sortBy]);

  const stats = useMemo(() => ({
    total: fabrics.length,
    dark: fabrics.filter(f => f.tone === "dark").length,
    medium: fabrics.filter(f => f.tone === "medium").length,
    light: fabrics.filter(f => f.tone === "light").length,
  }), [fabrics]);

  // ── Image utils ───────────────────────────────────────────────────────────

  const makeSeamlessTile = (f: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no ctx")); return; }
        ctx.drawImage(img, hw, hh, w - hw, h - hh, 0,      0,      w - hw, h - hh);
        ctx.drawImage(img, 0,  hh, hw,     h - hh, w - hw, 0,      hw,     h - hh);
        ctx.drawImage(img, hw, 0,  w - hw, hh,     0,      h - hh, w - hw, hh);
        ctx.drawImage(img, 0,  0,  hw,     hh,     w - hw, h - hh, hw,     hh);
        URL.revokeObjectURL(url);
        c.toBlob(blob => {
          if (!blob) { reject(new Error("toBlob failed")); return; }
          resolve(new File([blob], f.name.replace(/\.[^.]+$/, "") + "_seamless.png", { type: "image/png" }));
        }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
      img.src = url;
    });

  const analyzeTexture = async (blob: File) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const blobUrl = URL.createObjectURL(new Blob([bytes]));
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new window.Image();
        i.onload = () => res(i); i.onerror = rej; i.src = blobUrl;
      });
      const c = document.createElement("canvas");
      c.width = c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 240, 240);
      const data = ctx.getImageData(0, 0, 240, 240).data;
      let sum = 0, sumSq = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a < 0.05) continue;
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        sum += lum; sumSq += lum * lum; count++;
      }
      const avg = count ? sum / count : 0.4;
      const contrast = Math.sqrt(Math.max(0, count ? sumSq / count - avg * avg : 0));
      return { avgLum: avg, contrast, stripe: computeStripeHint(data, 240, 240) };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const detectTone = async (blob: File): Promise<"light" | "medium" | "dark" | null> => {
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const blobUrl = URL.createObjectURL(new Blob([bytes]));
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new window.Image();
        i.onload = () => res(i); i.onerror = rej; i.src = blobUrl;
      });
      const c = document.createElement("canvas");
      c.width = c.height = 200;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 200, 200);
      const data = ctx.getImageData(0, 0, 200, 200).data;
      let sum = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] / 255 < 0.05) continue;
        sum += (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
        count++;
      }
      URL.revokeObjectURL(blobUrl);
      if (!count) return null;
      const avg = sum / count;
      return avg < 0.28 ? "dark" : avg < 0.55 ? "medium" : "light";
    } catch { return null; }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onFileChange = async (f: File | null) => {
    setFile(f);
    setSuggestStatus({ type: "idle" });
    if (!f) { setAutoTone(null); return; }
    const tone = await detectTone(f);
    if (tone) { setAutoTone(tone); setForm(s => ({ ...s, tone })); }
    else setAutoTone(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) onFileChange(f);
  };

  const suggestSettings = async () => {
    if (!file) { setSuggestStatus({ type: "error", message: "Prvo izaberi fajl." }); return; }
    setSuggestStatus({ type: "loading", message: "Analiziram..." });
    try {
      const a = await analyzeTexture(file);
      if (!a) { setSuggestStatus({ type: "error", message: "Ne mogu da procitam teksturu." }); return; }
      const { avgLum, stripe } = a;
      const isStripe = stripe.orientation !== "none" && (stripe.strength >= 0.12 || stripe.contrast >= 0.1);
      if (!isStripe) { setSuggestStatus({ type: "success", message: "Nisu detektovane pruge." }); return; }
      const bold = stripe.strength >= 0.32 || stripe.contrast >= 0.18;
      const tone = avgLum < 0.28 ? "dark" : avgLum < 0.55 ? "medium" : "light";
      setForm(s => ({
        ...s,
        pattern: bold ? "stripe" : "pinstripe",
        textureScale: bold ? "0.85" : "0.70",
        textureStrength: bold ? "0.60" : "0.70",
        textureBrightness: tone === "dark" ? "1.05" : tone === "medium" ? "1.04" : "1.02",
        textureContrast: tone === "dark" ? "1.45" : tone === "medium" ? "1.32" : "1.18",
      }));
      setSuggestStatus({ type: "success", message: `Predlog: ${bold ? "stripe" : "pinstripe"}, ton: ${tone}` });
    } catch { setSuggestStatus({ type: "error", message: "Greška pri analizi." }); }
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setFile(null); setDetailFile(null); setAutoTone(null);
    setSuggestStatus({ type: "idle" });
  };

  const onEdit = (fab: Fabric) => {
    setForm({
      id: fab.id || "",
      name: fab.name || "",
      tone: fab.tone || "medium",
      price: fab.price ? String(fab.price) : "",
      code: fab.code || "",
      texture: fab.texture || "",
      pattern: fab.pattern || "",
      textureScale: typeof fab.textureScale === "number" ? String(fab.textureScale) : "",
      textureStrength: typeof fab.textureStrength === "number" ? String(fab.textureStrength) : "",
      textureContrast: typeof fab.textureContrast === "number" ? String(fab.textureContrast) : "",
      textureBrightness: typeof fab.textureBrightness === "number" ? String(fab.textureBrightness) : "",
      stripeSpacing: typeof fab.stripeSpacing === "number" ? String(fab.stripeSpacing) : "",
      stripeSpacingJacket: typeof fab.stripeSpacingJacket === "number" ? String(fab.stripeSpacingJacket) : "",
      stripeSpacingPants: typeof fab.stripeSpacingPants === "number" ? String(fab.stripeSpacingPants) : "",
      pantsStripeAngleDelta: typeof fab.pantsStripeAngleDelta === "number" ? String(fab.pantsStripeAngleDelta) : "",
      detailImage: fab.detailImage || (fab as any).detail_image || "",
      detailText: fab.detailText || (fab as any).detail_text || "",
    });
    setFile(null); setDetailFile(null); setAutoTone(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onCopy = (fab: Fabric) => onEdit({ ...fab, id: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setStatus({ type: "error", message: "Naziv je obavezan" }); return; }
    if (!file && !form.texture.trim()) { setStatus({ type: "error", message: "Dodaj teksturu ili uploaduj fajl" }); return; }
    setStatus({ type: "loading", message: "Čuvam..." });
    const fd = new FormData();
    if (form.id.trim()) fd.set("id", form.id.trim());
    fd.set("name", form.name.trim());
    fd.set("tone", form.tone);
    if (form.price.trim()) fd.set("price", form.price.trim());
    if (form.code.trim()) fd.set("code", form.code.trim());
    if (form.texture.trim()) fd.set("texture", form.texture.trim());
    fd.set("pattern", form.pattern.trim());
    if (form.textureScale.trim()) fd.set("textureScale", form.textureScale.trim());
    if (form.textureStrength.trim()) fd.set("textureStrength", form.textureStrength.trim());
    if (form.textureContrast.trim()) fd.set("textureContrast", form.textureContrast.trim());
    if (form.textureBrightness.trim()) fd.set("textureBrightness", form.textureBrightness.trim());
    if (form.stripeSpacing.trim()) fd.set("stripeSpacing", form.stripeSpacing.trim());
    if (form.stripeSpacingJacket.trim()) fd.set("stripeSpacingJacket", form.stripeSpacingJacket.trim());
    if (form.stripeSpacingPants.trim()) fd.set("stripeSpacingPants", form.stripeSpacingPants.trim());
    if (form.pantsStripeAngleDelta.trim()) fd.set("pantsStripeAngleDelta", form.pantsStripeAngleDelta.trim());
    if (form.detailImage.trim()) fd.set("detailImage", form.detailImage.trim());
    if (form.detailText.trim()) fd.set("detailText", form.detailText.trim());
    if (file) {
      const upload = seamlessEnabled ? await makeSeamlessTile(file).catch(() => file) : file;
      fd.set("file", upload);
    }
    if (detailFile) fd.set("detailFile", detailFile);
    const res = await fetch("/api/fabrics/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) { setStatus({ type: "error", message: json?.message || "Greška" }); return; }
    setStatus({ type: "success", message: isEditing ? "Tkanina ažurirana ✓" : "Tkanina dodana ✓" });
    setForm(EMPTY_FORM);
    setFile(null); setDetailFile(null); setAutoTone(null);
    await loadFabrics();
    bumpRevision();
  };

  const onDelete = async (id: string) => {
    setDeleteConfirm(null);
    setStatus({ type: "loading", message: "Brišem..." });
    const res = await fetch("/api/fabrics/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) setStatus({ type: "error", message: json?.message || "Brisanje neuspješno" });
    else {
      setStatus({ type: "success", message: "Obrisano ✓" });
      setFabrics(prev => prev.filter(f => f.id !== id));
      bumpRevision();
    }
  };

  const exportCSV = () => {
    const headers = ["id", "name", "tone", "price", "code", "pattern", "texture", "textureScale", "stripeSpacing"];
    const rows = fabrics.map(f => headers.map(h => `"${(f as any)[h] ?? ""}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `fabrics-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const f = (key: keyof typeof form) =>
    (value: string) => setForm(s => ({ ...s, [key]: value }));

  const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none transition";
  const sectionToggle = (key: keyof typeof expanded) =>
    setExpanded(s => ({ ...s, [key]: !s[key] }));

  const SectionHeader = ({ label, sectionKey, hint }: { label: string; sectionKey: keyof typeof expanded; hint?: string }) => (
    <button
      type="button"
      onClick={() => sectionToggle(sectionKey)}
      className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left transition hover:bg-gray-50"
    >
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {hint && <span className="ml-2 text-xs text-gray-400">{hint}</span>}
      </div>
      <svg
        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded[sectionKey] ? "rotate-180" : ""}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const previewSrc = previewUrl || (form.texture.startsWith("http") ? form.texture : null);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {status.type !== "idle" && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl transition-all ${
          status.type === "success" ? "bg-emerald-600 text-white"
          : status.type === "error" ? "bg-red-600 text-white"
          : "bg-gray-900 text-white"
        }`}>
          {status.type === "loading" && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          )}
          {status.message}
        </div>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Obrisati tkaninu?</h3>
            <p className="mt-1 text-sm text-gray-600">
              &ldquo;{deleteConfirm.name}&rdquo; će biti trajno obrisana.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => onDelete(deleteConfirm.id)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Obriši
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <header className="border-b bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fabrics CMS</h1>
            <p className="text-xs text-gray-500">{stats.total} tkanina · {stats.dark} tamnih · {stats.medium} srednje · {stats.light} svetlih</p>
          </div>
          {isEditing && (
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 sm:inline">
                Editovanje: {form.name || "—"}
              </span>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
              >
                ✕ Otkaži
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-8 xl:grid-cols-[460px_1fr]">

          {/* ── FORM PANEL ─────────────────────────────────────────────── */}
          <div ref={formRef} className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <form onSubmit={onSubmit} className="space-y-3">

              {/* Section: Basic info */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Osnovno</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Naziv *</label>
                    <input value={form.name} onChange={e => f("name")(e.target.value)}
                      className={inputCls} placeholder="Npr. Dark Herringbone" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Šifra</label>
                      <input value={form.code} onChange={e => f("code")(e.target.value)}
                        className={inputCls} placeholder="CODE-123" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Cena (EUR)</label>
                      <input value={form.price} onChange={e => f("price")(e.target.value)}
                        className={inputCls} placeholder="300" inputMode="decimal" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Ton</label>
                    <div className="flex gap-2">
                      {TONE_OPTIONS.map(t => (
                        <button key={t} type="button" onClick={() => f("tone")(t)}
                          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                            form.tone === t ? TONE_COLORS[t] + " ring-2 ring-offset-1 ring-gray-400" : "border border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {TONE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    {autoTone && (
                      <p className="mt-1 text-[11px] text-emerald-600">
                        ✓ Auto-detektovano: {autoTone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      ID <span className="font-normal text-gray-400">(opciono — auto ako prazno)</span>
                    </label>
                    <input value={form.id} onChange={e => f("id")(e.target.value)}
                      className={inputCls} placeholder="slug-id" />
                  </div>
                </div>
              </div>

              {/* Section: Texture upload */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tekstura</p>

                {/* Drop zone */}
                <input id="fabric-file" type="file" accept="image/*"
                  onChange={e => onFileChange(e.target.files?.[0] || null)} className="sr-only" />
                <label
                  htmlFor="fabric-file"
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition ${
                    dragOver ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {file ? (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Prevuci ili klikni</p>
                      <p className="text-xs text-gray-400">PNG/JPG, min 800×800</p>
                    </div>
                  )}
                </label>

                {/* Seamless toggle */}
                <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-xs text-gray-700 select-none">
                  <div className={`relative h-5 w-9 rounded-full transition ${seamlessEnabled ? "bg-gray-900" : "bg-gray-200"}`}
                    onClick={() => setSeamlessEnabled(s => !s)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${seamlessEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span>Seamless tile <span className="text-gray-400">(preporučeno)</span></span>
                </label>

                {/* Texture URL fallback */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Texture URL <span className="font-normal text-gray-400">(ili fajl gore)</span>
                  </label>
                  <input value={form.texture} onChange={e => f("texture")(e.target.value)}
                    className={inputCls} placeholder="https://..." />
                </div>

                {/* Live tiled preview */}
                {previewSrc && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-gray-500">Live preview (tiled)</p>
                    <div className="h-20 w-full overflow-hidden rounded-lg border border-gray-100"
                      style={{ backgroundImage: `url(${previewSrc})`, backgroundRepeat: "repeat", backgroundSize: "80px 80px" }} />
                  </div>
                )}
              </div>

              {/* Section: Render settings (collapsible) */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <SectionHeader label="Podesavanja renderovanja" sectionKey="render" hint={form.pattern ? `· ${form.pattern}` : ""} />
                {expanded.render && (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Uzorak / Pattern</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PATTERN_OPTIONS.map(opt => (
                          <button key={opt.value} type="button" onClick={() => f("pattern")(opt.value)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              form.pattern === opt.value
                                ? "bg-gray-900 text-white"
                                : "border border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Skala</label>
                        <input value={form.textureScale} onChange={e => f("textureScale")(e.target.value)}
                          className={inputCls} placeholder="1.0" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Jačina</label>
                        <input value={form.textureStrength} onChange={e => f("textureStrength")(e.target.value)}
                          className={inputCls} placeholder="0.35" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Kontrast</label>
                        <input value={form.textureContrast} onChange={e => f("textureContrast")(e.target.value)}
                          className={inputCls} placeholder="1.3" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Svetlina</label>
                        <input value={form.textureBrightness} onChange={e => f("textureBrightness")(e.target.value)}
                          className={inputCls} placeholder="1.05" inputMode="decimal" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={suggestSettings}
                        disabled={suggestStatus.type === "loading"}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300 disabled:opacity-60"
                      >
                        {suggestStatus.type === "loading" ? "Analiziram..." : "✦ Predloži automatski"}
                      </button>
                      {suggestStatus.type !== "idle" && (
                        <span className={`text-xs ${suggestStatus.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                          {suggestStatus.message}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Stripe settings (collapsible) */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <SectionHeader label="Podešavanja pruga" sectionKey="stripe"
                  hint={form.stripeSpacing ? `· spacing ${form.stripeSpacing}` : ""} />
                {expanded.stripe && (
                  <div className="mt-3 space-y-4 border-t border-gray-100 pt-3">
                    {/* Spacing slider */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700">Gustina pruga (globalno)</label>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {stripeSpacingDisplay}
                        </span>
                      </div>
                      <input type="range" min={1} max={10} step={1} value={stripeSpacingDisplay}
                        onChange={e => f("stripeSpacing")(e.target.value)}
                        className="h-1.5 w-full cursor-pointer accent-gray-900" />
                      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                        <span>1 gusto</span>
                        <span>6 standard</span>
                        <span>10 široko</span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {[4, 6, 8].map(v => (
                          <button key={v} type="button" onClick={() => f("stripeSpacing")(String(v))}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              stripeSpacingDisplay === v ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {v === 4 ? "Usko (4)" : v === 6 ? "Standard (6)" : "Široko (8)"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Per-part overrides */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Sako</label>
                        <input type="number" value={form.stripeSpacingJacket} min={1} max={10} step={1}
                          onChange={e => f("stripeSpacingJacket")(e.target.value)}
                          className={inputCls} placeholder="= globalno" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Pantalone</label>
                        <input type="number" value={form.stripeSpacingPants} min={1} max={10} step={1}
                          onChange={e => f("stripeSpacingPants")(e.target.value)}
                          className={inputCls} placeholder="= globalno" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Ugao pruga pantalona (delta °)
                      </label>
                      <input type="number" value={form.pantsStripeAngleDelta} step={1}
                        onChange={e => f("pantsStripeAngleDelta")(e.target.value)}
                        className={inputCls} placeholder="0 = auto" />
                      <p className="mt-1 text-[11px] text-gray-400">Prilagodi smer pruga na pantalonama (+ / - stepeni).</p>
                    </div>
                    <button type="button"
                      onClick={() => {
                        const v = form.stripeSpacing?.trim() || "6";
                        setForm(s => ({ ...s, stripeSpacingJacket: v, stripeSpacingPants: v }));
                      }}
                      className="w-full rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
                    >
                      ↕ Kopiraj globalno → sako i pantalone
                    </button>
                  </div>
                )}
              </div>

              {/* Section: Detail info (collapsible) */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <SectionHeader label="Detalji za popup" sectionKey="details"
                  hint={form.detailImage || form.detailText ? "· popunjeno" : ""} />
                {expanded.details && (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">URL detaljne slike</label>
                      <input value={form.detailImage} onChange={e => f("detailImage")(e.target.value)}
                        className={inputCls} placeholder="https://..." />
                    </div>
                    {/* Detail file upload */}
                    <div>
                      <input id="detail-file" type="file" accept="image/*"
                        onChange={e => setDetailFile(e.target.files?.[0] || null)} className="sr-only" />
                      <label htmlFor="detail-file"
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 transition hover:border-gray-300">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Upload detaljne slike</p>
                          <p className="text-[11px] text-gray-400">{detailFile?.name ?? "nije izabran"}</p>
                        </div>
                        <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">Izaberi</span>
                      </label>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Opis tkanine</label>
                      <textarea value={form.detailText} onChange={e => f("detailText")(e.target.value)}
                        className={`${inputCls} min-h-[80px] resize-none`}
                        placeholder="Sastav, poreklo, kolekcija..." />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={status.type === "loading"}
                className="w-full rounded-2xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 active:scale-[0.99]"
              >
                {status.type === "loading" ? "Čuvam..." : isEditing ? "Sačuvaj izmene" : "Dodaj tkaninu"}
              </button>
              {isEditing && (
                <button type="button" onClick={cancelEdit}
                  className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:border-gray-300">
                  Otkaži editovanje
                </button>
              )}
            </form>
          </div>

          {/* ── LIST PANEL ─────────────────────────────────────────────── */}
          <div className="mt-6 lg:mt-0">

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 12a7.5 7.5 0 0012.15 4.65z" />
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
                  placeholder="Pretraži po imenu, šifri..." />
              </div>
              {/* Sort */}
              <div className="flex gap-1">
                {(["default", "name", "tone"] as SortKey[]).map(k => (
                  <button key={k} onClick={() => setSortBy(k)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      sortBy === k ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {k === "default" ? "Novo" : k === "name" ? "A–Z" : "Ton"}
                  </button>
                ))}
              </div>
              {/* Refresh + Export */}
              <button onClick={loadFabrics}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                title="Osveži listu">
                ↺
              </button>
              <button onClick={exportCSV}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                title="Izvezi CSV">
                ↓ CSV
              </button>
            </div>

            {/* Results count */}
            {search && (
              <p className="mb-3 text-xs text-gray-500">
                {filteredFabrics.length} od {fabrics.length} tkanina
              </p>
            )}

            {/* Fabric grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredFabrics.map(fab => {
                const toneDot = fab.tone === "dark" ? "bg-gray-800" : fab.tone === "light" ? "bg-gray-200 border border-gray-300" : "bg-gray-500";
                const hasMeta = fab.pattern || fab.textureScale || fab.stripeSpacing || fab.pantsStripeAngleDelta;
                return (
                  <div key={fab.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                    {/* Thumbnail */}
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      {fab.texture ? (
                        <NextImage src={fab.texture} alt={fab.name} fill sizes="200px"
                          className="object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                          </svg>
                        </div>
                      )}
                      {/* Tone dot */}
                      <div className={`absolute right-2 top-2 h-3 w-3 rounded-full shadow ${toneDot}`} title={fab.tone} />
                      {/* Pattern badge */}
                      {fab.pattern && (
                        <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                          {fab.pattern}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="truncate text-sm font-semibold text-gray-900" title={fab.name}>{fab.name}</p>
                      <p className="truncate text-[11px] text-gray-400">{fab.code || fab.id}</p>
                      {typeof fab.price === "number" && (
                        <p className="text-[11px] font-semibold text-gray-600">{fab.price} EUR</p>
                      )}
                      {hasMeta && (
                        <p className="mt-1 truncate text-[10px] text-gray-400">
                          {[
                            fab.pattern && fab.pattern,
                            fab.textureScale != null && `sc ${fab.textureScale}`,
                            fab.stripeSpacing != null && `sp ${fab.stripeSpacing}`,
                            fab.pantsStripeAngleDelta != null && `Δ${fab.pantsStripeAngleDelta}°`,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex border-t border-gray-100">
                      <button onClick={() => onEdit(fab)}
                        className="flex-1 py-2 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50">
                        Edit
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button onClick={() => onCopy(fab)}
                        className="flex-1 py-2 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
                        title="Duplikat">
                        Kopiraj
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button onClick={() => setDeleteConfirm({ id: fab.id, name: fab.name })}
                        className="flex-1 py-2 text-[11px] font-semibold text-red-500 transition hover:bg-red-50">
                        Briši
                      </button>
                    </div>
                  </div>
                );
              })}
              {!filteredFabrics.length && (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-gray-400">
                  <svg className="mb-3 h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm">{search ? "Nema rezultata pretrage." : "Nema tkanina."}</p>
                  {search && (
                    <button onClick={() => setSearch("")}
                      className="mt-2 text-xs text-gray-500 underline">
                      Očisti pretragu
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
