"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";

type AboutHeroMediaProps = {
  /** Poster/fallback image. Shown until the video is ready, and always on low-power. */
  posterSrc: string;
  /** Optional background video (relative /fajlovi/… path). When absent the hero stays image-only. */
  videoSrc?: string;
  alt: string;
};

/**
 * Hero media for the About page. Renders the poster image immediately (LCP-friendly)
 * and, when a video is configured, lazily fades in an autoplaying muted loop behind
 * the hero title. Mirrors the homepage hero behaviour (see HomeHeroMedia).
 */
export default function AboutHeroMedia({ posterSrc, videoSrc, alt }: AboutHeroMediaProps) {
  const { lowPower } = useAnimationBudget();
  const poster = sanitizeStorefrontImageSrc(posterSrc) || posterSrc;
  const video = videoSrc ? sanitizeStorefrontImageSrc(videoSrc) || videoSrc : "";
  const hasVideo = Boolean(video);

  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (lowPower || !hasVideo) {
      setShouldLoadVideo(false);
      setShowVideo(false);
      return;
    }

    let idleId: number | null = null;
    let loadTimeoutId: number | null = null;
    let showTimeoutId: number | null = null;

    const activate = () => {
      setShouldLoadVideo(true);
      showTimeoutId = window.setTimeout(() => setShowVideo(true), 700);
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(activate, { timeout: 1400 });
    } else {
      loadTimeoutId = window.setTimeout(activate, 700);
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (loadTimeoutId !== null) window.clearTimeout(loadTimeoutId);
      if (showTimeoutId !== null) window.clearTimeout(showTimeoutId);
    };
  }, [hasVideo, lowPower]);

  const videoReady = hasVideo && showVideo && shouldLoadVideo && !lowPower;

  return (
    <div className="about-hero__media position-relative w-100 overflow-hidden">
      <Image
        src={poster}
        width={1920}
        height={900}
        alt={alt}
        className="w-100 h-auto object-fit-cover"
        priority
        unoptimized
      />
      {hasVideo && shouldLoadVideo ? (
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="about-hero__video position-absolute top-0 start-0 w-100 h-100"
          style={{
            objectFit: "cover",
            opacity: videoReady ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        />
      ) : null}
    </div>
  );
}
