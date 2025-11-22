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
    title: "Odelo oblikovano samo za vas.",
    primary: { label: "Zakazi termin", href: "/custom-suits" },
  },
  {
    id: "atelier-capsule",
    image: "/img/hero2.jpg",
    title: "Crvene linije – limitirana kolekcija.",
    primary: { label: "Pogledaj kolekciju", href: "https://santos.rs/Ode%C4%87a" },
  },
];

type HeroImageBlockProps = (typeof heroImageSections)[number] & { priority?: boolean };

const HeroImageBlock = ({ image, title, primary, priority }: HeroImageBlockProps) => {
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
                <span>Ucitavanje...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-[90svh] w-full max-w-6xl flex-col justify-center gap-6 px-6 pb-16 pt-24 text-left text-white sm:px-10 lg:px-0">
        <h2 className="text-4xl font-semibold tracking-[0.06em] sm:text-5xl lg:text-[56px]">{title}</h2>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href={primary.href}
            className="min-w-[180px] rounded-full bg-[#b3202a] px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
          >
            {primary.label}
          </Link>
        </div>
      </div>
    </section>
  );
};

const VideoHero = () => {
  const desktopId = "18WbTwdI0Vs";
  const mobileId = "U8g-651j3yo";
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [preloaderExpired, setPreloaderExpired] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreloaderExpired(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const showLoader = !isVideoReady && !preloaderExpired;
  const handleReady = () => setIsVideoReady(true);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#120c0c] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 hidden md:block">
          <iframe
            title="Santos & Santorini video hero desktop"
            src={buildEmbed(desktopId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={handleReady}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 md:hidden">
          <iframe
            title="Santos & Santorini video hero mobile"
            src={buildEmbed(mobileId)}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[190%] w-[130%] -translate-x-1/2 -translate-y-1/2 scale-110"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={handleReady}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(179,32,42,0.12),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(24,39,75,0.08),transparent_40%)]" aria-hidden="true" />
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <Image src="/img/logo.png" alt="Santos & Santorini logo" width={88} height={88} className="h-16 w-16 object-contain" />
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-gray-100">
                <span className="h-5 w-5 animate-spin rounded-full border border-white/60 border-t-transparent" aria-hidden="true" />
                <span>Pripremamo video...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-[#190808]/70 to-[#2b0e0e]/80" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[100svh] items-center px-6 pb-16 pt-24 sm:px-12 lg:px-24">
        <div className="max-w-3xl space-y-5">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-[64px]">Dizajniraj svoje odelo po meri.</h1>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/custom-suits"
              className="rounded-full bg-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#1c1c1c] transition hover:bg-[#f5ece7]"
            >
              Zapocni dizajn
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const BridgePromo = () => {
  const promos = [
    {
      id: "suits",
      image: "/img/odela2.jpg",
      eyebrow: "S&S kolekcija",
      title: "Kolekcija gotovih odela.",
      copy: "Modeli su izradjeni od luksuznih tkanina i spremni za kupovinu. Precizan kroj, udobnost i cista linija za svaku priliku.",
      href: "https://santos.rs/Odela",
      cta: "Pogledaj kolekciju",
    },
    {
      id: "shoes",
      image: "/img/obuca.jpg",
      eyebrow: "S&S kolekcija",
      title: "Kolekcija premium obuce.",
      copy: "Italijanska koza bojeno rucno u slojevima, oblikovana da prati liniju odela za harmonican stil.",
      href: "https://santos.rs/Obuca",
      cta: "Pogledaj obucu",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-[#f3f0eb] via-[#f7f4ef] to-[#f3f0eb] px-4 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
        {promos.map((item) => (
          <div
            key={item.id}
            className="relative w-full overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.12)]"
          >
            <div className="relative h-[420px] w-full sm:h-[480px]">
              <Image src={item.image} alt={item.title} fill priority sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" aria-hidden="true" />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#fbd7cc]">{item.eyebrow}</p>
              <h3 className="mt-2 text-3xl font-semibold leading-tight">{item.title}</h3>
              <p className="mt-2 max-w-md text-sm text-white/85">{item.copy}</p>
              <div className="mt-6">
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#1c1c1c] transition hover:bg-[#f5eee9]"
                >
                  {item.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const HeroSection = () => {
  return (
    <>
      <VideoHero />
      <BridgePromo />
      {heroImageSections.map((section, index) => (
        <HeroImageBlock key={section.id} {...section} priority={index === 0} />
      ))}
    </>
  );
};

export default HeroSection;
