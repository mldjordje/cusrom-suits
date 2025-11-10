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
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-8 lg:py-10 xl:px-12">
        <div className="flex h-[100svh] flex-col gap-6 overflow-hidden lg:h-auto lg:min-h-[80vh] lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="order-1 flex shrink-0 items-center justify-center rounded-[36px] bg-white/85 p-4 shadow-[0_35px_120px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-sm sm:p-6 lg:order-2 lg:h-full">
            <div className="flex w-full max-w-3xl items-center justify-center">
              <SuitPreview config={config} />
            </div>
          </section>
          <section className="order-2 flex-1 overflow-hidden lg:order-1 lg:overflow-visible">
            <div className="h-full overflow-y-auto lg:h-auto lg:overflow-visible">
              <Sidebar config={config} dispatch={dispatch} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

