"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Pregled", icon: "OV" },
  {
    href: "/admin/webshop",
    label: "Web Shop",
    icon: "WS",
    matchPaths: ["/admin/webshop", "/admin/categories", "/admin/orders", "/admin/size-guides"],
    children: [
      { href: "/admin/webshop?tab=products", label: "Proizvodi i lager" },
      { href: "/admin/webshop?tab=landing", label: "Pocetna i sekcije" },
      { href: "/admin/webshop?tab=akcije", label: "Akcije i snizenja" },
      { href: "/admin/categories", label: "Kategorije" },
      { href: "/admin/orders", label: "Porudzbine" },
      { href: "/admin/size-guides", label: "Tabele velicina" },
    ],
  },
  { href: "/admin/tutorial", label: "Tutorial", icon: "HD" },
  { href: "/admin/integrations", label: "Integracije", icon: "IN" },
  { href: "/admin/fabrics", label: "Fabrics", icon: "FB" },
  { href: "/admin/linings", label: "Linings", icon: "LN" },
  { href: "/admin/buttons", label: "Buttons", icon: "BT" },
  { href: "/admin/contact-messages", label: "Kontakt", icon: "CT" },
  { href: "/admin/newsletter", label: "Newsletter", icon: "NW" },
  { href: "/admin/blog-posts", label: "Blog", icon: "BL" },
  { href: "/admin/preview-tuning", label: "Preview Tuning", icon: "PT" },
  { href: "/admin/stripe-tuning", label: "Stripe Tuning", icon: "ST" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
};

export default function AdminNav() {
  const pathname = usePathname() || "";

  return (
    <nav className="admin-template-nav" aria-label="Admin navigation">
      <ul className="admin-template-nav-list">
        {navItems.map((item) => {
          const groupActive = item.matchPaths?.some((path) => pathname.startsWith(path)) ?? false;
          const active = isActive(pathname, item.href) || groupActive;

          if (item.children?.length) {
            return (
              <li key={item.href} className={`admin-template-nav-group ${active ? "is-open" : ""}`}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`admin-template-nav-link ${active ? "is-active" : ""}`}
                >
                  <span className="admin-template-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="admin-template-nav-link__copy">
                    <span>{item.label}</span>
                    <small>Dropdown sa svim webshop funkcijama</small>
                  </span>
                  <span className="admin-template-nav-caret" aria-hidden="true">
                    ▾
                  </span>
                </Link>

                <ul className="admin-template-subnav-list">
                  {item.children.map((child) => {
                    const childPath = child.href.split("?")[0] || child.href;
                    const childActive = pathname === childPath || pathname.startsWith(`${childPath}/`);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          className={`admin-template-subnav-link ${childActive ? "is-active" : ""}`}
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
                aria-current={active ? "page" : undefined}
                className={`admin-template-nav-link ${active ? "is-active" : ""}`}
              >
                <span className="admin-template-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
