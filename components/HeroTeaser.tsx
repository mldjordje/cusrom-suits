// components/HeroTeaser.tsx
"use client";

import Image from "next/image";
import React from "react";

const HERO_IMAGE = "/img/hero.webp"; // lokalna slika iz public foldera

const HeroTeaser: React.FC = () => {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background image (responsive) */}
      <div className="relative w-full h-[56vw] md:h-[40vw] lg:h-[30vw] xl:h-[28vw] 2xl:h-[24vw]">
        <Image
          src={HERO_IMAGE}
          alt="Outerwear Teaser"
          fill
          priority
          sizes="(max-width: 640px) 360px, (max-width: 1024px) 1024px, 1980px"
          style={{ objectFit: "cover", objectPosition: "50% 50%" }}
        />
        {/* overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content container (center-left like Hugo Boss) */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="max-w-2xl">
            <h1 className="text-white font-[PlayfairDisplay] uppercase font-semibold leading-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg">
              OUTERWEAR
              <br />
              <span className="block">STAPLES</span>
            </h1>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.hugoboss.com/us/men-jackets-coats/"
                className="inline-flex items-center justify-center rounded-none border border-white/80 text-white py-3 px-6 text-sm font-medium tracking-wide hover:bg-white/10 transition"
                title="Men"
                rel="noreferrer"
              >
                Men
                <span className="ml-3">→</span>
              </a>

              <a
                href="https://www.hugoboss.com/us/women-jackets-coats/"
                className="inline-flex items-center justify-center rounded-none border border-white/80 text-white py-3 px-6 text-sm font-medium tracking-wide hover:bg-white/10 transition"
                title="Women"
                rel="noreferrer"
              >
                Women
                <span className="ml-3">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroTeaser;
