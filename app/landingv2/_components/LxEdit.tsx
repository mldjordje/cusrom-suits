"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import Rise from "./_fx/Rise";
import { getMotion } from "./_fx/motion";
import styles from "../landing.module.scss";

export type LxProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  hoverImage?: string;
  href: string;
  fallback: string;
};

const COPY = {
  sr: {
    eyebrow: "(04) — Kurirani Izbor",
    title: "Izdvojeni Modeli",
    all: "Svi artikli u salonu",
    fabric: "100% Čista vuna • Loro Piana / Cerruti",
  },
  en: {
    eyebrow: "(04) — Curated Edit",
    title: "Signature Pieces",
    all: "View all pieces",
    fabric: "100% Pure Wool • Loro Piana / Cerruti",
  },
};

const PLACEMENT = [
  { column: "1 / span 6", offset: "0px" },
  { column: "8 / span 5", offset: "clamp(40px, 8vw, 120px)" },
  { column: "1 / span 5", offset: "0px" },
  { column: "7 / span 6", offset: "clamp(30px, 6vw, 90px)" },
] as const;

export default function LxEdit({
  lang,
  products,
  allHref,
}: {
  lang: "sr" | "en";
  products: LxProduct[];
  allHref: string;
}) {
  const copy = COPY[lang];
  const sectionRef = useRef<HTMLElement | null>(null);

  // Each card lifts in on entry, and its photograph drifts inside the frame at
  // a rate set by its column — the asymmetric layout only reads as depth if
  // the layers actually move at different speeds.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap } = core;

      ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>(`.${styles.editItem}`);

        items.forEach((item, index) => {
          gsap.from(item, {
            y: 70,
            opacity: 0,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: item, start: "top 88%", once: true },
          });

          // Both layers of the hover crossfade drift together, or the detail
          // shot would sit a few percent off when it fades in.
          const shots = Array.from(
            item.querySelectorAll<HTMLElement>(`.${styles.editShot}`),
          );
          if (!shots.length) return;

          gsap.fromTo(
            shots,
            { yPercent: -5 - (index % 2) * 3 },
            {
              yPercent: 5 + (index % 2) * 3,
              ease: "none",
              scrollTrigger: {
                trigger: item,
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
  }, [products.length]);

  if (!products.length) return null;

  return (
    <section ref={sectionRef} className={`${styles.section} ${styles.edit}`}>
      <div className={styles.rails} aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.grid}>
        <Rise className={styles.editHead}>
          <div>
            <div className={styles.micro} style={{ marginBottom: 14 }}>
              {copy.eyebrow}
            </div>
            <h2 className={styles.dLg}>{copy.title}</h2>
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
        </Rise>

        {products.map((product, index) => {
          const pos = PLACEMENT[index % PLACEMENT.length];
          const style: CSSProperties = {
            ["--lx-col" as string]: pos.column,
            ["--lx-top" as string]: pos.offset,
          };

          return (
            <div key={product.id} className={styles.editItem} style={style}>
              <Link href={product.href} className={styles.editLink}>
                <div className={styles.editFigure}>
                  {/* Primary garment image */}
                  <div className={styles.editShot}>
                    <StorefrontImage
                      sources={[product.image]}
                      fallbackSrc={product.fallback}
                      alt={product.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 45vw"
                    />
                  </div>

                  {/* Dual-image crossfade hover effect */}
                  {product.hoverImage && (
                    <div className={`${styles.editShot} ${styles.editShotAlt}`}>
                      <StorefrontImage
                        sources={[product.hoverImage]}
                        fallbackSrc={product.fallback}
                        alt={`${product.title} — Detalj`}
                        fill
                        sizes="(max-width: 900px) 100vw, 45vw"
                      />
                    </div>
                  )}

                  {/* Fabric tag badge */}
                  <span className={styles.editBadge}>{copy.fabric}</span>
                </div>

                <div className={styles.editCaption}>
                  <h3 className={`${styles.dSm} ${styles.editName}`}>
                    {product.title}
                  </h3>
                  <span className={`${styles.meta} ${styles.editPrice}`}>
                    {product.price}
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
