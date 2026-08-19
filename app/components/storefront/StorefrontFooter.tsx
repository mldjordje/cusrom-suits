import Image from "next/image";
import Link from "next/link";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { getSiteContent } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default async function StorefrontFooter({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const [landingSettings, siteContent] = await Promise.all([getLandingSettings(), getSiteContent()]);
  const isEn = lang === "en";
  const primaryStore = siteContent.stores[0];
  const footer = siteContent.footer;
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
                  {isEn ? footer.eyebrowEn : footer.eyebrow}
                </p>
                <Link href={withLang("/")} className="ss-footer__logo" aria-label="Santos & Santorini">
                  <Image
                    src="/img/logo-header-dark.png"
                    alt="Santos & Santorini"
                    width={340}
                    height={96}
                    sizes="(min-width: 992px) 220px, 190px"
                    className="ss-footer__logo-img"
                  />
                </Link>
                <p className="ss-footer__copy">
                  {isEn ? footer.brandCopyEn : footer.brandCopy}
                </p>

                <div className="ss-footer__contact-grid">
                  <a href="mailto:prodaja@santos.rs" className="ss-footer__contact-chip">
                    prodaja@santos.rs
                  </a>
                  <a href="tel:+381694455106" className="ss-footer__contact-chip">
                    +381 69 445 5106
                  </a>
                  {primaryStore ? <span className="ss-footer__contact-chip">{primaryStore.mapLabel}</span> : null}
                  <span className="ss-footer__contact-chip">
                    PIB {landingSettings.companyPib}
                  </span>
                  <span className="ss-footer__contact-chip">
                    MB {landingSettings.companyMb}
                  </span>
                </div>

                <div className="ss-footer__socials">
                  <a
                    href={footer.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ss-footer__social-link"
                    aria-label="Instagram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="17.6" cy="6.5" r="1.15" fill="currentColor" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                  {footer.facebookUrl ? (
                  <a
                    href={footer.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ss-footer__social-link"
                    aria-label="Facebook"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14.2 8.4H16V5.3C15.7 5.3 14.7 5.2 13.5 5.2C11 5.2 9.3 6.7 9.3 9.5V12H6.5V15.5H9.3V23H12.8V15.5H15.6L16.1 12H12.8V9.8C12.8 8.8 13.1 8.4 14.2 8.4Z" fill="currentColor" />
                    </svg>
                    <span>Facebook</span>
                  </a>
                  ) : null}
                  {footer.tiktokUrl ? (
                  <a
                    href={footer.tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ss-footer__social-link"
                    aria-label="TikTok"
                  >
                    <span aria-hidden="true" className="fw-semibold">TT</span>
                    <span>TikTok</span>
                  </a>
                  ) : null}
                </div>
              </div>
            </div>

            {footer.groups.filter((g) => g.links.length > 0).map((group) => (
              <div key={group.title} className="col-6 col-lg-2">
                <div className="ss-footer__group">
                  <h5 className="ss-footer__title">{isEn ? group.titleEn : group.title}</h5>
                  <ul className="ss-footer__list list-unstyled">
                    {group.links.map((link) => (
                      <li key={`${group.title}-${link.href}`}>
                        <Link href={withLang(link.href)}>{isEn ? link.labelEn : link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ss-footer__bottom">
          <span>Copyright {new Date().getFullYear()} Santos & Santorini | Santos DOO</span>
          <span>
            {isEn ? footer.bottomTaglineEn : footer.bottomTagline}
          </span>
          <span>
            {isEn ? "Website by" : "Izrada sajta"}{" "}
            <a
              href="https://adspire.rs/"
              target="_blank"
              rel="noopener noreferrer"
              className="ss-footer__credit-link"
            >
              Adspire
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
