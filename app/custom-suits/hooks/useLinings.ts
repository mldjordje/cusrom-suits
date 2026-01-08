"use client";

import { useEffect, useMemo, useState } from "react";
import { suits } from "../data/options";

export type Lining = {
  id: string;
  name: string;
  base?: string;
  left?: string;
  right?: string;
  texture?: string | null;
  price?: number | null;
};

type CacheEntry = { data: Lining[]; ts: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
let LININGS_CACHE: CacheEntry | null = null;
let LININGS_INFLIGHT: Promise<{ data: Lining[]; error: string | null; cache: boolean }> | null = null;

export function useLinings(styleId?: string) {
  const fallback: Lining[] = useMemo(() => {
    const current = suits.find((s) => s.id === styleId);
    const interiors = current?.interiors || suits[0]?.interiors || [];
    return interiors.map((int) => ({
      id: int.id,
      name: int.name,
      base: int.layers?.find((l) => l.id.includes("base"))?.src,
      left: int.layers?.find((l) => l.id.includes("left"))?.src,
      right: int.layers?.find((l) => l.id.includes("right"))?.src,
      texture: null,
    }));
  }, [styleId]);

  const cached = LININGS_CACHE;
  const isFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;
  const [linings, setLinings] = useState<Lining[]>(() => (isFresh ? cached?.data ?? [] : fallback));
  const [loading, setLoading] = useState<boolean>(() => !isFresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (isFresh) {
      setLinings(cached?.data ?? []);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    const inflight =
      LININGS_INFLIGHT ??
      fetch("/api/linings", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          const list = Array.isArray(json?.data) ? json.data : [];
          if (json?.success && list.length) {
            const mapped = list.map((l: any) => ({
              ...l,
              texture: l.texture || l.texture_url || null,
            })) as Lining[];
            return { data: mapped, error: null, cache: true };
          }
          return { data: fallback, error: json?.message || "Fallback na lokalne postave.", cache: false };
        })
        .catch((err) => {
          return {
            data: fallback,
            error: err?.message || "Neuspelo ucitavanje postava. Koristimo fallback.",
            cache: false,
          };
        })
        .then((entry) => {
          if (entry.cache) {
            LININGS_CACHE = { data: entry.data, ts: Date.now() };
          }
          return entry;
        })
        .finally(() => {
          LININGS_INFLIGHT = null;
        });

    if (!LININGS_INFLIGHT) LININGS_INFLIGHT = inflight;

    inflight.then((entry) => {
      if (cancelled) return;
      setLinings(entry.data);
      setError(entry.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cached?.data, fallback, isFresh]);

  return { linings, loading, error };
}
