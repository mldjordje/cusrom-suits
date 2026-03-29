"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type HomeHeroMediaProps = {
  desktopVideoId: string;
  desktopPosterSrc: string;
  mobilePosterSrc: string;
};

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0`;

export default function HomeHeroMedia({
  desktopVideoId,
  desktopPosterSrc,
  mobilePosterSrc,
}: HomeHeroMediaProps) {
  const { reduceMotion } = useAnimationBudget();
  const [isDesktop, setIsDesktop] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(min-width: 768px)");
    const syncViewport = () => setIsDesktop(media.matches);

    syncViewport();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncViewport);
      return () => media.removeEventListener("change", syncViewport);
    }

    media.addListener(syncViewport);
    return () => media.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (reduceMotion || !isDesktop) {
      setShowVideo(false);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const enableVideo = () => {
      if (!cancelled) {
        setShowVideo(true);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(enableVideo, { timeout: 1400 });
    } else {
      timeoutId = window.setTimeout(enableVideo, 950);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isDesktop, reduceMotion]);

  return (
    <div className={`ss-home18-hero__media position-absolute top-0 start-0 w-100 h-100 ${showVideo ? "is-video-ready" : ""}`}>
      <Image
        src={isDesktop ? desktopPosterSrc : mobilePosterSrc}
        alt=""
        fill
        priority
        className="ss-home18-hero__poster"
        sizes="100vw"
      />
      {showVideo ? (
        <iframe
          title="Santos and Santorini hero desktop video"
          src={buildEmbed(desktopVideoId)}
          className="ss-home18-hero__iframe ss-home18-hero__iframe--desktop ss-home18-hero__video-frame"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
