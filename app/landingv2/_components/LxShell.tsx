"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "../landing.module.scss";
import LxConsent from "./LxConsent";
import { getMotion } from "./_fx/motion";

type LxShellProps = {
  lang: "sr" | "en";
  basePath?: string;
  children: ReactNode;
};

const NAV = {
  sr: [
    { label: "Web Shop", href: "/web-shop" },
    { label: "Odela po meri", href: "/custom-suits" },
    { label: "Poslovne uniforme", href: "/poslovne-uniforme" },
    { label: "Saloni", href: "/prodajna-mesta" },
    { label: "O nama", href: "/o-nama" },
  ],
  en: [
    { label: "Web Shop", href: "/web-shop?lang=en" },
    { label: "Bespoke Suits", href: "/custom-suits?lang=en" },
    { label: "Uniforms", href: "/poslovne-uniforme?lang=en" },
    { label: "Ateliers", href: "/prodajna-mesta?lang=en" },
    { label: "About Us", href: "/o-nama?lang=en" },
  ],
};

const ATELIERS = {
  sr: [
    { city: "Niš", address: "Obrenovićeva 9", phone: "+381 18 240 240" },
    { city: "Kruševac", address: "Trg fontana bb", phone: "+381 37 420 420" },
  ],
  en: [
    { city: "Niš Atelier", address: "Obrenovićeva 9", phone: "+381 18 240 240" },
    { city: "Kruševac Atelier", address: "Trg fontana bb", phone: "+381 37 420 420" },
  ],
};

