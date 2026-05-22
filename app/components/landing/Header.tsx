"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowsPointingOutIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  MapPinIcon,
  NewspaperIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  StarIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type DropdownItem = {
  href: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type NavItem = {
  /** If set, clicking the trigger navigates here; dropdown still opens on hover */
  href?: string;
  label: string;
  dropdown?: DropdownItem[];
  /** Right-aligns the dropdown panel (use for items near the right edge) */
  dropdownAlign?: "center" | "right";
};

/* ------------------------------------------------------------------ */
/*  Nav structure                                                       */
/* ------------------------------------------------------------------ */

const navItems: NavItem[] = [
  { href: "/", label: "Početna" },
  { href: "/o-nama", label: "O nama" },
  {
    href: "/web-shop",
    label: "Prodavnica",
    dropdown: [
      {
        href: "/web-shop",
        label: "Web Shop",
        description: "Kompletna kolekcija odela i garderobe",
        Icon: ShoppingBagIcon,
      },
      {
        href: "/akcije",
        label: "Akcije",
        description: "Posebne ponude i sezonski popusti",
        Icon: TagIcon,
      },
      {
        href: "/blog",
        label: "Blog",
        description: "Modni saveti i novosti iz ateljea",
        Icon: NewspaperIcon,
      },
    ],
  },
  {
    href: "/custom-suits",
    label: "Custom Suits",
    dropdown: [
      {
        href: "/custom-suits",
        label: "Konfigurator",
        description: "Dizajnirajte odelo po meri korak po korak",
        Icon: ScissorsIcon,
      },
      {
        href: "/custom-suits/measure",
        label: "Merna tabela",
        description: "Pronađite savršenu veličinu i mere",
        Icon: ArrowsPointingOutIcon,
      },
      {
        href: "/poslovne-uniforme",
        label: "Poslovne uniforme",
        description: "Uniforme i odeća za kompanije i timove",
        Icon: BriefcaseIcon,
      },
    ],
  },
  {
    label: "Kontakt",
    dropdownAlign: "right",
    dropdown: [
      {
        href: "/kontakt",
        label: "Kontakt",
        description: "Pošaljite nam poruku ili upit",
        Icon: EnvelopeIcon,
      },
      {
        href: "/prodajna-mesta",
        label: "Prodajna mesta",
        description: "Pronađite nas u vašem gradu",
        Icon: MapPinIcon,
      },
      {
        href: "/loyalty-program",
        label: "Loyalty program",
        description: "Ekskluzivne pogodnosti za stalne klijente",
        Icon: StarIcon,
      },
    ],
  },
];

/* Mobile flat link list (all pages accessible) */
const mobileLinks = [
  { href: "/", label: "Početna" },
  { href: "/o-nama", label: "O nama" },
  { href: "/web-shop", label: "Web Shop" },
  { href: "/akcije", label: "Akcije" },
  { href: "/blog", label: "Blog" },
  { href: "/custom-suits", label: "Custom Suits" },
  { href: "/custom-suits/measure", label: "Merna tabela" },
  { href: "/poslovne-uniforme", label: "Poslovne uniforme" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/prodajna-mesta", label: "Prodajna mesta" },
];

/* ------------------------------------------------------------------ */
/*  Desktop nav item (with optional hover dropdown)                    */
/* ------------------------------------------------------------------ */

function DesktopNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 130);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const triggerClass = `flex items-center gap-1 py-1 text-[11px] uppercase tracking-[0.25em] transition-colors duration-200 ${
    open ? "text-[#b3202a]" : "text-[#8b7d76] hover:text-[#b3202a]"
  }`;

  /* Simple link — no dropdown */
  if (!item.dropdown) {
    return (
      <Link href={item.href!} className={triggerClass}>
        {item.label}
      </Link>
    );
  }

  /* Dropdown item */
  const align = item.dropdownAlign ?? "center";

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {/* Trigger — navigates if href, otherwise just opens menu */}
      {item.href ? (
        <Link href={item.href} className={triggerClass}>
          {item.label}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="ml-0.5 mt-px"
          >
            <ChevronDownIcon className="h-[11px] w-[11px]" />
          </motion.span>
        </Link>
      ) : (
        <button type="button" className={triggerClass} aria-expanded={open}>
          {item.label}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="ml-0.5 mt-px"
          >
            <ChevronDownIcon className="h-[11px] w-[11px]" />
          </motion.span>
        </button>
      )}

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={`absolute top-[calc(100%+14px)] z-50 min-w-[280px] ${
              align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
            }`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {/* Arrow caret */}
            <div
              className={`absolute -top-1.5 ${
                align === "right" ? "right-6" : "left-1/2 -translate-x-1/2"
              }`}
            >
              <div className="h-3 w-3 rotate-45 border-l border-t border-[#edddd6] bg-white" />
            </div>

            {/* Panel */}
            <div className="overflow-hidden rounded-2xl border border-[#edddd6] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.03]">
              {item.dropdown.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-[#fdf7f4] first:pt-4 last:pb-4"
                >
                  {/* Icon blob */}
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#f7ece6] text-[#c4877f] transition-colors duration-150 group-hover:bg-[#b3202a]/10 group-hover:text-[#b3202a]">
                    <sub.Icon className="h-[18px] w-[18px]" />
                  </span>

                  {/* Text */}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1b1b] transition-colors duration-150 group-hover:text-[#b3202a]">
                      {sub.label}
                    </span>
                    <span className="text-[12px] normal-case tracking-normal text-[#9e8d87] leading-snug">
                      {sub.description}
                    </span>
                  </span>
                </Link>
              ))}

              {/* Bottom accent strip */}
              <div className="h-[3px] w-full bg-gradient-to-r from-[#b3202a] via-[#e06060] to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    const handleResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#f1e4dd] bg-white/88 text-[#1d1b1b] backdrop-blur-md shadow-sm">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-12 w-12">
            <Image
              src="/img/logo.png"
              alt="Santos & Santorini logo"
              fill
              sizes="48px"
              className="object-contain drop-shadow-sm"
              priority
            />
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            Santos & Santorini
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Glavna navigacija">
          {navItems.map((item) => (
            <DesktopNavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/custom-suits"
            className="hidden whitespace-nowrap rounded-full bg-[#b3202a] px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-[#8f0f1a] sm:inline-flex"
          >
            Započni dizajn
          </Link>

          {/* Hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Zatvori navigaciju" : "Otvori navigaciju"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e2d3cc] text-[#1d1b1b] transition hover:border-[#b3202a] hover:text-[#b3202a] lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="relative flex h-4 w-4 flex-col justify-between">
              <span className={`origin-center h-0.5 w-full rounded-full bg-current transition duration-300 ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`origin-center h-0.5 w-full rounded-full bg-current transition duration-300 ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        {/* Mobile nav panel */}
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
                className="absolute inset-x-4 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-3xl border border-[#f1e4dd] bg-white shadow-2xl lg:hidden"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ul className="flex flex-col p-3 text-[12px] uppercase tracking-[0.28em] text-[#1d1b1b]">
                  {mobileLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center rounded-2xl px-3 py-2.5 transition hover:bg-[#f7ebe4] hover:text-[#b3202a]"
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#f1e4dd] p-3">
                  <Link
                    href="/custom-suits"
                    className="flex w-full items-center justify-center rounded-full bg-[#b3202a] px-4 py-2.5 text-[11px] uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
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
