import Link from "next/link";
import NewsletterSignupForm from "@/app/components/storefront/NewsletterSignupForm";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function StorefrontFooter({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const isEn = lang === "en";
  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  return (
    <footer className="footer footer_type_1 ss-footer">
      <div className="container">
        <div className="ss-footer__panel">
          <div className="row g-3 g-lg-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div className="ss-footer__brand">
                <p className="ss-footer__eyebrow">
                  {isEn ? "Crafted in Nis" : "Krojeno u Nisu"}
                </p>
                <Link href={withLang("/")} className="ss-footer__logo">
                  SANTOS & SANTORINI
                </Link>
                <p className="ss-footer__copy">
                  {isEn
                    ? "Modern tailoring, ready-to-wear pieces and a cleaner mobile shopping experience."
                    : "Modern tailoring, ready-to-wear modeli i modernije mobile iskustvo kupovine."}
                </p>

                <div className="ss-footer__contact-grid">
                  <a href="mailto:prodaja@santos.rs" className="ss-footer__contact-chip">
                    prodaja@santos.rs
                  </a>
                  <a href="tel:+381694455106" className="ss-footer__contact-chip">
                    +381 69 445 5106
                  </a>
                  <span className="ss-footer__contact-chip">
                    Obrenoviceva 9, Nis
                  </span>
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-2">
              <div className="ss-footer__group">
                <h5 className="ss-footer__title">
                  {isEn ? "Company" : "Kompanija"}
                </h5>
                <ul className="ss-footer__list list-unstyled">
                  <li><Link href={withLang("/")}>{isEn ? "Home" : "Pocetna"}</Link></li>
                  <li><Link href={withLang("/o-nama")}>{isEn ? "About" : "O nama"}</Link></li>
                  <li><Link href={withLang("/blog")}>Blog</Link></li>
                  <li><Link href={withLang("/kontakt")}>{isEn ? "Contact" : "Kontakt"}</Link></li>
                </ul>
              </div>
            </div>

            <div className="col-6 col-lg-2">
              <div className="ss-footer__group">
                <h5 className="ss-footer__title">Shop</h5>
                <ul className="ss-footer__list list-unstyled">
                  <li><Link href={withLang("/web-shop")}>Web Shop</Link></li>
                  <li><Link href={withLang("/akcije")}>{isEn ? "Sale" : "Akcije"}</Link></li>
                  <li><Link href={withLang("/web-shop?inStock=1")}>{isEn ? "In stock" : "Na stanju"}</Link></li>
                  <li><Link href={withLang("/checkout")}>Checkout</Link></li>
                </ul>
              </div>
            </div>

            <div className="col-12 col-lg-3">
              <div className="ss-footer__group ss-footer__group--newsletter">
                <h5 className="ss-footer__title">Newsletter</h5>
                <p className="ss-footer__newsletter-copy">
                  {isEn
                    ? "New drops, campaigns and selected edits. Low noise, high signal."
                    : "Nove kolekcije, kampanje i izdvojeni modeli. Malo buke, vise signala."}
                </p>
                <NewsletterSignupForm lang={lang} />
              </div>
            </div>
          </div>
        </div>

        <div className="ss-footer__bottom">
          <span>Copyright {new Date().getFullYear()} Santos & Santorini</span>
          <span>
            {isEn
              ? "Tailoring, accessories and editorial shopping."
              : "Krojenje, aksesoari i editorial shopping."}
          </span>
        </div>
      </div>
    </footer>
  );
}
