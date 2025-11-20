"use client";

import { useEffect, useMemo, useState } from "react";
import { fabrics as fallbackFabrics } from "../data/options";
import { getBackendBase } from "../utils/backend";

export type FabricQuery = {
  tone?: "light" | "medium" | "dark";
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
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
    const normalizedSearch = query?.search?.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);
    return params.toString();
  }, [query?.tone, query?.sort, query?.order, query?.search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const controller = new AbortController();
    const base = getBackendBase();
    const url = `${base}fabrics.php${searchKey ? `?${searchKey}` : ""}`;

    const fetchData = async () => {
      try {
        const response = await fetch(url, { cache: "no-store", mode: "cors", signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (cancelled || controller.signal.aborted) return;
        const list = Array.isArray(payload?.data) ? payload.data : [];
        if (payload?.success) {
          setFabrics(list);
          setError(null);
        } else {
          setFabrics(fallbackList);
          setError(payload?.message || "Fallback na lokalne tkanine.");
        }
      } catch (err: any) {
        if (cancelled || controller.signal.aborted) return;
        setFabrics(fallbackList);
        setError(err?.message || "Neuspelo učitavanje tkanina. Koristimo fallback.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fallbackList, searchKey]);

  return { fabrics, loading, error };
}
