"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import MaskLines from "./_fx/MaskLines";
import { getMotion } from "./_fx/motion";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    eyebrow: "(05) — Saloni & Ateljei",
    lines: ["Dva salona.", "Jedan beskompromisan kroj."],
    subline:
      "Privatni termin sa našim majstorima krojačima. Preko šezdeset mera uz espresso i selekciju italijanskih štofova.",
    book: "Zakažite privatnu probu",
    call: "Pozovite salon",
    address: "Adresa",
    hours: "Radno vreme",
    phone: "Telefon",
    ritual: [
      "Individualni termin sa stilistom",
      "Korekcija u našem ateljeu",
      "Arhiviranje vašeg unikatnog kroja",
      "Preko 500 italijanskih tkanina",
    ],
  },
  en: {
    eyebrow: "(05) — Ateliers",
    lines: ["Two ateliers.", "One bespoke standard."],
    subline:
      "A private appointment with our master tailors. Over sixty measurements, an espresso and a curated selection of Italian cloth.",
    book: "Book a private fitting",
    call: "Call the atelier",
    address: "Address",
    hours: "Opening hours",
    phone: "Telephone",
    ritual: [
      "Dedicated styling appointment",
      "In-atelier custom alterations",
      "Permanent pattern archival",
      "Over 500 Italian cloth swatches",
    ],
  },
};

export type LxAtelier = {
  city: string;
  address: string;
  hours: string;
  phone: string;
  image: string;
  href: string;
  mapHref?: string;
};

/**
 * Walking into a sartoria is a ritual, not a delivery address. The old section
 * listed two cities as plain text next to e-commerce reassurances; these are
 * two monumental cards carrying the room itself — stills pulled from Santos's
 * own campaign footage, graded down to the page's ink and gold — with the
 * appointment, not the postcode, as the primary action.
 */
export default function LxAteliers({
  lang,
  ateliers,
}: {
  lang: "sr" | "en";
  ateliers: LxAtelier[];
}) {
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
        const cards = gsap.utils.toArray<HTMLElement>(`.${styles.salon}`);

        cards.forEach((card, index) => {
          gsap.from(card, {
            y: 80,
            opacity: 0,
            duration: 1.15,
            ease: "expo.out",
            delay: index * 0.1,
            scrollTrigger: { trigger: card, start: "top 86%", once: true },
          });

          const shot = card.querySelector<HTMLElement>(`.${styles.salonShot}`);
          if (!shot) return;

          gsap.fromTo(
            shot,
            { yPercent: -7 },
            {
              yPercent: 7,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.8,
              },
            },
          );
        });
      }, section);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, [ateliers.length]);

  return (
    <section ref={sectionRef} className={`${styles.section} ${styles.ateliers}`} id="saloni">
      <div className={styles.grid}>
        <div className={styles.ateliersHead}>
          <div className={styles.micro} style={{ marginBottom: 18 }}>
            {copy.eyebrow}
          </div>
          <MaskLines lines={copy.lines} className={styles.dLg} />
          <p className={styles.ateliersSub}>{copy.subline}</p>
        </div>
      </div>

      <div className={styles.salonGrid}>
        {ateliers.map((atelier, index) => (
          <article key={atelier.city} className={styles.salon}>
            <div className={styles.salonFigure}>
              <div className={styles.salonShot}>
                <StorefrontImage
                  sources={[atelier.image]}
                  fallbackSrc="/img/odela-luxury.jpg"
                  alt={`Santos & Santorini — ${atelier.city}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 46vw"
                />
              </div>
              <span className={styles.salonScrim} />
              <span className={styles.salonIndex}>{`Atelier 0${index + 1}`}</span>
              <h3 className={styles.salonCity}>{atelier.city}</h3>
            </div>

            <dl className={styles.salonFacts}>
              <div>
                <dt>{copy.address}</dt>
                <dd>{atelier.address}</dd>
              </div>
              <div>
                <dt>{copy.hours}</dt>
                <dd>{atelier.hours}</dd>
              </div>
              <div>
                <dt>{copy.phone}</dt>
                <dd>
                  <a href={`tel:${atelier.phone.replace(/\s+/g, "")}`}>{atelier.phone}</a>
                </dd>
              </div>
            </dl>

            <div className={styles.salonActions}>
              <Link href={atelier.href} className={styles.heroPrimaryBtn}>
                <span>{copy.book}</span>
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

              {atelier.mapHref ? (
                <a
                  href={atelier.mapHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.salonMapLink}
                >
                  {atelier.city} — Google Maps
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.grid}>
        <div className={styles.guarantees}>
          {copy.ritual.map((item) => (
            <span key={item} className={styles.guaranteeItem}>
              <span className={styles.guaranteeBullet}>✦</span>
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
