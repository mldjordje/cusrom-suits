"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import AdminNav from "../components/AdminNav";

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
  detailImage?: string | null;
  detailText?: string | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };

type StripeOrientation = "vertical" | "horizontal" | "none";
type StripeHint = { strength: number; orientation: StripeOrientation; contrast: number };

const toneOptions = ["light", "medium", "dark"];
const patternOptions = [
  { value: "", label: "automatski" },
  { value: "solid", label: "puna boja" },
  { value: "pinstripe", label: "tanke pruge" },
  { value: "stripe", label: "pruge" },
  { value: "check", label: "karo" },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const computeStripeHint = (data: Uint8ClampedArray, w: number, h: number): StripeHint => {
  if (!data.length || w < 2 || h < 2) return { strength: 0, orientation: "none", contrast: 0 };
  const prevRow = new Float32Array(w);
  let edgeX = 0;
  let edgeY = 0;
  let sum = 0;
  let sumSq = 0;
  const pixels = w * h;

  for (let y = 0; y < h; y++) {
    let prevLum = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      sum += lum;
      sumSq += lum * lum;
      if (x > 0) edgeX += Math.abs(lum - prevLum);
      if (y > 0) edgeY += Math.abs(lum - prevRow[x]);
      prevRow[x] = lum;
      prevLum = lum;
    }
  }

  const mean = sum / pixels;
  const variance = Math.max(0, sumSq / pixels - mean * mean);
  const contrast = Math.min(1, Math.sqrt(variance) / 255);
  const edgeAvg = (edgeX + edgeY) / (pixels * 255);
  const ratio = edgeY < 0.0001 ? 999 : edgeX / edgeY;
  let orientation: StripeOrientation = "none";
  if (ratio > 1.2) orientation = "vertical";
  else if (ratio < 0.83) orientation = "horizontal";

  const strength = clamp(edgeAvg * 2.05 + contrast * 0.85, 0, 1);
  if (strength < 0.08) orientation = "none";
  return { strength, orientation, contrast };
};

