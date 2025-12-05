"use client";

import { useEffect, useMemo, useState } from "react";

export type Button = {
  id: string;
  name: string;
  image_url: string;
  color_hex?: string | null;
  diameter?: number | null;
};

export function useButtons() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackButtons: Button[] = useMemo(
    () => [
      { id: "btn1", name: "Button 1", image_url: "/btn/1.jpg" },
      { id: "btn2", name: "Button 2", image_url: "/btn/2.jpg" },
      { id: "btn5", name: "Button 5", image_url: "/btn/5.jpg" },
      { id: "btn6", name: "Button 6", image_url: "/btn/6.jpg" },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/buttons", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        if (json?.success && list.length) {
          setButtons(list);
          setError(null);
        } else {
          setButtons(fallbackButtons);
          setError(json?.message || "Fallback na lokalna dugmad.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setButtons(fallbackButtons);
        setError(err?.message || "Neuspelo učitavanje dugmadi. Koristimo fallback.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fallbackButtons]);

  return { buttons, loading, error };
}
