"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { computePrice } from "../utils/price";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getBackendBase } from "../utils/backend";
import { useFabrics } from "../hooks/useFabrics";

type Props = { config: SuitState; dispatch: React.Dispatch<any> };

const tabs = ["FABRIC", "STYLE", "ACCENTS"] as const;
const tabLabels: Record<(typeof tabs)[number], string> = {
  FABRIC: "Tkanine",
  STYLE: "Stil",
  ACCENTS: "Detalji",
};

const sidebarVariants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75 },
  },
  exit: {
    opacity: 0,
    x: -32,
    transition: { duration: 0.35 },
  },
};

const Sidebar: React.FC<Props> = ({ config, dispatch }) => {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("FABRIC");
  const currentSuit = suits.find((s) => s.id === config.styleId);
  const [savingCart, setSavingCart] = useState(false);

  const [toneFilter, setToneFilter] = useState<"all" | "light" | "medium" | "dark">("all");
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");
  const [fabricQuery, setFabricQuery] = useState("");
  const { fabrics, loading: fabricsLoading, error: fabricsError } = useFabrics({
    tone: toneFilter === "all" ? undefined : toneFilter,
    sort: "created_at",
    order: sort === "date_desc" ? "desc" : "asc",
  });

  const price = computePrice(config, suits);
  const fabricsNormalized = fabrics.length
    ? fabrics.map((x: any) => ({ ...x, id: String(x.id) }))
    : fallbackFabrics.map((fabric) => ({
        ...fabric,
        id: String(fabric.id),
        price: (fabric as any).price ?? 0,
        tone: (fabric as any).tone ?? "medium",
      }));
  const normalizedQuery = fabricQuery.trim().toLowerCase();
  const filteredFabrics = normalizedQuery
    ? fabricsNormalized.filter((fabric: any) => {
        const name = String(fabric.name || "").toLowerCase();
        const code = String(fabric.code || "").toLowerCase();
        return name.includes(normalizedQuery) || code.includes(normalizedQuery);
      })
    : fabricsNormalized;
  const fabricPrice = fabricsNormalized.find((f: any) => f.id === config.colorId)?.price ?? 0;

  const uploadUrl = "/admin/fabrics";

  const ChipGroup = ({
    title,
    options,
    selectedId,
    onSelect,
  }: {
    title: string;
    options: { id: string; label: string }[];
    selectedId?: string;
    onSelect: (id: string) => void;
  }) => {
    if (!options.length) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selectedId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-wide transition sm:px-3.5 sm:text-[11px] ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-transparent bg-white/60 text-gray-600 hover:border-gray-300 hover:bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const lapels = currentSuit?.lapels ?? [];
  const selectedLapelId = config.lapelId || lapels[0]?.id;
  const activeLapel = lapels.find((lapel) => lapel.id === selectedLapelId) || lapels[0];
  const selectedLapelWidthId = config.lapelWidthId || activeLapel?.widths[0]?.id;
  const measurementUrl = useMemo(() => {
    const json = JSON.stringify(config);
    const url = new URL(typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.pathname = "/custom-suits/measure";
    url.searchParams.set("config", json);
    return url.toString();
  }, [config]);

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

      // Send to Supabase orders via API route
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

  const iconMap: Record<(typeof tabs)[number], string> = {
    FABRIC: "/custom-suits/icons/iconfabric.png",
    STYLE: "/custom-suits/icons/iconstyle.png",
    ACCENTS: "/custom-suits/icons/iconaccents.png",
  };

  return (
    <motion.div
      className="flex h-full flex-col lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)]"
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex-1 rounded-[22px] border border-gray-100 bg-white/90 px-4 py-4 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:px-4 sm:py-5 lg:overflow-y-auto">
        <div className="space-y-4 sm:space-y-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3 shadow-sm transition hover:border-gray-300 hover:bg-white"
            aria-label="Na pocetnu stranicu"
          >
            <img src="/img/logo.png" alt="Brand logo" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Custom suits</p>
              <p className="text-sm font-semibold text-gray-900">Santos &amp; Santorini</p>
            </div>
          </Link>

          <div className="rounded-2xl border border-gray-100 bg-white/95 p-3.5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Cena dizajna</p>
            <div className="mt-2 flex items-center justify-between text-lg font-semibold text-gray-900">
              <span>Model</span>
              <span>{price.total} EUR</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-gray-600">
              <span>Tkanina</span>
              <span>{fabricPrice} EUR</span>
            </div>
          </div>

          <nav className="flex snap-x gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:pb-0 lg:grid-cols-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex min-w-[180px] flex-shrink-0 snap-center items-center gap-3 rounded-xl border px-3 py-2 text-sm transition sm:min-w-0 sm:px-3.5 sm:py-2.5 ${
                    isActive ? "border-gray-900 bg-gray-900 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                      <img src={iconMap[tab]} alt={tab} className="h-5 w-5 object-contain opacity-80" />
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em]">{tabLabels[tab]}</p>
                      {isActive ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="text-[11px] text-gray-500">Otvori</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {activeTab === "FABRIC" && (
            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">Tkanine</h3>
                <a
                  href={uploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:text-gray-900"
                >
                  CMS
                </a>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
                  value={toneFilter}
                  onChange={(e) => setToneFilter(e.target.value as any)}
                >
                  <option value="all">Svi tonovi</option>
                  <option value="light">Svetli</option>
                  <option value="medium">Srednji</option>
                  <option value="dark">Tamni</option>
                </select>
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="date_desc">Najnovije</option>
                  <option value="date_asc">Najstarije</option>
                </select>
              </div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                placeholder="Pretraga po nazivu ili sifri"
                value={fabricQuery}
                onChange={(e) => setFabricQuery(e.target.value)}
              />
              {fabricsError && <p className="text-[11px] text-red-500">{fabricsError}</p>}
              {fabricsLoading ? (
                <p className="text-xs text-gray-500">Ucitavanje tkanina...</p>
              ) : filteredFabrics.length === 0 ? (
                <p className="text-xs text-gray-500">Nema tkanina za filter.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filteredFabrics.map((fabric) => {
                    const isActive = config.colorId === fabric.id;
                    return (
                      <button
                        key={fabric.id}
                        onClick={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
                        className={`group overflow-hidden rounded-xl border text-left transition ${
                          isActive ? "border-gray-900 shadow-md" : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="relative h-20 w-full overflow-hidden">
                          <Image src={fabric.texture} alt={fabric.name} fill style={{ objectFit: "cover" }} />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <div className={`px-2.5 py-2.5 text-[11px] ${isActive ? "text-gray-900" : "text-gray-600"}`}>
                          <p className="font-semibold leading-tight">{fabric.name || "Bez naziva"}</p>
                          <p className="text-[10px] text-gray-500">
                            {fabric.price ?? 0} EUR · ton {fabric.tone || "medium"}
                          </p>
                          {(fabric.zoom1 || fabric.zoom2) && (
                            <div className="mt-1 flex gap-2 text-[10px] underline">
                              {fabric.zoom1 && (
                                <a href={fabric.zoom1} target="_blank" rel="noreferrer">
                                  Zoom 1
                                </a>
                              )}
                              {fabric.zoom2 && (
                                <a href={fabric.zoom2} target="_blank" rel="noreferrer">
                                  Zoom 2
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "STYLE" && (
            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-sm">
              {!currentSuit ? (
                <p className="text-xs text-gray-500">Model nije pronaen.</p>
              ) : (
                <>
                  <ChipGroup
                    title="Model odela"
                    options={suits.map((suit) => ({ id: suit.id, label: suit.name }))}
                    selectedId={config.styleId}
                    onSelect={(id) => dispatch({ type: "SET_STYLE", payload: id })}
                  />

                  <ChipGroup
                    title="Tip revera"
                    options={lapels.map((lapel) => ({ id: lapel.id, label: lapel.name }))}
                    selectedId={selectedLapelId}
                    onSelect={(id) => dispatch({ type: "SET_LAPEL", payload: id })}
                  />

                  {activeLapel?.widths?.length ? (
                    <ChipGroup
                    title="Širina revera"
                      options={activeLapel.widths.map((width) => ({ id: width.id, label: width.name }))}
                      selectedId={selectedLapelWidthId}
                      onSelect={(id) => dispatch({ type: "SET_LAPEL_WIDTH", payload: id })}
                    />
                  ) : null}
                </>
              )}
            </section>
          )}

          {activeTab === "ACCENTS" && (
            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white/90 p-4 text-sm text-gray-600 shadow-sm">
              <ChipGroup
                title="Depovi na sakou"
                options={(currentSuit?.pockets || []).map((pocket) => ({ id: pocket.id, label: pocket.name }))}
                selectedId={config.pocketId}
                onSelect={(id) => dispatch({ type: "SET_POCKET", payload: id })}
              />

              <ChipGroup
                title="Dep na grudima"
                options={(currentSuit?.breastPocket || []).map((option) => ({ id: option.id, label: option.name }))}
                selectedId={config.breastPocketId}
                onSelect={(id) => dispatch({ type: "SET_BREAST_POCKET", payload: id })}
              />

              <ChipGroup
                title="Postava"
                options={(currentSuit?.interiors || []).map((option) => ({ id: option.id, label: option.name }))}
                selectedId={config.interiorId}
                onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
              />

              {currentSuit?.cuffs?.length ? (
                <ChipGroup
                  title="Zavrnica pantalona"
                  options={(currentSuit.cuffs || []).map((option) => ({ id: option.id, label: option.name }))}
                  selectedId={config.cuffId}
                  onSelect={(id) => dispatch({ type: "SET_CUFF", payload: id })}
                />
              ) : null}

              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3.5 py-3">
                <p className="text-sm font-semibold text-gray-800">Prikazi sloj kosulje</p>
                <button
                  onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    config.showShirt ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600"
                  }`}
                >
                  {config.showShirt ? "Ukljuceno" : "Iskljuceno"}
                </button>
              </div>
            </section>
          )}

        </div>

        <div className="mt-6">
          <div className="space-y-2.5">
            <button
              onClick={handleAddToCart}
              disabled={savingCart}
              className="w-full rounded-xl bg-[#ff7a00] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e86d00] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Sacuvaj dizajn
            </button>
            <button
              onClick={() => {
                window.location.href = measurementUrl;
              }}
              className="w-full rounded-xl border border-gray-900 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
            >
              Nastavi na merenje
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
















