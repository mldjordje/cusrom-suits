"use client";

import React from "react";
import { suits } from "./data/options";
import { useSuitConfigurator } from "./hooks/useSuitConfigurator";
import { useImagePreloader } from "./hooks/useImagePreloader";
import SuitPreview from "./components/SuitPreview";
import Sidebar from "./components/Sidebar";
import MobileControls from "./components/MobileControls";

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
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-[26px] border border-white/60 bg-white/85 px-5 py-6 text-center shadow-[0_22px_70px_rgba(15,23,42,0.09)] ring-1 ring-black/5 backdrop-blur-sm sm:px-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#b3202a]">Santos & Santorini</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#1c1c1c] sm:text-3xl">Mobilni konfigurator odela</h1>
          <p className="mt-2 text-sm text-[#4a403b] sm:text-base">
            Ostani u prikazu odela dok biras tkaninu, stil i detalje. Dizajn je optimizovan za telefon.
          </p>
        </div>
      </div>

      <div id="konfigurator" className="mx-auto w-full max-w-[1600px] px-3 pb-36 sm:px-6 lg:px-0 lg:pb-16">
        <div className="relative isolate flex min-h-[100svh] flex-col gap-4 sm:gap-6 lg:min-h-[80vh] lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="order-1 hidden w-full lg:order-1 lg:block">
            <div className="lg:sticky lg:top-2">
              <div className="rounded-[34px] border border-white/60 bg-white/80 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-lg lg:max-h-[calc(100svh-1.25rem)] lg:overflow-y-auto lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
                <Sidebar config={config} dispatch={dispatch} />
              </div>
            </div>
          </section>
          <section className="order-2 relative flex w-full items-center justify-center overflow-hidden rounded-[36px] bg-white/90 p-2 shadow-[0_35px_120px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-sm sm:p-4 lg:order-2 lg:h-full lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(179,32,42,0.08),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(24,39,75,0.06),transparent_40%)]" />
            <div className="relative z-10 flex w-full max-w-3xl items-center justify-center">
              <SuitPreview config={config} />
            </div>
          </section>
        </div>
        <MobileControls config={config} dispatch={dispatch} />
      </div>
    </div>
  );
}
