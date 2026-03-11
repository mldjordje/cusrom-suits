"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/web-shop", label: "Shop" },
  { href: "/akcije", label: "Akcije" },
  { href: "/o-nama", label: "O nama" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/custom-suits", label: "Custom Suits" },
  { href: "/admin", label: "Admin" },
];

export default function StorefrontHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const normalizedPath = pathname ?? "";
  const isHome = normalizedPath === "/" || normalizedPath === "";

  useEffect(() => {
    document.body.classList.toggle("mobile-menu-opened", mobileOpen);
    return () => {
      document.body.classList.remove("mobile-menu-opened");
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const desktopFloating = false;
  const mobileFloating = false;
  const headerClass = [
    "header",
    "header-fullwidth",
    "header_sticky",
    isHome ? "header-transparent-bg header_sticky-bg_dark" : "",
    desktopFloating ? "position-absolute ss-header-home-floating" : "header_sticky-active",
  ]
    .filter(Boolean)
    .join(" ");
  const mobileHeaderClass = [
    "header-mobile",
    "header-mobile_sticky",
    isHome ? "" : "header_sticky-active",
    mobileFloating ? "position-absolute ss-mobile-home" : "position-relative",
    isHome && !mobileFloating ? "ss-mobile-home-solid header_sticky-active" : "",
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
                  <li key={item.href} className="navigation__item">
                    <Link href={item.href} className="navigation__link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="header-tools d-flex align-items-center gap-2">
              <Link href="/web-shop" className="header-tools__item d-none d-md-inline-flex" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/web-shop" className="header-tools__item header-tools__cart position-relative d-none d-md-inline-flex" aria-label="Cart">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6.5 7.2V5.8a3.5 3.5 0 1 1 7 0v1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M4.4 7.2h11.2l-.9 8.6a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-.9l-.9-8.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span className="cart-amount d-block position-absolute">0</span>
              </Link>
              <Link href="/custom-suits" className="btn-link btn-link_lg default-underline text-uppercase fw-medium">
                Start Design
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
              <Link href="/web-shop" className="ss-mobile-slot ss-mobile-link ss-mobile-link--cart position-relative" aria-label="Korpa">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6.5 7.2V5.8a3.5 3.5 0 1 1 7 0v1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M4.4 7.2h11.2l-.9 8.6a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-.9l-.9-8.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span className="cart-amount d-block position-absolute">0</span>
              </Link>
            </div>
          </div>
        </div>

        <nav className="header-mobile__navigation navigation d-flex flex-column w-100 position-absolute top-100 bg-body overflow-auto">
          <div className="container pt-3 pb-4">
            <ul className="navigation__list list-unstyled position-relative">
              {navItems.map((item) => (
                <li key={`mobile-${item.href}`} className="navigation__item border-bottom">
                  <Link href={item.href} className="navigation__link d-block text-uppercase">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
