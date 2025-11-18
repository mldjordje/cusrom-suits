"use client";

import React from "react";
import { suits } from "./data/options";
import { useSuitConfigurator } from "./hooks/useSuitConfigurator";
import { useImagePreloader } from "./hooks/useImagePreloader";
import SuitPreview from "./components/SuitPreview";
import Sidebar from "./components/Sidebar";

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
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 lg:px-0 lg:py-10">
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

