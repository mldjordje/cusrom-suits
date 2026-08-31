"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

const VIDEO_PATIENCE_MS = 3000;

const COPY = {
  sr: {
    badge: "Sartoria Italiana • Ručna Izrada • Niš & Kruševac",
    lines: ["Odelo koje", "pamti", "vaše držanje"],
    sub: "Vrhunski italijanski štofovi od čiste vune Loro Piana i Cerruti, preko 60 preciznih mera i besprekorna ručna izrada u našim ateljeima.",
    primaryCta: "Istražite kolekciju",
    secondaryCta: "Konfigurišite po meri",
    badges: [
      { num: "100%", label: "Italijanska vuna", detail: "Loro Piana & Cerruti" },
      { num: "60+", label: "Unikatnih mera", detail: "Savršen kroj po telu" },
      { num: "2", label: "Salona u Srbiji", detail: "Niš & Kruševac" },
    ],
    scroll: "Skrolujte za više",
  },
  en: {
    badge: "Italian Sartoria • Bespoke Atelier • Niš & Kruševac",
    lines: ["A suit that", "remembers", "how you stand"],
    sub: "Finest Italian pure wool fabrics from Loro Piana and Cerruti, over 60 bespoke measurements, and master tailoring refined in our ateliers.",
    primaryCta: "Explore collection",
    secondaryCta: "Configure bespoke suit",
    badges: [
      { num: "100%", label: "Italian wool", detail: "Loro Piana & Cerruti" },
      { num: "60+", label: "Measurements", detail: "Anatomical bespoke fit" },
      { num: "2", label: "Ateliers in Serbia", detail: "Niš & Kruševac" },
    ],
    scroll: "Scroll to explore",
  },
};

export default function LxHero({ lang, image, video, videoFallback, poster }: LxHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [activeVideo, setActiveVideo] = useState(video || videoFallback);
  const copy = COPY[lang];
  const isEn = lang === "en";

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
        {/* Ambient video background covering full hero */}
        <div className={styles.heroMedia}>
          <LxImage
            src={poster || image}
            fallback={image}
            alt="Santos &amp; Santorini"
            sizes="100vw"
            priority
          />
        </div>

        {/* Full cinematic video layer with smooth opacity entrance */}
        <div className={styles.heroFullVideo}>
          <video
            ref={videoRef}
            key={activeVideo}
            className={`${styles.heroVideo} ${videoReady ? styles.heroVideoOn : ""}`}
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

        {/* Deep luxury radial wash for maximum readability and mood */}
        <div className={styles.heroCinematicWash} />

        {/* Content Container */}
        <div className={styles.heroInner}>
          <div className={styles.heroMainContent}>
            {/* Editorial Eyebrow Tag */}
            <div className={styles.heroEyebrow}>
              <span className={styles.heroBadgeDot} />
              <span>{copy.badge}</span>
            </div>

            {/* Display Headline */}
            <h1 className={`${styles.heroTitle} ${styles.dXl} ${styles.lines}`}>
              {copy.lines.map((line, index) => (
                <span key={line} className={styles.line}>
                  <span
                    className={styles.lineInner}
                    style={{ transitionDelay: `${400 + index * 120}ms` }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            {/* Subtitle description */}
            <p className={styles.heroSubText}>
              {copy.sub}
            </p>

            {/* Dual CTAs */}
            <div className={styles.heroCtaGroup}>
              <Link
                href={isEn ? "/web-shop?lang=en" : "/web-shop"}
                className={styles.heroPrimaryBtn}
              >
                <span>{copy.primaryCta}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.75 7H12.25M12.25 7L7 1.75M12.25 7L7 12.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <Link
                href={isEn ? "/custom-suits?lang=en" : "/custom-suits"}
                className={styles.heroSecondaryBtn}
              >
                <span>{copy.secondaryCta}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Floating Luxury Trust Badges */}
          <div className={styles.heroTrustBadges}>
            {copy.badges.map((b, idx) => (
              <div
                key={b.num}
                className={styles.heroTrustCard}
                style={{ animationDelay: `${700 + idx * 140}ms` }}
              >
                <div className={styles.heroTrustNum}>{b.num}</div>
                <div className={styles.heroTrustInfo}>
                  <span className={styles.heroTrustLabel}>{b.label}</span>
                  <span className={styles.heroTrustDetail}>{b.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Cue at Bottom */}
          <div className={styles.heroScrollCue}>
            <div className={styles.heroMouseIcon}>
              <div className={styles.heroMouseWheel} />
            </div>
            <span className={styles.heroScrollText}>{copy.scroll}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

