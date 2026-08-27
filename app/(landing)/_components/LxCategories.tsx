import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import Reveal from "./_fx/Reveal";
import styles from "../landing.module.scss";

export type LxCategory = {
  id: string;
  label: string;
  href: string;
  image: string;
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

  return (
    <section className={`${styles.section} ${styles.paper} ${styles.cats}`}>
      <div className={styles.grid}>
        <div className={styles.catsHead}>
          <span className={styles.micro}>{copy.eyebrow}</span>
          <Link href={allHref} className={styles.rule}>
            {copy.all}
          </Link>
        </div>

        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={category.href}
            className={styles.catTile}
            style={{ gridColumn: SPANS[index % SPANS.length] }}
          >
            <Reveal delay={(index % 2) * 90} className={styles.catFrame}>
              <StorefrontImage
                sources={[category.image]}
                alt={category.label}
                fill
                sizes="(max-width: 900px) 100vw, 55vw"
              />
              <span className={styles.catScrim} />
              <span className={`${styles.micro} ${styles.catTileIndex}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.catTileFoot}>
                <span className={styles.dMd}>{category.label}</span>
                <span className={styles.micro}>{copy.shop}</span>
              </span>
            </Reveal>
          </Link>
        ))}
      </div>
    </section>
  );
}
