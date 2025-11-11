"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimeoutReached(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const showLoader = !(mediaLoaded || timeoutReached);

  return (
    <section className="relative min-h-[92svh] w-full overflow-hidden bg-black text-white">
      <Image
        src="/img/hero.webp"
        alt="Model u Santos & Santorini odelu"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        onLoadingComplete={() => setMediaLoaded(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/85" aria-hidden="true" />

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
              <Image src="/img/logo.png" alt="Santos & Santorini logo" width={80} height={80} className="h-16 w-16 object-contain" />
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-gray-100">
                <span className="h-5 w-5 animate-spin rounded-full border border-white/60 border-t-transparent" aria-hidden="true" />
                <span>Učitavanje…</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-[92svh] w-full max-w-6xl flex-col justify-center gap-8 px-6 pb-20 pt-28 text-center sm:px-10 lg:px-0">
        <p className="text-[11px] uppercase tracking-[0.6em] text-gray-200">Niš · od 2007.</p>
        <h1 className="text-4xl font-semibold tracking-[0.08em] sm:text-5xl lg:text-[58px]">SANTOS &amp; SANTORINI</h1>
        <p className="text-lg text-gray-200 sm:text-xl">Kreiraj odelo po svojoj meri</p>
        <p className="mx-auto max-w-2xl text-sm text-gray-200 sm:text-base">
          Minimalistički doživljaj inspirisan Hugo Boss estetikom — precizna tipografija, tamna paleta i naglašeni pozivi na akciju
          koji vode ka Custom Suits konfiguratoru ili online prodavnici.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/custom-suits"
            className="min-w-[180px] rounded-full bg-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-gray-200"
          >
            Custom Suits
          </Link>
          <Link
            href="/web-shop"
            className="min-w-[180px] rounded-full border border-white/70 px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/10"
          >
            Web Shop
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
