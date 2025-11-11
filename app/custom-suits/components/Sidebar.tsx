"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Image from "next/image";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { computePrice } from "../utils/price";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getBackendBase } from "../utils/backend";
import { useFabrics } from "../hooks/useFabrics";

type Props = { config: SuitState; dispatch: React.Dispatch<any> };

const tabs = ["FABRIC", "STYLE", "ACCENTS", "MEASURE"] as const;
const tabLabels: Record<(typeof tabs)[number], string> = {
  FABRIC: "Tkanine",
  STYLE: "Stil",
  ACCENTS: "Detalji",
  MEASURE: "Mere",
};

const Sidebar: React.FC<Props> = ({ config, dispatch }) => {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("STYLE");
  const currentSuit = suits.find((s) => s.id === config.styleId);

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

  const uploadUrl = (() => {
    const base = getBackendBase();
    const root = base.replace(/\/api\/?$/i, "/");
    return root + "upload_test.html";
  })();

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

  const iconMap: Record<(typeof tabs)[number], string> = {
    FABRIC: "/custom-suits/icons/iconfabric.png",
    STYLE: "/custom-suits/icons/iconstyle.png",
    ACCENTS: "/custom-suits/icons/iconaccents.png",
    MEASURE: "/custom-suits/icons/iconstyle.png",
  };

  return (
    <div className="flex h-full flex-col md:sticky md:top-8 md:max-h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto rounded-[30px] bg-gray-50/95 px-5 py-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] ring-1 ring-black/5 md:overflow-y-auto">
        <div className="space-y-8">
          <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/70 px-4 py-4 shadow-sm">
            <img src="/img/logo.png" alt="Brand logo" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500">Dizajniraj svoje odelo</p>
              <p className="text-base font-semibold text-gray-900">Santos &amp; Santorini</p>
            </div>
          </div>

          <nav className="grid gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-[13px] transition sm:px-4 sm:py-3 ${
                    isActive
                      ? "border-gray-900 bg-white text-gray-900 shadow-inner"
                      : "border-transparent bg-white/40 text-gray-500 hover:border-gray-200 hover:bg-white/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
                      <img src={iconMap[tab]} alt={tab} className="h-6 w-6 object-contain opacity-80" />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">{tabLabels[tab]}</p>
                      <p className="text-xs font-semibold text-gray-700">Podesi</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">{isActive ? "Aktivno" : "Izaberi"}</span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-400">
              <span>Model</span>
              <span>Fabric</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-right text-2xl font-semibold text-gray-900">
              <div className="text-left">{price.total} EUR</div>
              <div>{fabricPrice} EUR</div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Indikativna cena, PDV uključen.</p>
          </div>

          {activeTab === "FABRIC" && (
            <section className="space-y-5 rounded-3xl border border-dashed border-gray-200 bg-white/80 p-5 shadow-inner shadow-black/5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-800">Biblioteka tkanina</h3>
                <a
                  href={uploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium uppercase tracking-[0.3em] text-gray-500 underline-offset-4 hover:text-gray-900"
                >
                  CMS
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-xs text-gray-600 focus:border-gray-400 focus:outline-none"
                  value={toneFilter}
                  onChange={(e) => setToneFilter(e.target.value as any)}
                >
                  <option value="all">Svi tonovi</option>
                  <option value="light">Svetli</option>
                  <option value="medium">Srednji</option>
                  <option value="dark">Tamni</option>
                </select>
                <select
                  className="rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-xs text-gray-600 focus:border-gray-400 focus:outline-none"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="date_desc">Najnovije prvo</option>
                  <option value="date_asc">Najstarije prvo</option>
                </select>
              </div>
              <input
                className="w-full rounded-2xl border border-gray-200 bg-white/60 px-4 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                placeholder="Pretraga po nazivu ili šifri"
                value={fabricQuery}
                onChange={(e) => setFabricQuery(e.target.value)}
              />
              {fabricsError && <p className="text-[11px] text-red-500">{fabricsError}</p>}
              {fabricsLoading ? (
                <p className="text-xs text-gray-500">Učitavanje tkanina...</p>
              ) : filteredFabrics.length === 0 ? (
                <p className="text-xs text-gray-500">Nema tkanina za zadate filtere.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredFabrics.map((fabric) => {
                    const isActive = config.colorId === fabric.id;
                    return (
                      <button
                        key={fabric.id}
                        onClick={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
                        className={`group overflow-hidden rounded-2xl border text-left transition ${
                          isActive ? "border-gray-900 shadow-lg" : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="relative h-24 w-full overflow-hidden">
                          <Image src={fabric.texture} alt={fabric.name} fill style={{ objectFit: "cover" }} />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <div className={`px-3 py-3 text-[11px] ${isActive ? "text-gray-900" : "text-gray-600"}`}>
                          <p className="font-semibold">{fabric.name || "Bez naziva"}</p>
                          <p className="text-[10px] text-gray-500">
                            {fabric.price ?? 0} EUR • Ton {fabric.tone || "medium"}
                          </p>
                          {(fabric.zoom1 || fabric.zoom2) && (
                            <div className="mt-1 flex gap-3 text-[10px] underline">
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
            <section className="space-y-6 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm">
              {!currentSuit ? (
                <p className="text-xs text-gray-500">Model nije pronađen.</p>
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

                  <ChipGroup
                    title="Džepovi na sakou"
                    options={(currentSuit.pockets || []).map((pocket) => ({ id: pocket.id, label: pocket.name }))}
                    selectedId={config.pocketId}
                    onSelect={(id) => dispatch({ type: "SET_POCKET", payload: id })}
                  />

                  <ChipGroup
                    title="Džep na grudima"
                    options={(currentSuit.breastPocket || []).map((option) => ({ id: option.id, label: option.name }))}
                    selectedId={config.breastPocketId}
                    onSelect={(id) => dispatch({ type: "SET_BREAST_POCKET", payload: id })}
                  />

                  <ChipGroup
                    title="Postava"
                    options={(currentSuit.interiors || []).map((option) => ({ id: option.id, label: option.name }))}
                    selectedId={config.interiorId}
                    onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
                  />

                  <ChipGroup
                    title="Završnica pantalona"
                    options={(currentSuit.cuffs || []).map((option) => ({ id: option.id, label: option.name }))}
                    selectedId={config.cuffId}
                    onSelect={(id) => dispatch({ type: "SET_CUFF", payload: id })}
                  />

                  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Prikaži sloj košulje</p>
                      <p className="text-[11px] text-gray-500">Koristi belu košulju za jasniji prikaz slojeva.</p>
                    </div>
                    <button
                      onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        config.showShirt ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600"
                      }`}
                    >
                      {config.showShirt ? "Uključeno" : "Isključeno"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === "ACCENTS" && (
            <section className="rounded-3xl border border-dashed border-gray-200 bg-white/70 p-5 text-sm text-gray-500">
              <p>Personalizacija detalja uskoro.</p>
            </section>
          )}

          {activeTab === "MEASURE" && (
            <section className="space-y-3 rounded-3xl border border-white/60 bg-white/80 p-5">
              <h3 className="text-sm font-semibold text-gray-800">Mere</h3>
              <p className="text-xs text-gray-500">Za detaljnije merenje nastavite na sledeći korak.</p>
            </section>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={() => {
              const url = new URL(window.location.origin + "/custom-suits/measure");
              window.location.href = url.toString();
            }}
            className="w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-gray-800"
          >
            Nastavi na merenje
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;








