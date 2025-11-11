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
        <div className="relative isolate flex min-h-[100svh] flex-row gap-3 overflow-x-auto sm:gap-4 md:overflow-visible lg:h-auto lg:min-h-[80vh] lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="relative order-1 z-20 flex basis-[40%] min-w-[180px] max-w-[380px] shrink-0 flex-col sm:basis-[34%] sm:min-w-[220px] md:basis-[32%] lg:order-1 lg:z-auto lg:basis-auto lg:max-w-none lg:min-w-0 lg:flex-none">
            <div className="sticky top-2 lg:static">
              <div className="max-h-[calc(100svh-1.25rem)] overflow-y-auto rounded-[34px] border border-white/60 bg-white/80 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-lg lg:max-h-none lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none lg:overflow-visible">
                <Sidebar config={config} dispatch={dispatch} />
              </div>
            </div>
          </section>
          <section className="order-2 flex min-w-[240px] flex-1 basis-[60%] items-center justify-center rounded-[36px] bg-white/85 p-2 shadow-[0_35px_120px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-sm sm:min-w-0 sm:p-5 lg:order-2 lg:basis-auto lg:h-full">
            <div className="flex w-full max-w-3xl items-center justify-center">
              <SuitPreview config={config} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

