"use client";

import { useEffect, useRef, useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import styles from "../landing.module.scss";

type LxHeroProps = {
  lang: "sr" | "en";
  image: string;
  video?: string | null;
  poster?: string | null;
};

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

/**
 * The frame holds still. Only an 6% vertical drift is tied to scroll — enough
 * that the picture feels alive under the type, far short of a parallax effect
 * anyone would notice as one.
 */
export default function LxHero({ lang, image, video, poster }: LxHeroProps) {
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [entered, setEntered] = useState(false);
  const copy = COPY[lang];

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const node = mediaRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const draw = () => {
      const progress = Math.min(1, window.scrollY / window.innerHeight);
      node.style.transform = `translate3d(0, ${(progress * 6).toFixed(3)}%, 0)`;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className={styles.hero}>
      <div ref={mediaRef} className={styles.heroMedia}>
        {video ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster || image}
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          <StorefrontImage
            sources={[image]}
            alt=""
            fill
            priority
            sizes="100vw"
          />
        )}
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
        <h1
          className={`${styles.heroTitle} ${styles.dXl} ${styles.lines} ${
            entered ? styles.linesOn : ""
          }`}
        >
          {copy.lines.map((line, index) => (
            <span key={line} className={styles.line}>
              <span
                className={styles.lineInner}
                style={{ transitionDelay: `${180 + index * 90}ms` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div className={`${styles.heroFoot} ${styles.micro}`}>{copy.scroll}</div>
      </div>
    </section>
  );
}
