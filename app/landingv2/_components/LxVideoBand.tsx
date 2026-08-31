"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../landing.module.scss";
import MaskLines from "./_fx/MaskLines";
import { getMotion } from "./_fx/motion";
import { useInView } from "./_fx/useInView";

type LxVideoBandProps = {
  video: string;
  poster: string;
  eyebrow: string;
  lines: string[];
  cta?: { label: string; href: string };
};

/**
 * Full-bleed cinematic break. The footage runs at a different scroll rate to
 * the band itself, so the band reads as a window onto something moving behind
 * the page rather than a video pasted into a box.
 */
export default function LxVideoBand({
  video,
  poster,
  eyebrow,
  lines,
  cta,
}: LxVideoBandProps) {
  const { ref, inView } = useInView<HTMLElement>({
    threshold: 0,
    rootMargin: "40% 0px",
    once: true,
  });
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  // Play only while on screen — a looping 18 MB clip in a background tab is
  // pure battery burn.
  useEffect(() => {
    const node = videoRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void node.play().catch(() => undefined);
        else node.pause();
      },
      { threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  // Depth parallax: media layer and copy layer travel at different rates.
  useEffect(() => {
    const section = ref.current;
    const media = mediaRef.current;
    if (!section || !media) return;

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap } = core;

      ctx = gsap.context(() => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(media, { yPercent: -12 }, { yPercent: 12, ease: "none" }, 0)
          .fromTo(
            `.${styles.bandInner}`,
            { yPercent: 8 },
            { yPercent: -8, ease: "none" },
            0,
          );
      }, section);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, [ref]);

  return (
    <section ref={ref} className={styles.band}>
      {/* Oversized so the parallax travel never exposes an edge. */}
      <div ref={mediaRef} className={styles.bandMedia} style={{ inset: "-14% 0" }}>
        <img
          src={poster}
          alt=""
          className={styles.bandBackdrop}
          loading="lazy"
          decoding="async"
        />

        {inView ? (
          <video
            ref={videoRef}
            className={`${styles.bandVideo} ${ready ? styles.bandVideoOn : ""}`}
            src={video}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onCanPlay={() => setReady(true)}
            onError={() => setReady(false)}
          />
        ) : null}
      </div>

      {/* Contrast comes from the scrim, never from dimming the type. */}
      <div className={styles.bandWash} />

      <div className={styles.bandInner}>
        <span className={`${styles.micro} ${styles.bandEyebrow}`}>{eyebrow}</span>

        <MaskLines lines={lines} className={`${styles.dLg} ${styles.bandTitle}`} />

        {cta ? (
          <Link href={cta.href} className={styles.heroPrimaryBtn} style={{ marginTop: 12 }}>
            <span>{cta.label}</span>
            <svg
              className={styles.heroArrow}
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
