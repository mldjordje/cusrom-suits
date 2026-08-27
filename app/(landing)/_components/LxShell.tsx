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
    { label: "Odela po meri", href: "/custom-suits", wide: true },
    { label: "Uniforme", href: "/poslovne-uniforme", wide: true },
    { label: "Saloni", href: "/prodajna-mesta", wide: true },
    { label: "Korpa", href: "/cart" },
  ],
  en: [
    { label: "Web Shop", href: "/web-shop?lang=en" },
    { label: "Bespoke", href: "/custom-suits?lang=en", wide: true },
    { label: "Uniforms", href: "/poslovne-uniforme?lang=en", wide: true },
    { label: "Ateliers", href: "/prodajna-mesta?lang=en", wide: true },
    { label: "Bag", href: "/cart?lang=en" },
  ],
};

export default function LxShell({ lang, children }: LxShellProps) {
  const [hidden, setHidden] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [cursorOn, setCursorOn] = useState(false);
  const [cursorWide, setCursorWide] = useState(false);

  // Smooth scroll, desktop only. Both fashion references that use Lenis leave
  // touch on the native scroller — syncTouch is what made the earlier builds
  // feel laggy on a phone.
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

  // Header retreats on the way down, returns on the way up. The 80px floor
  // keeps it from flickering during the first few pixels of scroll.
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setHidden(y > 80 && y > last);
        last = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <>
      <header className={`${styles.header} ${hidden ? styles.headerHidden : ""}`}>
        <Link href={lang === "en" ? "/?lang=en" : "/"} className={styles.wordmark}>
          Santos &amp; Santorini
        </Link>
        <nav className={styles.nav}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${item.wide ? "lx-nav-wide" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

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
