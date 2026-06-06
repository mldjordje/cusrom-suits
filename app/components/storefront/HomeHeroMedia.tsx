"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type HomeHeroMediaProps = {
  desktopVideoId: string;
  mobileVideoId?: string;
  desktopPosterSrc: string;
  mobilePosterSrc: string;
  /** Uploaded direct video file for desktop. If absent, the hero remains poster-only. */
  heroVideoUrl?: string;
  /** Uploaded direct video file for mobile. Falls back to heroVideoUrl if absent. */
  heroVideoMobileUrl?: string;
};

const DESKTOP_MQ = "(min-width: 768px)";

export default function HomeHeroMedia({
  desktopVideoId: _desktopVideoId,
  mobileVideoId: _mobileVideoId,
  desktopPosterSrc,
  mobilePosterSrc,
  heroVideoUrl,
  heroVideoMobileUrl,
}: HomeHeroMediaProps) {
  const { lowPower } = useAnimationBudget();
  const [viewportReady, setViewportReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
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
    if (!viewportReady || lowPower || !heroVideoUrl) {
      setShouldLoadVideo(false);
      setShowVideo(false);
      return;
    }

    let idleId: number | null = null;
    let loadTimeoutId: number | null = null;
    let showTimeoutId: number | null = null;

    const activate = () => {
      setShouldLoadVideo(true);
      showTimeoutId = window.setTimeout(() => setShowVideo(true), 900);
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
  }, [heroVideoUrl, lowPower, viewportReady]);

  const posterSrc = !viewportReady || isDesktop ? desktopPosterSrc : mobilePosterSrc;
  const activeVideoUrl = !viewportReady || isDesktop
    ? heroVideoUrl
    : (heroVideoMobileUrl || heroVideoUrl);
  const videoReady = showVideo && shouldLoadVideo && Boolean(activeVideoUrl) && !lowPower;

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
      {activeVideoUrl && shouldLoadVideo ? (
        <video
          src={activeVideoUrl}
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
      ) : null}
    </div>
  );
}
