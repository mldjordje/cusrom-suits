"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A modal list of media already on the server.
 *
 * The upload field on its own has one failure mode the client kept hitting: the
 * same hero video uploaded a second time because there was no way to see that
 * it was already there. Picking from this list writes the existing URL instead,
 * so nothing is stored twice.
 */

type LibraryItem = {
  url: string;
  name: string;
  kind: "image" | "video" | "other";
  sizeBytes: number | null;
  updatedAt: string | null;
  source: string;
};

type Props = {
  kind: "image" | "video";
  onPick: (url: string) => void;
  onClose: () => void;
};

const formatSize = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("sr-RS");
};

export default function AdminMediaLibraryPicker({ kind, onPick, onClose }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/webshop/site-assets/library?kind=${kind}`);
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.items)) {
        setError(json?.message || "Biblioteka nije mogla da se ucita.");
        return;
      }
      setItems(json.items as LibraryItem[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Greska pri ucitavanju biblioteke.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) => `${item.name} ${item.url}`.toLowerCase().includes(needle))
    : items;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4">
      <div className="mt-10 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {kind === "video" ? "Vec otpremljeni videi" : "Vec otpremljene slike"}
            </h3>
            <p className="text-sm text-slate-500">
              Klikni na fajl da ga iskoristis ponovo — bez novog uploada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Zatvori
          </button>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pretraga po imenu fajla…"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />

        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-center text-sm text-slate-400">Ucitavanje…</p>
        ) : visible.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Nema {kind === "video" ? "snimljenih videa" : "snimljenih slika"} — otpremi prvi fajl.
          </p>
        ) : (
          <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {visible.map((item) => (
              <button
                key={item.url}
                type="button"
                onClick={() => {
                  onPick(item.url);
                  onClose();
                }}
                className="group overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-slate-800"
              >
                <div className="h-24 w-full bg-slate-100">
                  {item.kind === "video" ? (
                    <video src={item.url} className="h-24 w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt=""
                      className="h-24 w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                    />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-slate-700" title={item.url}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {[formatDate(item.updatedAt), formatSize(item.sizeBytes)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
