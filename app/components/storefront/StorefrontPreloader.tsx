"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 260;
const EXIT_DURATION_MS = 260;

export default function StorefrontPreloader({ onExitComplete }: { onExitComplete?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let releaseTimer: number | undefined;
    let exitTimer: number | undefined;
    let released = false;

    startedAtRef.current = window.performance.now();

    const release = () => {
      if (released) return;
      released = true;
      const elapsed = window.performance.now() - startedAtRef.current;
      const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);

      releaseTimer = window.setTimeout(() => {
        setIsExiting(true);
        exitTimer = window.setTimeout(() => {
          setIsVisible(false);
          onExitComplete?.();
        }, EXIT_DURATION_MS);
      }, waitMs);
    };

    if (document.readyState === "complete") {
      release();
    } else {
      window.addEventListener("load", release, { once: true });
      releaseTimer = window.setTimeout(release, 1200);
    }

    return () => {
      window.removeEventListener("load", release);
      if (releaseTimer) window.clearTimeout(releaseTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, [onExitComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`ss-preloader ${isExiting ? "is-exiting" : ""}`}
      aria-hidden="true"
    >
      <div className="ss-preloader__backdrop" />
      <div className="ss-preloader__mark">
        <div className="ss-preloader__logo-wrap">
          <Image
            src="/img/logo-header.png"
            alt="Santos and Santorini"
            width={360}
            height={110}
            priority
            className="ss-preloader__logo"
          />
        </div>
        <span className="ss-preloader__caption">Tailored in silence</span>
        <span className="ss-preloader__line" />
      </div>
    </div>
  );
}
