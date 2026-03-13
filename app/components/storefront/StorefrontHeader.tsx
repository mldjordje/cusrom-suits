"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontCartLink from "@/app/components/storefront/cart/StorefrontCartLink";

const navItems = [
  { href: "/", label: "Pocetna" },
  { href: "/web-shop", label: "Web Shop" },
  { href: "/akcije", label: "Akcije" },
  { href: "/o-nama", label: "O nama" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function StorefrontHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { reduceMotion } = useAnimationBudget();
  const normalizedPath = pathname ?? "";
  const isHome = normalizedPath === "/" || normalizedPath === "";

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
              <Link href="/">
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
                  <li key={item.href} className={`navigation__item ${isItemActive(item.href) ? "is-active" : ""}`}>
                    <Link href={item.href} className={`navigation__link ${isItemActive(item.href) ? "is-active" : ""}`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="header-tools d-flex align-items-center gap-2">
              <Link href="/web-shop" className="header-tools__item d-none d-md-inline-flex" aria-label="Pretraga">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <StorefrontCartLink
                className="header-tools__item d-none d-md-inline-flex"
                ariaLabel="Korpa"
              />
              <Link href="/kontakt" className="btn-link btn-link_lg default-underline text-uppercase fw-medium">
                Kontakt
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
              aria-label={mobileOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
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
              <Link href="/">
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
              <Link href="/web-shop" className="ss-mobile-slot ss-mobile-link" aria-label="Pretraga">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <StorefrontCartLink className="ss-mobile-slot ss-mobile-link" ariaLabel="Korpa" />
              <Link href="/kontakt" className="ss-mobile-slot ss-mobile-link" aria-label="Kontakt">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3.75 5.75a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-8.5Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4.5 5l5.5 5 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <div className="ss-mobile-nav-layer">
          <AnimatePresence>
            {mobileOpen ? (
              <m.button
                type="button"
                className="ss-mobile-nav-backdrop"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {mobileOpen ? (
              <m.nav
                className="header-mobile__navigation navigation d-flex flex-column w-100 position-absolute top-100 bg-body overflow-auto ss-mobile-nav-panel"
                initial={reduceMotion ? false : { y: -12, opacity: 0 }}
                animate={reduceMotion ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
                exit={reduceMotion ? { y: -8, opacity: 0 } : { y: -8, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="container pt-3 pb-4">
                  <ul className="navigation__list list-unstyled position-relative">
                    {navItems.map((item, index) => (
                      <m.li
                        key={`mobile-${item.href}`}
                        className={`navigation__item border-bottom ${isItemActive(item.href) ? "is-active" : ""}`}
                        initial={reduceMotion ? false : { y: 10, opacity: 0 }}
                        animate={reduceMotion ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
                        exit={reduceMotion ? { y: 0, opacity: 0 } : { y: 0, opacity: 0 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.24,
                          delay: reduceMotion ? 0 : 0.025 * index,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link href={item.href} className={`navigation__link d-block text-uppercase ${isItemActive(item.href) ? "is-active" : ""}`}>
                          {item.label}
                        </Link>
                      </m.li>
                    ))}
                  </ul>
                </div>
              </m.nav>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