export default function LxShell({ lang, basePath = "/landingv2", children }: LxShellProps) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [introDismissed, setIntroDismissed] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const isEn = lang === "en";

  // Preloader curtain dismiss sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroDismissed(true);
      setTimeout(() => setIntroActive(false), 900);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  // Boot the shared motion core (Lenis + GSAP + ScrollTrigger) once, up front.
  // Every section registers against this one instance; the shell no longer
  // runs a Lenis of its own that nothing was subscribed to.
  useEffect(() => {
    void getMotion();
  }, []);

  // Header scroll detection with hysteresis
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const current = window.scrollY;
        setScrolled(current > 40);

        // Hide on scroll down past 180px, show on scroll up
        if (current > 180 && current > last + 8) {
          setHidden(true);
        } else if (current < last - 8 || current < 80) {
          setHidden(false);
        }

        last = current;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Subtle magnetic cursor, desktop only
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    let rx = 0;
    let ry = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    // Class toggles, not React state: the old version called two setState
    // hooks on every single pointermove, re-rendering the entire shell — and
    // with it the whole page — dozens of times a second.
    const onMove = (e: PointerEvent) => {
      rx = e.clientX;
      ry = e.clientY;
      cursor.classList.add(styles.cursorOn);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest?.("a, button, [role='button'], input, select");
      cursor.classList.toggle(styles.cursorWide, Boolean(interactive));
    };

    const onLeave = () => cursor.classList.remove(styles.cursorOn);

    const tick = () => {
      cx += (rx - cx) * 0.18;
      cy += (ry - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const items = NAV[lang];
  const ateliers = ATELIERS[lang];

  return (
    <>
      {/* Intro / Preloader with Logo */}
      {introActive && (
        <div
          className={`${styles.introLoader} ${
            introDismissed ? styles.introLoaderDismissed : ""
          }`}
          aria-hidden="true"
        >
          <div className={styles.introContent}>
            <img
              src="/img/logo-header.png"
              alt="Santos & Santorini"
              className={styles.introLogo}
              width={220}
              height={44}
            />
            <div className={styles.introLine} />
            <span className={styles.introTag}>SARTORIA ITALIANA • DAL 2007</span>
          </div>
        </div>
      )}

      {/* Main Luxury Header */}
      <header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""} ${
          hidden ? styles.headerHidden : ""
        }`}
      >
        <div className={styles.headerInner}>
          {/* Official Brand Logo */}
          <Link href={isEn ? `${basePath}?lang=en` : basePath} className={styles.brandWrap}>
            <img
              src="/img/logo-header.png"
              alt="Santos & Santorini"
              className={styles.brandLogo}
              width={168}
              height={34}
            />
            <span className={styles.brandTag}>
              {isEn ? "Italian Sartoria • Bespoke" : "Sartoria Italiana • Po Meri"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className={styles.nav} aria-label="Glavna navigacija">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions: CTA, Lang, Cart, Mobile Toggle */}
          <div className={styles.headerActions}>
            {/* Lang switcher */}
            <div className={styles.langSwitch}>
              <Link
                href={basePath}
                className={`${styles.langBtn} ${!isEn ? styles.langActive : ""}`}
                title="Srpski"
              >
                SR
              </Link>
              <span className={styles.langDivider}>/</span>
              <Link
                href={`${basePath}?lang=en`}
                className={`${styles.langBtn} ${isEn ? styles.langActive : ""}`}
                title="English"
              >
                EN
              </Link>
            </div>

            {/* Bespoke Appointment CTA */}
            <Link
              href={isEn ? "/custom-suits?lang=en" : "/custom-suits"}
              className={styles.headerCta}
            >
              <span>{isEn ? "Book Fitting" : "Zakažite termin"}</span>
              <svg
                className={styles.ctaArrow}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            {/* Cart Link */}
            <Link
              href={isEn ? "/cart?lang=en" : "/cart"}
              className={styles.cartBtn}
              aria-label={isEn ? "Shopping Bag" : "Korpa"}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className={styles.cartLabel}>{isEn ? "Bag" : "Korpa"}</span>
            </Link>

            {/* Mobile Burger */}
            <button
              type="button"
              className={`${styles.burger} ${mobileOpen ? styles.burgerOpen : ""}`}
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Zatvori meni" : "Otvori meni"}
              aria-expanded={mobileOpen}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <aside
        className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div className={styles.mobileDrawerBackdrop} onClick={() => setMobileOpen(false)} />
        <div className={styles.mobileDrawerPanel}>
          <div className={styles.mobileDrawerHead}>
            <Link
              href={isEn ? `${basePath}?lang=en` : basePath}
              className={styles.brandWrap}
              onClick={() => setMobileOpen(false)}
            >
              <img
                src="/img/logo-header.png"
                alt="Santos & Santorini"
                className={styles.brandLogo}
                width={150}
                height={30}
              />
              <span className={styles.brandTag}>
                {isEn ? "Italian Sartoria" : "Sartoria Italiana"}
              </span>
            </Link>
            <button
              type="button"
              className={styles.mobileCloseBtn}
              onClick={() => setMobileOpen(false)}
              aria-label="Zatvori"
            >
              ×
            </button>
          </div>

          <nav className={styles.mobileNav}>
            {items.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.mobileNavLink}
                onClick={() => setMobileOpen(false)}
              >
                <span>{item.label}</span>
                <span className={styles.mobileNavNum}>{`0${index + 1}`}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.mobileDrawerFoot}>
            <Link
              href={isEn ? "/custom-suits?lang=en" : "/custom-suits"}
              className={styles.mobileCtaBtn}
              onClick={() => setMobileOpen(false)}
            >
              {isEn ? "Book Private Fitting" : "Zakažite privatni termin"}
            </Link>

            <div className={styles.mobileAteliers}>
              {ateliers.map((at) => (
                <div key={at.city} className={styles.mobileAtelierItem}>
                  <strong>{at.city}:</strong> {at.address} —{" "}
                  <a href={`tel:${at.phone.replace(/\s+/g, "")}`}>{at.phone}</a>
                </div>
              ))}
            </div>

            <div className={styles.mobileLangRow}>
              <span className={styles.meta} style={{ color: "var(--meta)" }}>
                {isEn ? "Language:" : "Jezik:"}
              </span>
              <Link
                href={basePath}
                className={`${styles.langBtn} ${!isEn ? styles.langActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                SR
              </Link>
              <span className={styles.langDivider}>/</span>
              <Link
                href={`${basePath}?lang=en`}
                className={`${styles.langBtn} ${isEn ? styles.langActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                EN
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Subtle Custom Cursor */}
      <div
        ref={cursorRef}
        className={styles.cursor}
        aria-hidden="true"
      />

      {/* Page Content */}
      <main>{children}</main>

      {/* GDPR Consent Bar */}
      <LxConsent lang={lang} />
    </>
  );
}
