"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontLanguageSwitcher from "@/app/components/storefront/StorefrontLanguageSwitcher";
import StorefrontCartLink from "@/app/components/storefront/cart/StorefrontCartLink";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function StorefrontHeader({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { reduceMotion } = useAnimationBudget();
  const normalizedPath = pathname ?? "";
  const isHome = normalizedPath === "/" || normalizedPath === "";
  const isEn = lang === "en";

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const navItems = [
    { href: "/", label: isEn ? "Home" : "Pocetna" },
    { href: "/web-shop", label: "Web Shop" },
    { href: "/akcije", label: isEn ? "Sale" : "Akcije" },
    { href: "/o-nama", label: isEn ? "About" : "O nama" },
    { href: "/blog", label: "Blog" },
    { href: "/kontakt", label: isEn ? "Contact" : "Kontakt" },
  ];

  const quickLinks = [
    { href: "/web-shop", label: isEn ? "Open shop" : "Otvori shop" },
    { href: "/kontakt", label: isEn ? "Ask stylist" : "Pitaj stilistu" },
  ];

  const isItemActive = (href: string) => {
    if (href === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
  };

  useEffect(() => {
    document.body.classList.toggle("mobile-menu-opened", mobileOpen);
    return () => {
      document.body.classList.remove("mobile-menu-opened");
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 26);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const desktopFloating = isHome;
  const mobileFloating = isHome;
  const headerClass = [
    "header",
    "header-fullwidth",
    "header_sticky",
    isHome ? "header-transparent-bg header_sticky-bg_dark" : "",
    desktopFloating ? "position-absolute ss-header-home-floating" : "header_sticky-active",
    isScrolled ? "ss-header-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mobileHeaderClass = [
    "header-mobile",
    "header-mobile_sticky",
    isHome ? "" : "header_sticky-active",
    mobileFloating ? "position-absolute ss-mobile-home" : "position-relative",
    isHome && !mobileFloating ? "ss-mobile-home-solid header_sticky-active" : "",
    isScrolled ? "ss-mobile-header-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const desktopLogoSrc = isHome ? "/img/logo-header-dark.png" : "/img/logo-header.png";
  const mobileLogoSrc = isHome ? "/img/logo-header-dark-mobile.png" : "/img/logo-header-mobile.png";

  return (
    <>
      <header id="header" className={headerClass}>
        <div className="container">
          <div className="header-desk header-desk_type_1">
            <div className="logo">
              <Link href={withLang("/")}>
                <Image
                  src={desktopLogoSrc}
                  alt="Santos and Santorini"
                  width={340}
                  height={96}
                  className="logo__image d-block ss-site-logo"
                  priority
                />
              </Link>
            </div>

            <nav className="navigation">
              <ul className="navigation__list list-unstyled d-flex">
                {navItems.map((item) => (
                  <li
                    key={item.href}
                    className={`navigation__item ${isItemActive(item.href) ? "is-active" : ""}`}
                  >
                    <Link
                      href={withLang(item.href)}
                      className={`navigation__link ${isItemActive(item.href) ? "is-active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="header-tools d-flex align-items-center gap-2">
              <StorefrontLanguageSwitcher lang={lang} className="d-none d-md-inline-flex me-1" />
              <Link
                href={withLang("/web-shop")}
                className="header-tools__item d-none d-md-inline-flex"
                aria-label={isEn ? "Search" : "Pretraga"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <StorefrontCartLink
                href={withLang("/cart")}
                className="header-tools__item d-none d-md-inline-flex"
                ariaLabel={isEn ? "Cart" : "Korpa"}
              />
              <Link href={withLang("/kontakt")} className="ss-inline-link text-uppercase fw-medium">
                {isEn ? "Contact" : "Kontakt"}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className={mobileHeaderClass}>
        <div className="container h-100">
          <div className="ss-mobile-header-row h-100">
            <button
              type="button"
              className={`ss-mobile-slot mobile-nav-activator d-block position-relative btn-icon ${mobileOpen ? "is-open" : ""}`}
              aria-label={
                mobileOpen
                  ? isEn
                    ? "Close navigation"
                    : "Zatvori navigaciju"
                  : isEn
                    ? "Open navigation"
                    : "Otvori navigaciju"
              }
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <svg className="nav-icon" width="25" height="18" viewBox="0 0 25 18" xmlns="http://www.w3.org/2000/svg">
                <rect width="25" height="2" y="0" />
                <rect width="25" height="2" y="8" />
                <rect width="25" height="2" y="16" />
              </svg>
              <span className="btn-close-lg position-absolute top-0 start-0 w-100" />
            </button>

            <div className="logo ss-mobile-logo">
              <Link href={withLang("/")}>
                <Image
                  src={mobileLogoSrc}
                  alt="Santos and Santorini"
                  width={280}
                  height={79}
                  className="logo__image d-block ss-site-logo ss-site-logo--mobile"
                  priority
                />
              </Link>
            </div>

            <div className="ss-mobile-tools">
              <Link
                href={withLang("/web-shop")}
                className="ss-mobile-slot ss-mobile-link"
                aria-label={isEn ? "Search" : "Pretraga"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <StorefrontCartLink
                href={withLang("/cart")}
                className="ss-mobile-slot ss-mobile-link"
                ariaLabel={isEn ? "Cart" : "Korpa"}
              />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {mobileOpen ? (
            <m.div
              className="ss-mobile-nav-layer"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <m.button
                type="button"
                className="ss-mobile-nav-backdrop"
                aria-label={isEn ? "Close menu" : "Zatvori meni"}
                onClick={() => setMobileOpen(false)}
              />

              <m.nav
                className="ss-mobile-nav-panel"
                initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="ss-mobile-nav-panel__glow ss-mobile-nav-panel__glow--one" />
                <div className="ss-mobile-nav-panel__glow ss-mobile-nav-panel__glow--two" />
                <div className="ss-mobile-nav-panel__inner">
                  <div className="ss-mobile-nav-panel__top">
                    <StorefrontLanguageSwitcher lang={lang} compact />
                    <Link href={withLang("/kontakt")} className="ss-mobile-nav-pill">
                      {isEn ? "Contact" : "Kontakt"}
                    </Link>
                  </div>

                  <div className="ss-mobile-nav-panel__hero">
                    <p className="ss-mobile-nav-panel__eyebrow">
                      {isEn ? "Modern tailoring" : "Modern tailoring"}
                    </p>
                    <h2 className="ss-mobile-nav-panel__title">
                      {isEn ? "Move through the collection with a cleaner mobile flow." : "Kreci se kroz kolekciju sa cistijim mobile iskustvom."}
                    </h2>
                  </div>

                  <div className="ss-mobile-nav-panel__quick">
                    {quickLinks.map((item, index) => (
                      <m.div
                        key={item.href}
                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.22,
                          delay: reduceMotion ? 0 : 0.03 * index,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link href={withLang(item.href)} className="ss-mobile-nav-quicklink">
                          {item.label}
                        </Link>
                      </m.div>
                    ))}
                  </div>

                  <ul className="navigation__list list-unstyled position-relative ss-mobile-nav-list">
                    {navItems.map((item, index) => (
                      <m.li
                        key={`mobile-${item.href}`}
                        className={`navigation__item ${isItemActive(item.href) ? "is-active" : ""}`}
                        initial={reduceMotion ? false : { y: 14, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 0, opacity: 0 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.28,
                          delay: reduceMotion ? 0 : 0.05 * index,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link
                          href={withLang(item.href)}
                          className={`ss-mobile-nav-link ${isItemActive(item.href) ? "is-active" : ""}`}
                        >
                          <span>{item.label}</span>
                          <span className="ss-mobile-nav-link__index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </Link>
                      </m.li>
                    ))}
                  </ul>
                </div>
              </m.nav>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
