"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Pregled", icon: "OV" },
  { href: "/admin/webshop", label: "Web Shop Hub", icon: "WS" },
  { href: "/admin/tutorial", label: "Tutorial", icon: "HD" },
  { href: "/admin/integrations", label: "Integracije", icon: "IN" },
  { href: "/admin/fabrics", label: "Fabrics", icon: "FB" },
  { href: "/admin/linings", label: "Linings", icon: "LN" },
  { href: "/admin/buttons", label: "Buttons", icon: "BT" },
  { href: "/admin/orders", label: "Porudzbine", icon: "OR" },
  { href: "/admin/size-guides", label: "Size Guides", icon: "SZ" },
  { href: "/admin/categories", label: "Kategorije", icon: "CT" },
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
          const active = isActive(pathname, item.href);
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
