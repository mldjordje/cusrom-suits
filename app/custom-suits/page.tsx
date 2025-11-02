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
  <div className="flex flex-row md:flex-row min-h-screen bg-[#f7f7f7] text-[#111] overflow-x-auto">
    {/* ===== SIDEBAR ===== */}
    <aside className="order-1 w-[55%] min-w-[300px] md:w-[340px] bg-white border-r border-[#e6e6e6]">
      <Sidebar config={config} dispatch={dispatch} />
    </aside>

    {/* ===== PREVIEW ===== */}
    <main className="order-2 flex-1 flex items-center justify-center bg-white p-4 md:p-10">
      <div className="max-w-full md:max-w-[700px]">
        <SuitPreview config={config} />
      </div>
    </main>
  </div>
);

}
