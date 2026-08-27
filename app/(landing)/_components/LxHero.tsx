"use client";

import { useEffect, useRef, useState } from "react";
import LxImage from "./_fx/LxImage";
import styles from "../landing.module.scss";

type LxHeroProps = {
  lang: "sr" | "en";
  image: string;
  video?: string | null;
  /** Bundled clip used when the configured one errors or never arrives. */
  videoFallback: string;
  poster?: string | null;
};

/** How long the configured clip gets before the bundled one takes over. */
const VIDEO_PATIENCE_MS = 3000;

const COPY = {
  sr: {
    lines: ["Odelo koje", "pamti", "vaše držanje"],
    corner: ["(SS_'26)", "Niš — Kruševac"],
    scroll: "Skrolujte",
  },
  en: {
    lines: ["A suit that", "remembers", "how you stand"],
    corner: ["(SS_'26)", "Niš — Kruševac"],
    scroll: "Scroll",
  },
};

export default function LxHero({ lang, image, video, videoFallback, poster }: LxHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [activeVideo, setActiveVideo] = useState(video || videoFallback);
  const copy = COPY[lang];

  // The admin-configured URL is honoured first, but a hero that silently falls
  // back to a still because the media library points at a dead file is worse
  // than no configuration at all. A 500 fires onError; a host that simply
  // hangs never does, so the deadline covers that case too.
  useEffect(() => {
    setActiveVideo(video || videoFallback);
    setVideoReady(false);
  }, [video, videoFallback]);

  useEffect(() => {
    if (activeVideo === videoFallback) return;

    const timer = window.setTimeout(() => {
      const node = videoRef.current;
      if (!node || node.readyState === 0) setActiveVideo(videoFallback);
    }, VIDEO_PATIENCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeVideo, videoFallback]);

  // Two frames, not one: the first commits the closed curtain to the
  // compositor, the second starts opening it. Firing both in one frame makes
  // the browser skip straight to the end state.
  //
  // The timer is not belt and braces. A page opened in a background tab gets
  // no animation frames at all, and without it the hero would still be sitting
  // behind a half-closed curtain whenever the visitor switched to it.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    const guard = window.setTimeout(() => setEntered(true), 200);

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(guard);
    };
  }, []);

  // The hero is fixed and everything below slides up over it, so it is never
  // scrolled away — it is covered. Scroll position, not an observer, decides
  // when it is hidden: a fixed element always intersects the viewport, so an
  // IntersectionObserver would leave the clip playing behind the whole page.
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    let covered = false;

    const draw = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      if (!reduced) {
        node.style.setProperty("--lx-hero-progress", progress.toFixed(4));
        // The type is gone well before the section above it lands, so the two
        // never overlap mid-fade.
        node.style.setProperty("--lx-hero-fade", Math.min(1, progress * 1.6).toFixed(4));
      }

      const nowCovered = progress >= 1;
      if (nowCovered !== covered) {
        covered = nowCovered;
        node.style.visibility = covered ? "hidden" : "";
        const clip = videoRef.current;
        if (clip) {
          if (covered) clip.pause();
          else void clip.play().catch(() => undefined);
        }
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={styles.heroSlot}>
      <section ref={heroRef} className={`${styles.hero} ${entered ? styles.heroOpen : ""}`}>
        <div className={styles.heroMedia}>
          <LxImage
            src={poster || image}
            fallback={image}
            alt=""
            sizes="100vw"
            priority
          />
        </div>

        {/* Santos' own clips are 640-720px square. Stretched across a 1440px
            hero they would be visibly soft, so the footage runs as a column at
            roughly its native height instead — sharp, and the display type
            crosses it so the difference blend has something moving to invert
            against. A 1920x1080 upload in the admin can take the full frame. */}
        <div className={styles.heroFilm}>
          <video
            ref={videoRef}
            key={activeVideo}
            className={`${styles.heroVideo} ${videoReady ? styles.heroVideoOn : ""}`}
            // src on the element, not a <source> child: error events from a
            // <source> do not reliably reach the video's own onError.
            src={activeVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onError={() => {
              setVideoReady(false);
              setActiveVideo(videoFallback);
            }}
          />
        </div>

        <div className={styles.heroWash} />

        <div className={styles.heroCorner}>
          {copy.corner.map((line) => (
            <div key={line} className={styles.micro} style={{ marginBottom: 6 }}>
              {line}
            </div>
          ))}
        </div>

        <div className={styles.heroInner}>
          {/* Blended against the frame instead of laid over it: the letters
              invert continuously as the clip moves underneath them. */}
          <h1 className={`${styles.heroTitle} ${styles.dXl} ${styles.lines}`}>
            {copy.lines.map((line, index) => (
              <span key={line} className={styles.line}>
                <span
                  className={styles.lineInner}
                  style={{ transitionDelay: `${520 + index * 110}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <div className={`${styles.heroFoot} ${styles.micro}`}>
            {copy.scroll}
            <span className={styles.heroTick} aria-hidden />
          </div>
        </div>
      </section>
    </div>
  );
}
