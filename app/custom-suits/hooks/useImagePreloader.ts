"use client";

import { useEffect, useState } from "react";

export function useImagePreloader(urls: (string | undefined)[]) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    //  Filtriraj prazne vrednosti da izbegne "undefined"
    const validUrls = urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0);

    // Ako nema validnih URL-ova, odmah oznai kao uitano
    if (validUrls.length === 0) {
      setLoaded(true);
      return;
    }

    const promises = validUrls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.src = url.startsWith("/") ? url : `/${url}`; // sigurnost ako nema '/'
          img.onload = () => resolve();
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
