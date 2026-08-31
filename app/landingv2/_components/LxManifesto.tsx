"use client";

import { useEffect, useRef } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import MaskLines from "./_fx/MaskLines";
import { getMotion } from "./_fx/motion";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    left: "(01) — Manifest",
    right: "Sartoria Italiana • Od 2007.",
    lines: ["Ne pravimo odela", "za sve prilike.", "Pravimo jedno,", "za vašu."],
    subtext:
      "Svaki šav, svaka linija revera i pad ramena nastaju sa jednom svrhom — da stvore siluetu koja pripada samo vama.",
  },
  en: {
    left: "(01) — Manifesto",
    right: "Italian Sartoria • Since 2007",
    lines: ["We do not make suits", "for every occasion.", "We make one,", "for yours."],
    subtext:
      "Every stitch, every contour of the lapel and sleeve drop exists for a single purpose: a silhouette that belongs solely to you.",
  },
};

/**
 * The statement, delivered instead of displayed. The words are released line by
 * line as the reader scrolls through them — the scroll is the reading pace —
 * over a macro cloth texture drifting slowly behind at a third of the speed.
 */
export default function LxManifesto({ lang }: { lang: "sr" | "en" }) {
  const copy = COPY[lang];
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap } = core;

      ctx = gsap.context(() => {
        gsap.fromTo(
          `.${styles.manifestoTexture}`,
          { yPercent: -10, scale: 1.12 },
          {
            yPercent: 10,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          },
        );
      }, section);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.section} ${styles.manifesto}`}>
      <div className={styles.manifestoBackdrop} aria-hidden="true">
        <div className={styles.manifestoTexture}>
          <StorefrontImage
            sources={["/img/odela-luxury.jpg"]}
            fallbackSrc="/img/odela-luxury.jpg"
            alt=""
            fill
            sizes="100vw"
          />
        </div>
        <span className={styles.manifestoVeil} />
      </div>

      <div className={styles.grid}>
        <div className={styles.manifestoMeta}>
          <span className={styles.micro}>{copy.left}</span>
          <span className={styles.micro}>{copy.right}</span>
        </div>
        <div className={styles.manifestoContent}>
          <MaskLines
            lines={copy.lines}
            mode="line"
            scrub
            className={`${styles.manifestoInner} ${styles.dLg}`}
            start="top 78%"
          />
          <p className={styles.manifestoSub}>{copy.subtext}</p>
        </div>
      </div>
    </section>
  );
}
