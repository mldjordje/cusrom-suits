"use client";

import Link from "next/link";

const cards = [
  { href: "/admin/webshop", title: "Web Shop Hub", desc: "Proizvodi + Landing + Akcije (mobile-first).", tag: "CORE" },
  { href: "/admin/webshop?tab=landing", title: "Landing CMS", desc: "Hero, baneri i sale sekcija na home strani.", tag: "CONTENT" },
  { href: "/admin/webshop?tab=akcije", title: "Akcije", desc: "Detaljno upravljanje popustima i akcijskim cenama.", tag: "SALES" },
  { href: "/admin/integrations", title: "Integrations", desc: "Ananas + lager sync (run now, logs, retry).", tag: "SYNC" },
  { href: "/admin/fabrics", title: "Fabrics", desc: "Upravljanje tkaninama, upload i lista.", tag: "CATALOG" },
  { href: "/admin/stripe-tuning", title: "Stripe tuning", desc: "Brzi ulaz u stripe/pinstripe tuning preview.", tag: "RENDER" },
  { href: "/admin/preview-tuning", title: "Preview tuning", desc: "Vizuelno podesi fabric preview po tkanini.", tag: "LAB" },
  { href: "/admin/buttons", title: "Buttons", desc: "Upload dugmadi za prikaz u konfiguratoru.", tag: "ASSETS" },
  { href: "/admin/linings", title: "Linings", desc: "Postave (base/left/right) za CMS.", tag: "CATALOG" },
  { href: "/admin/orders", title: "Porudzbine", desc: "Pregled poslednjih narudzbina.", tag: "SALES" },
  { href: "/admin/contact-messages", title: "Kontakt poruke", desc: "Inbox poruka sa landing/kontakt forme.", tag: "CRM" },
  { href: "/admin/blog-posts", title: "Blog Posts", desc: "Legacy blog/news merge CMS.", tag: "CONTENT" },
];

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Admin modules</h1>
        <p className="mt-1 text-sm text-slate-600">Brzi pristup CMS sekcijama.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              {card.tag}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
