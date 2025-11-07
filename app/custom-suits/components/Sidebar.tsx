"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { suits } from "../data/options";
import { computePrice } from "../utils/price";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getBackendBase } from "../utils/backend";

type Props = { config: SuitState; dispatch: React.Dispatch<any> };

const Sidebar: React.FC<Props> = ({ config, dispatch }) => {
  const [activeTab, setActiveTab] = useState<"FABRIC" | "STYLE" | "ACCENTS" | "MEASURE">("STYLE");
  const [fabrics, setFabrics] = useState<any[]>([]);
  const currentSuit = suits.find((s) => s.id === config.styleId);

  const [toneFilter, setToneFilter] = useState<"all"|"light"|"medium"|"dark">("all");
  const [sort, setSort] = useState<"date_desc"|"date_asc">("date_desc");

  useEffect(() => {
    const base = getBackendBase();
    const qs = new URLSearchParams();
    if (toneFilter !== "all") qs.set("tone", toneFilter);
    if (sort === "date_asc") { qs.set("sort", "created_at"); qs.set("order", "asc"); }
    else { qs.set("sort", "created_at"); qs.set("order", "desc"); }
    const url = `${base}fabrics.php` + (qs.toString()?`?${qs.toString()}`:"");
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setFabrics(j.data); })
      .catch((e) => { console.error("Fabrics load error", e); });
  }, [toneFilter, sort]);

  const price = computePrice(config, suits);
  const fabricsNormalized = fabrics.map((x:any) => ({ ...x, id: String(x.id) }));
  const fabricPrice = fabricsNormalized.find((f:any) => f.id === config.colorId)?.price ?? 0;

  const uploadUrl = (() => {
    const base = getBackendBase(); // e.g. https://customsuits.adspire.rs/api/
    const root = base.replace(/\/api\/?$/i, "/");
    return root + "upload_test.html";
  })();

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
          <div className="flex items-center gap-3 mb-4">
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
          {fabrics.length === 0 ? (
            <p className="text-gray-400 text-xs italic">Učitavanje tkanina...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {fabricsNormalized.map((fabric) => (
                <button key={fabric.id} onClick={() => dispatch({ type: "SET_COLOR", payload: fabric.id })} className={`relative border rounded-xl overflow-hidden transition-all duration-300 ${config.colorId === fabric.id ? "border-[#111] shadow-sm scale-105" : "border-[#ddd] hover:border-[#111]"}`}>
                  <div className="relative w-full h-20">
                    <Image src={fabric.texture} alt={fabric.name} fill style={{ objectFit: "cover" }} />
                  </div>
                  <div className={`text-xs py-2 ${config.colorId === fabric.id ? "text-[#111] font-medium" : "text-[#666]"}`}>
                    <div className="text-[11px]">{fabric.name}</div>
                    <div className="text-[10px] text-[#777]">Cena: {fabric.price ?? 0} • Tone: {fabric.tone || "medium"}</div>
                    {(fabric.zoom1 || fabric.zoom2) && (
                      <div className="flex gap-3 mt-1">
                        {fabric.zoom1 && (<a className="text-[10px] underline" href={fabric.zoom1} target="_blank">Zoom 1</a>)}
                        {fabric.zoom2 && (<a className="text-[10px] underline" href={fabric.zoom2} target="_blank">Zoom 2</a>)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STYLE */}
      {activeTab === "STYLE" && (
        <section className="animate-fade-in space-y-8">
          {/* Style models */}
          <div>
            <h3 className="text-sm font-semibold text-[#444] mb-4">Style</h3>
            <div className="grid grid-cols-3 gap-4">
              {suits.map((s) => (
                <button key={s.id} onClick={() => dispatch({ type: "SET_STYLE", payload: s.id })} className={`flex flex-col items-center justify-center border rounded-xl px-3 py-5 transition-all duration-200 ${config.styleId === s.id ? "border-[#111] bg-[#fafafa] shadow-sm scale-105" : "border-[#ddd] hover:border-[#111] hover:scale-105"}`}>
                  <img src={s.icon} alt={s.name} className="w-14 h-20 object-contain mb-2" />
                  <span className={`text-[12px] text-center leading-tight ${config.styleId === s.id ? "text-[#111] font-semibold" : "text-[#666]"}`}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lapel type */}
          {currentSuit && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Lapel Type</h3>
              <div className="flex gap-3 flex-wrap">
                {currentSuit.lapels.map((lapel) => (
                  <button key={lapel.id} onClick={() => { const def = lapel.widths?.[1]?.id || lapel.widths?.[0]?.id; dispatch({ type: "SET_LAPEL", payload: lapel.id }); if (def) dispatch({ type: "SET_LAPEL_WIDTH", payload: def }); }} className={`px-4 py-2 text-xs rounded-md border transition ${config.lapelId === lapel.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}>
                    {lapel.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lapel width */}
          {currentSuit && config.lapelId && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Lapel Width</h3>
              <div className="flex gap-3 flex-wrap">
                {currentSuit.lapels.find((l) => l.id === config.lapelId)?.widths.map((width) => (
                  <button
                    key={width.id}
                    onClick={() => dispatch({ type: "SET_LAPEL_WIDTH", payload: width.id })}
                    className={`px-2 py-2 text-xs rounded-md border transition flex flex-col items-center gap-1 w-28 ${config.lapelWidthId === width.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}
                  >
                    {width.src && (
                      // thumb from transparent assets
                      <img src={width.src} alt={width.name} className="h-14 w-full object-contain" />
                    )}
                    <span>{width.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pockets */}
          {currentSuit && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Pocket Style</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.pockets?.map((pocket) => (
                  <button
                    key={pocket.id}
                    onClick={() => dispatch({ type: "SET_POCKET", payload: pocket.id })}
                    className={`border rounded-md p-2 text-xs transition flex flex-col items-center gap-1 ${config.pocketId === pocket.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}
                  >
                    {pocket.src && <img src={pocket.src} alt={pocket.name} className="h-14 w-full object-contain" />}
                    <span>{pocket.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interior */}
          {currentSuit?.interiors && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Jacket Interior</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.interiors.map((interior) => (
                  <button key={interior.id} onClick={() => dispatch({ type: "SET_INTERIOR", payload: interior.id })} className={`border rounded-md py-3 text-xs transition ${config.interiorId === interior.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}>
                    {interior.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Breast pocket */}
          {currentSuit?.breastPocket && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Breast Pocket</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.breastPocket.map((bp) => (
                  <button
                    key={bp.id}
                    onClick={() => dispatch({ type: "SET_BREAST_POCKET", payload: bp.id })}
                    className={`border rounded-md p-2 text-xs transition flex flex-col items-center gap-1 ${config.breastPocketId === bp.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}
                  >
                    {bp.src && <img src={bp.src} alt={bp.name} className="h-14 w-full object-contain" />}
                    <span>{bp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pants cuffs */}
          {currentSuit?.cuffs && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Pants Cuffs</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.cuffs.map((cuff) => (
                  <button
                    key={cuff.id}
                    onClick={() => dispatch({ type: "SET_CUFF", payload: cuff.id })}
                    className={`border rounded-md p-2 text-xs transition flex flex-col items-center gap-1 ${config.cuffId === cuff.id ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}
                  >
                    {cuff.src && <img src={cuff.src} alt={cuff.name} className="h-14 w-full object-contain" />}
                    <span>{cuff.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pants pleats */}
          <div>
            <h3 className="text-sm font-semibold text-[#444] mb-4">Pants Pleats</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => dispatch({ type: "SET_PANTS_PLEAT", payload: "" as any })} className={`border rounded-md py-3 text-xs transition ${!config.pantsPleatId ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}>No Pleats</button>
              <button onClick={() => dispatch({ type: "SET_PANTS_PLEAT", payload: "double" })} className={`border rounded-md py-3 text-xs transition ${config.pantsPleatId === "double" ? "border-[#111] bg-[#fafafa] font-semibold" : "border-[#ddd] hover:border-[#111]"}`}>Double Pleats</button>
            </div>
          </div>

          {/* Shirt toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#444]">Show Shirt</span>
            <button onClick={() => dispatch({ type: "TOGGLE_SHIRT" })} className={`w-10 h-6 rounded-full transition ${config.showShirt ? "bg-[#111]" : "bg-gray-300"}`}>
              <span className={`block w-5 h-5 bg-white rounded-full transition transform ${config.showShirt ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </section>
      )}

      {/* ACCENTS */}
      {activeTab === "ACCENTS" && (
        <section className="animate-fade-in text-sm text-[#777] italic">
          <p>Accents customization coming soon.</p>
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

