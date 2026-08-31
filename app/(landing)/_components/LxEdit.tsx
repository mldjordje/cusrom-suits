import type { CSSProperties } from "react";
import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import Rise from "./_fx/Rise";
import styles from "../landing.module.scss";

export type LxProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  hoverImage?: string;
  href: string;
  /** Bundled frame used when the legacy asset host is slow or down. */
  fallback: string;
};

const COPY = {
  sr: { eyebrow: "(04) — Izbor", title: "Izdvojeno", all: "Svi modeli" },
  en: { eyebrow: "(04) — Edit", title: "Selected", all: "All models" },
};

/**
 * Four large frames, two to a row, alternating 6/5 and 5/6 so the run never
 * settles into a grid. Placement is explicit rather than left to auto-flow: a
 * column start of 1 after a start of 8 makes the grid open a new row, which
 * silently turned the items into one column each the first time this was built.
 */
const PLACEMENT = [
  { column: "1 / span 6", offset: "0px" },
  { column: "8 / span 5", offset: "clamp(50px, 9vw, 140px)" },
  { column: "1 / span 5", offset: "0px" },
  { column: "7 / span 6", offset: "clamp(40px, 7vw, 110px)" },
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
  if (!products.length) return null;

  return (
    <section className={`${styles.section} ${styles.paper} ${styles.edit}`}>
      <div className={styles.rails} aria-hidden>
        <span /><span /><span /><span />
      </div>

      <div className={styles.grid}>
        <Rise className={styles.editHead}>
          <div>
            <div className={styles.micro} style={{ marginBottom: 14 }}>
              {copy.eyebrow}
            </div>
            <h2 className={styles.dLg}>{copy.title}</h2>
          </div>
          <Link href={allHref} className={styles.rule}>
            {copy.all}
          </Link>
        </Rise>

        {products.map((product, index) => {
          const place = PLACEMENT[index % PLACEMENT.length];
          return (
          <article
            key={product.id}
            className={styles.editItem}
            style={
              {
                "--lx-col": place.column,
                "--lx-row": String(Math.floor(index / 2) + 2),
                "--lx-top": place.offset,
              } as CSSProperties
            }
          >
            <Link href={product.href}>
              <div className={styles.editFigure}>
                <span className={styles.editShot}>
                  <StorefrontImage
                    sources={[product.image]}
                    fallbackSrc={product.fallback || "/img/odela.jpg"}
                    alt={product.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 48vw"
                  />
                </span>
                {product.hoverImage ? (
                  <span className={`${styles.editShot} ${styles.editShotAlt}`}>
                    <StorefrontImage
                      sources={[product.hoverImage]}
                      fallbackSrc={product.fallback || "/img/odela.jpg"}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 100vw, 48vw"
                    />
                  </span>
                ) : null}
              </div>
              <Rise className={styles.editCaption} delay={260}>
                <span className={`${styles.meta} ${styles.editName}`}>{product.title}</span>
                <span className={`${styles.meta} ${styles.editPrice}`}>{product.price}</span>
              </Rise>
            </Link>
          </article>
          );
        })}
      </div>
    </section>
  );
}
