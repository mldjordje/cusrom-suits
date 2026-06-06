"use client";

import { useEffect, useRef, useState } from "react";

type HeroVideoSettings = {
  heroVideoUrl: string;
  heroVideoMobileUrl: string;
  heroVideoPosterUrl: string;
};

const empty: HeroVideoSettings = {
  heroVideoUrl: "",
  heroVideoMobileUrl: "",
  heroVideoPosterUrl: "",
};

type UploadState = "idle" | "uploading" | "done" | "error";

function UploadButton({
  label,
  accept,
  onUploaded,
}: {
  label: string;
  accept: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setState("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("files", file);
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: form });
      const json = await res.json();
      if (!json?.success || !json?.urls?.[0]) {
        throw new Error(json?.message || "Upload nije uspeo");
      }
      onUploaded(json.urls[0] as string);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri uploadu");
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {state === "uploading" ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
            Uploaduje se…
          </>
        ) : state === "done" ? (
          <>✓ Uploadovano</>
        ) : (
          <>{label}</>
        )}
      </button>
      {state === "error" && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function VideoField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/site-assets/..."
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <UploadButton
          label="Upload fajl"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onUploaded={onChange}
        />
      </div>
      {value && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <video
            src={value}
            muted
            playsInline
            controls
            className="max-h-40 w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

function PosterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-semibold text-slate-700">Poster slika</label>
        <p className="text-xs text-slate-500">
          Prikazuje se dok se video učitava i na uređajima bez videa. Preporuka: 1760×900px, JPG/WebP.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/site-assets/... ili /img/hero2.jpg"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <UploadButton
          label="Upload sliku"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onUploaded={onChange}
        />
      </div>
      {value && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Poster preview"
            className="h-32 w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminLandingHeroPage() {
  const [form, setForm] = useState<HeroVideoSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings");
      const json = await res.json();
      if (!json?.success || !json?.settings) {
        setError(json?.message || "Učitavanje nije uspelo");
        return;
      }
      const s = json.settings as Record<string, unknown>;
      setForm({
        heroVideoUrl: String(s.heroVideoUrl || ""),
        heroVideoMobileUrl: String(s.heroVideoMobileUrl || ""),
        heroVideoPosterUrl: String(s.heroVideoPosterUrl || ""),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri učitavanju");
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
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Čuvanje nije uspelo");
        return;
      }
      if (json.settings) {
        const s = json.settings as Record<string, unknown>;
        setForm({
          heroVideoUrl: String(s.heroVideoUrl || ""),
          heroVideoMobileUrl: String(s.heroVideoMobileUrl || ""),
          heroVideoPosterUrl: String(s.heroVideoPosterUrl || ""),
        });
      }
      setNotice("Sačuvano!");
      setTimeout(() => setNotice(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  const patch = (key: keyof HeroVideoSettings) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Landing Hero — Video</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Video pozadina na početnoj stranici. Desktop i mobile klip mogu biti različiti.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Čuvanje…" : "Sačuvaj"}
          </button>
        </div>
        {notice && (
          <div className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 border border-green-200">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center text-sm text-slate-400">
          Učitavanje…
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Video klipovi</h2>

            <VideoField
              label="Desktop video"
              description="Prikazuje se na ekranima ≥768px. MP4 ili WebM, preporuka do 15MB za brzo učitavanje."
              value={form.heroVideoUrl}
              onChange={patch("heroVideoUrl")}
            />

            <div className="border-t border-slate-100" />

            <VideoField
              label="Mobile video"
              description="Prikazuje se na ekranima <768px. Ako nije postavljen, koristi se desktop klip. Može biti vertikalan (9:16) ili kraći."
              value={form.heroVideoMobileUrl}
              onChange={patch("heroVideoMobileUrl")}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Poster (fallback slika)</h2>
            <PosterField
              value={form.heroVideoPosterUrl}
              onChange={patch("heroVideoPosterUrl")}
            />
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Napomena:</strong> Video se učitava odloženo (idle callback) i prikazuje tek nakon 900ms da ne usporava stranicu. Poster je uvek vidljiv dok se video ne učita.
          </div>
        </>
      )}
    </div>
  );
}
