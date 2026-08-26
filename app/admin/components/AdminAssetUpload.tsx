"use client";

import { useRef, useState } from "react";

/**
 * Pick a file from this computer and get back a URL.
 *
 * The category screen originally asked for the URL directly, which assumed the
 * person filling it in already had the file on the server and knew its address.
 * They do not: uploading meant opening cPanel, finding the right folder, and
 * copying a path by hand. That is not a step a shop owner should ever take, so
 * the field now uploads and fills itself in.
 *
 * Pasting a link still works — it is just no longer the only way, and it is
 * tucked behind a toggle so it does not present itself as the main path.
 */

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Restricts the file picker and the preview. */
  kind: "image" | "video";
  label: string;
  hint?: string;
};

const ACCEPT: Record<Props["kind"], string> = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/mp4,video/webm",
};

const MAX_MB = 80;

export default function AdminAssetUpload({ value, onChange, kind, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);

  const upload = async (file: File) => {
    setError(null);

    /* Checked here as well as on the server so the person gets the answer
       immediately instead of after uploading 200MB over a slow line. */
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Fajl je veći od ${MAX_MB}MB. Smanji ga pa probaj ponovo.`);
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("files", file);
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body });
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.urls) || !json.urls[0]) {
        setError(json?.message || "Otpremanje nije uspelo. Probaj ponovo.");
        return;
      }
      onChange(String(json.urls[0]));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Otpremanje nije uspelo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Otpremanje…" : value ? "Zameni fajl" : "Izaberi sa računara"}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Ukloni
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setShowLink((open) => !open)}
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          {showLink ? "Sakrij link" : "ili nalepi link"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {hint ? <p className="mt-1.5 text-sm text-slate-500">{hint}</p> : null}

      {error ? (
        <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      {showLink ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={kind === "video" ? "https://…/video.mp4" : "https://…/slika.jpg"}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      ) : null}

      {/* Proof that the right file landed. Without it the only feedback was a
          URL appearing in a text box, which tells you nothing about whether it
          is the file you meant. */}
      {value && !busy ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {kind === "video" ? (
            <video src={value} className="h-36 w-full object-cover" muted playsInline controls />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-36 w-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
