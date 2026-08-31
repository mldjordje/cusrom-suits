import Link from "next/link";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    columns: [
      {
        head: "Kolekcija",
        links: [
          { label: "Web Shop", href: "/web-shop" },
          { label: "Odela po meri", href: "/custom-suits" },
          { label: "Poslovne uniforme", href: "/poslovne-uniforme" },
          { label: "Akcije", href: "/akcije" },
        ],
      },
      {
        head: "Brend",
        links: [
          { label: "O nama", href: "/o-nama" },
          { label: "Saloni", href: "/prodajna-mesta" },
          { label: "Blog", href: "/blog" },
          { label: "Kontakt", href: "/kontakt" },
        ],
      },
      {
        head: "Pomoć & Podrška",
        links: [
          { label: "Isporuka", href: "/isporuka" },
          { label: "Način plaćanja", href: "/nacinplacanja" },
          { label: "Reklamacije", href: "/reklamacije" },
          { label: "Uslovi kupovine", href: "/uslovi_kupovine" },
        ],
      },
    ],
    tagline: "Italijanske tkanine. Vrhunska sartoria. Od 2007. godine.",
  },
  en: {
    columns: [
      {
        head: "Collection",
        links: [
          { label: "Web Shop", href: "/web-shop?lang=en" },
          { label: "Bespoke", href: "/custom-suits?lang=en" },
          { label: "Corporate uniforms", href: "/poslovne-uniforme?lang=en" },
          { label: "Sale", href: "/akcije?lang=en" },
        ],
      },
      {
        head: "Brand",
        links: [
          { label: "About", href: "/o-nama?lang=en" },
          { label: "Ateliers", href: "/prodajna-mesta?lang=en" },
          { label: "Journal", href: "/blog?lang=en" },
          { label: "Contact", href: "/kontakt?lang=en" },
        ],
      },
      {
        head: "Support",
        links: [
          { label: "Delivery", href: "/isporuka?lang=en" },
          { label: "Payment", href: "/nacinplacanja?lang=en" },
          { label: "Returns", href: "/reklamacije?lang=en" },
          { label: "Terms", href: "/uslovi_kupovine?lang=en" },
        ],
      },
    ],
    tagline: "Italian cloth. Master sartoria. Established 2007.",
  },
};

export default function LxFooter({ lang }: { lang: "sr" | "en" }) {
  const copy = COPY[lang];
  const year = new Date().getFullYear();
  const isEn = lang === "en";

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        {/* Brand Column with Logo */}
        <div className={styles.footerBrand}>
          <Link href={isEn ? "/?lang=en" : "/"} className={styles.footerLogoLink}>
            <img
              src="/img/logo-header.png"
              alt="Santos & Santorini"
              className={styles.footerLogo}
              width={180}
              height={36}
            />
          </Link>
          <p className={styles.footerTagline}>
            {copy.tagline}
          </p>
          <div className={styles.footerAteliersSummary}>
            <span>Niš: Obrenovićeva 9</span>
            <span>Kruševac: Trg fontana bb</span>
          </div>
        </div>

        {/* Navigation Columns */}
        {copy.columns.map((column) => (
          <div key={column.head} className={styles.footerCol}>
            <div className={`${styles.micro} ${styles.footerColHead}`}>{column.head}</div>
            {column.links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Base Copyright Strip */}
        <div className={styles.footerBase}>
          <span className={styles.micro}>
            © {year} Santos &amp; Santorini. Sva prava zadržana.
          </span>
          <span className={styles.micro}>
            Sartoria Italiana — Niš & Kruševac
          </span>
        </div>
      </div>
    </footer>
  );
}
