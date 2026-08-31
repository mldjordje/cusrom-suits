"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import LxImage from "./_fx/LxImage";
import MaskLines from "./_fx/MaskLines";
import { getMotion, prefersReduced } from "./_fx/motion";
import styles from "../landing.module.scss";

type LxHeroProps = {
  lang: "sr" | "en";
  image: string;
  video?: string | null;
  videoFallback: string;
  poster?: string | null;
};

const VIDEO_PATIENCE_MS = 2500;

const COPY = {
  sr: {
    eyebrow: "Sartoria Italiana • Od 2007.",
    headline: ["Odelo koje pamti", "vaše držanje."],
    subline: "Italijanske tkanine. Ručni rad. Savršen kroj po vašem telu.",
    cta: "Istražite kolekciju",
    scroll: "Skrolujte za više",
  },
  en: {
    eyebrow: "Italian Sartoria • Since 2007",
    headline: ["A suit that", "remembers you."],
    subline: "Finest Italian cloth. Master craft. Flawless bespoke fit.",
    cta: "Explore collection",
    scroll: "Scroll to explore",
  },
};

/**
 * Full-bleed cinematic opening. Three text elements and one CTA — everything
 * else lives further down the page.
 *
 * The exit is scroll-driven rather than a fade: the footage pushes back and
 * closes on itself while the copy lifts away, so the manifesto below appears
 * to be revealed from underneath instead of scrolling over the top.
 */
export default function LxHero({ lang, image, video, videoFallback, poster }: LxHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [activeVideo, setActiveVideo] = useState(video || videoFallback);
  const copy = COPY[lang];
  const isEn = lang === "en";

  useEffect(() => {
    setActiveVideo(video || videoFallback);
    setVideoReady(false);
  }, [video, videoFallback]);

  // Fallback guard if the heavy production cut stalls on the legacy host.
  useEffect(() => {
    if (activeVideo === videoFallback) return;

    const timer = window.setTimeout(() => {
      const node = videoRef.current;
      if (!node || node.readyState === 0) setActiveVideo(videoFallback);
    }, VIDEO_PATIENCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeVideo, videoFallback]);

  // Curtain open.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    const guard = window.setTimeout(() => setEntered(true), 150);

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(guard);
    };
  }, []);

  // Entrance stagger for the sub-line, CTA and scroll cue. The headline runs
  // its own masked reveal; these follow it in.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || prefersReduced()) return;

    const followers = Array.from(
      content.querySelectorAll<HTMLElement>(`[data-hero-follow]`),
    );
    for (const node of followers) {
      node.style.opacity = "0";
      node.style.transform = "translate3d(0, 24px, 0)";
    }

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      ctx = core.gsap.context(() => {
        core.gsap.to(followers, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.12,
          delay: 0.75,
          clearProps: "transform,opacity",
        });
      }, content);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, []);

  // Scroll-driven exit, replacing the old hand-rolled scroll listener.
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap } = core;

      ctx = gsap.context(() => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: node.parentElement || node,
              start: "top top",
              end: "bottom top",
              scrub: 0.8,
              invalidateOnRefresh: true,
              // The hero is position:fixed; once it is fully covered it must
              // stop compositing or it costs frames for the whole page.
              onToggle: (self) => {
                node.style.visibility = self.isActive ? "" : "hidden";
                const clip = videoRef.current;
                if (!clip) return;
                if (self.isActive) void clip.play().catch(() => undefined);
                else clip.pause();
              },
            },
          })
          .to(`.${styles.heroFullVideo}`, { scale: 1.14, ease: "none" }, 0)
          .to(`.${styles.heroMedia}`, { yPercent: 8, ease: "none" }, 0)
          .to(`.${styles.heroInner}`, { yPercent: -14, opacity: 0, ease: "none" }, 0);
      }, node);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div className={styles.heroSlot}>
      <section ref={heroRef} className={`${styles.hero} ${entered ? styles.heroOpen : ""}`}>
        {/* Still frame carries the LCP while the video streams in. */}
        <div className={styles.heroMedia}>
          <LxImage
            src={poster || image}
            fallback={image}
            alt="Santos & Santorini Sartoria"
            sizes="100vw"
            priority
          />
        </div>

        <div className={styles.heroFullVideo}>
          <video
            ref={videoRef}
            key={activeVideo}
            className={`${styles.heroVideo} ${videoReady ? styles.heroVideoOn : ""}`}
            src={activeVideo}
            poster={poster || image}
            autoPlay
            muted
            loop
            playsInline
            // metadata, not auto: the production cut is 27 MB and preloading it
            // in full competes with the LCP image for bandwidth.
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            onError={() => {
              setVideoReady(false);
              setActiveVideo(videoFallback);
            }}
          />
        </div>

        {/* Filmic scrim — contrast comes from the gradient, never from dimming
            the type itself, so the copy stays at full WCAG AA weight. */}
        <div className={styles.heroCinematicWash} />

        <div className={styles.heroInner}>
          <div ref={contentRef} className={styles.heroMainContent}>
            <div className={styles.heroEyebrow} data-hero-follow>
              <span className={styles.heroBadgeDot} />
              <span>{copy.eyebrow}</span>
            </div>

            <MaskLines
              as="h1"
              lines={copy.headline}
              className={styles.heroTitle}
              stagger={0.07}
              start="top 95%"
            />

            <p className={styles.heroSubText} data-hero-follow>
              {copy.subline}
            </p>

            <div className={styles.heroCtaWrap} data-hero-follow>
              <Link
                href={isEn ? "/web-shop?lang=en" : "/web-shop"}
                className={styles.heroPrimaryBtn}
              >
                <span>{copy.cta}</span>
                <svg
                  className={styles.heroArrow}
                  width="14"
                  height="14"
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
            </div>
          </div>

          <div className={styles.heroScrollCue} aria-hidden="true">
            <span className={styles.heroScrollText}>{copy.scroll}</span>
            <div className={styles.heroScrollLine}>
              <div className={styles.heroScrollDot} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
