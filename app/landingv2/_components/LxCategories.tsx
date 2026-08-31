"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import MaskLines from "./_fx/MaskLines";
import { getMotion } from "./_fx/motion";
import styles from "../landing.module.scss";

export type LxCategory = {
  id: string;
  label: string;
  href: string;
  image: string;
  fallback: string;
};

const COPY = {
  sr: {
    eyebrow: "(02) — Kolekcija & Krojevi",
    title: ["Četiri kuće", "jednog kroja."],
    all: "Pregledajte celu kolekciju",
    shop: "Istražite",
    endTitle: "Ostalo je u salonu.",
    endCopy:
      "Preko 500 italijanskih štofova, kompletna konfekcija i obuća — uživo u Nišu i Kruševcu, ili u web shopu.",
  },
  en: {
    eyebrow: "(02) — Curated Collections",
    title: ["Four houses,", "one cut."],
    all: "View full collection",
    shop: "Explore",
    endTitle: "The rest is in the atelier.",
    endCopy:
      "Over 500 Italian cloths, the full ready-to-wear range and footwear — in Niš and Kruševac, or online.",
  },
};

/**
 * The collections read as a runway, not as a grid. On desktop the section pins
 * and the wheel drives the track sideways; each frame's photograph drifts
 * against the track at a different rate, so the panels sit in depth instead of
 * sliding as one flat strip.
 *
 * On touch the same panels become a native snap rail — a faked horizontal pin
 * on a 390px screen is the worst of both worlds.
 */
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!section || !track || !viewport) return;

    let ctx: { revert: () => void } | null = null;
    let dead = false;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap, ScrollTrigger } = core;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(min-width: 901px)", () => {
          const distance = () => Math.max(0, viewport.scrollWidth - window.innerWidth);
          const shots = gsap.utils.toArray<HTMLElement>(`.${styles.runwayShot}`);
          const fill = section.querySelector<HTMLElement>(`.${styles.runwayProgressFill}`);

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: track,
              start: "top top",
              end: () => `+=${distance() + window.innerHeight * 0.4}`,
              pin: true,
              scrub: 0.9,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          timeline.to(viewport, { x: () => -distance() }, 0);

          // Counter-drift: the photograph inside each frame moves back against
          // the track, which is what separates a runway from a slideshow.
          shots.forEach((shot, index) => {
            timeline.fromTo(
              shot,
              { xPercent: -6 - (index % 3) * 2 },
              { xPercent: 6 + (index % 3) * 2 },
              0,
            );
          });

          if (fill) timeline.fromTo(fill, { scaleX: 0 }, { scaleX: 1 }, 0);
        });

        ScrollTrigger.refresh();
      }, section);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, [categories.length]);

  return (
    <section ref={sectionRef} className={styles.runway} id="kolekcija">
      <div className={styles.runwayHead}>
        <div>
          <div className={styles.micro} style={{ marginBottom: 14 }}>
            {copy.eyebrow}
          </div>
          <MaskLines lines={copy.title} className={styles.dLg} />
        </div>

        <Link href={allHref} className={styles.categoryAllLink}>
          <span>{copy.all}</span>
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

      <div ref={trackRef} className={styles.runwayTrack}>
        <div ref={viewportRef} className={styles.runwayViewport}>
          {categories.map((category, index) => (
            <Link key={category.id} href={category.href} className={styles.runwayPanel}>
              <div className={styles.runwayShot}>
                <StorefrontImage
                  sources={[category.image]}
                  fallbackSrc={category.fallback || "/img/odela-luxury.jpg"}
                  alt={category.label}
                  fill
                  sizes="(max-width: 900px) 78vw, 34vw"
                />
              </div>

              <span className={styles.runwayScrim} />
              <span className={styles.runwayIndex}>{`0${index + 1}`}</span>

              <span className={styles.runwayFoot}>
                <span className={styles.runwayName}>{category.label}</span>
                <span className={styles.runwayRule} />
                <span className={styles.runwayCue}>{copy.shop} →</span>
              </span>
            </Link>
          ))}

          {/* The runway resolves into an invitation rather than just ending. */}
          <Link href={allHref} className={`${styles.runwayPanel} ${styles.runwayEnd}`}>
            <span className={styles.micro}>{copy.eyebrow}</span>
            <span className={styles.runwayEndTitle}>{copy.endTitle}</span>
            <span className={styles.runwayEndCopy}>{copy.endCopy}</span>
            <span className={styles.rule}>
              {copy.all}
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
            </span>
          </Link>
        </div>

        <div className={styles.runwayProgress} aria-hidden="true">
          <span className={styles.runwayProgressFill} />
        </div>
      </div>
    </section>
  );
}
