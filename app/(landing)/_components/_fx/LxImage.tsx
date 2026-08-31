"use client";

import { useEffect, useRef, useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

type LxImageProps = {
  src: string;
  /** Bundled image to show if the legacy host is slow or unreachable. */
  fallback: string;
  alt: string;
  sizes: string;
  priority?: boolean;
};

/** How long the legacy host gets before we stop waiting on it. */
const PATIENCE_MS = 2500;

/**
 * StorefrontImage already falls back when a source errors, but a host that
 * hangs never fires onError — the request just sits there and the frame stays
 * empty. That is exactly what assets.santos.rs does when it is down, and it
 * left the collection section as four grey boxes. This gives the remote image
 * a deadline and swaps in a bundled one when it misses it.
 */
export default function LxImage({ src, fallback, alt, sizes, priority }: LxImageProps) {
  const [source, setSource] = useState(src);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setSource(src);
    if (!src || src === fallback) return;

    let timer: number | undefined;

    // Only start patience timer if the image is in or near the viewport
    const checkHung = () => {
      const node = wrapRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const isNearViewport = rect.top < window.innerHeight * 1.5 && rect.bottom > -200;
      
      if (isNearViewport) {
        timer = window.setTimeout(() => {
          const img = wrapRef.current?.querySelector("img");
          if (img && img.naturalWidth === 0 && !img.complete) {
            setSource(fallback);
          }
        }, PATIENCE_MS);
      }
    };

    checkHung();
    window.addEventListener("scroll", checkHung, { passive: true });

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", checkHung);
    };
  }, [src, fallback]);

  return (
    <span ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <StorefrontImage
        sources={[source, fallback]}
        fallbackSrc={fallback}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
      />
    </span>
  );
}
