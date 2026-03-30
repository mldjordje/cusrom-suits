"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type HomeHeroMediaProps = {
  desktopVideoId: string;
  /** Optional muted autoplay loop on narrow viewports; skipped on save-data / 2G. */
  mobileVideoId?: string;
  desktopPosterSrc: string;
  mobilePosterSrc: string;
};

const DESKTOP_MQ = "(min-width: 768px)";

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0`;

export default function HomeHeroMedia({
  desktopVideoId,
  mobileVideoId,
  desktopPosterSrc,
  mobilePosterSrc,
}: HomeHeroMediaProps) {
  /** Hero video: skip only on save-data / 2G (not OS reduce-motion). */
  const { lowPower } = useAnimationBudget();
  const [viewportReady, setViewportReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useLayoutEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    setIsDesktop(mq.matches);
    setViewportReady(true);

    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const showDesktopVideo = viewportReady && isDesktop && !lowPower;
  const showMobileVideo = viewportReady && !isDesktop && Boolean(mobileVideoId) && !lowPower;
  const videoReady = showDesktopVideo || showMobileVideo;
  const posterSrc = !viewportReady || isDesktop ? desktopPosterSrc : mobilePosterSrc;

  return (
    <div
      className={`ss-home18-hero__media position-absolute top-0 start-0 w-100 h-100 ${videoReady ? "is-video-ready" : ""}`}
    >
      <Image
        src={posterSrc}
        alt=""
        fill
        priority
        className="ss-home18-hero__poster"
        sizes="100vw"
      />
      {showDesktopVideo ? (
        <iframe
          title="Santos and Santorini hero desktop video"
          src={buildEmbed(desktopVideoId)}
          className="ss-home18-hero__iframe ss-home18-hero__iframe--desktop ss-home18-hero__video-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
      {showMobileVideo && mobileVideoId ? (
        <iframe
          title="Santos and Santorini hero mobile video"
          src={buildEmbed(mobileVideoId)}
          className="ss-home18-hero__iframe ss-home18-hero__iframe--mobile ss-home18-hero__video-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
