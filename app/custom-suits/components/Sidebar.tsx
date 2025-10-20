"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { suits } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

type Props = {
  config: SuitState;
  dispatch: React.Dispatch<any>;
};

const Sidebar: React.FC<Props> = ({ config, dispatch }) => {
  const [activeTab, setActiveTab] = useState<"FABRIC" | "STYLE" | "ACCENTS">("STYLE");
  const [fabrics, setFabrics] = useState<any[]>([]);
  const currentSuit = suits.find((s) => s.id === config.styleId);
  const [isOpen, setIsOpen] = useState(false);

  // 🔹 Dinamičko učitavanje tkanina iz PHP API-ja
  useEffect(() => {
    fetch("http://localhost/custom-suits-backend/api/fabrics.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFabrics(data.data);
        else console.error("Greška u API odgovoru:", data);
      })
      .catch((err) => console.error("Greška pri učitavanju tkanina:", err));
  }, []);

  return (
    <div className="h-auto md:h-screen md:sticky md:top-0 overflow-y-auto flex flex-col bg-white px-4 md:px-8 py-6 md:py-8 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-80">

      {/* ===== LOGO ===== */}
      <div className="mb-10 flex items-center justify-start">
        <img src="/img/logo.png" alt="Brand logo" className="h-19 w-auto object-contain" />
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className="flex flex-col gap-6 text-xs tracking-widest mb-8">
        {["FABRIC", "STYLE", "ACCENTS"].map((tab) => {
          const isActive = activeTab === tab;
          const iconMap: Record<string, string> = {
            FABRIC: "/custom-suits/icons/iconfabric.png",
            STYLE: "/custom-suits/icons/iconstyle.png",
            ACCENTS: "/custom-suits/icons/iconaccents.png",
          };

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-3 transition-transform duration-200 ${
                isActive ? "text-[#111] font-semibold" : "text-[#9a9a9a] hover:text-[#333]"
              }`}
            >
              <img
                src={iconMap[tab]}
                className={`w-10 h-10 transition-all duration-200 ${
                  isActive ? "opacity-100 scale-110" : "opacity-70 hover:opacity-90"
                }`}
                alt={tab}
              />
              <span
                className={`tracking-widest text-[11px] ${
                  isActive ? "font-semibold text-[#111]" : "text-[#666]"
                }`}
              >
                {tab}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-[#e6e6e6] -mx-8 mb-8" />

      {/* ===== FABRIC TAB ===== */}
      {activeTab === "FABRIC" && (
        <section className="animate-fade-in">
          <h3 className="text-sm font-semibold text-[#444] mb-4">Fabric (Color)</h3>

          {fabrics.length === 0 ? (
            <p className="text-gray-400 text-xs italic">Učitavanje tkanina...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {fabrics.map((fabric) => (
                <button
                  key={fabric.id}
                  onClick={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
                  className={`relative border rounded-xl overflow-hidden transition-all duration-300 ${
                    config.colorId === fabric.id
                      ? "border-[#111] shadow-sm scale-105"
                      : "border-[#ddd] hover:border-[#111]"
                  }`}
                >
                  {/* Prikaz teksture tkanine preko Next Image sa eksternog URL */}
                  <div className="relative w-full h-20">
                    <Image
                      src={`http://localhost${fabric.texture}`}
                      alt={fabric.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div
                    className={`text-xs py-2 ${
                      config.colorId === fabric.id
                        ? "text-[#111] font-medium"
                        : "text-[#666]"
                    }`}
                  >
                    {fabric.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== STYLE TAB ===== */}
      {activeTab === "STYLE" && (
        <section className="animate-fade-in space-y-8">
          {/* Stil odela */}
          <div>
            <h3 className="text-sm font-semibold text-[#444] mb-4">Style</h3>
            <div className="grid grid-cols-3 gap-4">
              {suits.map((s) => (
                <button
                  key={s.id}
                  onClick={() => dispatch({ type: "SET_STYLE", payload: s.id })}
                  className={`flex flex-col items-center justify-center border rounded-xl px-3 py-5 transition-all duration-200
                    ${
                      config.styleId === s.id
                        ? "border-[#111] bg-[#fafafa] shadow-sm scale-105"
                        : "border-[#ddd] hover:border-[#111] hover:scale-105"
                    }`}
                >
                  <img
                    src={s.icon}
                    alt={s.name}
                    className="w-14 h-20 object-contain mb-2"
                  />
                  <span
                    className={`text-[12px] text-center leading-tight ${
                      config.styleId === s.id
                        ? "text-[#111] font-semibold"
                        : "text-[#666]"
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rever (Lapel Type) */}
          {currentSuit && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Lapel Type</h3>
              <div className="flex gap-3 flex-wrap">
                {currentSuit.lapels.map((lapel) => (
                  <button
                    key={lapel.id}
                    onClick={() => {
                      const defaultWidth = lapel.widths?.[1]?.id || lapel.widths?.[0]?.id;
                      dispatch({ type: "SET_LAPEL", payload: lapel.id });
                      if (defaultWidth) {
                        dispatch({ type: "SET_LAPEL_WIDTH", payload: defaultWidth });
                      }
                    }}
                    className={`px-4 py-2 text-xs rounded-md border transition
                      ${
                        config.lapelId === lapel.id
                          ? "border-[#111] bg-[#fafafa] font-semibold"
                          : "border-[#ddd] hover:border-[#111]"
                      }`}
                  >
                    {lapel.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Širina revera (Lapel Width) */}
          {currentSuit && config.lapelId && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Lapel Width</h3>
              <div className="flex gap-3 flex-wrap">
                {currentSuit.lapels
                  .find((l) => l.id === config.lapelId)
                  ?.widths.map((width) => (
                    <button
                      key={width.id}
                      onClick={() =>
                        dispatch({ type: "SET_LAPEL_WIDTH", payload: width.id })
                      }
                      className={`px-4 py-2 text-xs rounded-md border transition
                        ${
                          config.lapelWidthId === width.id
                            ? "border-[#111] bg-[#fafafa] font-semibold"
                            : "border-[#ddd] hover:border-[#111]"
                        }`}
                    >
                      {width.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Džepovi (Pocket Style) */}
          {currentSuit && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Pocket Style</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.pockets?.map((pocket) => (
                  <button
                    key={pocket.id}
                    onClick={() =>
                      dispatch({ type: "SET_POCKET", payload: pocket.id })
                    }
                    className={`border rounded-md py-3 text-xs transition
                      ${
                        config.pocketId === pocket.id
                          ? "border-[#111] bg-[#fafafa] font-semibold"
                          : "border-[#ddd] hover:border-[#111]"
                      }`}
                  >
                    {pocket.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unutrašnjost sakoa (Jacket Interior) */}
          {currentSuit?.interiors && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Jacket Interior</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.interiors.map((interior) => (
                  <button
                    key={interior.id}
                    onClick={() =>
                      dispatch({ type: "SET_INTERIOR", payload: interior.id })
                    }
                    className={`border rounded-md py-3 text-xs transition
                      ${
                        config.interiorId === interior.id
                          ? "border-[#111] bg-[#fafafa] font-semibold"
                          : "border-[#ddd] hover:border-[#111]"
                      }`}
                  >
                    {interior.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grudni džep (Breast Pocket) */}
          {currentSuit?.breastPocket && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Breast Pocket</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.breastPocket.map((bp) => (
                  <button
                    key={bp.id}
                    onClick={() =>
                      dispatch({ type: "SET_BREAST_POCKET", payload: bp.id })
                    }
                    className={`border rounded-md py-3 text-xs transition
                      ${
                        config.breastPocketId === bp.id
                          ? "border-[#111] bg-[#fafafa] font-semibold"
                          : "border-[#ddd] hover:border-[#111]"
                      }`}
                  >
                    {bp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manžetne na pantalonama (Pants Cuffs) */}
          {currentSuit?.cuffs && (
            <div>
              <h3 className="text-sm font-semibold text-[#444] mb-4">Pants Cuffs</h3>
              <div className="grid grid-cols-2 gap-3">
                {currentSuit.cuffs.map((cuff) => (
                  <button
                    key={cuff.id}
                    onClick={() => dispatch({ type: "SET_CUFF", payload: cuff.id })}
                    className={`border rounded-md py-3 text-xs transition
                      ${
                        config.cuffId === cuff.id
                          ? "border-[#111] bg-[#fafafa] font-semibold"
                          : "border-[#ddd] hover:border-[#111]"
                      }`}
                  >
                    {cuff.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===== ACCENTS TAB ===== */}
      {activeTab === "ACCENTS" && (
        <section className="animate-fade-in text-sm text-[#777] italic">
          <p>Accents customization coming soon…</p>
        </section>
      )}
    </div>
  );
};

export default Sidebar;
