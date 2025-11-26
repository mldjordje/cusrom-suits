"use client";

import { useEffect, useMemo, useState } from "react";

type Fabric = {
  id: string;
  name: string;
  texture: string;
  tone?: string;
  price?: number | null;
  code?: string | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };

const toneOptions = ["light", "medium", "dark"];

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
        const i = new Image();
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
    if (file) fd.set("file", file);

    const res = await fetch("/api/fabrics/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Upload failed" });
      return;
    }
    setStatus({ type: "success", message: "Sačuvano" });
    setForm({ id: "", name: "", tone: "medium", price: "", code: "", texture: "" });
    setFile(null);
    setAutoTone(null);
    await loadFabrics();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fabrics CMS</h1>
        <p className="text-sm text-gray-600">Dodaj novu tkaninu uploadom ili unosom URL-a.</p>
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
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">Upload fajl (image)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="text-sm"
          />
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
          {fabrics.map((f) => (
            <div key={f.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
              <div className="h-16 w-20 overflow-hidden rounded-lg bg-gray-100">
                {f.texture ? <img src={f.texture} alt={f.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                <p className="text-xs text-gray-500">{f.id}</p>
                <p className="text-xs text-gray-500">
                  Ton: {f.tone || "medium"} {typeof f.price === "number" ? `• ${f.price} EUR` : ""}
                </p>
                {f.code && <p className="text-[11px] text-gray-400">Code: {f.code}</p>}
              </div>
            </div>
          ))}
          {!fabrics.length && <p className="text-sm text-gray-500">Nema tkanina.</p>}
        </div>
      </div>
    </div>
  );
}
