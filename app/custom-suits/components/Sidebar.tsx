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

const Sidebar: React.FC<Props> = ({ config, dispatch }) => {
  const [activeTab, setActiveTab] = useState<"FABRIC" | "STYLE" | "ACCENTS" | "MEASURE">("STYLE");
  const currentSuit = suits.find((s) => s.id === config.styleId);

  const [toneFilter, setToneFilter] = useState<"all"|"light"|"medium"|"dark">("all");
  const [sort, setSort] = useState<"date_desc"|"date_asc">("date_desc");
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
  const fabricPrice = fabricsNormalized.find((f:any) => f.id === config.colorId)?.price ?? 0;

  const uploadUrl = (() => {
    const base = getBackendBase(); // e.g. https://customsuits.adspire.rs/api/
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
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[#444] mb-2">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selectedId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active ? "border-[#111] bg-[#111] text-white" : "border-[#d4d4d4] text-[#555] hover:border-[#111]"
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

  return (
    <div className="h-auto md:h-screen md:sticky md:top-0 overflow-y-auto flex flex-col bg-white px-4 md:px-8 py-6 md:py-8 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-80">
      {/* LOGO */}
      <div className="mb-10 flex items-center justify-start">
        <img src="/img/logo.png" alt="Brand logo" className="h-19 w-auto object-contain" />
      </div>

      {/* NAV */}
      <nav className="flex flex-col gap-6 text-xs tracking-widest mb-8">
        {["FABRIC", "STYLE", "ACCENTS", "MEASURE"].map((tab) => {
          const isActive = activeTab === tab;
          const iconMap: Record<string, string> = {
            FABRIC: "/custom-suits/icons/iconfabric.png",
            STYLE: "/custom-suits/icons/iconstyle.png",
            ACCENTS: "/custom-suits/icons/iconaccents.png",
            MEASURE: "/custom-suits/icons/iconstyle.png",
          };
          return (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex items-center gap-3 transition-transform duration-200 ${isActive ? "text-[#111] font-semibold" : "text-[#9a9a9a] hover:text-[#333]"}`}>
              <img src={iconMap[tab]} className={`w-10 h-10 transition-all duration-200 ${isActive ? "opacity-100 scale-110" : "opacity-70 hover:opacity-90"}`} alt={tab} />
              <span className={`tracking-widest text-[11px] ${isActive ? "font-semibold text-[#111]" : "text-[#666]"}`}>{tab}</span>
            </button>
          );
        })}
      </nav>

      {/* PRICE */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs tracking-wider text-[#666]">Cena (model)</span>
        <span className="text-base font-semibold text-[#111]">{price.total}</span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-wider text-[#666]">Tkanina</span>
        <span className="text-base font-semibold text-[#111]">{fabricPrice}</span>
      </div>
      <div className="h-px bg-[#e6e6e6] -mx-8 mb-8" />

      {/* FABRICS */}
      {activeTab === "FABRIC" && (
        <section className="animate-fade-in">
          <h3 className="text-sm font-semibold text-[#444] mb-2">Fabric (Color)</h3>
          <a href={uploadUrl} target="_blank" rel="noopener" className="inline-flex items-center justify-center mb-4 px-3 py-2 text-xs font-medium rounded-md border border-[#111] text-[#111] hover:bg-[#111] hover:text-white transition">CMS za tkanine</a>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3">
              <select className="border rounded p-2 text-xs" value={toneFilter} onChange={(e)=>setToneFilter(e.target.value as any)}>
                <option value="all">All tones</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="dark">Dark</option>
              </select>
              <select className="border rounded p-2 text-xs" value={sort} onChange={(e)=>setSort(e.target.value as any)}>
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
              </select>
            </div>
            <input
              className="w-full rounded border border-[#ddd] px-3 py-2 text-xs"
              placeholder="Pretrazi naziv ili sifru"
              value={fabricQuery}
              onChange={(e) => setFabricQuery(e.target.value)}
            />
          </div>
          {fabricsError && <p className="text-red-500 text-xs mb-2">{fabricsError}</p>}
          {fabricsLoading ? (
            <p className="text-gray-400 text-xs italic">Učitavanje tkanina...</p>
          ) : filteredFabrics.length === 0 ? (
            <p className="text-gray-400 text-xs italic">Nema tkanina za zadate filtere.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredFabrics.map((fabric) => (
                <button
                  key={fabric.id}
                  onClick={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
                  className={`relative border rounded-xl overflow-hidden transition-all duration-300 ${
                    config.colorId === fabric.id ? "border-[#111] shadow-sm scale-105" : "border-[#ddd] hover:border-[#111]"
                  }`}
                >
                  <div className="relative w-full h-20">
                    <Image src={fabric.texture} alt={fabric.name} fill style={{ objectFit: "cover" }} />
                  </div>
                  <div className={`text-xs py-2 ${config.colorId === fabric.id ? "text-[#111] font-medium" : "text-[#666]"}`}>
                    <div className="text-[11px] font-semibold">{fabric.name || "Bez naziva"}</div>
                    <div className="text-[10px] text-[#777]">
                      Cena: {fabric.price ?? 0} EUR - Tone: {fabric.tone || "medium"}
                    </div>
                    {(fabric.zoom1 || fabric.zoom2) && (
                      <div className="flex gap-3 mt-1">
                        {fabric.zoom1 && (
                          <a className="text-[10px] underline" href={fabric.zoom1} target="_blank">
                            Zoom 1
                          </a>
                        )}
                        {fabric.zoom2 && (
                          <a className="text-[10px] underline" href={fabric.zoom2} target="_blank">
                            Zoom 2
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ACCENTS */}
      {activeTab === "ACCENTS" && (
        <section className="animate-fade-in text-sm text-[#777] italic">
          <p>Accents customization coming soon.</p>
        </section>
      )}

      {/* STYLE */}
      {activeTab === "STYLE" && (
        <section className="animate-fade-in">
          {!currentSuit ? (
            <p className="text-xs text-[#777]">Model nije pronađen.</p>
          ) : (
            <>
              <ChipGroup
                title="Model"
                options={suits.map((suit) => ({ id: suit.id, label: suit.name }))}
                selectedId={config.styleId}
                onSelect={(id) => dispatch({ type: "SET_STYLE", payload: id })}
              />

              <ChipGroup
                title="Lapel Type"
                options={lapels.map((lapel) => ({ id: lapel.id, label: lapel.name }))}
                selectedId={selectedLapelId}
                onSelect={(id) => dispatch({ type: "SET_LAPEL", payload: id })}
              />

              {activeLapel?.widths?.length ? (
                <ChipGroup
                  title="Lapel Width"
                  options={activeLapel.widths.map((width) => ({ id: width.id, label: width.name }))}
                  selectedId={selectedLapelWidthId}
                  onSelect={(id) => dispatch({ type: "SET_LAPEL_WIDTH", payload: id })}
                />
              ) : null}

              <ChipGroup
                title="Jacket Pockets"
                options={(currentSuit.pockets || []).map((pocket) => ({ id: pocket.id, label: pocket.name }))}
                selectedId={config.pocketId}
                onSelect={(id) => dispatch({ type: "SET_POCKET", payload: id })}
              />

              <ChipGroup
                title="Breast Pocket"
                options={(currentSuit.breastPocket || []).map((option) => ({ id: option.id, label: option.name }))}
                selectedId={config.breastPocketId}
                onSelect={(id) => dispatch({ type: "SET_BREAST_POCKET", payload: id })}
              />

              <ChipGroup
                title="Interior"
                options={(currentSuit.interiors || []).map((option) => ({ id: option.id, label: option.name }))}
                selectedId={config.interiorId}
                onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
              />

              <ChipGroup
                title="Pant Finish"
                options={(currentSuit.cuffs || []).map((option) => ({ id: option.id, label: option.name }))}
                selectedId={config.cuffId}
                onSelect={(id) => dispatch({ type: "SET_CUFF", payload: id })}
              />

              <div className="flex items-center justify-between rounded-lg border border-dashed border-[#d9d9d9] px-3 py-2 mt-4">
                <div>
                  <p className="text-xs font-semibold text-[#444]">Show shirt layer</p>
                  <p className="text-[11px] text-[#777]">Koristi bele košulje za preview.</p>
                </div>
                <button
                  onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    config.showShirt ? "bg-[#111] text-white" : "border border-[#ccc] text-[#555]"
                  }`}
                >
                  {config.showShirt ? "On" : "Off"}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* MEASURE */}
      {activeTab === "MEASURE" && (
        <section className="animate-fade-in">
          <h3 className="text-sm font-semibold text-[#444] mb-4">Measurements</h3>
          <div className="text-xs text-[#666]">Za detaljnije merenje nastavite na sledeći korak.</div>
        </section>
      )}

      <div className="mt-6">
        <button onClick={() => { const url = new URL(window.location.origin + "/custom-suits/measure"); window.location.href = url.toString(); }} className="w-full px-4 py-3 bg-[#111] text-white rounded">Nastavi na merenje</button>
      </div>
    </div>
  );
};

export default Sidebar;


