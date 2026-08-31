import Link from "next/link";
import Rise from "./_fx/Rise";
import MaskLines from "./_fx/MaskLines";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    eyebrow: "(05) — Saloni & Ateljei",
    lines: ["Dva salona.", "Jedan beskompromisan kroj."],
    subline: "Iskusite privatni termin sa našim majstorima krojačima. Preko 60 mera uz espresso i selekciju italijanskih štofova.",
    book: "Zakažite privatnu probu",
    guarantees: [
      "Individualni termin sa stilistom",
      "Korekcija u našem ateljeu",
      "Arhiviranje vašeg unikatnog kroja",
      "Preko 500 italijanskih tkanina",
    ],
  },
  en: {
    eyebrow: "(05) — Ateliers",
    lines: ["Two ateliers.", "One bespoke standard."],
    subline: "Experience an individual fitting appointment. Over 60 measures accompanied by espresso and curated Italian cloth selections.",
    book: "Book private fitting",
    guarantees: [
      "Dedicated styling appointment",
      "In-atelier custom alterations",
      "Permanent pattern archival",
      "Over 500 Italian cloth swatches",
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
          <MaskLines lines={copy.lines} className={styles.dLg} />
          <p className={styles.ateliersSub}>{copy.subline}</p>
        </div>

        {ateliers.map((atelier, index) => (
          <Rise key={atelier.city} className={styles.atelier} delay={index * 120}>
            <div className={styles.atelierBadge}>Atelier {`0${index + 1}`}</div>
            <h3 className={styles.dMd}>{atelier.city}</h3>
            <div className={`${styles.meta} ${styles.atelierLines}`}>
              {atelier.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <Link href={atelier.href} className={styles.atelierBookingLink}>
              <span>{copy.book}</span>
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
        ))}

        <div className={styles.guarantees}>
          {copy.guarantees.map((item) => (
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
