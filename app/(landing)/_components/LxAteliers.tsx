import Link from "next/link";
import SplitLines from "./_fx/SplitLines";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    eyebrow: "(05) — Saloni",
    lines: ["Dva salona.", "Jedan kroj."],
    book: "Zakažite probu",
    guarantees: [
      "Besplatna dostava",
      "Korekcija u salonu",
      "Zamena u roku od 14 dana",
      "VIP podrška",
    ],
  },
  en: {
    eyebrow: "(05) — Ateliers",
    lines: ["Two ateliers.", "One pattern."],
    book: "Book a fitting",
    guarantees: [
      "Free delivery",
      "In-atelier alterations",
      "14-day exchange",
      "VIP support",
    ],
  },
};

export type LxAtelier = {
  city: string;
  lines: string[];
  href: string;
};

export default function LxAteliers({
  lang,
  ateliers,
}: {
  lang: "sr" | "en";
  ateliers: LxAtelier[];
}) {
  const copy = COPY[lang];

  return (
    <section className={`${styles.section} ${styles.ateliers}`}>
      <div className={styles.grid}>
        <div className={styles.ateliersHead}>
          <div className={styles.micro} style={{ marginBottom: 18 }}>
            {copy.eyebrow}
          </div>
          <SplitLines lines={copy.lines} className={styles.dLg} />
        </div>

        {ateliers.map((atelier) => (
          <div key={atelier.city} className={styles.atelier}>
            <h3 className={styles.dMd}>{atelier.city}</h3>
            <div className={`${styles.meta} ${styles.atelierLines}`}>
              {atelier.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <Link href={atelier.href} className={styles.rule} style={{ marginTop: 10 }}>
              {copy.book}
            </Link>
          </div>
        ))}

        {/* One row of small type. Four icons in four boxes is the single most
            recognisable piece of 2017 template furniture there is. */}
        <div className={styles.guarantees}>
          {copy.guarantees.map((item) => (
            <span key={item} className={styles.micro}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
