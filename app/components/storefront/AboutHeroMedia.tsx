"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";

type AboutHeroMediaProps = {
  /** Poster/fallback image. Shown until the video is ready, and always on low-power. */
  posterSrc: string;
  /** Optional background video: a YouTube link or an uploaded video URL (/fajlovi/…mp4). */
  videoSrc?: string;
  alt: string;
};

/** Extract a YouTube video id from watch/youtu.be/shorts/embed URLs. */
const parseYouTubeId = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

/**
 * Hero media for the About page. Renders the poster image immediately (LCP-friendly)
 * and, when a video is configured, lazily fades in an autoplaying muted loop behind
 * the hero title. Supports both uploaded video files and YouTube links.
 */
export default function AboutHeroMedia({ posterSrc, videoSrc, alt }: AboutHeroMediaProps) {
  const { lowPower } = useAnimationBudget();
  const poster = sanitizeStorefrontImageSrc(posterSrc) || posterSrc;
  const rawVideo = (videoSrc || "").trim();
  const youTubeId = parseYouTubeId(rawVideo);
  const fileVideo = !youTubeId && rawVideo ? sanitizeStorefrontImageSrc(rawVideo) || rawVideo : "";
  const hasVideo = Boolean(youTubeId || fileVideo);

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
  const overlayStyle = {
    objectFit: "cover" as const,
    opacity: videoReady ? 1 : 0,
    transition: "opacity 600ms ease",
    pointerEvents: "none" as const,
    border: 0,
  };

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
      {youTubeId && shouldLoadVideo ? (
        // Background YouTube embed. muted+autoplay+loop, scaled to cover so it fills
        // the hero without letterboxing. aria-hidden — it is decoration behind the title.
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youTubeId}?autoplay=1&mute=1&loop=1&playlist=${youTubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1`}
          title={alt}
          aria-hidden="true"
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className="position-absolute top-50 start-50"
          style={{
            ...overlayStyle,
            width: "177.78vh",
            minWidth: "100%",
            height: "56.25vw",
            minHeight: "100%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
      {fileVideo && shouldLoadVideo ? (
        <video
          src={fileVideo}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="position-absolute top-0 start-0 w-100 h-100"
          style={overlayStyle}
        />
      ) : null}
    </div>
  );
}
