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
  pantsTextureRotation?: number | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };

const toneOptions = ["light", "medium", "dark"];
const patternOptions = [
  { value: "", label: "auto" },
  { value: "solid", label: "solid" },
  { value: "pinstripe", label: "pinstripe" },
  { value: "stripe", label: "stripe" },
  { value: "check", label: "check" },
];

export default function FabricsAdminPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
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
    pantsTextureRotation: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [autoTone, setAutoTone] = useState<string | null>(null);

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
    if (form.pantsTextureRotation.trim()) fd.set("pantsTextureRotation", form.pantsTextureRotation.trim());
    if (file) fd.set("file", file);

    const res = await fetch("/api/fabrics/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Upload failed" });
      return;
    }
    setStatus({ type: "success", message: "Sačuvano" });
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
      pantsTextureRotation: "",
    });
    setFile(null);
    setAutoTone(null);
    await loadFabrics();
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
      setStatus({ type: "error", message: json?.message || "Brisanje neuspešno" });
    } else {
      setStatus({ type: "success", message: "Obrisano" });
      setFabrics((prev) => prev.filter((f) => f.id !== id));
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
      pantsTextureRotation: typeof fab.pantsTextureRotation === "number" ? String(fab.pantsTextureRotation) : "",
    });
    setAutoTone(null);
    setFile(null);
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
              placeholder="Slug/šifra"
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
            <label className="text-xs font-semibold text-gray-700">Šifra / code (opciono)</label>
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
        </div>
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3">
          <p className="text-xs font-semibold text-gray-700">Preview overrides (optional)</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Pattern</label>
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
              <label className="text-xs font-semibold text-gray-700">Texture scale</label>
              <input
                value={form.textureScale}
                onChange={(e) => setForm((s) => ({ ...s, textureScale: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.0"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Texture strength</label>
              <input
                value={form.textureStrength}
                onChange={(e) => setForm((s) => ({ ...s, textureStrength: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="0.35"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Texture contrast</label>
              <input
                value={form.textureContrast}
                onChange={(e) => setForm((s) => ({ ...s, textureContrast: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.3"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Texture brightness</label>
              <input
                value={form.textureBrightness}
                onChange={(e) => setForm((s) => ({ ...s, textureBrightness: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="1.05"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Pants rotation (deg)</label>
              <input
                value={form.pantsTextureRotation}
                onChange={(e) => setForm((s) => ({ ...s, pantsTextureRotation: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                placeholder="90"
                inputMode="numeric"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Pinstripe: try contrast 1.35-1.55, brightness 1.02-1.08, pants rotation 90.
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
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
          >
            {status.type === "loading" ? "Čuvam..." : "Sačuvaj tkaninu"}
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
              typeof f.pantsTextureRotation === "number" ? `pants rot ${f.pantsTextureRotation}` : null,
            ]
              .filter(Boolean)
              .join(" • ");
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
                    Ton: {f.tone || "medium"} {typeof f.price === "number" ? `• ${f.price} EUR` : ""}
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
