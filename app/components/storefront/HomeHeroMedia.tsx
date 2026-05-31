"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type HomeHeroMediaProps = {
  desktopVideoId: string;
  /** Optional muted autoplay loop on narrow viewports; skipped on save-data / 2G. */
  mobileVideoId?: string;
  desktopPosterSrc: string;
  mobilePosterSrc: string;
  /** If provided, overrides YouTube embeds with a direct video file. */
  heroVideoUrl?: string;
};

const DESKTOP_MQ = "(min-width: 768px)";

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0`;

export default function HomeHeroMedia({
  desktopVideoId,
  mobileVideoId,
  desktopPosterSrc,
  mobilePosterSrc,
  heroVideoUrl,
}: HomeHeroMediaProps) {
  /** Hero video: skip only on save-data / 2G (not OS reduce-motion). */
  const { lowPower } = useAnimationBudget();
  const [viewportReady, setViewportReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  // showVideo je odvojen od loadVideo — video se učitava u pozadini,
  // ali postaje vidljiv tek nakon 3.2s da YouTube stigne da autoplay-uje
  // pre nego što poster nestane (sprečava bljesak play button-a)
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    setIsDesktop(mq.matches);
    setViewportReady(true);

    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!viewportReady || lowPower) {
      setShouldLoadVideo(false);
      setShowVideo(false);
      return;
    }

    let idleId: number | null = null;
    let loadTimeoutId: number | null = null;
    let showTimeoutId: number | null = null;

    const activate = () => {
      // Korak 1: dodaj iframe u DOM da počne učitavanje
      setShouldLoadVideo(true);
      // Korak 2: tek nakon 3.2s postavi is-video-ready (YouTube treba vremena
      // da autoplay-uje — ovo sprečava bljesak play button-a)
      showTimeoutId = window.setTimeout(() => setShowVideo(true), 3200);
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(activate, { timeout: 1400 });
    } else {
      loadTimeoutId = window.setTimeout(activate, 900);
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (loadTimeoutId !== null) window.clearTimeout(loadTimeoutId);
      if (showTimeoutId !== null) window.clearTimeout(showTimeoutId);
    };
  }, [lowPower, viewportReady]);

  const showDesktopVideo = shouldLoadVideo && viewportReady && isDesktop && !lowPower;
  const showMobileVideo = shouldLoadVideo && viewportReady && !isDesktop && Boolean(mobileVideoId) && !lowPower;
  // videoReady (is-video-ready CSS class) sada čeka showVideo — YouTube mora
  // da autoplay-uje pre nego što poster nestane
  const videoReady = showVideo && (showDesktopVideo || showMobileVideo);
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
      {heroVideoUrl && shouldLoadVideo ? (
        <video
          src={heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          poster={desktopPosterSrc}
          className="ss-home18-hero__iframe ss-home18-hero__video-frame"
          aria-hidden="true"
          tabIndex={-1}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      ) : (
        <>
          {showDesktopVideo ? (
            <iframe
              title="Santos and Santorini hero desktop video"
              src={buildEmbed(desktopVideoId)}
              className="ss-home18-hero__iframe ss-home18-hero__iframe--desktop ss-home18-hero__video-frame"
              loading="lazy"
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
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