export default function FabricsAdminPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [suggestStatus, setSuggestStatus] = useState<Status>({ type: "idle" });
  const [form, setForm] = useState({
    id: "",
    name: "",
    tone: "medium",
    price: "",
    code: "",
    texture: "",
    pattern: "",
    textureScale: "",
    textureStrength: "",
    textureContrast: "",
    textureBrightness: "",
    stripeSpacing: "",
    stripeSpacingJacket: "",
    stripeSpacingPants: "",
    detailImage: "",
    detailText: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [autoTone, setAutoTone] = useState<string | null>(null);
  const stripeSpacingValue = Number.parseFloat(form.stripeSpacing);
  const stripeSpacingDisplay = Number.isFinite(stripeSpacingValue)
    ? clamp(stripeSpacingValue, 1, 10)
    : 6;
  const stripeSpacingScale = clamp(1 + (stripeSpacingDisplay - 6) * 0.07, 0.65, 1.35);
  const stripePreviewSpacingPx = Math.round(12 * stripeSpacingScale);
  const stripePreviewStyle = {
    backgroundImage: `repeating-linear-gradient(90deg, rgba(60,60,60,0.55) 0px, rgba(60,60,60,0.55) 1px, transparent 1px, transparent ${stripePreviewSpacingPx}px)`,
  };
  const applyStripeSpacingPreset = (value: number) => {
    setForm((s) => ({ ...s, stripeSpacing: String(value) }));
  };
  const applyStripeSpacingToParts = () => {
    setForm((s) => {
      const value = s.stripeSpacing?.trim() ? s.stripeSpacing : "6";
      return { ...s, stripeSpacing: value, stripeSpacingJacket: value, stripeSpacingPants: value };
    });
  };
  const bumpFabricsRevision = () => {
    if (typeof window === "undefined") return;
    const stamp = String(Date.now());
    window.localStorage.setItem("fabrics:rev", stamp);
    window.dispatchEvent(new Event("fabrics:updated"));
  };

  const analyzeTexture = async (blob: File) => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const blobUrl = URL.createObjectURL(new Blob([bytes]));
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = blobUrl;
      });
      const canvas = document.createElement("canvas");
      const size = 240;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha < 0.05) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        sum += lum;
        sumSq += lum * lum;
        count++;
      }
      const avgLum = count ? sum / count : 0.4;
      const variance = count ? Math.max(0, sumSq / count - avgLum * avgLum) : 0;
      const contrast = Math.sqrt(variance);
      const stripe = computeStripeHint(data, size, size);
      return { avgLum, contrast, stripe };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const loadFabrics = useMemo(
    () => async () => {
      const res = await fetch("/api/fabrics");
      const json = await res.json();
      if (json?.data) setFabrics(json.data);
    },
    []
  );

  const detectTone = async (blob: File): Promise<"light" | "medium" | "dark" | null> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blobUrl = URL.createObjectURL(new Blob([bytes]));
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = blobUrl;
      });
      const canvas = document.createElement("canvas");
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha < 0.05) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sum += (r + g + b) / (3 * 255);
        count++;
      }
      URL.revokeObjectURL(blobUrl);
      if (!count) return null;
      const avg = sum / count;
      if (avg < 0.28) return "dark";
      if (avg < 0.55) return "medium";
      return "light";
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadFabrics();
  }, [loadFabrics]);

  const onFileChange = async (f: File | null) => {
    setFile(f);
    setSuggestStatus({ type: "idle" });
    if (!f) {
      setAutoTone(null);
      return;
    }
    const tone = await detectTone(f);
    if (tone) {
      setAutoTone(tone);
      setForm((s) => ({ ...s, tone }));
    } else {
      setAutoTone(null);
    }
  };

  const suggestSettings = async () => {
    if (!file) {
      setSuggestStatus({ type: "error", message: "Prvo uploaduj tkaninu (fajl), pa klikni Predlozi." });
      return;
    }
    setSuggestStatus({ type: "loading", message: "Analiza tkanine..." });
    try {
      const analysis = await analyzeTexture(file);
      if (!analysis) {
        setSuggestStatus({ type: "error", message: "Ne mogu da procitam teksturu." });
        return;
      }
      const { avgLum, stripe } = analysis;
      const isStripe =
        stripe.orientation !== "none" && (stripe.strength >= 0.12 || stripe.contrast >= 0.1);
      if (!isStripe) {
        setSuggestStatus({ type: "success", message: "Nisu detektovane pruge. Podesavanja ostaju." });
        return;
      }
      const isBoldStripe = stripe.strength >= 0.32 || stripe.contrast >= 0.18;
      const tone = avgLum < 0.28 ? "dark" : avgLum < 0.55 ? "medium" : "light";
      const pattern = isBoldStripe ? "stripe" : "pinstripe";
      const textureScale = isBoldStripe ? "0.85" : "0.70";
      const textureStrength = isBoldStripe ? "0.60" : "0.70";
      const textureBrightness =
        tone === "dark" ? "1.05" : tone === "medium" ? "1.04" : "1.02";
      const textureContrast =
        tone === "dark" ? "1.45" : tone === "medium" ? "1.32" : "1.18";
      setForm((s) => ({
        ...s,
        pattern,
        textureScale,
        textureStrength,
        textureContrast,
        textureBrightness,
      }));
      setSuggestStatus({ type: "success", message: "Predlozena podesavanja su postavljena." });
    } catch {
      setSuggestStatus({ type: "error", message: "Greska pri analizi tkanine." });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ type: "error", message: "Naziv je obavezan" });
      return;
    }
    if (!file && !form.texture.trim()) {
      setStatus({ type: "error", message: "Dodaj teksturu ili uploaduj fajl" });
      return;
    }
    setStatus({ type: "loading", message: "Upload..." });
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
    if (form.detailImage.trim()) fd.set("detailImage", form.detailImage.trim());
    if (form.detailText.trim()) fd.set("detailText", form.detailText.trim());
    if (file) fd.set("file", file);
    if (detailFile) fd.set("detailFile", detailFile);

    const res = await fetch("/api/fabrics/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Upload failed" });
      return;
    }
    setStatus({ type: "success", message: "Sacuvano" });
    setForm({
      id: "",
      name: "",
      tone: "medium",
      price: "",
      code: "",
      texture: "",
      pattern: "",
      textureScale: "",
      textureStrength: "",
      textureContrast: "",
      textureBrightness: "",
      stripeSpacing: "",
      stripeSpacingJacket: "",
      stripeSpacingPants: "",
      detailImage: "",
      detailText: "",
    });
    setFile(null);
    setDetailFile(null);
    setAutoTone(null);
    await loadFabrics();
    bumpFabricsRevision();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Obrisati tkaninu?")) return;
    setStatus({ type: "loading", message: "Brisanje..." });
    const res = await fetch("/api/fabrics/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Brisanje neuspesno" });
    } else {
      setStatus({ type: "success", message: "Obrisano" });
      setFabrics((prev) => prev.filter((f) => f.id !== id));
      bumpFabricsRevision();
    }
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
      stripeSpacingJacket:
        typeof fab.stripeSpacingJacket === "number" ? String(fab.stripeSpacingJacket) : "",
      stripeSpacingPants:
        typeof fab.stripeSpacingPants === "number" ? String(fab.stripeSpacingPants) : "",
      detailImage: fab.detailImage || (fab as any).detail_image || "",
      detailText: fab.detailText || (fab as any).detail_text || "",
    });
    setAutoTone(null);
    setFile(null);
    setDetailFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fabrics CMS</h1>
        <p className="text-sm text-gray-600">Dodaj novu tkaninu uploadom ili unosom URL-a.</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-sm">
        <p className="font-semibold">Kratak tutorial za fotografisanje i upload tkanine</p>
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
          <li>Fotografisi samo tkaninu: popuni kadar, bez stola, ruku ili drugih predmeta.</li>
          <li>Svetlo treba da bude ravnomerno i difuzno (bez senki, odsjaja i fleka).</li>
          <li>Tkanina neka bude ravna, bez nabora i preklapanja.</li>
          <li>PNG/JPG, preporuka 800x800+; nemoj menjati velicinu ili background.</li>
          <li>Koristi ili upload fajla ili Texture URL (ne oba istovremeno).</li>
          <li>Posle upload-a mozes kliknuti &quot;Predlozi podesavanja&quot; za automatski predlog.</li>
        </ul>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Naziv *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Npr. Dark Herringbone"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">ID (opciono)</label>
            <input
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Slug/sifra"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Ton</label>
            <select
              value={form.tone}
              onChange={(e) => setForm((s) => ({ ...s, tone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            >
              {toneOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cena (opciono)</label>
            <input
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Sifra / code (opciono)</label>
            <input
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="CODE-123"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Texture URL (opciono)</label>
            <input
              value={form.texture}
              onChange={(e) => setForm((s) => ({ ...s, texture: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Detaljna slika URL (opciono)</label>
            <input
              value={form.detailImage}
              onChange={(e) => setForm((s) => ({ ...s, detailImage: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700">Opis tkanine (opciono)</label>
            <textarea
              value={form.detailText}
              onChange={(e) => setForm((s) => ({ ...s, detailText: e.target.value }))}
              className="min-h-[80px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Kratak opis, sastav, poreklo, kolekcija..."
            />
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3">
          <p className="text-xs font-semibold text-gray-700">Podesavanja prikaza (opciono)</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Uzorak</label>
              <select
                value={form.pattern}
                onChange={(e) => setForm((s) => ({ ...s, pattern: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              >
                {patternOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Skala teksture</label>
              <input
                value={form.textureScale}
                onChange={(e) => setForm((s) => ({ ...s, textureScale: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.0"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Jacina teksture</label>
              <input
                value={form.textureStrength}
                onChange={(e) => setForm((s) => ({ ...s, textureStrength: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="0.35"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Kontrast teksture</label>
              <input
                value={form.textureContrast}
                onChange={(e) => setForm((s) => ({ ...s, textureContrast: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.3"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Svetlina teksture</label>
              <input
                value={form.textureBrightness}
                onChange={(e) => setForm((s) => ({ ...s, textureBrightness: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.05"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-gray-700">Gustina pruga (globalno)</label>
                <span className="text-[11px] text-gray-500">1 = gusto, 6 = default, 10 = razmaknuto</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={stripeSpacingDisplay}
                  onChange={(e) => setForm((s) => ({ ...s, stripeSpacing: e.target.value }))}
                  className="h-2 w-full cursor-pointer accent-gray-900"
                />
                <input
                  type="number"
                  value={form.stripeSpacing}
                  onChange={(e) => setForm((s) => ({ ...s, stripeSpacing: e.target.value }))}
                  className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  placeholder="6"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">Preseti:</span>
                <button
                  type="button"
                  onClick={() => applyStripeSpacingPreset(4)}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                >
                  Tanke (4)
                </button>
                <button
                  type="button"
                  onClick={() => applyStripeSpacingPreset(6)}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                >
                  Standard (6)
                </button>
                <button
                  type="button"
                  onClick={() => applyStripeSpacingPreset(8)}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                >
                  Sire (8)
                </button>
                <button
                  type="button"
                  onClick={applyStripeSpacingToParts}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                >
                  Primeni na sako/pantalone
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-32 rounded border border-gray-200 bg-white" style={stripePreviewStyle} />
                <p className="text-[11px] text-gray-500">Preview razmaka (aproksimacija).</p>
              </div>
              <p className="text-[11px] text-gray-500">Ako sako/pantalone ostanu prazno, koristi se globalno.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Gustina pruga - sako (opciono)</label>
              <input
                type="number"
                value={form.stripeSpacingJacket}
                onChange={(e) => setForm((s) => ({ ...s, stripeSpacingJacket: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="prazno = globalno"
                inputMode="numeric"
                min={1}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Gustina pruga - pantalone (opciono)</label>
              <input
                type="number"
                value={form.stripeSpacingPants}
                onChange={(e) => setForm((s) => ({ ...s, stripeSpacingPants: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="prazno = globalno"
                inputMode="numeric"
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={suggestSettings}
              disabled={suggestStatus.type === "loading"}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 disabled:opacity-60"
            >
              {suggestStatus.type === "loading" ? "Predlazem..." : "Predlozi podesavanja"}
            </button>
            {suggestStatus.type !== "idle" && (
              <span
                className={`text-xs ${
                  suggestStatus.type === "error"
                    ? "text-red-600"
                    : suggestStatus.type === "success"
                      ? "text-emerald-600"
                      : "text-gray-600"
                }`}
              >
                {suggestStatus.message}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Pinstripe: probaj kontrast 1.35-1.55, svetlina 1.02-1.08, rotacija pantalona 90.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Upload fajl (image)</label>
          <input
            id="fabric-file"
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="sr-only"
          />
          <label
            htmlFor="fabric-file"
            className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition hover:border-gray-400"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-800">Dodaj ili zameni teksturu</p>
              <p className="text-xs text-gray-500">
                PNG/JPG, preporuka 800x800+. Trenutno: {file?.name ?? "nije izabran fajl"}
              </p>
            </div>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">Izaberi fajl</span>
          </label>
          {autoTone && <p className="text-xs text-gray-500">Auto ton: {autoTone}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Upload detaljne slike (opciono)</label>
          <input
            id="detail-file"
            type="file"
            accept="image/*"
            onChange={(e) => setDetailFile(e.target.files?.[0] || null)}
            className="sr-only"
          />
          <label
            htmlFor="detail-file"
            className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition hover:border-gray-400"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-800">Dodaj detaljnu sliku za popup</p>
              <p className="text-xs text-gray-500">
                PNG/JPG, preporuka 1000px+. Trenutno: {detailFile?.name ?? "nije izabran fajl"}
              </p>
            </div>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">Izaberi fajl</span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
          >
            {status.type === "loading" ? "Cuvam..." : "Sacuvaj tkaninu"}
          </button>
          {status.type !== "idle" && (
            <span
              className={`text-sm ${
                status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-gray-600"
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tkanine ({fabrics.length})</h2>
          <button
            onClick={loadFabrics}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fabrics.map((f) => {
            const previewMeta = [
              f.pattern ? `pattern ${f.pattern}` : null,
              typeof f.textureScale === "number" ? `scale ${f.textureScale}` : null,
              typeof f.textureStrength === "number" ? `strength ${f.textureStrength}` : null,
              typeof f.textureContrast === "number" ? `contrast ${f.textureContrast}` : null,
              typeof f.textureBrightness === "number" ? `bright ${f.textureBrightness}` : null,
              typeof f.stripeSpacing === "number" ? `stripe spacing ${f.stripeSpacing}` : null,
              typeof f.stripeSpacingJacket === "number" ? `stripe jacket ${f.stripeSpacingJacket}` : null,
              typeof f.stripeSpacingPants === "number" ? `stripe pants ${f.stripeSpacingPants}` : null,
              f.detailImage || f.detailText ? "detail" : null,
            ]
              .filter(Boolean)
              .join(" | ");
            return (
              <div key={f.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-gray-100">
                  {f.texture ? (
                    <NextImage src={f.texture} alt={f.name} fill sizes="120px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.id}</p>
                  <p className="text-xs text-gray-500">
                    Ton: {f.tone || "medium"} {typeof f.price === "number" ? `- ${f.price} EUR` : ""}
                  </p>
                  {f.code && <p className="text-[11px] text-gray-400">Code: {f.code}</p>}
                  {previewMeta && <p className="text-[11px] text-gray-400">Preview: {previewMeta}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onEdit(f)}
                      className="rounded-full border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      className="rounded-full border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:border-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!fabrics.length && <p className="text-sm text-gray-500">Nema tkanina.</p>}
        </div>
      </div>
    </div>
  );
}

