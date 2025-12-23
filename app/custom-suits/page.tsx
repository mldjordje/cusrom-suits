"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { suits, fabrics as fallbackFabrics } from "./data/options";
import { useSuitConfigurator } from "./hooks/useSuitConfigurator";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { useFabrics } from "./hooks/useFabrics";
import SuitPreview from "./components/SuitPreview";
import Sidebar from "./components/Sidebar";
import MobileControls, { Panel as MobilePanel } from "./components/MobileControls";
import { computePrice } from "./utils/price";
import StickyMiniNav from "../components/landing/StickyMiniNav";
import Image from "next/image";

export default function CustomSuitsPage() {
  const [config, dispatch] = useSuitConfigurator({
    styleId: "single_2btn",
  });
  const { fabrics: initialFabrics } = useFabrics({
    sort: "created_at",
    order: "desc",
  });
  const defaultColorSet = React.useRef(false);
  const [activeMobilePanel, setActiveMobilePanel] = React.useState<MobilePanel | null>(null);

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
  const price = React.useMemo(() => computePrice(config, suits), [config]);
  const fabricsFallback = initialFabrics?.length ? initialFabrics : fallbackFabrics;
  const fabricPrice =
    fabricsFallback.find((fabric: any) => String(fabric.id) === String(config.colorId))?.price ?? 0;
  const measurementUrl = React.useMemo(() => {
    const json = JSON.stringify(config);
    const url = new URL(typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.pathname = "/custom-suits/measure";
    url.searchParams.set("config", json);
    return url.toString();
  }, [config]);
  const [savingCart, setSavingCart] = React.useState(false);

  if (!imagesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading suit images...
      </div>
    );
  }

  const handleAddToCart = async () => {
    if (savingCart) return;
    try {
      setSavingCart(true);
      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        config,
        price,
        addedAt: new Date().toISOString(),
      };
      const existingRaw = localStorage.getItem("suitCart");
      const parsed = existingRaw ? JSON.parse(existingRaw) : [];
      parsed.unshift(entry);
      localStorage.setItem("suitCart", JSON.stringify(parsed));

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            price: price.total,
            fabricId: config.colorId,
            contact: null,
          }),
        });
        const json = await res.json();
        if (!json?.success) {
          console.error("Order sync failed", json?.message);
        }
      } catch (err) {
        console.error("Order sync failed", err);
      }

      alert("Dizajn je sacuvan u korpu. Zavrsite porudzbinu u sledecem koraku.");
    } catch (err) {
      console.error("Add to cart failed", err);
      alert("Nije moguce sacuvati dizajn trenutno. Pokusajte ponovo.");
    } finally {
      setSavingCart(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#f6f6f4] via-white to-[#ececec] text-[#111]">
      <div className="fixed left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1.5 shadow-md backdrop-blur">
        <Image src="/img/logo.png" alt="Santos & Santorini" width={18} height={18} className="h-5 w-5 object-contain" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#1d1b1b]">Custom suits</span>
      </div>
      <div className="relative z-20">
        <StickyMiniNav variant="compact" />
      </div>
      <motion.div
        id="konfigurator"
        className="mx-auto w-full max-w-[1480px] px-3 pb-24 pt-24 sm:px-4 sm:pt-24 lg:px-2 lg:pb-16"
        variants={configuratorVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative isolate flex min-h-[100svh] flex-col gap-2 sm:gap-3 lg:min-h-[78vh] lg:grid lg:grid-cols-[360px_minmax(0,1fr)_280px] lg:gap-8 xl:grid-cols-[420px_minmax(0,1fr)_300px]">
          <motion.section
            className="order-1 hidden w-full lg:order-1 lg:block"
            variants={columnVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="lg:sticky lg:top-2">
              <div className="rounded-[24px] border border-white/60 bg-white/80 p-1 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-lg lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
                <Sidebar config={config} dispatch={dispatch} showSummary={false} showFooter={false} />
              </div>
            </div>
          </motion.section>
          <motion.section
          className={`order-2 relative flex w-full items-center justify-center overflow-visible rounded-[28px] bg-white/90 p-3 shadow-[0_20px_70px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-sm sm:p-4 lg:order-2 lg:h-full lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-0 lg:rounded-none transition-transform duration-300 ease-out origin-left ${
              activeMobilePanel ? "translate-x-28 scale-[0.82] sm:translate-x-32 sm:scale-[0.84]" : "translate-x-0"
            } lg:translate-x-0 lg:scale-100`}
          variants={columnVariants}
          initial="hidden"
          animate="visible"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(179,32,42,0.08),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(24,39,75,0.06),transparent_40%)] lg:opacity-0" />
            <div className="relative z-10 flex w-full max-w-4xl items-center justify-center px-2">
              <SuitPreview config={config} />
            </div>
          </motion.section>
          <motion.aside
            className="order-3 hidden w-full lg:block"
            variants={columnVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="lg:sticky lg:top-8">
              <div className="rounded-[26px] border border-black/5 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">Vase odelo</p>
                <div className="mt-4">
                  <p className="text-3xl font-semibold text-gray-900">{price.total} EUR</p>
                  <p className="mt-1 text-[12px] text-gray-500">Tkanina {fabricPrice} EUR - PDV ukljucen</p>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={savingCart}
                    className="w-full rounded-full bg-[#ff7a00] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e86d00] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Sacuvaj dizajn
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = measurementUrl;
                    }}
                    className="w-full rounded-full border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
                  >
                    Nastavi na merenje
                  </button>
                </div>
                <p className="mt-4 text-[11px] text-gray-500">Izrada traje oko 3 nedelje. Dostava je besplatna.</p>
              </div>
            </div>
          </motion.aside>
        </div>
        <motion.div variants={controlsVariants} initial="hidden" animate="visible">
          <MobileControls
            config={config}
            dispatch={dispatch}
            activePanel={activeMobilePanel}
            onPanelChange={setActiveMobilePanel}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
