import SplitLines from "./_fx/SplitLines";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    left: "(01) — Manifest",
    right: "Od 2007.",
    lines: ["Ne pravimo odela", "za sve prilike.", "Pravimo jedno,", "za vašu."],
  },
  en: {
    left: "(01) — Manifesto",
    right: "Since 2007",
    lines: ["We do not make suits", "for every occasion.", "We make one,", "for yours."],
  },
};

/**
 * Deliberately near-empty. A full screen that sells nothing is the cheapest
 * signal of confidence a page can buy, and every reference we studied has one.
 */
export default function LxManifesto({ lang }: { lang: "sr" | "en" }) {
  const copy = COPY[lang];

  return (
    <section className={`${styles.section} ${styles.paper2} ${styles.manifesto}`}>
      <div className={styles.grid}>
        <div className={styles.manifestoMeta}>
          <span className={styles.micro}>{copy.left}</span>
          <span className={styles.micro}>{copy.right}</span>
        </div>
        <SplitLines
          lines={copy.lines}
          className={`${styles.manifestoInner} ${styles.dLg}`}
        />
      </div>
    </section>
  );
}
