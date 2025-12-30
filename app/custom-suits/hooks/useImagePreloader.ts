"use client";

import { useEffect, useState } from "react";

const preloadedUrls = new Set<string>();

export function useImagePreloader(urls: (string | undefined)[]) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    //  Filtriraj prazne vrednosti da izbegne "undefined"
    const validUrls = urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    const pendingUrls = validUrls.filter((url) => !preloadedUrls.has(url));

    // Ako nema validnih URL-ova, odmah oznai kao uitano
    if (pendingUrls.length === 0) {
      setLoaded(true);
      return;
    }

    const promises = pendingUrls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.decoding = "async";
          const normalized =
            url.startsWith("http") || url.startsWith("data:")
              ? url
              : url.startsWith("/")
                ? url
                : `/${url}`;
          img.src = normalized; // sigurnost ako nema '/'
          img.onload = () => {
            preloadedUrls.add(url);
            resolve();
          };
          img.onerror = (err) => reject(err);
        })
    );

    Promise.all(promises)
      .then(() => {
        if (isMounted) setLoaded(true);
      })
      .catch((err) => {
        console.error(" Error preloading images:", err);
        if (isMounted) setLoaded(true); // i dalje prikai UI
      });

    return () => {
      isMounted = false;
    };
  }, [urls]);

  return loaded;
}
