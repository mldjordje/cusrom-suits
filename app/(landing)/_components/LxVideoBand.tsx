"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../landing.module.scss";
import { useInView } from "./_fx/useInView";

type LxVideoBandProps = {
  video: string;
  poster: string;
  eyebrow: string;
  /** One line per rendered row. Kept short — this is a caption, not a column. */
  lines: string[];
  cta?: { label: string; href: string };
};

/**
 * A full-bleed moving frame between two quiet sections. The clip is not
 * attached to the DOM until the band is close to the viewport, so three of
 * these cost nothing on first load, and it pauses the moment it scrolls away.
 */
export default function LxVideoBand({
  video,
  poster,
  eyebrow,
  lines,
  cta,
}: LxVideoBandProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0, rootMargin: "60% 0px", once: true });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

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

  return (
    <section ref={ref} className={styles.band}>
      {/* The clip is square and 640-720px wide, so it plays at roughly native
          size in the middle of the band while a blurred still fills the rest
          of the frame. Upscaling it edge to edge would be soft, and soft is
          the one thing this page cannot be. */}
      <div className={styles.bandMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the poster is
            a bundled file and next/image is configured unoptimized, so the
            component would add a wrapper and no optimisation. */}
        <img src={poster} alt="" className={styles.bandBackdrop} loading="lazy" decoding="async" />
        <div className={styles.bandFilm}>
          {inView ? (
            <video
              ref={videoRef}
              className={`${styles.bandVideo} ${ready ? styles.bandVideoOn : ""}`}
              src={video}
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
      </div>

      <div className={styles.bandWash} />

      <div className={styles.bandInner}>
        <span className={`${styles.micro} ${styles.bandEyebrow}`}>{eyebrow}</span>
        {/* Blended against the moving frame rather than laid on top of it —
            the type keeps re-inverting as the clip plays underneath. */}
        <h2 className={`${styles.dLg} ${styles.bandTitle}`}>
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        {cta ? (
          <Link href={cta.href} className={`${styles.rule} ${styles.bandCta}`}>
            {cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
