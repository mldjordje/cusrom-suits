"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontLanguageSwitcher from "@/app/components/storefront/StorefrontLanguageSwitcher";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartLink from "@/app/components/storefront/cart/StorefrontCartLink";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";

type ShopCategory = {
  id: string;
  name: string;
};

type HeaderNavItem = {
  href: string;
  label: string;
};

type HeaderSocialLinks = {
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
};

const SHOP_CATEGORIES_SESSION_KEY = "ss-shop-categories-v3";

export default function StorefrontHeaderClient({
  lang = "sr",
  variant = "default",
  navItems,
  socialLinks,
  navLinkColor,
}: {
  lang?: StorefrontLanguage;
  variant?: "default" | "contrast";
  navItems: HeaderNavItem[];
  socialLinks?: HeaderSocialLinks;
  navLinkColor?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileShopExpanded, setMobileShopExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [shouldLoadShopCategories, setShouldLoadShopCategories] = useState(false);
  const lockedScrollY = useRef(0);
  const { reduceMotion } = useAnimationBudget();
  const { user: authUser, loading: authLoading } = useStorefrontAuth();
  const normalizedPath = pathname ?? "";
  const isHome = normalizedPath === "/" || normalizedPath === "";
  const isEn = lang === "en";
  const isContrast = variant === "contrast";
  const updateScrolledStateRef = useRef<(nextScrollY: number) => void>(() => {});
  updateScrolledStateRef.current = (nextScrollY: number) => {
    const shouldBeScrolled = nextScrollY > 26;
    setIsScrolled((current) => (current === shouldBeScrolled ? current : shouldBeScrolled));
  };

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const isItemActive = (href: string) => {
    if (href === "/") return normalizedPath === "/" || normalizedPath === "";
    return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
  };

  useEffect(() => {
    const { body, documentElement } = document;

    const unlockScroll = () => {
      body.classList.remove("mobile-menu-opened");
      body.style.overflow = "";
      body.style.height = "";
      window.scrollTo(0, lockedScrollY.current);
    };

    if (mobileOpen) {
      lockedScrollY.current = window.scrollY;
      body.classList.add("mobile-menu-opened");
      // Lock only body, not html — html:overflow:hidden blocks scroll inside
      // fixed overlays on iOS Safari.
      body.style.overflow = "hidden";
      body.style.height = "100%";
    } else {
      unlockScroll();
    }

    return unlockScroll;
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMobileShopExpanded(
      normalizedPath === "/web-shop" || normalizedPath.startsWith("/web-shop/") || normalizedPath === "/akcije",
    );
  }, [normalizedPath]);

  useEffect(() => {
    if (
      normalizedPath === "/web-shop" ||
      normalizedPath.startsWith("/web-shop/") ||
      normalizedPath === "/akcije"
    ) {
      setShouldLoadShopCategories(true);
    }
  }, [normalizedPath]);

  useEffect(() => {
    let frameId = 0;

    const onScroll = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateScrolledStateRef.current(window.scrollY);
      });
    };

    updateScrolledStateRef.current(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.sessionStorage.getItem(SHOP_CATEGORIES_SESSION_KEY);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as ShopCategory[];
      if (Array.isArray(parsed) && parsed.length) {
        setShopCategories(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(SHOP_CATEGORIES_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoadShopCategories || shopCategories.length > 0) return;
    let active = true;
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/storefront/categories", { cache: "force-cache" });
        const json = await res.json();
        if (!active || !json?.success || !Array.isArray(json.categories)) return;
        const categories = json.categories as ShopCategory[];
        setShopCategories(categories);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(SHOP_CATEGORIES_SESSION_KEY, JSON.stringify(categories));
        }
      } catch {
        if (active) setShopCategories([]);
      }
    };
    void loadCategories();
    return () => {
      active = false;
    };
  }, [shouldLoadShopCategories, shopCategories.length]);

  const desktopFloating = isHome && !isContrast;
  const closeMobileMenu = () => setMobileOpen(false);
  const handleSearchTrigger = () => {
    window.dispatchEvent(new CustomEvent("ss:open-storefront-search"));
  };
  const headerClass = [
    "header",
    "header-fullwidth",
    "header_sticky",
    isHome && !isContrast ? "header-transparent-bg header_sticky-bg_dark" : "",
    isContrast ? "ss-header-contrast" : "",
    desktopFloating ? "position-absolute ss-header-home-floating" : "header_sticky-active",
    isScrolled ? "ss-header-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mobileHeaderClass = [
    "header-mobile",
    "header-mobile_sticky",
    "header_sticky-active",
    isHome && !isContrast ? "ss-mobile-home" : "",
    isContrast ? "ss-mobile-header-contrast" : "",
    isScrolled ? "ss-mobile-header-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // Home page starts with a transparent dark hero header — use the white logo variant for
  // readability on that dark background. On all other pages (contrast or non-home) the
  // header is always on a light background, so use the standard dark logo.
  const shouldUseDarkLogo = isHome && !isContrast && !isScrolled;
  const desktopLogoSrc = shouldUseDarkLogo ? "/img/logo-header-dark.png" : "/img/logo-header.png";
  const mobileLogoSrc = shouldUseDarkLogo ? "/img/logo-header-dark-mobile.png" : "/img/logo-header-mobile.png";
  const shopMenuLinks = [
    { href: "/web-shop", label: isEn ? "All products" : "Svi proizvodi" },
    { href: "/web-shop?categoryId=sale", label: isEn ? "Sale" : "Akcija" },
    ...shopCategories.map((category) => ({
      href: `/web-shop?categoryGroup=${category.id}`,
      label: localizeDynamicCategoryLabel(category.name, isEn ? "en" : "sr"),
    })),
  ];
  type HeaderSocialItem = { key: "instagram" | "facebook" | "tiktok"; label: string; href?: string };
  const headerSocialItems = ([
    { key: "instagram", label: "Instagram", href: socialLinks?.instagramUrl },
    { key: "facebook", label: "Facebook", href: socialLinks?.facebookUrl },
    { key: "tiktok", label: "TikTok", href: socialLinks?.tiktokUrl },
  ] satisfies HeaderSocialItem[]).filter((item) => item.href && item.href.trim().length > 0);
  const renderHeaderSocialIcon = (key: "instagram" | "facebook" | "tiktok", idSuffix: string) => {
    if (key === "instagram") {
      const gradientId = `ss-ig-gradient-${idSuffix}`;
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="1.5" y1="22.5" x2="22.5" y2="1.5" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FEE411" />
              <stop offset="0.15" stopColor="#FEDA77" />
              <stop offset="0.35" stopColor="#F58529" />
              <stop offset="0.55" stopColor="#DD2A7B" />
              <stop offset="0.75" stopColor="#8134AF" />
              <stop offset="1" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect x="1.75" y="1.75" width="20.5" height="20.5" rx="6" fill={`url(#${gradientId})`} />
          <rect x="6.25" y="6.25" width="11.5" height="11.5" rx="4" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.35" stroke="#fff" strokeWidth="1.7" />
          <circle cx="17" cy="7" r="1.15" fill="#fff" />
        </svg>
      );
    }

    if (key === "facebook") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="12" r="10.25" fill="#1877F2" />
          <path
            d="M13.6 21.75v-7.7h2.58l.39-3H13.6V9.05c0-.87.24-1.46 1.49-1.46h1.59V4.9c-.27-.04-1.22-.12-2.31-.12-2.29 0-3.86 1.4-3.86 3.96v2.21H8v3h2.51v7.7Z"
            fill="#fff"
          />
        </svg>
      );
    }

    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M16.6 5.82c-.68-.73-1.06-1.68-1.06-2.66h-3.03v13.3a2.9 2.9 0 1 1-2.05-2.77v-3.1a5.94 5.94 0 0 0-.86-.06 5.94 5.94 0 1 0 5.94 5.94V9.4a7.85 7.85 0 0 0 4.59 1.47V7.85a4.85 4.85 0 0 1-3.53-2.03Z"
          fill="currentColor"
        />
      </svg>
    );
  };

  return (
    <>
      {navLinkColor ? (
        <style>{`#header#header .navigation__link, #header#header .navigation__item.is-active .navigation__link, #header#header .navigation__link.is-active { color: ${navLinkColor} !important; }`}</style>
      ) : null}
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
                  sizes="(min-width: 1200px) 214px, (min-width: 992px) 200px, 256px"
                  priority
                />
              </Link>
            </div>

            <nav className="navigation">
              <ul className="navigation__list list-unstyled d-flex">
                {navItems.map((item) => (
                  <li
                    key={item.href}
                    className={`navigation__item ${isItemActive(item.href) ? "is-active" : ""} ${item.href === "/web-shop" ? "menu-item-has-children position-relative" : ""}`}
                    onMouseEnter={item.href === "/web-shop" ? () => setShouldLoadShopCategories(true) : undefined}
                  >
                    <Link
                      href={withLang(item.href)}
                      prefetch={item.href === "/web-shop" || item.href.startsWith("/web-shop")}
                      className={`navigation__link ${isItemActive(item.href) ? "is-active" : ""}`}
                      onFocus={item.href === "/web-shop" ? () => setShouldLoadShopCategories(true) : undefined}
                    >
                      {item.label}
                    </Link>
                    {item.href === "/web-shop" && shopMenuLinks.length > 0 ? (
                      <div className="default-menu ss-header-shop-submenu">
                        <div className="ss-shop-dd-featured">
                          <Link
                            href={withLang("/web-shop")}
                            prefetch
                            className="ss-shop-dd-all"
                          >
                            <span>{isEn ? "All products" : "Svi proizvodi"}</span>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                          <Link
                            href={withLang("/web-shop?categoryId=sale")}
                            prefetch
                            className="ss-shop-dd-sale"
                          >
                            {isEn ? "Sale" : "Akcija"}
                          </Link>
                        </div>
                        {shopCategories.length > 0 && (
                          <>
                            <div className="ss-shop-dd-divider" />
                            <div className="ss-shop-dd-cats">
                              {shopCategories.map((category) => (
                                <Link
                                  key={`/web-shop?categoryGroup=${category.id}`}
                                  href={withLang(`/web-shop?categoryGroup=${category.id}`)}
                                  prefetch
                                  className="ss-shop-dd-cat"
                                >
                                  {localizeDynamicCategoryLabel(category.name, isEn ? "en" : "sr")}
                                </Link>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="header-tools ss-header-tools d-flex align-items-center">
              {headerSocialItems.length ? (
                <div className="ss-header-socials d-none d-xxl-inline-flex" aria-label={isEn ? "Social links" : "Drustvene mreze"}>
                  {headerSocialItems.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="ss-header-social-link"
                      aria-label={item.label}
                    >
                      {renderHeaderSocialIcon(item.key, "desktop")}
                    </a>
                  ))}
                </div>
              ) : null}

              <span className="ss-header-tools__divider d-none d-xxl-inline-block" aria-hidden="true" />

              <div className="ss-header-tools__icons d-none d-md-inline-flex">
                <button
                  type="button"
                  className="header-tools__item ss-header-tool"
                  aria-label={isEn ? "Search" : "Pretraga"}
                  onClick={handleSearchTrigger}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <StorefrontCartLink
                  className="header-tools__item ss-header-tool"
                  ariaLabel={isEn ? "Cart" : "Korpa"}
                />
              </div>

              <span className="ss-header-tools__divider d-none d-md-inline-block" aria-hidden="true" />

              <Link
                href={withLang(authUser ? "/nalog/porudzbine" : "/nalog/prijava")}
                className="ss-inline-link text-uppercase fw-medium d-none d-md-inline-flex"
              >
                {authLoading ? "…" : authUser ? (isEn ? "My orders" : "Moje porudzbine") : isEn ? "Sign in" : "Prijava"}
              </Link>
              <Link href={withLang("/kontakt")} className="ss-inline-link text-uppercase fw-medium d-none d-md-inline-flex">
                {isEn ? "Contact" : "Kontakt"}
              </Link>

              <StorefrontLanguageSwitcher lang={lang} className="d-none d-md-inline-flex ss-header-lang" />
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
              aria-controls="ss-mobile-nav-panel"
              aria-expanded={mobileOpen}
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
              <svg className="close-icon" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="logo ss-mobile-logo">
              <Link href={withLang("/")}>
                <Image
                  src={mobileLogoSrc}
                  alt="Santos and Santorini"
                  width={280}
                  height={79}
                  className="logo__image d-block ss-site-logo ss-site-logo--mobile"
                  sizes="(max-width: 767.98px) min(208px, 54vw), 208px"
                />
              </Link>
            </div>

            <div className="ss-mobile-tools">
              <button
                type="button"
                className="ss-mobile-slot ss-mobile-link"
                aria-label={isEn ? "Search" : "Pretraga"}
                onClick={handleSearchTrigger}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <StorefrontCartLink
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
              style={{ background: "rgba(8,6,4,0.55)" }}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <m.button
                type="button"
                className="ss-mobile-nav-backdrop"
                aria-label={isEn ? "Close menu" : "Zatvori meni"}
                onClick={closeMobileMenu}
              />

              <m.nav
                id="ss-mobile-nav-panel"
                className="ss-mobile-nav-panel"
                style={{ background: "#faf9f6", color: "#14110c" }}
                initial={reduceMotion ? false : { opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "-100%" }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="ss-mobile-nav-panel__inner">
                  <div className="ss-mobile-nav-brand">
                    <Link href={withLang("/")} className="ss-mobile-nav-brand__logo" onClick={closeMobileMenu}>
                      <Image
                        src="/img/logo-header.png"
                        alt="Santos and Santorini"
                        width={280}
                        height={79}
                        className="logo__image d-block ss-site-logo ss-site-logo--mobile"
                        sizes="(max-width: 767.98px) min(208px, 54vw), 208px"
                      />
                    </Link>
                    <button
                      type="button"
                      className="ss-mobile-nav-close"
                      aria-label={isEn ? "Close menu" : "Zatvori meni"}
                      onClick={closeMobileMenu}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <m.div
                    className="ss-mobile-nav-panel__quick"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      className="ss-mobile-nav-search ss-mobile-nav-quicklink"
                      onClick={() => {
                        closeMobileMenu();
                        handleSearchTrigger();
                      }}
                    >
                      <span>{isEn ? "Search products" : "Pretrazi proizvode"}</span>
                      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </m.div>

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
                        {item.href === "/web-shop" && shopMenuLinks.length > 0 ? (
                          <>
                            <button
                              type="button"
                              className={`ss-mobile-nav-link ss-mobile-nav-link--toggle ${isItemActive(item.href) ? "is-active" : ""} ${mobileShopExpanded ? "is-open" : ""}`}
                              aria-expanded={mobileShopExpanded}
                              onClick={() => {
                                setShouldLoadShopCategories(true);
                                setMobileShopExpanded((prev) => !prev);
                              }}
                            >
                              <span>{item.label}</span>
                              <svg
                                className="ss-mobile-nav-link__chevron"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <AnimatePresence initial={false}>
                              {mobileShopExpanded ? (
                                <m.div
                                  className="ss-mobile-nav-submenu"
                                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                                  style={{ overflow: "hidden" }}
                                >
                                  {shopMenuLinks.map((link) => (
                                    <Link
                                      key={`mobile-${link.href}`}
                                      href={withLang(link.href)}
                                      prefetch={link.href.startsWith("/web-shop")}
                                      className="ss-mobile-nav-submenu__link"
                                      onClick={closeMobileMenu}
                                    >
                                      {link.label}
                                    </Link>
                                  ))}
                                </m.div>
                              ) : null}
                            </AnimatePresence>
                          </>
                        ) : (
                          <Link
                            href={withLang(item.href)}
                            prefetch={item.href === "/web-shop" || item.href.startsWith("/web-shop")}
                            className={`ss-mobile-nav-link ${isItemActive(item.href) ? "is-active" : ""}`}
                            onClick={closeMobileMenu}
                          >
                            <span>{item.label}</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        )}
                      </m.li>
                    ))}
                  </ul>

                  <div className="ss-mobile-nav-footer">
                    {headerSocialItems.length ? (
                      <div className="ss-mobile-nav-socials" aria-label={isEn ? "Social links" : "Drustvene mreze"}>
                        {headerSocialItems.map((item) => (
                          <a
                            key={`mobile-social-${item.key}`}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="ss-mobile-nav-pill"
                            aria-label={item.label}
                            onClick={closeMobileMenu}
                          >
                            {renderHeaderSocialIcon(item.key, "mobile")}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <Link
                      href={withLang(authUser ? "/nalog/porudzbine" : "/nalog/prijava")}
                      className="ss-mobile-nav-account ss-mobile-nav-pill"
                      onClick={closeMobileMenu}
                    >
                      {authLoading
                        ? "…"
                        : authUser
                          ? isEn
                            ? "My orders"
                            : "Moje porudzbine"
                          : isEn
                            ? "Sign in"
                            : "Prijava"}
                    </Link>
                    <Link href={withLang("/kontakt")} className="ss-mobile-nav-account ss-mobile-nav-pill" onClick={closeMobileMenu}>
                      {isEn ? "Contact" : "Kontakt"}
                    </Link>
                    <div className="ss-mobile-nav-lang">
                      <span className="ss-mobile-nav-lang__label">{isEn ? "Language" : "Jezik"}</span>
                      <StorefrontLanguageSwitcher lang={lang} compact />
                    </div>
                  </div>
                </div>
              </m.nav>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
