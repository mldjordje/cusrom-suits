"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Početna" },
  { href: "#o-nama", label: "O nama" },
  { href: "https://santos.rs/Ode%C4%87a", label: "Web Shop" },
  { href: "/custom-suits", label: "Custom Suits" },
  { href: "#kontakt", label: "Kontakt" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#f1e4dd] bg-white/85 text-[#1d1b1b] backdrop-blur-md shadow-sm">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-12 w-12">
            <Image src="/img/logo.png" alt="Santos & Santorini logo" fill className="object-contain drop-shadow-sm" priority />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Santos & Santorini</span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#b3202a]">Atelier</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-[11px] uppercase tracking-[0.25em] text-[#8b7d76] lg:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[#b3202a]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/custom-suits"
            className="hidden whitespace-nowrap rounded-full bg-[#b3202a] px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-[#8f0f1a] sm:inline-flex"
          >
            Započni dizajn
          </Link>
          <button
            type="button"
            aria-label="Otvori navigaciju"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e2d3cc] text-[#1d1b1b] transition hover:border-[#b3202a] hover:text-[#b3202a] lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="relative flex h-4 w-4 flex-col justify-between">
              <span
                className={`origin-center h-0.5 w-full rounded-full bg-current transition ${mobileOpen ? "translate-y-1 rotate-45" : ""}`}
              />
              <span className={`h-0.5 w-full rounded-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
              <span
                className={`origin-center h-0.5 w-full rounded-full bg-current transition ${mobileOpen ? "-translate-y-1 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/35 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMenu}
              />
              <motion.nav
                className="absolute inset-x-4 top-[calc(100%+0.75rem)] z-50 rounded-3xl border border-[#f1e4dd] bg-white p-4 text-sm text-[#1d1b1b] shadow-2xl lg:hidden"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ul className="flex flex-col gap-2 text-[12px] uppercase tracking-[0.3em]">
                  {navLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-2xl px-3 py-2 transition hover:bg-[#f7ebe4]"
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link
                    href="/custom-suits"
                    className="flex w-full items-center justify-center rounded-full bg-[#b3202a] px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
                    onClick={closeMenu}
                  >
                    Započni dizajn
                  </Link>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
