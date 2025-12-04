"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    key: "custom-suits",
    label: "Custom suits",
    href: "/custom-suits",
    isActive: (pathname) => pathname.startsWith("/custom-suits"),
  },
  {
    key: "shop",
    label: "Shop",
    href: "https://santos.rs/Ode%C4%87a",
    isActive: (pathname) => pathname.startsWith("/web-shop"),
    external: true,
  },
  {
    key: "home",
    label: "Početna",
    href: "/",
    isActive: (pathname) => pathname === "/",
  },
];

const StickyMiniNav = () => {
  const pathname = usePathname() ?? "/";

  return (
    <div className="fixed inset-x-0 top-20 z-30 flex justify-center px-4 sm:top-[92px] sm:px-6">
      <nav className="flex w-full max-w-xl items-center gap-2 rounded-[18px] border border-white/70 bg-white/90 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.14)] backdrop-blur-lg">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const baseClasses =
            "flex-1 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3202a] sm:text-[11px]";
          const stateClasses = active
            ? "bg-[#0f0f0f] text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
            : "bg-white text-[#1b1b1b] shadow-[0_10px_18px_rgba(0,0,0,0.06)] hover:bg-[#f3eee8]";
          const className = `${baseClasses} ${stateClasses}`;

          if (item.external) {
            return (
              <a key={item.key} href={item.href} className={className}>
                {item.label}
              </a>
            );
          }

          return (
            <Link key={item.key} href={item.href} className={className} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default StickyMiniNav;
