"use client";

import { useRef, useState } from "react";
import type { ContactMessage, ContactMessageStatus } from "@/lib/contact/messages";
import type { LandingUniformImage, LandingUniformVideo } from "@/lib/catalog/landingSettings";

type Tab = "galerija" | "upiti";

type Props = {
  initialImages: LandingUniformImage[];
  initialVideos: LandingUniformVideo[];
  initialTitle: string;
  initialEyebrow: string;
  initialText: string;
  initialInquiries: ContactMessage[];
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("sr-RS");
};

const badgeClass: Record<ContactMessageStatus, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AdminPoslovneUniformePage({
  initialImages,
  initialVideos,
  initialTitle,
  initialEyebrow,
  initialText,
  initialInquiries,
}: Props) {
  const [tab, setTab] = useState<Tab>("galerija");

  // ── Gallery state ────────────────────────────────────────────────────────
  const [images, setImages] = useState<LandingUniformImage[]>(initialImages);
  const [videos, setVideos] = useState<LandingUniformVideo[]>(initialVideos);
  const [title, setTitle] = useState(initialTitle);
  const [eyebrow, setEyebrow] = useState(initialEyebrow);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // ── Inquiries state ──────────────────────────────────────────────────────
  const [inquiries, setInquiries] = useState<ContactMessage[]>(initialInquiries);
  const [inqFilter, setInqFilter] = useState<"all" | "open" | "resolved">("all");
  const [inqQuery, setInqQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [inqError, setInqError] = useState<string | null>(null);

  // ── Upload helpers ───────────────────────────────────────────────────────
  const uploadFiles = async (files: FileList | null): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: form });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Upload nije uspeo.");
      return (json.urls as string[]) || [];
    } catch (e) {
      setUploadError((e as Error).message || "Greška pri uploadu.");
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files);
    if (urls.length) {
      setImages((prev) => [
        ...prev,
        ...urls.map((url) => ({ title: "", image: url, alt: "" })),
      ]);
    }
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files);
    if (urls.length) {
      setVideos((prev) => [
        ...prev,
        ...urls.map((url) => ({ title: "", video: url, poster: "", alt: "" })),
      ]);
    }
    if (vidInputRef.current) vidInputRef.current.value = "";
  };

  // ── Image list mutations ─────────────────────────────────────────────────
  const updateImage = (index: number, patch: Partial<LandingUniformImage>) =>
    setImages((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeImage = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const moveImage = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= images.length) return;
    setImages((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  // ── Video list mutations ─────────────────────────────────────────────────
  const updateVideo = (index: number, patch: Partial<LandingUniformVideo>) =>
    setVideos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeVideo = (index: number) =>
    setVideos((prev) => prev.filter((_, i) => i !== index));

  const moveVideo = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= videos.length) return;
    setVideos((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  // ── Save gallery ─────────────────────────────────────────────────────────
  const saveGallery = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniformsTitle: title,
          uniformsEyebrow: eyebrow,
          uniformsText: text,
          uniformsImages: images,
          uniformsVideos: videos,
        }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Čuvanje nije uspelo.");
      setSaveNotice("Galerija je sacuvana.");
    } catch (e) {
      setSaveError((e as Error).message || "Greška pri čuvanju.");
    } finally {
      setSaving(false);
    }
  };

  // ── Inquiry status update ────────────────────────────────────────────────
  const updateInquiryStatus = async (id: string, status: ContactMessageStatus) => {
    setUpdatingId(id);
    setInqError(null);
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Greška pri izmeni.");
      setInquiries((prev) => prev.map((m) => (m.id === id ? json.message : m)));
    } catch (e) {
      setInqError((e as Error).message || "Greška.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Derived inquiry list ─────────────────────────────────────────────────
  const visibleInquiries = inquiries.filter((m) => {
    const status = m.status || "open";
    if (inqFilter === "open" && status !== "open") return false;
    if (inqFilter === "resolved" && status !== "resolved") return false;
    const q = inqQuery.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.email, m.phone, m.company, m.subject, m.message]
      .map((v) => String(v || "").toLowerCase())
      .some((v) => v.includes(q));
  });

  const inqCounts = {
    all: inquiries.length,
    open: inquiries.filter((m) => (m.status || "open") === "open").length,
    resolved: inquiries.filter((m) => m.status === "resolved").length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sadrzaj</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Poslovne uniforme</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upravljaj fotografijama, video klipovima i upitima za poslovne uniforme.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {(["galerija", "upiti"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-700 hover:border-slate-400"
            }`}
          >
            {key === "galerija" ? "Fotografije & Video" : `Upiti (${inqCounts.open} otvorenih)`}
          </button>
        ))}
      </div>

      {/* ── GALLERY TAB ─────────────────────────────────────────────────── */}
      {tab === "galerija" && (
        <div className="flex flex-col gap-5">
          {/* Hero text */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hero tekst</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Eyebrow</label>
                <input
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="npr. Poslovne uniforme"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Naslov</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Naslov hero sekcije"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Opis / lead tekst</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Kratki opis za hero sekciju"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fotografije</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {images.length} fotografija · Ako ostavis prazno koriste se bundlovane slike iz koda.
                </p>
              </div>
              <div>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => imgInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-400 disabled:opacity-50"
                >
                  {uploading ? "Uploadovanje..." : "+ Dodaj fotografije"}
                </button>
              </div>
            </div>

            {uploadError ? (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {uploadError}
              </p>
            ) : null}

            {images.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                Nema uploadvanih fotografija — koriste se podrazumevane slike iz koda.
              </p>
            ) : (
              <div className="space-y-3">
                {images.map((img, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    {/* Preview */}
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.image}
                        alt={img.alt || img.title || "uniform"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Fields */}
                    <div className="flex flex-1 flex-col gap-2">
                      <input
                        value={img.title}
                        onChange={(e) => updateImage(i, { title: e.target.value })}
                        placeholder="Naziv modela (npr. Hospitality kolekcija)"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        value={img.alt}
                        onChange={(e) => updateImage(i, { alt: e.target.value })}
                        placeholder="Alt tekst za SEO"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        value={img.image}
                        onChange={(e) => updateImage(i, { image: e.target.value })}
                        placeholder="URL slike"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500"
                      />
                    </div>
                    {/* Controls */}
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveImage(i, 1)}
                        disabled={i === images.length - 1}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeImage(i)}
                        className="rounded border border-rose-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Video klipovi</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {videos.length} videa · Ako ostavis prazno koriste se bundlovani klipovi iz koda.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={vidInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={handleVideoUpload}
                />
                <button
                  onClick={() => vidInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-400 disabled:opacity-50"
                >
                  {uploading ? "Uploadovanje..." : "+ Upload video"}
                </button>
              </div>
            </div>

            {videos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                Nema uploadvanih videa — koriste se podrazumevani klipovi iz koda.
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((vid, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {vid.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vid.poster} alt="poster" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl text-slate-300">▶</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <input
                        value={vid.title}
                        onChange={(e) => updateVideo(i, { title: e.target.value })}
                        placeholder="Naziv videa"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        value={vid.video}
                        onChange={(e) => updateVideo(i, { video: e.target.value })}
                        placeholder="URL videa"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500"
                      />
                      <input
                        value={vid.poster}
                        onChange={(e) => updateVideo(i, { poster: e.target.value })}
                        placeholder="URL poster slike (opciono)"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500"
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => moveVideo(i, -1)}
                        disabled={i === 0}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveVideo(i, 1)}
                        disabled={i === videos.length - 1}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeVideo(i)}
                        className="rounded border border-rose-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            {saveError ? (
              <p className="mb-2 text-sm text-rose-600">{saveError}</p>
            ) : saveNotice ? (
              <p className="mb-2 text-sm text-emerald-600">{saveNotice}</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Slike i video klipovi koje ovde sačuvaš zamenjuju podrazumevane iz koda.
              </p>
              <button
                onClick={saveGallery}
                disabled={saving}
                className="rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {saving ? "Čuvanje..." : "Sačuvaj galeriju"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INQUIRIES TAB ───────────────────────────────────────────────── */}
      {tab === "upiti" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "open", "resolved"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setInqFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  inqFilter === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                {key === "all" ? "Svi" : key === "open" ? "Otvoreni" : "Reseni"} ({inqCounts[key]})
              </button>
            ))}
            <input
              value={inqQuery}
              onChange={(e) => setInqQuery(e.target.value)}
              placeholder="Pretraga po imenu, emailu, poruci..."
              className="ml-auto w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {inqError ? (
            <p className="mb-3 text-sm text-rose-600">{inqError}</p>
          ) : null}

          <p className="mb-3 text-sm text-slate-500">
            Prikazano: {visibleInquiries.length} upita za poslovne uniforme
          </p>

          <div className="space-y-3">
            {visibleInquiries.map((m) => {
              const status: ContactMessageStatus = m.status || "open";
              return (
                <article key={m.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass[status]}`}>
                        {status === "open" ? "Otvoren" : "Resen"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(m.createdAt)}</span>
                  </div>

                  <div className="grid gap-1 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <strong>Email:</strong>{" "}
                      <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                    </p>
                    {m.phone ? (
                      <p>
                        <strong>Telefon:</strong>{" "}
                        <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>
                      </p>
                    ) : null}
                    {m.company ? <p><strong>Firma:</strong> {m.company}</p> : null}
                    {m.subject ? <p className="md:col-span-2"><strong>Tema:</strong> {m.subject}</p> : null}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {status === "open" ? (
                      <button
                        onClick={() => updateInquiryStatus(m.id, "resolved")}
                        disabled={updatingId === m.id}
                        className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 hover:border-emerald-400 disabled:opacity-50"
                      >
                        Oznaci kao resen
                      </button>
                    ) : (
                      <button
                        onClick={() => updateInquiryStatus(m.id, "open")}
                        disabled={updatingId === m.id}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      >
                        Vrati u otvorene
                      </button>
                    )}
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Upit za poslovne uniforme"}`)}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:border-slate-400"
                    >
                      Odgovori mailom
                    </a>
                  </div>
                </article>
              );
            })}
            {visibleInquiries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nema upita u ovom filteru.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
