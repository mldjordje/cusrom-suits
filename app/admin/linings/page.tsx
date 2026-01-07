"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import AdminNav from "../components/AdminNav";

type Lining = {
  id: string;
  name: string;
  base?: string;
  left?: string;
  right?: string;
  texture?: string | null;
  price?: number | null;
};

type Status = { type: "idle" | "loading" | "error" | "success"; message?: string };

export default function LiningsAdminPage() {
  const [linings, setLinings] = useState<Lining[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [files, setFiles] = useState<{ base: File | null; left: File | null; right: File | null; texture: File | null }>({
    base: null,
    left: null,
    right: null,
    texture: null,
  });
  const [form, setForm] = useState({ id: "", name: "", base: "", left: "", right: "", texture: "", price: "" });

  const loadLinings = useMemo(
    () => async () => {
      const res = await fetch("/api/linings");
      const json = await res.json();
      if (json?.data) setLinings(json.data);
    },
    []
  );

  useEffect(() => {
    loadLinings();
  }, [loadLinings]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ type: "error", message: "Naziv je obavezan" });
      return;
    }
    if (
      !files.base &&
      !files.left &&
      !files.right &&
      !files.texture &&
      !form.base.trim() &&
      !form.left.trim() &&
      !form.right.trim() &&
      !form.texture.trim()
    ) {
      setStatus({ type: "error", message: "Dodaj barem jedan fajl (texture ili base/left/right)" });
      return;
    }
    setStatus({ type: "loading", message: "Upload..." });
    const fd = new FormData();
    if (form.id.trim()) fd.set("id", form.id.trim());
    fd.set("name", form.name.trim());
    if (form.base.trim()) fd.set("base", form.base.trim());
    if (form.left.trim()) fd.set("left", form.left.trim());
    if (form.right.trim()) fd.set("right", form.right.trim());
    if (form.price.trim()) fd.set("price", form.price.trim());
    if (form.texture.trim()) fd.set("texture", form.texture.trim());
    if (files.base) fd.set("base_file", files.base);
    if (files.left) fd.set("left_file", files.left);
    if (files.right) fd.set("right_file", files.right);
    if (files.texture) fd.set("texture_file", files.texture);

    const res = await fetch("/api/linings/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Upload failed" });
      return;
    }
    setStatus({ type: "success", message: "Sačuvano" });
    setForm({ id: "", name: "", base: "", left: "", right: "", texture: "", price: "" });
    setFiles({ base: null, left: null, right: null, texture: null });
    await loadLinings();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Obrisati postavu?")) return;
    setStatus({ type: "loading", message: "Brisanje..." });
    const res = await fetch("/api/linings/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      setStatus({ type: "error", message: json?.message || "Brisanje neuspešno" });
    } else {
      setStatus({ type: "success", message: "Obrisano" });
      setLinings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const onEdit = (item: Lining) => {
    setForm({
      id: item.id || "",
      name: item.name || "",
      base: item.base || "",
      left: item.left || "",
      right: item.right || "",
      texture: item.texture || "",
      price: item.price ? String(item.price) : "",
    });
    setFiles({ base: null, left: null, right: null, texture: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Linings CMS</h1>
        <p className="text-sm text-gray-600">Upload postava (base/left/right slojevi) za sako.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Naziv *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Npr. Contrast red"
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
            <label className="text-xs font-semibold text-gray-700">Cena (opciono)</label>
            <input
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="150"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700">Base URL (opciono)</label>
            <input
              value={form.base}
              onChange={(e) => setForm((s) => ({ ...s, base: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700">Left URL (opciono)</label>
            <input
              value={form.left}
              onChange={(e) => setForm((s) => ({ ...s, left: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700">Right URL (opciono)</label>
            <input
              value={form.right}
              onChange={(e) => setForm((s) => ({ ...s, right: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["texture", "base", "left", "right"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                {key === "texture" ? "Texture upload (jedna slika postave)" : `${key.toUpperCase()} upload`}
              </label>
              <input
                id={`lining-${key}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFiles((s) => ({ ...s, [key]: e.target.files?.[0] || null }))}
              />
              <label
                htmlFor={`lining-${key}`}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition hover:border-gray-400"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-800">
                    {key === "texture" ? "Dodaj texture" : `Dodaj ${key}`}
                  </p>
                  <p className="text-xs text-gray-500">Trenutno: {files[key]?.name ?? "nije izabran fajl"}</p>
                </div>
                <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">Izaberi</span>
              </label>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
          >
            {status.type === "loading" ? "Čuvam..." : "Sačuvaj postavu"}
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
          <h2 className="text-lg font-semibold text-gray-900">Postave ({linings.length})</h2>
          <button
            onClick={loadLinings}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {linings.map((l) => (
            <div key={l.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
              <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-gray-100">
                {l.texture ? (
                  <NextImage src={l.texture} alt={l.name} fill sizes="120px" className="object-cover" />
                ) : l.base ? (
                  <NextImage src={l.base} alt={l.name} fill sizes="120px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{l.name}</p>
                <p className="text-xs text-gray-500">{l.id}</p>
                {typeof l.price === "number" && <p className="text-[11px] text-gray-500">{l.price} EUR</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onEdit(l)}
                    className="rounded-full border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:border-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(l.id)}
                    className="rounded-full border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:border-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!linings.length && <p className="text-sm text-gray-500">Nema postava.</p>}
        </div>
      </div>
    </div>
  );
}
