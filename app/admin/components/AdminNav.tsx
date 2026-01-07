"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Admin home" },
  { href: "/admin/fabrics", label: "Fabrics" },
  { href: "/admin/buttons", label: "Buttons" },
  { href: "/admin/linings", label: "Linings" },
  { href: "/admin/orders", label: "Orders" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full border px-3 py-1 transition ${
              active
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
