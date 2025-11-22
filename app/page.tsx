"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Footer from "./components/landing/Footer";
import Header from "./components/landing/Header";
import HeroSection from "./components/landing/HeroSection";

const aboutText = [
  "Sa idejom da muskarac treba da uziva u garderobi koju nosi, Santos & Santorini nastaje 2007. u Nisu.",
  "Od 2013. prerasta u brend prepoznat po modernim krojevima, biranim tkaninama i rucno negovanim detaljima.",
  "Nasi modeli spajaju tradiciju krojenja i savremeni dizajn – od prvog sava do finalne siluete.",
];

const campaignBlocks = [
  {
    id: "black-friday",
    label: "Black Friday Event",
    title: "Do 30% popusta",
    copy: "Osvezi zimsku garderobu uz limitirane ponude.",
    image: "/img/hero.jpg",
    ctas: [
      { label: "Muskarci", href: "/web-shop" },
      { label: "Zene", href: "/web-shop" },
    ],
  },
  {
    id: "holiday-capsule",
    label: "Holiday Capsule",
    title: "Kreiraj praznicni set",
    copy: "Blazeri, koze i tregeri koji se uklapaju u sve svecane prilike.",
    image: "/img/hero2.jpg",
    ctas: [
      { label: "Lookbook", href: "/custom-suits" },
      { label: "Shop sada", href: "/web-shop" },
    ],
  },
  {
    id: "gift-edit",
    label: "Gift Edit",
    title: "Pokloni za njega",
    copy: "Kravate, maramice i kozni kaiševi koji zaokruzuju stil.",
    image: "/img/obuca.jpg",
    ctas: [
      { label: "Pokloni", href: "/web-shop" },
      { label: "Detalji", href: "/custom-suits" },
    ],
  },
  {
    id: "outerwear",
    label: "Outerwear Staples",
    title: "Kaputi i sakoi",
    copy: "Topline siluete i precizan kroj za hladne dane.",
    image: "/img/odela2.jpg",
    ctas: [
      { label: "Jackets", href: "/web-shop" },
      { label: "Coats", href: "/web-shop" },
    ],
  },
  {
    id: "new-arrivals",
    label: "New Arrivals",
    title: "Nova tura odela",
    copy: "Najnoviji krojevi, sveže tkanine, spremno za probu.",
    image: "/img/odela.jpg",
    ctas: [
      { label: "Men", href: "/web-shop" },
      { label: "Women", href: "/web-shop" },
    ],
  },
];

const contactInfo = [
  { label: "Telefon", value: "+381 18 250 250" },
  { label: "Email", value: "atelier@santos.rs" },
  { label: "Adresa", value: "Obrenoviceva 10, Nis" },
];

const stackVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
  },
};

const aboutVariants: Variants = {
  hidden: { opacity: 0, x: -50, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  },
};

const contactVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#1b1b1b]">
      <Header />
      <HeroSection />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-28 pt-16 sm:px-6 lg:px-8">
        <motion.section
          className="flex flex-col gap-10"
          variants={stackVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {campaignBlocks.map((item) => (
            <motion.article
              key={item.id}
              variants={cardVariant}
              className="relative min-h-[420px] overflow-hidden rounded-[36px] border border-[#f3e1d9] bg-[#0f0b0b] shadow-[0_30px_100px_rgba(0,0,0,0.14)]"
            >
              <div className="absolute inset-0">
                <Image src={item.image} alt={item.title} fill sizes="100vw" className="object-cover object-center" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" aria-hidden="true" />
              </div>
              <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-8 pb-10 pt-12 text-white sm:px-12">
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#ffd9cf]">{item.label}</p>
                <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">{item.title}</h3>
                {item.copy ? <p className="max-w-xl text-sm text-white/85">{item.copy}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.ctas.map((cta) => (
                    <Link
                      key={cta.label}
                      href={cta.href}
                      className="rounded-full border border-white/70 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white hover:text-[#0f0f0f]"
                    >
                      {cta.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.section>

        <motion.section
          id="o-nama"
          className="space-y-8 rounded-[48px] border border-[#f4e6de] bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.07)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={aboutVariants}
        >
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.45em] text-[#b3202a]">O nama</p>
            <h2 className="text-3xl font-semibold tracking-wide text-[#201a18]">Brend nastao iz porodicne radionice.</h2>
          </div>
          <div className="grid gap-6 text-sm text-[#4a403b] sm:grid-cols-2 sm:text-base">
            {aboutText.map((paragraph, index) => (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-6">
            <Link
              href="/custom-suits"
              className="rounded-full bg-[#b3202a] px-6 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-[#8f0f1a]"
            >
              Otvori konfigurator
            </Link>
            <Link
              href="/web-shop"
              className="rounded-full border border-[#f4e6de] bg-white px-6 py-2 text-[11px] uppercase tracking-[0.3em] text-[#1b1b1b] transition hover:bg-[#fceeea]"
            >
              Poseti web shop
            </Link>
          </div>
        </motion.section>

        <motion.section
          id="kontakt"
          className="grid gap-8 rounded-[48px] border border-[#f4e6de] bg-white/95 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.2fr_0.8fr]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={contactVariants}
        >
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.45em] text-[#b3202a]">Kontakt</p>
            <h2 className="text-3xl font-semibold tracking-wide text-[#201a18]">Diskretna podrska i licne preporuke.</h2>
            <p className="text-sm text-[#4a403b]">
              Nas tim vas vodi kroz izbor tkanina, krojeva i detalja – u showroomu ili online. Odgovaramo u roku od jednog radnog dana.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {contactInfo.map((item) => (
                <div key={item.label} className="rounded-3xl border border-[#f4e6de] bg-[#fff8f2] p-4 text-sm text-[#4a403b]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#b3202a]">{item.label}</p>
                  <p className="mt-1 text-base font-medium text-[#1b1b1b]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col rounded-[36px] border border-[#f4e6de] bg-[#fffdfb] p-6">
            <p className="text-sm text-[#4a403b]">
              Preferirate digitalni pristup? Udjite u konfigurator i dizajnirajte svoje odelo dok komunicirate sa stilistom.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/custom-suits"
                className="w-full rounded-full bg-[#b3202a] px-6 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
              >
                Otvori konfigurator
              </Link>
              <a
                href="mailto:atelier@santos.rs"
                className="w-full rounded-full border border-[#f4e6de] px-6 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-[#1b1b1b] transition hover:bg-[#fceeea]"
              >
                Kontaktirajte nas
              </a>
            </div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
