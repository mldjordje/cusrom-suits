"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Footer from "./components/landing/Footer";
import Header from "./components/landing/Header";
import HeroSection from "./components/landing/HeroSection";

const aboutText = [
  "Vizijom osnivača da muškarci zaslužuju uživanje u svojoj garderobi, u Nišu 2007. godine nastaje Santos & Santorini.",
  "Porodična radionica prerasta u preduzeće 2013. godine, registrovano u Zavodu za intelektualnu svojinu i tada dobija epitet renomiranog srpskog brenda.",
  "Naše proizvode ističe autentičnost kroja, beskompromisni kvalitet i lepota detalja koja oslikava posvećenost svakog člana S&S porodice.",
];

const galleryItems = [
  {
    id: "odela",
    title: "Nova kolekcija odela",
    copy: "Ravnomerna geometrija krojeva, luksuzne teksture i digitalni konfigurator koji prikazuje svaki šav u realnom vremenu.",
    image: "/img/odela.jpg",
    alt: "Model u novoj kolekciji odela Santos & Santorini",
    href: "/custom-suits",
  },
  {
    id: "obuca",
    title: "Premium obuća",
    copy: "Italijanska koža, ručno bojena u slojevima, usklađena sa odelom za harmoničnu siluetu od glave do pete.",
    image: "/img/obuca.jpg",
    alt: "Premium kožna obuća Santos & Santorini",
    href: "/web-shop",
  },
];

const contactInfo = [
  { label: "Telefon", value: "+381 18 250 250" },
  { label: "Email", value: "atelier@santos.rs" },
  { label: "Adresa", value: "Obrenovićeva 10, Niš" },
];

const aboutVariants: Variants = {
  hidden: { opacity: 0, x: -50, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  },
};

const galleryContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const galleryItem: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
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
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <HeroSection />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <motion.section
          id="o-nama"
          className="space-y-8 rounded-[48px] border border-white/10 bg-white/5 p-8 backdrop-blur"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={aboutVariants}
        >
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.45em] text-gray-300">O nama</p>
            <h2 className="text-3xl font-semibold tracking-wide">Brend nastao iz porodične radionice</h2>
          </div>
          <div className="grid gap-6 text-sm text-gray-100 sm:grid-cols-2 sm:text-base">
            {aboutText.map((paragraph, index) => (
              <p key={index} className="leading-relaxed text-gray-200">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-6">
            <Link
              href="/custom-suits"
              className="rounded-full border border-white/40 px-6 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:border-white"
            >
              Otvori konfigurator
            </Link>
            <Link
              href="/web-shop"
              className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
            >
              Poseti web shop
            </Link>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-8 lg:grid-cols-2"
          variants={galleryContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          {galleryItems.map((item) => (
            <motion.article
              key={item.id}
              variants={galleryItem}
              className="relative overflow-hidden rounded-[44px] border border-white/10 bg-black/30 shadow-[0_25px_80px_rgba(0,0,0,0.35)]"
            >
              <div className="relative h-[420px] w-full">
                <Image src={item.image} alt={item.alt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/90" aria-hidden="true" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                <p className="text-[11px] uppercase tracking-[0.35em] text-gray-300">S&S kolekcija</p>
                <h3 className="mt-3 text-3xl font-semibold">{item.title}</h3>
                <p className="mt-3 max-w-xl text-sm text-gray-200">{item.copy}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-gray-200"
                >
                  Pogledaj više
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.section>

        <motion.section
          id="kontakt"
          className="grid gap-8 rounded-[48px] border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-black/40 p-8 lg:grid-cols-[1.2fr_0.8fr]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={contactVariants}
        >
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.45em] text-gray-300">Kontakt</p>
            <h2 className="text-3xl font-semibold tracking-wide">Diskretna podrška i rezervacije termina</h2>
            <p className="text-sm text-gray-200">
              Naš tim vas vodi kroz izbor tkanina, stilova i aksesoara uživo ili preko Custom Suits konfiguratora. Zakažite termin za
              meru ili pitajte bilo šta — odgovor stiže u roku od jednog radnog dana.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {contactInfo.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/20 bg-white/5 p-4 text-sm text-gray-100">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">{item.label}</p>
                  <p className="mt-1 text-base font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col rounded-[36px] border border-white/20 bg-black/30 p-6">
            <p className="text-sm text-gray-200">
              Preferirate digitalni pristup? Pređite direktno u konfigurator kako biste uživo videli svaki sloj odela dok paralelno
              komunicirate sa stilistom.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/custom-suits"
                className="w-full rounded-full bg-white px-6 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-gray-200"
              >
                Custom Suits
              </Link>
              <a
                href="mailto:atelier@santos.rs"
                className="w-full rounded-full border border-white/40 px-6 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white"
              >
                Piši atelieru
              </a>
            </div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
