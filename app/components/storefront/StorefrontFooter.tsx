import Link from "next/link";
import NewsletterSignupForm from "@/app/components/storefront/NewsletterSignupForm";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function StorefrontFooter({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const isEn = lang === "en";
  return (
    <footer className="footer footer_type_1">
      <div className="footer-middle container">
        <div className="row row-cols-lg-5 row-cols-2">
          <div className="footer-column footer-store-info col-12 mb-4 mb-lg-0">
            <div className="logo">
              <Link href="/" className="menu-link menu-link_us-s">
                SANTOS & SANTORINI
              </Link>
            </div>
            <p className="footer-address">Obrenoviceva 9, Nis, Serbia</p>
            <p className="m-0">
              <strong className="fw-medium">prodaja@santos.rs</strong>
            </p>
            <p>
              <strong className="fw-medium">+381 69 445 5106</strong>
            </p>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">{isEn ? "Company" : "Kompanija"}</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/" className="menu-link menu-link_us-s">
                  {isEn ? "Home" : "Početna"}
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/blog" className="menu-link menu-link_us-s">
                  Blog
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/o-nama" className="menu-link menu-link_us-s">
                  {isEn ? "About" : "O nama"}
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/kontakt" className="menu-link menu-link_us-s">
                  {isEn ? "Contact" : "Kontakt"}
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">Shop</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/web-shop" className="menu-link menu-link_us-s">
                  Web Shop
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/web-shop?inStock=1" className="menu-link menu-link_us-s">
                  {isEn ? "In stock" : "Na stanju"}
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/blog" className="menu-link menu-link_us-s">
                  Blog
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/akcije" className="menu-link menu-link_us-s">
                  {isEn ? "Sale" : "Akcije"}
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-menu mb-4 mb-lg-0">
            <h5 className="sub-menu__title text-uppercase">{isEn ? "Support" : "Podrška"}</h5>
            <ul className="sub-menu__list list-unstyled">
              <li className="sub-menu__item">
                <Link href="/kontakt" className="menu-link menu-link_us-s">
                  {isEn ? "Contact" : "Kontakt"}
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/akcije" className="menu-link menu-link_us-s">
                  {isEn ? "Sale" : "Akcije"}
                </Link>
              </li>
              <li className="sub-menu__item">
                <Link href="/o-nama" className="menu-link menu-link_us-s">
                  {isEn ? "About" : "O nama"}
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer-column footer-newsletter col-12 mb-4 mb-lg-0" id="footer-newsletter">
            <h5 className="sub-menu__title text-uppercase">Newsletter</h5>
            <p>{isEn ? "Be the first to hear about new collections, campaigns and promotions." : "Saznajte prvi za nove kolekcije, akcije i kampanje."}</p>
            <NewsletterSignupForm lang={lang} />
          </div>
        </div>
      </div>

      <div className="footer-bottom container">
        <div className="d-block d-md-flex align-items-center">
          <span className="footer-copyright me-auto">Copyright {new Date().getFullYear()} Santos and Santorini</span>
        </div>
      </div>
    </footer>
  );
}
