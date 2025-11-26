"use client";

import Link from "next/link";

const cards = [
  { href: "/admin/fabrics", title: "Fabrics", desc: "Upravljanje tkaninama, upload i lista." },
  { href: "/admin/orders", title: "Porudžbine", desc: "Pregled poslednjih narudžbina." },
];

export default function AdminHome() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-600">Brzi pristup CMS sekcijama.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
