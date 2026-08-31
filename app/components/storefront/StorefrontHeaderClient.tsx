"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontLanguageSwitcher from "@/app/components/storefront/StorefrontLanguageSwitcher";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartLink from "@/app/components/storefront/cart/StorefrontCartLink";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";
import { CATEGORY_ROUTE_BY_SLUG } from "@/lib/storefront/categoryRoutes";

type ShopCategoryChild = {
  id: string;
  name: string;
  href: string;
};

type ShopCategory = {
  id: string;
  name: string;
  children?: ShopCategoryChild[];
  /** Set for admin-made top-level categories, which filter by id, not group. */
  href?: string;
};

/** A main category filters by group key unless the feed spelled out a link. */
const shopCategoryHref = (category: ShopCategory) =>
  category.href || `/web-shop?categoryGroup=${category.id}`;

type HeaderNavItem = {
  href: string;
  label: string;
};

type HeaderSocialLinks = {
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
};

/* v4: the payload gained per-category children, so a v3 cache would render the
   menu without its second level until the session storage expired. */
const SHOP_CATEGORIES_SESSION_KEY = "ss-shop-categories-v4";

/**
 * Group key a header link points at, or "" when it is not a category link.
 *
 * Header links are admin-editable, and a category one can be written two ways:
 * the filter form (/web-shop?categoryGroup=aksesoari) or the indexable landing
 * route (/web-shop/kategorija/muski-aksesoari). Reading the key off the href is
 * what keeps the dropdown dynamic — no list of "which nav items have menus"
 * to keep in sync when the admin adds a category or renames a link.
 */
