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
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f4] via-white to-[#ececec] text-[#111]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-6 lg:px-8 lg:py-10 xl:px-12">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <main className="order-1 flex min-h-[70vh] items-center justify-center rounded-[36px] bg-white/80 p-4 shadow-[0_35px_120px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-sm md:p-8 lg:order-2">
            <div className="flex w-full max-w-3xl items-center justify-center">
              <SuitPreview config={config} />
            </div>
          </main>
          <aside className="order-2 lg:order-1">
            <Sidebar config={config} dispatch={dispatch} />
          </aside>
        </div>
      </div>
    </div>
  );
}

