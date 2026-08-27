import type { CSSProperties } from "react";
import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import Reveal from "./_fx/Reveal";
import styles from "../landing.module.scss";

export type LxProduct = {
  id: string;
  title: string;
  price: string;
  image: string;
  hoverImage?: string;
  href: string;
};

const COPY = {
  sr: { eyebrow: "(04) — Izbor", title: "Izdvojeno", all: "Svi modeli" },
  en: { eyebrow: "(04) — Edit", title: "Selected", all: "All models" },
};

/**
 * Three fixed column starts with three fixed vertical offsets, repeated per
 * row. Placement is explicit rather than left to auto-flow: a column start of
 * 1 after a start of 9 makes the grid open a new row, which silently turned
 * six items into six rows the first time this was built.
 */
const PLACEMENT = [
  { column: "1 / span 4", offset: "0px" },
  { column: "6 / span 4", offset: "clamp(40px, 9vw, 120px)" },
  { column: "9 / span 4", offset: "clamp(20px, 4.5vw, 60px)" },
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
        <div className={styles.editHead}>
          <div>
            <div className={styles.micro} style={{ marginBottom: 14 }}>
              {copy.eyebrow}
            </div>
            <h2 className={styles.dLg}>{copy.title}</h2>
          </div>
          <Link href={allHref} className={styles.rule}>
            {copy.all}
          </Link>
        </div>

        {products.map((product, index) => {
          const place = PLACEMENT[index % PLACEMENT.length];
          return (
          <article
            key={product.id}
            className={styles.editItem}
            style={
              {
                "--lx-col": place.column,
                "--lx-row": String(Math.floor(index / PLACEMENT.length) + 2),
                "--lx-top": place.offset,
              } as CSSProperties
            }
          >
            <Link href={product.href}>
              <Reveal delay={(index % 3) * 80} className={styles.editFigure}>
                <span className={styles.editShot}>
                  <StorefrontImage
                    sources={[product.image]}
                    alt={product.title}
                    fill
                    sizes="(max-width: 900px) 50vw, 33vw"
                  />
                </span>
                {product.hoverImage ? (
                  <span className={`${styles.editShot} ${styles.editShotAlt}`}>
                    <StorefrontImage
                      sources={[product.hoverImage]}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 50vw, 33vw"
                    />
                  </span>
                ) : null}
              </Reveal>
              <div className={styles.editCaption}>
                <span className={`${styles.meta} ${styles.editName}`}>{product.title}</span>
                <span className={`${styles.meta} ${styles.editPrice}`}>{product.price}</span>
              </div>
            </Link>
          </article>
          );
        })}
      </div>
    </section>
  );
}
