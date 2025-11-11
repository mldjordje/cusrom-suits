"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Početna" },
  { href: "#o-nama", label: "O nama" },
  { href: "/web-shop", label: "Web Shop" },
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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 text-white sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 p-1">
            <Image
              src="/img/logo.png"
              alt="Santos & Santorini logo"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Santos & Santorini</span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-gray-300">Atelier</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-[11px] uppercase tracking-[0.25em] text-gray-300 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/custom-suits"
            className="hidden whitespace-nowrap rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white hover:text-black sm:inline-flex"
          >
            Započni dizajn
          </Link>
          <button
            type="button"
            aria-label="Otvori navigaciju"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="relative flex h-4 w-4 flex-col justify-between">
              <span
                className={`h-0.5 w-full rounded-full bg-current transition origin-center ${mobileOpen ? "translate-y-1 rotate-45" : ""}`}
              />
              <span className={`h-0.5 w-full rounded-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
              <span
                className={`h-0.5 w-full rounded-full bg-current transition origin-center ${mobileOpen ? "-translate-y-1 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMenu}
              />
              <motion.nav
                className="absolute inset-x-4 top-[calc(100%+0.75rem)] z-50 rounded-3xl border border-white/10 bg-[#050505]/95 p-4 text-sm text-white shadow-2xl lg:hidden"
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
                        className="block rounded-2xl px-3 py-2 transition hover:bg-white/10"
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
                    className="flex w-full items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.35em] transition hover:border-white hover:bg-white hover:text-black"
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
