"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 800;
const EXIT_DURATION_MS = 420;
const SESSION_KEY = "ss-storefront-preloader-seen";

export default function StorefrontPreloader() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;

    let releaseTimer: number | undefined;
    let exitTimer: number | undefined;
    let released = false;

    startedAtRef.current = window.performance.now();
    setIsVisible(true);

    const release = () => {
      if (released) return;
      released = true;
      const elapsed = window.performance.now() - startedAtRef.current;
      const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);

      releaseTimer = window.setTimeout(() => {
        setIsExiting(true);
        window.sessionStorage.setItem(SESSION_KEY, "1");
        exitTimer = window.setTimeout(() => {
          setIsVisible(false);
        }, EXIT_DURATION_MS);
      }, waitMs);
    };

    if (document.readyState === "complete") {
      release();
    } else {
      window.addEventListener("load", release, { once: true });
      releaseTimer = window.setTimeout(release, 1800);
    }

    return () => {
      window.removeEventListener("load", release);
      if (releaseTimer) window.clearTimeout(releaseTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, []);

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
            unoptimized
            className="ss-preloader__logo"
          />
        </div>
        <span className="ss-preloader__line" />
      </div>
    </div>
  );
}
