"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdminPermission } from "@/lib/adminRoles";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  children?: NavChild[];
  matchPaths?: string[];
  permission?: AdminPermission;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Pregled", icon: "OV" },
      {
        href: "/admin/analytics",
        label: "Analitika",
        icon: "AN",
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Prodavnica",
    items: [
      {
        href: "/admin/webshop",
        label: "Web Shop",
        icon: "WS",
        matchPaths: ["/admin/webshop", "/admin/landing-hero", "/admin/shop-hero"],
        children: [
          { href: "/admin/webshop?tab=products", label: "Proizvodi i lager" },
          { href: "/admin/webshop?tab=akcije", label: "Akcije i snizenja" },
          { href: "/admin/shop-hero", label: "Web Shop Hero" },
          { href: "/admin/landing-hero", label: "Landing Hero Video" },
        ],
      },
      { href: "/admin/orders", label: "Porudzbine", icon: "OR", matchPaths: ["/admin/orders"] },
      { href: "/admin/categories", label: "Kategorije", icon: "KT" },
      { href: "/admin/size-guides", label: "Tabele velicina", icon: "SZ" },
    ],
  },
  {
    label: "Sadrzaj",
    items: [
      { href: "/admin/landing", label: "Pocetna i sekcije", icon: "LC" },
      { href: "/admin/popups", label: "Pop-up / Promo", icon: "PP" },
      { href: "/admin/poslovne-uniforme", label: "Poslovne uniforme", icon: "UN" },
      { href: "/admin/site-content", label: "Site Content", icon: "SC" },
      { href: "/admin/blog-posts", label: "Blog", icon: "BL" },
    ],
  },
  {
    label: "Operacije",
    items: [
      { href: "/admin/sync", label: "Sync status", icon: "SY", matchPaths: ["/admin/sync"] },
      { href: "/admin/integrations", label: "Integracije", icon: "IN", matchPaths: ["/admin/integrations"] },
      { href: "/admin/fulfillment", label: "Fulfillment", icon: "FL" },
    ],
  },
  {
    label: "Konfiguracija",
    items: [
      { href: "/admin/fabrics", label: "Fabrics", icon: "FB" },
      { href: "/admin/linings", label: "Linings", icon: "LN" },
      { href: "/admin/buttons", label: "Buttons", icon: "BT" },
      { href: "/admin/fonts", label: "Fontovi", icon: "FN" },
    ],
  },
  {
    label: "Podrska",
    items: [
      { href: "/admin/contact-messages", label: "Kontakt", icon: "CT" },
      { href: "/admin/newsletter", label: "Newsletter", icon: "NW" },
      { href: "/admin/tutorial", label: "Tutorial", icon: "HD" },
      { href: "/admin/preview-tuning", label: "Preview Tuning", icon: "PT" },
      { href: "/admin/stripe-tuning", label: "Stripe", icon: "ST" },
      { href: "/admin/users", label: "Users & Roles", icon: "UR", permission: "admin.users.manage" },
    ],
  },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
};

type AdminNavProps = {
  onNavigate?: () => void;
  permissions?: AdminPermission[];
};

export default function AdminNav({ onNavigate, permissions = ["*"] }: AdminNavProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  const canAccess = (permission?: AdminPermission) =>
    !permission || permissions.includes("*") || permissions.includes(permission);

  const childMatchesCurrentLocation = (href: string) => {
    const [childPath, childQuery] = href.split("?");
    const pathMatches = pathname === childPath || pathname.startsWith(`${childPath}/`);
    if (!pathMatches) return false;
    if (!childQuery) return true;
    const expectedParams = new URLSearchParams(childQuery);
    for (const [key, value] of expectedParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  const renderItem = (item: NavItem) => {
    const groupActive = item.matchPaths?.some((path) => pathname.startsWith(path)) ?? false;
    const active = isActive(pathname, item.href) || groupActive;

    if (item.children?.length) {
      return (
        <li key={item.href} className={`admin-shell-nav-group ${active ? "is-open" : ""}`}>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`admin-shell-nav-link ${active ? "is-active" : ""}`}
          >
            <span className="admin-shell-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="admin-shell-nav-link__copy">
              <span>{item.label}</span>
            </span>
            <span className="admin-shell-nav-caret" aria-hidden="true">▾</span>
          </Link>
          <ul className="admin-shell-subnav-list">
            {item.children.map((child) => {
              const childActive = childMatchesCurrentLocation(child.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={childActive ? "page" : undefined}
                    className={`admin-shell-subnav-link ${childActive ? "is-active" : ""}`}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      );
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`admin-shell-nav-link ${active ? "is-active" : ""}`}
        >
          <span className="admin-shell-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="admin-shell-nav" aria-label="Admin navigation">
      {navSections.map((section, sectionIdx) => {
        const visibleItems = section.items.filter((item) => canAccess(item.permission));
        if (!visibleItems.length) return null;
        return (
          <div
            key={section.label ?? `section-${sectionIdx}`}
            className="admin-shell-nav-section"
          >
            {section.label ? (
              <span className="admin-shell-nav-section-label">{section.label}</span>
            ) : null}
            <ul className="admin-shell-nav-list">
              {visibleItems.map(renderItem)}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
