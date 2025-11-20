"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { suits } from "./data/options";
import { useSuitConfigurator } from "./hooks/useSuitConfigurator";
import { useImagePreloader } from "./hooks/useImagePreloader";
import SuitPreview from "./components/SuitPreview";
import Sidebar from "./components/Sidebar";

const galleryItems = [
  {
    id: "odela",
    title: "Kolekcija gotovih odela.",
    copy: "Modeli iz naše kolekcije izrađeni su od luksuznih tkanina i spremni su za trenutnu kupovinu. Precizan kroj, udobnost i čista linija za svaku priliku.",
    image: "/img/odela2.jpg",
    alt: "Model u kolekciji gotovih odela Santos & Santorini",
    href: "https://santos.rs/Odeća",
    ctaLabel: "Pogledaj kolekciju",
  },
  {
    id: "obuca",
    title: "Kožna obuća vrhunskog kvaliteta.",
    copy: "Italijanska koža, ručno bojena u slojevima i oblikovana da prati liniju odela — za harmoničan, celokupan stil.",
    image: "/img/obuca.jpg",
    alt: "Premium kožna obuća Santos & Santorini",
    href: "https://santos.rs/Obuća",
    ctaLabel: "Pogledaj obuću",
  },
];

export default function CustomSuitsPage() {
  const [config, dispatch] = useSuitConfigurator({
    styleId: "single_2btn",
    colorId: "blue",
  });

  const currentSuit = suits.find((s) => s.id === config.styleId);
  const layers = currentSuit?.layers || [];

  const preloadUrls = layers.map((l) => l.src).filter(Boolean);
  const imagesLoaded = useImagePreloader(preloadUrls);

  if (!imagesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading suit images...
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#f6f6f4] via-white to-[#ececec] text-[#111]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12">
          <header className="space-y-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#b3202a]">Santos & Santorini</p>
            <h1 className="text-3xl font-semibold leading-tight text-[#1c1c1c] sm:text-4xl">
              Dizajniraj svoje odelo po meri, uz inspiraciju iz naše stalne kolekcije.
            </h1>
            <p className="mx-auto max-w-3xl text-sm text-[#4a403b] sm:text-base">
              Pogledaj selekciju gotovih odela i obuće, zatim pređi na konfigurator da prilagodiš svaki detalj. Spoj klasične elegancije i digitalnog iskustva u jednom koraku.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="#konfigurator"
                className="rounded-full bg-[#b3202a] px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-[#8f0f1a]"
              >
                Započni dizajn
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[#f4e6de] bg-white px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#1b1b1b] transition hover:bg-[#fceeea]"
              >
                Povratak na početnu
              </Link>
            </div>
          </header>

          <section className="grid gap-8 lg:grid-cols-2">
            {galleryItems.map((item) => (
              <article
                key={item.id}
                className="relative overflow-hidden rounded-[48px] border border-[#f3e1d9] bg-white shadow-[0_35px_120px_rgba(0,0,0,0.12)]"
              >
                <div className="relative h-[520px] w-full sm:h-[580px]">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" aria-hidden="true" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#080303]/70 via-transparent to-transparent p-10 text-white">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffdcd2]">S&S kolekcija</p>
                  <h3 className="mt-3 text-3xl font-semibold">{item.title}</h3>
                  <p className="mt-3 max-w-xl text-sm text-white/85">{item.copy}</p>
                  <Link
                    href={item.href}
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#1c1c1c] transition hover:bg-[#f8f6f2]"
                  >
                    {item.ctaLabel ?? "Pogledaj"}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>

      <div id="konfigurator" className="mx-auto w-full max-w-[1600px] px-3 pb-12 sm:px-6 lg:px-0 lg:pb-16">
        <div className="relative isolate flex min-h-[100svh] flex-col gap-4 sm:gap-6 lg:min-h-[80vh] lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="order-1 w-full lg:order-1">
            <div className="lg:sticky lg:top-2">
              <div className="rounded-[34px] border border-white/60 bg-white/80 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-lg lg:max-h-[calc(100svh-1.25rem)] lg:overflow-y-auto lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
                <Sidebar config={config} dispatch={dispatch} />
              </div>
            </div>
          </section>
          <section className="order-2 flex w-full items-center justify-center rounded-[36px] bg-white/85 p-3 shadow-[0_35px_120px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-sm sm:p-5 lg:order-2 lg:h-full">
            <div className="flex w-full max-w-3xl items-center justify-center">
              <SuitPreview config={config} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
