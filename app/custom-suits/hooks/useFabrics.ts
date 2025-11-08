"use client";

import { useEffect, useMemo, useState } from "react";
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
        if (payload?.success) {
          setFabrics(payload.data);
          setError(null);
        } else {
          setError(payload?.message || "Neuspelo učitavanje tkanina");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Neuspelo učitavanje tkanina");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchKey]);

  return { fabrics, loading, error };
}
