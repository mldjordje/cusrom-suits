"use client";

import { useEffect, useMemo, useState } from "react";
import { suits } from "../data/options";
import { buildBackendUrl } from "../utils/backend";

export type Lining = {
  id: string;
  name: string;
  base?: string;
  left?: string;
  right?: string;
  texture?: string | null;
  price?: number | null;
};

export type UseLiningsOptions = {
  enabled?: boolean;
};

type CacheEntry = { data: Lining[]; ts: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
let LININGS_CACHE: CacheEntry | null = null;
let LININGS_INFLIGHT: Promise<{ data: Lining[]; error: string | null; cache: boolean }> | null = null;

const normalizeOptional = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeTexture = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export function useLinings(styleId?: string, options?: UseLiningsOptions) {
  const enabled = options?.enabled ?? true;
  const fallback: Lining[] = useMemo(() => {
    const current = suits.find((s) => s.id === styleId);
    const interiors = current?.interiors || suits[0]?.interiors || [];
    return interiors.map((int) => ({
      id: String(int.id),
      name: int.name,
      base: normalizeOptional(int.layers?.find((l) => l.id.includes("base"))?.src),
      left: normalizeOptional(int.layers?.find((l) => l.id.includes("left"))?.src),
      right: normalizeOptional(int.layers?.find((l) => l.id.includes("right"))?.src),
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
    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
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
      fetch(buildBackendUrl("linings"), { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          const list = Array.isArray(json?.data) ? json.data : [];
          if (json?.success && list.length) {
            const mapped = list.map((l: any, index: number) => {
              const id = String(l?.id ?? l?.uuid ?? l?.name ?? index);
              const fallbackMatch =
                fallback.find((item) => String(item.id) === id) ??
                fallback.find((item) => String(item.id).toLowerCase() === id.toLowerCase()) ??
                fallback[index];
              const base = normalizeOptional(l?.base ?? l?.base_url) ?? fallbackMatch?.base;
              const left = normalizeOptional(l?.left ?? l?.left_url) ?? fallbackMatch?.left;
              const right = normalizeOptional(l?.right ?? l?.right_url) ?? fallbackMatch?.right;
              const texture =
                normalizeTexture(l?.texture ?? l?.texture_url) ??
                normalizeTexture((fallbackMatch as any)?.texture) ??
                null;
              return {
                id,
                name: normalizeOptional(l?.name) ?? fallbackMatch?.name ?? `Lining ${index + 1}`,
                base,
                left,
                right,
                texture,
                price: l?.price ?? fallbackMatch?.price ?? null,
              } as Lining;
            });
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
  }, [cached?.data, enabled, fallback, isFresh]);

  return { linings, loading, error };
}
