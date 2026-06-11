"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MediaHealthDoc = {
  scannedAt: string | null;
  totalChecked: number;
  brokenCount: number;
  brokenLegacyIds: number[];
  noDirectMediaCount: number;
  noDirectMediaLegacyIds: number[];
};

const formatWhen = (iso: string | null) => {
  if (!iso) return "nikad";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "nepoznato";
  return date.toLocaleString("sr-RS");
};

export default function MediaHealthPanel() {
  const [doc, setDoc] = useState<MediaHealthDoc | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webshop/media-scan", { credentials: "include" });
      const json = await res.json();
      if (json?.success) setDoc(json.mediaHealth as MediaHealthDoc);
    } catch {
      // status read is best-effort
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/media-scan", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (json?.success) {
        setDoc(json.mediaHealth as MediaHealthDoc);
      } else {
        setError(json?.message || "Skeniranje nije uspelo.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Skeniranje nije uspelo.");
    } finally {
      setScanning(false);
    }
  }, []);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Provera slika (assets.santos.rs)</p>
          <p className="mt-1 max-w-3xl text-sm">
            Skenira sve artikle i obelezava one cije slike ne postoje na asset hostu. Obelezeni
            artikli se automatski <strong>sakrivaju sa sajta</strong> i ostaju u adminu kao proizvodi kojima treba dodati media.
            Pokreni rucno posle sync-a.
          </p>
        </div>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="rounded-full border border-rose-400 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-800 disabled:opacity-60"
        >
          {scanning ? "Skeniram..." : "Skeniraj slike"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/webshop?mediaStatus=missing&sort=stock_desc&activeOnly=1&inStock=1"
          className="rounded-xl border border-rose-300 bg-white px-3 py-2 block hover:bg-rose-50 transition-colors"
          title="Klikni da vidiš artikle bez sopstvene slike"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Bez sopstvene slike</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{doc?.noDirectMediaCount ?? "-"}</p>
          <p className="mt-0.5 text-[11px] text-rose-500">Skriveni iz web shopa → klikni</p>
        </Link>
        <Link
          href="/admin/webshop?mediaStatus=broken&sort=no_image_first"
          className="rounded-xl border border-rose-200 bg-white px-3 py-2 block hover:bg-rose-50 transition-colors"
          title="Klikni da vidiš artikle sa nedostupnim slikama"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Slike nedostupne (CDN)</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{doc?.brokenCount ?? "-"}</p>
          <p className="mt-0.5 text-[11px] text-rose-500">Imaju slike ali ne učitavaju → klikni</p>
        </Link>
        <div className="rounded-xl border border-rose-200 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Provereno artikala</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{doc?.totalChecked ?? "-"}</p>
          <p className="mt-0.5 text-[11px] text-rose-500">Sa sopstvenim slikama</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Poslednje skeniranje</p>
          <p className="mt-1 text-sm font-medium text-rose-900">{formatWhen(doc?.scannedAt ?? null)}</p>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
