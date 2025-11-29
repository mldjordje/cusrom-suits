"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { suits } from "./data/options";
import { useSuitConfigurator } from "./hooks/useSuitConfigurator";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { useFabrics } from "./hooks/useFabrics";
import SuitPreview from "./components/SuitPreview";
import Sidebar from "./components/Sidebar";
import MobileControls from "./components/MobileControls";

export default function CustomSuitsPage() {
  const [config, dispatch] = useSuitConfigurator({
    styleId: "single_2btn",
  });
  const { fabrics: initialFabrics } = useFabrics({
    sort: "created_at",
    order: "desc",
  });
  const defaultColorSet = React.useRef(false);

  const currentSuit = suits.find((s) => s.id === config.styleId);
  const layers = currentSuit?.layers || [];

  const preloadUrls = layers.map((l) => l.src).filter(Boolean);
  const imagesLoaded = useImagePreloader(preloadUrls);

  // Preselect first available fabric so preview is ready without a manual choice
  const firstFabricId = initialFabrics?.[0]?.id ? String(initialFabrics[0].id) : null;
  React.useEffect(() => {
    if (!firstFabricId) return;
    if (defaultColorSet.current) return;
    dispatch({ type: "SET_COLOR", payload: firstFabricId });
    defaultColorSet.current = true;
  }, [config.colorId, dispatch, firstFabricId]);

  if (!imagesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading suit images...
      </div>
    );
  }

  const heroCardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const configuratorVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const columnVariants: Variants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const controlsVariants: Variants = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <div className="bg-gradient-to-br from-[#f6f6f4] via-white to-[#ececec] text-[#111]">
      <motion.div
        className="mx-auto w-full max-w-5xl px-4 pb-4 pt-6 sm:px-6 lg:px-8"
        variants={heroCardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.6 }}
      >
        <div className="rounded-[20px] border border-white/60 bg-white/85 px-5 py-4 text-center shadow-[0_16px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur-sm sm:px-7">
          <h1 className="text-2xl font-semibold leading-tight text-[#1c1c1c] sm:text-3xl">Dizajniraj svoje odelo</h1>
        </div>
      </motion.div>

      <motion.div
        id="konfigurator"
        className="mx-auto w-full max-w-[1380px] px-3 pb-24 sm:px-6 lg:px-2 lg:pb-16"
        variants={configuratorVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="relative isolate flex min-h-[100svh] flex-col gap-4 sm:gap-5 lg:min-h-[78vh] lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
          <motion.section
            className="order-1 hidden w-full lg:order-1 lg:block"
            variants={columnVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <div className="lg:sticky lg:top-2">
              <div className="rounded-[28px] border border-white/60 bg-white/80 p-1 shadow-[0_25px_70px_rgba(15,23,42,0.1)] backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-lg lg:max-h-[calc(100svh-1.5rem)] lg:overflow-y-auto lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
                <Sidebar config={config} dispatch={dispatch} />
              </div>
            </div>
          </motion.section>
          <motion.section
            className="order-2 relative flex w-full items-center justify-center overflow-hidden rounded-[30px] bg-white/90 p-3 shadow-[0_28px_100px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-sm sm:p-4 lg:order-2 lg:h-full lg:p-5"
            variants={columnVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(179,32,42,0.08),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(24,39,75,0.06),transparent_40%)]" />
            <div className="relative z-10 flex w-full max-w-4xl items-center justify-center px-2">
              <SuitPreview config={config} />
            </div>
          </motion.section>
        </div>
        <motion.div
          variants={controlsVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <MobileControls config={config} dispatch={dispatch} />
        </motion.div>
      </motion.div>
    </div>
  );
}
