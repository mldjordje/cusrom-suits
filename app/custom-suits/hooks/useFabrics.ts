"use client";

import { useEffect, useMemo, useState } from "react";
import { fabrics as fallbackFabrics } from "../data/options";
import { buildBackendUrl } from "../utils/backend";

export type FabricQuery = {
  tone?: "light" | "medium" | "dark";
  sort?: string;
  order?: "asc" | "desc";
};

export type UseFabricsResult<T = any> = {
  fabrics: T[];
  loading: boolean;
  error: string | null;
};

export type UseFabricsOptions = {
  enabled?: boolean;
};

type CacheEntry<T> = { data: T[]; error: string | null; ts: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
const FABRICS_CACHE = new Map<string, CacheEntry<any>>();
const FABRICS_INFLIGHT = new Map<string, Promise<CacheEntry<any>>>();

export function useFabrics<T = any>(query?: FabricQuery, options?: UseFabricsOptions): UseFabricsResult<T> {
  const fallbackList = (fallbackFabrics as unknown[]) as T[];
  const enabled = options?.enabled ?? true;

  const searchKey = useMemo(() => {
    const params = new URLSearchParams();
    if (query?.tone) params.set("tone", query.tone);
    if (query?.sort) params.set("sort", query.sort);
    if (query?.order) params.set("order", query.order);
    return params.toString();
  }, [query?.tone, query?.sort, query?.order]);

  const cacheKey = searchKey || "all";
  const cached = FABRICS_CACHE.get(cacheKey);
  const isFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;

  const [fabrics, setFabrics] = useState<T[]>(() => (isFresh ? cached?.data ?? [] : []));
  const [loading, setLoading] = useState<boolean>(() => !isFresh);
  const [error, setError] = useState<string | null>(() => (isFresh ? cached?.error ?? null : null));

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    if (isFresh) {
      setFabrics(cached?.data ?? []);
      setError(cached?.error ?? null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    const url = `${buildBackendUrl("fabrics")}${searchKey ? `?${searchKey}` : ""}`;
    const existing = FABRICS_INFLIGHT.get(cacheKey);
    const inflight =
      existing ??
      fetch(url, { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          const list = Array.isArray(payload?.data) ? payload.data : [];
          if (payload?.success && list.length) {
            return { data: list, error: null } as CacheEntry<T>;
          }
          return { data: fallbackList, error: payload?.message || "Fallback na lokalne tkanine." } as CacheEntry<T>;
        })
        .catch((err) => {
          return {
            data: fallbackList,
            error: err?.message || "Neuspelo ucitavanje tkanina. Koristimo fallback.",
          } as CacheEntry<T>;
        })
        .then((entry) => {
          const stamped = { ...entry, ts: Date.now() };
          FABRICS_CACHE.set(cacheKey, stamped);
          return stamped;
        })
        .finally(() => {
          FABRICS_INFLIGHT.delete(cacheKey);
        });

    if (!existing) FABRICS_INFLIGHT.set(cacheKey, inflight);

    inflight.then((entry) => {
      if (cancelled) return;
      setFabrics(entry.data);
      setError(entry.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, fallbackList, isFresh, searchKey]);

  return { fabrics, loading, error };
}
