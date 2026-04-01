"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const SHOP_ROUTES = new Set(["/web-shop", "/cart", "/checkout", "/akcije"]);

export default function StorefrontMobileShopNav({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const pathname = usePathname() || "";
  const [effectiveLang, setEffectiveLang] = useState<StorefrontLanguage>(lang);
  const isEn = effectiveLang === "en";

  useEffect(() => {
    const currentLang = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : lang;
    setEffectiveLang(currentLang);
  }, [lang, pathname]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const shouldShow = SHOP_ROUTES.has(pathname);
  if (!shouldShow) return null;

  const navItems = [
    {
      href: "/",
      label: isEn ? "Home" : "Pocetna",
      isActive: pathname === "/",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M2.25 7.75L9 2.5L15.75 7.75V15H10.75V10.75H7.25V15H2.25V7.75Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: "/web-shop",
      label: isEn ? "Shop" : "Shop",
      isActive: pathname === "/web-shop" || pathname.startsWith("/web-shop/") || pathname === "/akcije",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 5.25H14L13.1 14H4.9L4 5.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.5 7.25V4.75C6.5 3.37 7.62 2.25 9 2.25C10.38 2.25 11.5 3.37 11.5 4.75V7.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/custom-suits",
      label: isEn ? "Custom suits" : "Custom suits",
      isActive: pathname === "/custom-suits" || pathname.startsWith("/custom-suits/"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6 3.25L9 5.25L12 3.25L14.5 5.5L12.75 14.75H5.25L3.5 5.5L6 3.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M7.25 6.75L9 8.25L10.75 6.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="footer-mobile ss-shop-mobile-nav d-md-none footer-mobile_initialized">
      <div className="ss-shop-mobile-nav__inner">
        {navItems.map((item) => (
          <div key={item.href} className="ss-shop-mobile-nav__item">
            <Link
              href={withLang(item.href)}
              className={`footer-mobile__link d-flex flex-column align-items-center ${item.isActive ? "is-active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </div>
        ))}
      </div>
    </footer>
  );
}
