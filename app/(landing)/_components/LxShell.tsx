"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "../landing.module.scss";
import LxConsent from "./LxConsent";

type LxShellProps = {
  lang: "sr" | "en";
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

export default function LxShell({ lang, children }: LxShellProps) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [cursorOn, setCursorOn] = useState(false);
  const [cursorWide, setCursorWide] = useState(false);

  const isEn = lang === "en";

  // Smooth scroll, desktop only
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduced) return;

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.9,
        smoothWheel: true,
        syncTouch: false,
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  // Header scroll detection with hysteresis
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        setScrolled(y > 30);
        if (delta > 10 && y > 160 && !mobileOpen) {
          setHidden(true);
        } else if (delta < -6 || y <= 160) {
          setHidden(false);
        }
        last = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Custom cursor
  useEffect(() => {
    const node = cursorRef.current;
    if (!node) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let x = 0;
    let y = 0;
    let raf = 0;

    const draw = () => {
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = 0;
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      setCursorOn(true);
      const target = event.target as HTMLElement | null;
      setCursorWide(Boolean(target?.closest("a, button")));
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const onLeave = () => setCursorOn(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
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
      <header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""} ${
          hidden ? styles.headerHidden : ""
        }`}
      >
        <div className={styles.headerInner}>
          {/* Logo & Subtitle */}
          <Link href={isEn ? "/?lang=en" : "/"} className={styles.brandWrap}>
            <span className={styles.wordmark}>Santos &amp; Santorini</span>
            <span className={styles.brandTag}>
              {isEn ? "Italian Sartoria • Bespoke" : "Sartoria Italiana • Po Meri"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className={styles.nav}>
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
                href="/"
                className={`${styles.langBtn} ${!isEn ? styles.langActive : ""}`}
                title="Srpski"
              >
                SR
              </Link>
              <span className={styles.langDivider}>/</span>
              <Link
                href="/?lang=en"
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
              <span>{isEn ? "Configure Suit" : "Zakažite termin"}</span>
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
                  strokeWidth="1.2"
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
                width="18"
                height="18"
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

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              className={`${styles.burger} ${mobileOpen ? styles.burgerOpen : ""}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Zatvori meni" : "Otvori meni"}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div className={styles.mobileDrawerBackdrop} onClick={() => setMobileOpen(false)} />
        <div className={styles.mobileDrawerPanel}>
          <div className={styles.mobileDrawerHead}>
            <span className={styles.wordmark}>Santos &amp; Santorini</span>
            <button
              type="button"
              className={styles.mobileCloseBtn}
              onClick={() => setMobileOpen(false)}
              aria-label="Zatvori"
            >
              ✕
            </button>
          </div>

          <nav className={styles.mobileNav}>
            {items.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.mobileNavLink}
                onClick={() => setMobileOpen(false)}
                style={{ transitionDelay: `${idx * 40}ms` }}
              >
                <span>{item.label}</span>
                <span className={styles.mobileNavNum}>0{idx + 1}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.mobileDrawerFoot}>
            <Link
              href={isEn ? "/custom-suits?lang=en" : "/custom-suits"}
              className={styles.mobileCtaBtn}
              onClick={() => setMobileOpen(false)}
            >
              {isEn ? "Book Bespoke Fitting" : "Konfigurišite odelo po meri"}
            </Link>

            <div className={styles.mobileAteliers}>
              <div className={styles.micro} style={{ marginBottom: 10, color: "rgba(255,255,255,0.5)" }}>
                {isEn ? "Ateliers" : "Saloni & Konsultacije"}
              </div>
              {ateliers.map((at) => (
                <div key={at.city} className={styles.mobileAtelierItem}>
                  <strong>{at.city}</strong>: {at.address} •{" "}
                  <a href={`tel:${at.phone.replace(/\s+/g, "")}`}>{at.phone}</a>
                </div>
              ))}
            </div>

            <div className={styles.mobileLangRow}>
              <Link
                href="/"
                className={`${styles.langBtn} ${!isEn ? styles.langActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                SR Srpski
              </Link>
              <span className={styles.langDivider}>|</span>
              <Link
                href="/?lang=en"
                className={`${styles.langBtn} ${isEn ? styles.langActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                EN English
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={cursorRef}
        aria-hidden
        className={`${styles.cursor} ${cursorOn ? styles.cursorOn : ""} ${
          cursorWide ? styles.cursorWide : ""
        }`}
      />

      {children}

      <LxConsent lang={lang} />
    </>
  );
}

