"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&showinfo=0`;

const heroImageSections = [
  {
    id: "atelier-core",
    image: "/img/hero.jpg",
    kicker: "Signature atelier",
    title: "Santos & Santorini Bespoke",
    subtitle: "Dizajniraj odelo koje prica tvoju pricu",
    description:
      "Privatne probe, luksuzne tkanine i crveni detalji vode te od prve mere do finalnog peglanja kako bi svako odelo imalo prepoznatljiv potpis.",
    primary: { label: "Zakazi kreiranje", href: "/custom-suits" },
    secondary: { label: "Upoznaj stilistu", href: "#kontakt" },
  },
  {
    id: "atelier-capsule",
    image: "/img/hero2.jpg",
    kicker: "Crimson capsule",
    title: "Crvene linije limited kolekcije",
    subtitle: "Akcenti inspirisani logoom Santosa",
    description:
      "Kombinujemo prirodne tkanine sa rucno bojenim detaljima u Bordeaux inspiraciji da bi svaki model ostao jedinstven i spreman za scenu.",
    primary: { label: "Pogledaj limited drop", href: "/web-shop" },
    secondary: { label: "Zatrazi konsultaciju", href: "#kontakt" },
  },
];

type HeroImageBlockProps = (typeof heroImageSections)[number] & { priority?: boolean };

const HeroImageBlock = ({ image, kicker, title, subtitle, description, primary, secondary, priority }: HeroImageBlockProps) => {
  const [loaded, setLoaded] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimeoutReached(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const showLoader = !(loaded || timeoutReached);

  return (
    <section className="relative min-h-[90svh] w-full overflow-hidden bg-[#120c0c] text-white">
      <Image
        src={image}
        alt={title}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-center"
        onLoadingComplete={() => setLoaded(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-[#1c0d0d]/70 to-[#0f0907]/30" aria-hidden="true" />
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <Image src="/img/logo.png" alt="Santos & Santorini logo" width={80} height={80} className="h-16 w-16 object-contain" />
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-gray-100">
                <span className="h-5 w-5 animate-spin rounded-full border border-white/60 border-t-transparent" aria-hidden="true" />
                <span>Učitavanje…</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-[90svh] w-full max-w-6xl flex-col justify-center gap-6 px-6 pb-16 pt-24 text-left text-white sm:px-10 lg:px-0">
        <p className="text-[11px] uppercase tracking-[0.5em] text-[#f8e9e2]">{kicker}</p>
        <div className="space-y-3">
          <h2 className="text-4xl font-semibold tracking-[0.06em] sm:text-5xl lg:text-[56px]">{title}</h2>
          <p className="text-lg text-white/85 sm:text-xl">{subtitle}</p>
        </div>
        <p className="max-w-3xl text-sm text-white/80 sm:text-base">{description}</p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href={primary.href}
            className="min-w-[180px] rounded-full bg-[#b3202a] px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="min-w-[180px] rounded-full border border-white/60 px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

const VideoHero = () => {
  const desktopId = "18WbTwdI0Vs";
  const mobileId = "gUQRpUIt5cU";
  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#120c0c] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 hidden md:block">
          <iframe
            title="Santos & Santorini video hero desktop"
            src={buildEmbed(desktopId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 md:hidden">
          <iframe
            title="Santos & Santorini video hero mobile"
            src={buildEmbed(mobileId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-[#190808]/70 to-[#2b0e0e]/80" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[100svh] items-center px-6 pb-16 pt-24 sm:px-12 lg:px-24">
        <div className="max-w-3xl space-y-6">
          <p className="text-[11px] uppercase tracking-[0.55em] text-[#f7ddd5]">Video lookbook</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-[64px]">Dizajniraj odelo. Mi vodimo svaki detalj.</h1>
          <p className="text-base text-white/85 sm:text-lg">
            Filmski uvod prikazuje emociju Santosa dok nasi majstori vode od prve skice do finalnog fittinga i cuvaju fokus na tvom stilu.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/custom-suits"
              className="rounded-full bg-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#1c1c1c] transition hover:bg-[#f5ece7]"
            >
              Zapocni dizajn
            </Link>
            <Link
              href="#o-nama"
              className="rounded-full border border-white/60 px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
            >
              Poseti showroom
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroSection = () => {
  return (
    <>
      <VideoHero />
      {heroImageSections.map((section, index) => (
        <HeroImageBlock key={section.id} {...section} priority={index === 0} />
      ))}
    </>
  );
};

export default HeroSection;
