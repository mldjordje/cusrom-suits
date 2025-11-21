"use client";

import { useEffect, useMemo, useState } from "react";
import { fabrics as fallbackFabrics } from "../data/options";
import { getBackendBase } from "../utils/backend";

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

export function useFabrics<T = any>(query?: FabricQuery): UseFabricsResult<T> {
  const [fabrics, setFabrics] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackList = (fallbackFabrics as unknown[]) as T[];

  const searchKey = useMemo(() => {
    const params = new URLSearchParams();
    if (query?.tone) params.set("tone", query.tone);
    if (query?.sort) params.set("sort", query.sort);
    if (query?.order) params.set("order", query.order);
    return params.toString();
  }, [query?.tone, query?.sort, query?.order]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const base = getBackendBase();
    const url = `${base}fabrics.php${searchKey ? `?${searchKey}` : ""}`;

    fetch(url, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const list = Array.isArray(payload?.data) ? payload.data : [];
        if (payload?.success && list.length) {
          setFabrics(list);
          setError(null);
        } else {
          setFabrics(fallbackList);
          setError(payload?.message || "Fallback na lokalne tkanine.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setFabrics(fallbackList);
        setError(err?.message || "Neuspelo uitavanje tkanina. Koristimo fallback.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackList, searchKey]);

  return { fabrics, loading, error };
}
