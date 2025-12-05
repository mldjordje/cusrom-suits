"use client";

import { useEffect, useMemo, useState } from "react";
import { suits } from "../data/options";

export type Lining = {
  id: string;
  name: string;
  base?: string;
  left?: string;
  right?: string;
  price?: number | null;
};

export function useLinings(styleId?: string) {
  const [linings, setLinings] = useState<Lining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallback: Lining[] = useMemo(() => {
    const current = suits.find((s) => s.id === styleId);
    const interiors = current?.interiors || suits[0]?.interiors || [];
    return interiors.map((int) => ({
      id: int.id,
      name: int.name,
      base: int.layers?.find((l) => l.id.includes("base"))?.src,
      left: int.layers?.find((l) => l.id.includes("left"))?.src,
      right: int.layers?.find((l) => l.id.includes("right"))?.src,
    }));
  }, [styleId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/linings", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        if (json?.success && list.length) {
          setLinings(list);
          setError(null);
        } else {
          setLinings(fallback);
          setError(json?.message || "Fallback na lokalne postave.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLinings(fallback);
        setError(err?.message || "Neuspelo učitavanje postava. Koristimo fallback.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return { linings, loading, error };
}
