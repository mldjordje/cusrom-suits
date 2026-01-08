"use client";

import { useEffect, useMemo, useState } from "react";

export type Button = {
  id: string;
  name: string;
  image_url: string;
  color_hex?: string | null;
  diameter?: number | null;
};

type CacheEntry = { data: Button[]; error: string | null; ts: number };

const CACHE_TTL_MS = 5 * 60 * 1000;
let BUTTONS_CACHE: CacheEntry | null = null;
let BUTTONS_INFLIGHT: Promise<CacheEntry> | null = null;

export function useButtons() {
  const fallbackButtons: Button[] = useMemo(
    () => [
      { id: "btn1", name: "Button 1", image_url: "/btn/1.jpg" },
      { id: "btn2", name: "Button 2", image_url: "/btn/2.jpg" },
      { id: "btn5", name: "Button 5", image_url: "/btn/5.jpg" },
      { id: "btn6", name: "Button 6", image_url: "/btn/6.jpg" },
    ],
    []
  );

  const cached = BUTTONS_CACHE;
  const isFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;
  const [buttons, setButtons] = useState<Button[]>(() => (isFresh ? cached?.data ?? [] : []));
  const [loading, setLoading] = useState<boolean>(() => !isFresh);
  const [error, setError] = useState<string | null>(() => (isFresh ? cached?.error ?? null : null));

  useEffect(() => {
    let cancelled = false;
    if (isFresh) {
      setButtons(cached?.data ?? []);
      setError(cached?.error ?? null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    const inflight =
      BUTTONS_INFLIGHT ??
      fetch("/api/buttons", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          const list = Array.isArray(json?.data) ? json.data : [];
          if (json?.success && list.length) {
            return { data: list, error: null } as CacheEntry;
          }
          return { data: fallbackButtons, error: json?.message || "Fallback na lokalna dugmad." } as CacheEntry;
        })
        .catch((err) => {
          return {
            data: fallbackButtons,
            error: err?.message || "Neuspelo ucitavanje dugmadi. Koristimo fallback.",
          } as CacheEntry;
        })
        .then((entry) => {
          const stamped = { ...entry, ts: Date.now() };
          BUTTONS_CACHE = stamped;
          return stamped;
        })
        .finally(() => {
          BUTTONS_INFLIGHT = null;
        });

    if (!BUTTONS_INFLIGHT) BUTTONS_INFLIGHT = inflight;

    inflight.then((entry) => {
      if (cancelled) return;
      setButtons(entry.data);
      setError(entry.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cached?.data, cached?.error, fallbackButtons, isFresh]);

  return { buttons, loading, error };
}
