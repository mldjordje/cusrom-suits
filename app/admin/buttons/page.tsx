"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import AdminNav from "../components/AdminNav";

type Button = {
  id: string;
  name: string;
  image_url: string;
  color_hex?: string | null;
  diameter?: number | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };

export default function ButtonsAdminPage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ id: "", name: "", image_url: "", color_hex: "", diameter: "" });

  const loadButtons = useMemo(
    () => async () => {
      const res = await fetch("/api/buttons");
      const json = await res.json();
      if (json?.data) setButtons(json.data);
    },
    []
  );

  useEffect(() => {
    loadButtons();
  }, [loadButtons]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ type: "error", message: "Naziv je obavezan" });
      return;
    }
    if (!file && !form.image_url.trim()) {
      setStatus({ type: "error", message: "Dodaj sliku ili URL" });
      return;
    }
    setStatus({ type: "loading", message: "Upload..." });
    const fd = new FormData();
    if (form.id.trim()) fd.set("id", form.id.trim());
    fd.set("name", form.name.trim());
    if (form.image_url.trim()) fd.set("image_url", form.image_url.trim());
    if (form.color_hex.trim()) fd.set("color_hex", form.color_hex.trim());
    if (form.diameter.trim()) fd.set("diameter", form.diameter.trim());
    if (file) fd.set("file", file);

    const res = await fetch("/api/buttons/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Upload failed" });
      return;
    }
    setStatus({ type: "success", message: "Sačuvano" });
    setForm({ id: "", name: "", image_url: "", color_hex: "", diameter: "" });
    setFile(null);
    await loadButtons();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Obrisati dugme?")) return;
    setStatus({ type: "loading", message: "Brisanje..." });
    const res = await fetch("/api/buttons/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Brisanje neuspešno" });
    } else {
      setStatus({ type: "success", message: "Obrisano" });
      setButtons((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const onEdit = (btn: Button) => {
    setForm({
      id: btn.id || "",
      name: btn.name || "",
      image_url: btn.image_url || "",
      color_hex: btn.color_hex || "",
      diameter: btn.diameter ? String(btn.diameter) : "",
    });
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buttons CMS</h1>
        <p className="text-sm text-gray-600">Upload dugmeta za sako. Jedna slika, više pozicija u renderu.</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-sm">
        <p className="font-semibold">Kratak tutorial za dugmad</p>
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
          <li>Slika dugmeta mora biti bez pozadine (transparentna).</li>
          <li>
            Ukloni pozadinu na{" "}
            <a
              href="https://remove.bg"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              remove.bg
            </a>{" "}
            (uploaduj sliku, preuzmi PNG bez pozadine).
          </li>
          <li>Tek onda uploaduj taj PNG fajl na ovoj strani.</li>
          <li>Upload fajl se automatski sece i centrira na isti precnik.</li>
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
              placeholder="Npr. Dark Horn"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">ID (opciono)</label>
            <input
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Slug"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Color hex (opciono)</label>
            <input
              value={form.color_hex}
              onChange={(e) => setForm((s) => ({ ...s, color_hex: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="#5a4a3a"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Prečnik (mm, opcionalno)</label>
            <input
              value={form.diameter}
              onChange={(e) => setForm((s) => ({ ...s, diameter: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="20"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700">Image URL (opciono)</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Upload fajl (image)</label>
          <input
            id="btn-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="sr-only"
          />
          <label
            htmlFor="btn-file"
            className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition hover:border-gray-400"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-800">Dodaj ili zameni sliku</p>
              <p className="text-xs text-gray-500">PNG/JPG. Trenutno: {file?.name ?? "nije izabran fajl"}</p>
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
            {status.type === "loading" ? "Čuvam..." : "Sačuvaj dugme"}
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
          <h2 className="text-lg font-semibold text-gray-900">Dugmad ({buttons.length})</h2>
          <button
            onClick={loadButtons}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {buttons.map((btn) => (
            <div key={btn.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
              <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-gray-100">
                {btn.image_url ? (
                  <NextImage src={btn.image_url} alt={btn.name} fill sizes="120px" className="object-contain" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{btn.name}</p>
                <p className="text-xs text-gray-500">{btn.id}</p>
                {btn.color_hex && <p className="text-[11px] text-gray-500">Boja: {btn.color_hex}</p>}
                {btn.diameter && <p className="text-[11px] text-gray-500">Prečnik: {btn.diameter} mm</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onEdit(btn)}
                    className="rounded-full border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(btn.id)}
                    className="rounded-full border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:border-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!buttons.length && <p className="text-sm text-gray-500">Nema dugmadi.</p>}
        </div>
      </div>
    </div>
  );
}
