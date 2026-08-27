"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import LxImage from "./_fx/LxImage";
import Reveal from "./_fx/Reveal";
import Rise from "./_fx/Rise";
import styles from "../landing.module.scss";

export type LxCategory = {
  id: string;
  label: string;
  href: string;
  image: string;
  /** Bundled frame used when the legacy asset host is slow or down. */
  fallback: string;
};

const COPY = {
  sr: { eyebrow: "(02) — Kolekcija", all: "Cela kolekcija", shop: "Pogledajte" },
  en: { eyebrow: "(02) — Collection", all: "View everything", shop: "Shop" },
};

/**
 * Four large frames, alternating 7/5 and 5/7 across the twelve columns. The
 * picture is the content: nothing here is hidden behind a hover, because on
 * a fashion site the photograph is the only thing that sells.
 */
const SPANS = ["1 / span 7", "8 / span 5", "1 / span 5", "6 / span 7"];

export default function LxCategories({
  lang,
  categories,
  allHref,
}: {
  lang: "sr" | "en";
  categories: LxCategory[];
  allHref: string;
}) {
  const copy = COPY[lang];
  const sectionRef = useRef<HTMLElement | null>(null);

  // One scroll listener for the whole section rather than one per frame, and
  // it only ever writes a custom property — layout is never read in the
  // handler, so this cannot force a synchronous reflow.
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frames = Array.from(root.querySelectorAll<HTMLElement>(`.${styles.catFrame}`));
    if (!frames.length) return;

    let ticking = false;
    const draw = () => {
      const viewport = window.innerHeight;
      for (const frame of frames) {
        const rect = frame.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) continue;
        const progress = (viewport - rect.top) / (viewport + rect.height);
        frame.style.setProperty("--lx-drift", progress.toFixed(4));
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
    <section ref={sectionRef} className={`${styles.section} ${styles.paper} ${styles.cats}`}>
      <div className={styles.grid}>
        <Rise className={styles.catsHead}>
          <span className={styles.micro}>{copy.eyebrow}</span>
          <Link href={allHref} className={styles.rule}>
            {copy.all}
          </Link>
        </Rise>

        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={category.href}
            className={styles.catTile}
            style={{ gridColumn: SPANS[index % SPANS.length] }}
          >
            <Reveal delay={(index % 2) * 90} className={styles.catFrame}>
              <LxImage
                src={category.image}
                fallback={category.fallback}
                alt={category.label}
                sizes="(max-width: 900px) 100vw, 55vw"
              />
              <span className={styles.catScrim} />
              <Rise as="span" className={`${styles.micro} ${styles.catTileIndex}`} delay={200}>
                {String(index + 1).padStart(2, "0")}
              </Rise>
              <Rise as="span" className={styles.catTileFoot} delay={320}>
                <span className={styles.dMd}>{category.label}</span>
                <span className={styles.micro}>{copy.shop}</span>
              </Rise>
            </Reveal>
          </Link>
        ))}
      </div>
    </section>
  );
}
