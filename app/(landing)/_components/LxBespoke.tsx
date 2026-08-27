"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import styles from "../landing.module.scss";

type BespokeStep = {
  index: string;
  title: string;
  copy: string;
  cta?: string;
  href?: string;
};

const COPY: Record<"sr" | "en", { eyebrow: string; steps: BespokeStep[] }> = {
  sr: {
    eyebrow: "(03) — Sartoria",
    steps: [
      {
        index: "I",
        title: "Vuna koja se bira, ne naručuje",
        copy: "Vitale Barberis Canonico i Loro Piana. Balirana u Bielli, tkana za držanje boje i pad koji ne popušta posle treće sezone.",
      },
      {
        index: "II",
        title: "Spalla camicia",
        copy: "Napuljsko meko rame. Rukav se uvlači kao na košulji, bez uloška — pa odelo prati rame umesto da ga gradi.",
      },
      {
        index: "III",
        title: "AMF ručni štep",
        copy: "Vidljiv bod na reveru i džepovima, rađen rukom. Jedini ukras koji odelo sme da nosi.",
      },
      {
        index: "IV",
        title: "Vaša mera",
        copy: "Preko šezdeset mera, tri probe, jedan kroj koji ostaje u arhivi salona.",
        cta: "Konfigurišite odelo",
        href: "/custom-suits",
      },
    ],
  },
  en: {
    eyebrow: "(03) — Sartoria",
    steps: [
      {
        index: "I",
        title: "Wool that is chosen, not ordered",
        copy: "Vitale Barberis Canonico and Loro Piana. Baled in Biella, woven to hold colour and a drape that survives a third season.",
      },
      {
        index: "II",
        title: "Spalla camicia",
        copy: "The Neapolitan soft shoulder. The sleeve is set like a shirt's, unpadded — so the jacket follows a shoulder instead of building one.",
      },
      {
        index: "III",
        title: "AMF hand stitch",
        copy: "A visible pick stitch along the lapel and pockets, worked by hand. The only ornament a suit is allowed.",
      },
      {
        index: "IV",
        title: "Your measure",
        copy: "Over sixty measurements, three fittings, one pattern that stays in the atelier archive.",
        cta: "Configure your suit",
        href: "/custom-suits?lang=en",
      },
    ],
  },
};

/**
 * Sticky frame on the left, steps scrolling past on the right. No GSAP pin:
 * `position: sticky` cannot desynchronise, survives resize, and collapses to a
 * plain stack on narrow screens without a single media-query'd JS branch.
 */
export default function LxBespoke({
  lang,
  shots,
}: {
  lang: "sr" | "en";
  shots: string[];
}) {
  const [current, setCurrent] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copy = COPY[lang];

  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setCurrent(index);
        }
      },
      // A band across the middle of the viewport, so the frame changes when a
      // step reaches reading position rather than when it first appears.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section className={`${styles.section} ${styles.paper2} ${styles.bespoke}`}>
      <div className={styles.grid} style={{ paddingBottom: "clamp(40px, 7vh, 90px)" }}>
        <span className={styles.micro} style={{ gridColumn: "1 / span 12" }}>
          {copy.eyebrow}
        </span>
      </div>

      <div className={styles.bespokeGrid}>
        <div className={styles.bespokeStage}>
          <div className={styles.bespokeFrame}>
            {copy.steps.map((step, index) => (
              <div
                key={step.index}
                className={`${styles.bespokeShot} ${
                  index === current ? styles.bespokeShotOn : ""
                }`}
              >
                <StorefrontImage
                  sources={[shots[index] || shots[0]]}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </div>
            ))}
            <span className={`${styles.micro} ${styles.bespokeStageIndex}`}>
              {copy.steps[current]?.index}
            </span>
          </div>
        </div>

        <div className={styles.bespokeSteps}>
          {copy.steps.map((step, index) => (
            <div
              key={step.index}
              data-index={index}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
              className={`${styles.bespokeStep} ${
                index === current ? styles.bespokeStepOn : ""
              }`}
            >
              <span className={styles.micro}>{step.index}</span>
              <h3 className={styles.dMd}>{step.title}</h3>
              <p className={`${styles.meta} ${styles.bespokeStepCopy}`}>{step.copy}</p>
              {step.cta && step.href ? (
                <Link href={step.href} className={styles.rule} style={{ marginTop: 8 }}>
                  {step.cta}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