const navItemGroupKey = (href: string): string => {
  const raw = String(href || "");
  const queryMatch = raw.match(/[?&]categoryGroup=([^&#]+)/);
  if (queryMatch) return decodeURIComponent(queryMatch[1]);

  const routeMatch = raw.match(/\/web-shop\/kategorija\/([^/?#]+)/);
  if (routeMatch) {
    const route = CATEGORY_ROUTE_BY_SLUG[decodeURIComponent(routeMatch[1]).toLowerCase()];
    if (route) return route.groupKey;
  }

  return "";
};

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
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileShopExpanded, setMobileShopExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [shouldLoadShopCategories, setShouldLoadShopCategories] = useState(false);
  /* Which category in the shop dropdown has its subcategory panel open. Null =
     none; only one at a time. */
  const [openShopSubmenu, setOpenShopSubmenu] = useState<string | null>(null);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const { body } = document;

    if (mobileOpen) {
      const scrollY = window.scrollY;
      lockedScrollY.current = scrollY;
      body.classList.add("mobile-menu-opened");
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
    } else {
      const scrollY = lockedScrollY.current;
      body.classList.remove("mobile-menu-opened");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, scrollY);
      }
    }

    return () => {
      body.classList.remove("mobile-menu-opened");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      if (lockedScrollY.current) {
        window.scrollTo(0, lockedScrollY.current);
      }
    };
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

  /* Navigating away leaves the panel open behind the new page otherwise. */
  useEffect(() => {
    setOpenShopSubmenu(null);
  }, [pathname]);

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

  /* Refresh once per menu open, even when the session cache already painted the
     menu. The cache is there so the dropdown is never empty on first hover, not
     to pin the menu for the whole session — a category the shop started serving
     ten minutes ago used to stay missing until the tab was closed. The cached
     copy stays on screen until the fresh one arrives. */
  const shopCategoriesFetchedRef = useRef(false);

  useEffect(() => {
    if (!shouldLoadShopCategories || shopCategoriesFetchedRef.current) return;
    shopCategoriesFetchedRef.current = true;
    let active = true;
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/storefront/categories");
        const json = await res.json();
        if (!active || !json?.success || !Array.isArray(json.categories)) return;
        const categories = json.categories as ShopCategory[];
        setShopCategories(categories);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(SHOP_CATEGORIES_SESSION_KEY, JSON.stringify(categories));
        }
      } catch {
        // Keep whatever the cache painted; an empty menu is worse than a stale one.
      }
    };
    void loadCategories();
    return () => {
      active = false;
    };
  }, [shouldLoadShopCategories]);

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
  const shopMenuLinks: Array<{ href: string; label: string; isChild?: boolean }> = [
    { href: "/web-shop", label: isEn ? "All products" : "Svi proizvodi" },
    { href: "/web-shop?categoryId=sale", label: isEn ? "Sale" : "Akcija" },
    ...shopCategories.flatMap((category) => [
      {
        href: shopCategoryHref(category),
        label: localizeDynamicCategoryLabel(category.name, isEn ? "en" : "sr"),
      },
      /* The mobile menu is a single scrolling list, so subcategories are
         indented children rather than a second panel. */
      ...(category.children || []).map((child) => ({
        href: child.href,
        label: localizeDynamicCategoryLabel(child.name, isEn ? "en" : "sr"),
        isChild: true,
      })),
    ]),
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
                {navItems.map((item) => {
                  /* Any header link that points at a category gets the same
                     dropdown treatment as Web shop, listing that category's
                     subcategories straight from the live feed. */
                  const itemGroupKey = navItemGroupKey(item.href);
                  const itemCategory = itemGroupKey
                    ? shopCategories.find((category) => category.id === itemGroupKey)
                    : undefined;
                  const itemChildren = itemCategory?.children || [];
                  const hasOwnMenu = item.href === "/web-shop" || Boolean(itemGroupKey);
                  return (
                  <li
                    key={item.href}
                    className={`navigation__item ${isItemActive(item.href) ? "is-active" : ""} ${hasOwnMenu ? "menu-item-has-children position-relative" : ""}`}
                    onMouseEnter={hasOwnMenu ? () => setShouldLoadShopCategories(true) : undefined}
                    onMouseLeave={item.href === "/web-shop" ? () => setOpenShopSubmenu(null) : undefined}
                  >
                    <Link
                      href={withLang(item.href)}
                      prefetch={item.href === "/web-shop" || item.href.startsWith("/web-shop")}
                      className={`navigation__link ${isItemActive(item.href) ? "is-active" : ""}`}
                      onFocus={hasOwnMenu ? () => setShouldLoadShopCategories(true) : undefined}
                    >
                      {item.label}
                    </Link>

                    {itemGroupKey && itemChildren.length > 0 ? (
                      <div className="default-menu ss-header-cat-submenu">
                        <Link href={withLang(item.href)} prefetch className="ss-shop-dd-subcat ss-shop-dd-subcat--all">
                          {isEn ? `All ${item.label.toLowerCase()}` : `Sve — ${item.label}`}
                        </Link>
                        {itemChildren.map((child) => (
                          <Link
                            key={child.href}
                            href={withLang(child.href)}
                            prefetch={false}
                            className="ss-shop-dd-subcat"
                          >
                            {localizeDynamicCategoryLabel(child.name, isEn ? "en" : "sr")}
                          </Link>
                        ))}
                      </div>
                    ) : null}
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
                              {shopCategories.map((category) => {
                                const children = category.children || [];
                                const label = localizeDynamicCategoryLabel(category.name, isEn ? "en" : "sr");
                                const groupHref = shopCategoryHref(category);

                                /* A category with subcategories opens a second panel on click
                                   instead of navigating; the panel's first entry still links to
                                   the whole group so the parent stays reachable. */
                                if (children.length === 0) {
                                  return (
                                    <Link key={groupHref} href={withLang(groupHref)} prefetch className="ss-shop-dd-cat">
                                      {label}
                                    </Link>
                                  );
                                }

                                const isOpen = openShopSubmenu === category.id;
                                return (
                                  <div key={groupHref} className={`ss-shop-dd-cat-group ${isOpen ? "is-open" : ""}`}>
                                    <button
                                      type="button"
                                      className="ss-shop-dd-cat ss-shop-dd-cat--parent"
                                      aria-expanded={isOpen}
                                      aria-haspopup="true"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        setOpenShopSubmenu((current) => (current === category.id ? null : category.id));
                                      }}
                                    >
                                      <span>{label}</span>
                                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                    {isOpen ? (
                                      <div className="ss-shop-dd-subcats" role="menu">
                                        <Link
                                          href={withLang(groupHref)}
                                          prefetch
                                          className="ss-shop-dd-subcat ss-shop-dd-subcat--all"
                                          role="menuitem"
                                        >
                                          {isEn ? `All ${label.toLowerCase()}` : `Sve — ${label}`}
                                        </Link>
                                        {children.map((child) => (
                                          <Link
                                            key={child.href}
                                            href={withLang(child.href)}
                                            prefetch={false}
                                            className="ss-shop-dd-subcat"
                                            role="menuitem"
                                          >
                                            {localizeDynamicCategoryLabel(child.name, isEn ? "en" : "sr")}
                                          </Link>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </li>
                  );
                })}
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
                href={withLang(authUser ? "/nalog" : "/nalog/prijava")}
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
              onClick={() => {
                // Category nav items need the feed to list their subcategories,
                // and on touch there is no hover to trigger the load.
                setShouldLoadShopCategories(true);
                setMobileOpen((prev) => !prev);
              }}
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
      </div>

      {mounted && typeof document !== "undefined"
        ? createPortal(
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
                onClick={closeMobileMenu}
              />

              <m.nav
                id="ss-mobile-nav-panel"
                className="ss-mobile-nav-panel"
                initial={reduceMotion ? false : { opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "-100%" }}
                transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Fixed top bar with logo and close button */}
                <div className="ss-mobile-nav-panel__header">
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
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Smooth dedicated scroll viewport */}
                <div className="ss-mobile-nav-panel__body">
                  {/* Search Bar */}
                  <m.div
                    className="ss-mobile-nav-search-wrap"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <button
                      type="button"
                      className="ss-mobile-nav-search-btn"
                      onClick={() => {
                        closeMobileMenu();
                        handleSearchTrigger();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>{isEn ? "Search collection..." : "Pretražite kolekciju..."}</span>
                    </button>
                  </m.div>

                  {/* Primary Navigation List */}
                  <div className="ss-mobile-nav-section-label">
                    <span>{isEn ? "Navigation" : "Meni"}</span>
                  </div>

                  <ul className="ss-mobile-nav-list list-unstyled">
                    {navItems.map((item, index) => {
                      const itemNum = String(index + 1).padStart(2, "0");
                      const isShop = item.href === "/web-shop";
                      const isItemOpen = isShop && mobileShopExpanded;
                      const active = isItemActive(item.href);

                      return (
                        <m.li
                          key={`mobile-${item.href}`}
                          className={`ss-mobile-nav-item ${active ? "is-active" : ""}`}
                          initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.35,
                            delay: reduceMotion ? 0 : 0.06 + index * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          {isShop && shopMenuLinks.length > 0 ? (
                            <>
                              <button
                                type="button"
                                className={`ss-mobile-nav-link ss-mobile-nav-link--toggle ${active ? "is-active" : ""} ${isItemOpen ? "is-open" : ""}`}
                                aria-expanded={mobileShopExpanded}
                                onClick={() => {
                                  setShouldLoadShopCategories(true);
                                  setMobileShopExpanded((prev) => !prev);
                                }}
                              >
                                <div className="ss-mobile-nav-link__main">
                                  <span className="ss-mobile-nav-link__num">{itemNum}</span>
                                  <span className="ss-mobile-nav-link__text">{item.label}</span>
                                </div>
                                <span className={`ss-mobile-nav-link__icon-box ${isItemOpen ? "is-open" : ""}`}>
                                  <svg
                                    className="ss-mobile-nav-link__chevron"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                  >
                                    <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              </button>

                              <AnimatePresence initial={false}>
                                {mobileShopExpanded ? (
                                  <m.div
                                    className="ss-mobile-nav-submenu"
                                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ overflow: "hidden" }}
                                  >
                                    {shopMenuLinks.map((link) => {
                                      const isSale = link.href.includes("categoryId=sale") || link.href.includes("akcije");
                                      return (
                                        <Link
                                          key={`mobile-${link.href}`}
                                          href={withLang(link.href)}
                                          prefetch={link.href.startsWith("/web-shop")}
                                          className={`ss-mobile-nav-submenu__link ${link.isChild ? "ss-mobile-nav-submenu__link--child" : ""} ${isSale ? "ss-mobile-nav-submenu__link--sale" : ""}`}
                                          onClick={closeMobileMenu}
                                        >
                                          <span className="ss-mobile-nav-submenu__indicator" aria-hidden="true" />
                                          <span className="ss-mobile-nav-submenu__label">{link.label}</span>
                                          {isSale ? <span className="ss-mobile-nav-badge">SALE</span> : null}
                                        </Link>
                                      );
                                    })}
                                  </m.div>
                                ) : null}
                              </AnimatePresence>
                            </>
                          ) : (
                            <>
                              <Link
                                href={withLang(item.href)}
                                prefetch={item.href === "/web-shop" || item.href.startsWith("/web-shop")}
                                className={`ss-mobile-nav-link ${active ? "is-active" : ""}`}
                                onClick={closeMobileMenu}
                              >
                                <div className="ss-mobile-nav-link__main">
                                  <span className="ss-mobile-nav-link__num">{itemNum}</span>
                                  <span className="ss-mobile-nav-link__text">{item.label}</span>
                                </div>
                                <span className="ss-mobile-nav-link__arrow" aria-hidden="true">
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.5 3.5L10 8L5.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              </Link>

                              {(() => {
                                const groupKey = navItemGroupKey(item.href);
                                const children = groupKey
                                  ? shopCategories.find((category) => category.id === groupKey)?.children || []
                                  : [];
                                if (children.length === 0) return null;
                                return (
                                  <div className="ss-mobile-nav-submenu">
                                    {children.map((child) => (
                                      <Link
                                        key={`mobile-${item.href}-${child.href}`}
                                        href={withLang(child.href)}
                                        prefetch={false}
                                        className="ss-mobile-nav-submenu__link ss-mobile-nav-submenu__link--child"
                                        onClick={closeMobileMenu}
                                      >
                                        <span className="ss-mobile-nav-submenu__indicator" aria-hidden="true" />
                                        <span className="ss-mobile-nav-submenu__label">
                                          {localizeDynamicCategoryLabel(child.name, isEn ? "en" : "sr")}
                                        </span>
                                      </Link>
                                    ))}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </m.li>
                      );
                    })}
                  </ul>

                  {/* Customer Portal & Quick Services */}
                  <div className="ss-mobile-nav-section-label">
                    <span>{isEn ? "Customer Services" : "Korisnički servis"}</span>
                  </div>

                  <div className="ss-mobile-nav-quick-grid">
                    <Link
                      href={withLang(authUser ? "/nalog" : "/nalog/prijava")}
                      className="ss-mobile-nav-card"
                      onClick={closeMobileMenu}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>
                        {authLoading
                          ? "…"
                          : authUser
                            ? isEn
                              ? "My Account"
                              : "Moj Nalog"
                            : isEn
                              ? "Sign In"
                              : "Prijava"}
                      </span>
                    </Link>

                    {authUser ? (
                      <Link
                        href={withLang("/nalog/porudzbine")}
                        className="ss-mobile-nav-card"
                        onClick={closeMobileMenu}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        <span>{isEn ? "My Orders" : "Porudžbine"}</span>
                      </Link>
                    ) : null}

                    <Link
                      href={withLang("/prodajna-mesta")}
                      className="ss-mobile-nav-card"
                      onClick={closeMobileMenu}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{isEn ? "Ateliers" : "Saloni"}</span>
                    </Link>

                    <Link
                      href={withLang("/kontakt")}
                      className="ss-mobile-nav-card"
                      onClick={closeMobileMenu}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{isEn ? "Contact" : "Kontakt"}</span>
                    </Link>
                  </div>

                  {/* Footer segment: Language Switcher, Social links, Brand text */}
                  <div className="ss-mobile-nav-footer">
                    <div className="ss-mobile-nav-footer__top">
                      <div className="ss-mobile-nav-lang">
                        <span className="ss-mobile-nav-lang__label">{isEn ? "Language" : "Jezik"}</span>
                        <StorefrontLanguageSwitcher lang={lang} compact />
                      </div>

                      {headerSocialItems.length ? (
                        <div className="ss-mobile-nav-socials" aria-label={isEn ? "Social links" : "Društvene mreže"}>
                          {headerSocialItems.map((item) => (
                            <a
                              key={`mobile-social-${item.key}`}
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className="ss-mobile-nav-social-btn"
                              aria-label={item.label}
                              onClick={closeMobileMenu}
                            >
                              {renderHeaderSocialIcon(item.key, "mobile")}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="ss-mobile-nav-brand-stamp">
                      <span>Santos &amp; Santorini</span>
                      <span className="ss-mobile-nav-brand-dot">·</span>
                      <span>Sartorial Luxury</span>
                    </div>
                  </div>
                </div>
              </m.nav>
            </m.div>
          ) : null}
        </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
