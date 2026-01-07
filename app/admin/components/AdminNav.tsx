"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/fabrics", label: "Fabrics" },
  { href: "/admin/buttons", label: "Buttons" },
  { href: "/admin/linings", label: "Linings" },
  { href: "/admin/orders", label: "Porudzbine" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === href;
  return pathname.startsWith(href);
};

export default function AdminNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
