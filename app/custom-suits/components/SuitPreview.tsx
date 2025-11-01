"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// ðŸ”¹ Ispravan putanja ka transparent slojevima
const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop() || "";
  const webpName = filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `https://customsuits.adspire.rs/uploads/transparent/${webpName}`;
};

// Tuned per-tone blending presets
const toneBlend = (tone: string) => {
  switch (tone) {
    case "light":
      return { opacity: 0.9, blendMode: "multiply" as const, filter: "brightness(1.15) saturate(1.2)" };
    case "dark":
      return { opacity: 0.95, blendMode: "soft-light" as const, filter: "brightness(1.0) contrast(1.12)" };
    default:
      return { opacity: 0.92, blendMode: "overlay" as const, filter: "brightness(1.08) contrast(1.06)" };
  }
};

type Props = {
  config: SuitState;
};

const SuitPreview: React.FC<Props> = ({ config }) => {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // ðŸ”¹ Poziva backend sa PUNIM URL-om
  useEffect(() => {
    fetch("https://customsuits.adspire.rs/api/fabrics.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFabrics(data.data);
      })
      .catch((err) => console.error("GreÅ¡ka pri uÄitavanju tkanina:", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedFabric = fabrics.find((f) => f.id === config.colorId);
 const fabricTexture = selectedFabric?.texture || "";

  const tone = selectedFabric?.tone || "medium";

  // ðŸ”¹ DinamiÄan filter i reÅ¾im blend-a prema tonu tkanine
  const { opacity: blendOpacity, blendMode, filter: fabricFilter } = toneBlend(tone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        UÄitavanje tkanina...
      </div>
    );
  }

  if (!selectedFabric) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Izaberi tkaninu da se prikaÅ¾e odelo.
      </div>
    );
  }

  // ðŸ”¹ Slojevi definisani za trenutni stil odela
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const torsoLayers = baseLayers.filter((l) => l.id !== "pants");
  const pantsLayer = baseLayers.find((l) => l.id === "pants");

  // ðŸ”¹ Izbor slike revera na osnovu selektovanog tipa i Å¡irine revera
  const lapelSrc =
    config.lapelId &&
    config.lapelWidthId &&
    currentSuit.lapels
      ?.find((l) => l.id === config.lapelId)
      ?.widths.find((w) => w.id === config.lapelWidthId)?.src;

  // ðŸ”¹ Izbor slike dÅ¾epova na osnovu selektovanog stila dÅ¾epova
  const pocketSrc =
    config.pocketId &&
    currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;

  // ðŸ”¹ Izbor slike za grudni dÅ¾ep (samo ako opcija ukljuÄuje dÅ¾ep)
  // ðŸ”¹ UnutraÅ¡njost (uzima sve slojeve i renderuje ih redom)
// Auto-activate default interior if none selected
const defaultInterior = currentSuit.interiors?.[0];
const activeInteriorId = config.interiorId ?? defaultInterior?.id;
const interiorLayers = activeInteriorId && currentSuit.interiors?.find((i) => i.id === activeInteriorId)?.layers;

// ðŸ”¹ Grudni dÅ¾ep (uzima sve slojeve)
const breastPocketLayers =
  config.breastPocketId &&
  currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)?.layers;

  // ðŸ”¹ Izbor slike manÅ¾etni na pantalonama ako su odabrane
  const cuffSrc =
    config.cuffId &&
    currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;

  // ðŸ”¹ Generisanje stila za overlay teksture tkanine (maskiranje oblikom sloja)
  const fabricStyle = (
    src: string,
    adjust?: { brightness?: number; opacityMult?: number; blendMode?: React.CSSProperties['mixBlendMode'] }
  ): React.CSSProperties => {
    let style: React.CSSProperties = {
      backgroundImage: `url(${fabricTexture})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: blendOpacity,
      mixBlendMode: blendMode,
      filter: fabricFilter,
      WebkitMaskImage: `url(${replaceColorInSrc(src)})`,
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      WebkitMaskPosition: "center",
      maskImage: `url(${replaceColorInSrc(src)})`,
      maskRepeat: "no-repeat",
      maskSize: "contain",
      maskPosition: "center",
      pointerEvents: "none",
    };
    if (adjust?.brightness) {
      style.filter = `${style.filter} brightness(${adjust.brightness})`;
    }
    if (adjust?.opacityMult) {
      const op = typeof style.opacity === 'number' ? style.opacity : Number(style.opacity) || 1;
      style.opacity = Math.max(0, Math.min(1, op * adjust.opacityMult));
    }
    if (adjust?.blendMode) {
      style.mixBlendMode = adjust.blendMode;
    }
    return style;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-white">
      {/* === GORNJI DEO (SAKO + SLOJEVI) === */}
      <div className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]">
        {/* ==== UNUTRAÅ NJOST SAKOA (bez tkanine) ==== */}
{interiorLayers &&
  interiorLayers.map((layer) => (
    <div key={layer.id} className="absolute inset-0">
      <Image
        src={replaceColorInSrc(layer.src)}
        alt={layer.name}
        fill
        sizes="(max-width: 768px) 100vw, 520px"
        priority
        style={{
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </div>
  ))}



        {/* Osnovni slojevi sakoa (torzo, rukavi itd.) */}
        {torsoLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image
              src={replaceColorInSrc(layer.src)}
              alt={layer.id}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(layer.src)} />
          </div>
        ))}

        {/* DÅ¾epovi na saku (npr. flapped ili patch pockets) */}
        {pocketSrc && (
          <div className="absolute inset-0 z-10">
            <Image
              src={replaceColorInSrc(pocketSrc)}
              alt="pockets"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(pocketSrc)} />
          </div>
        )}

        {/* Grudni dÅ¾ep (breast pocket) */}
       {breastPocketLayers &&
  breastPocketLayers.map((layer) => (
    <div key={layer.id} className="absolute inset-0 z-20">
      <Image
        src={replaceColorInSrc(layer.src)}
        alt={layer.name}
        fill
        sizes="(max-width: 768px) 100vw, 520px"
        priority
        style={{ objectFit: "contain", pointerEvents: "none" }}
      />
      <div className="absolute inset-0" style={fabricStyle(layer.src)} />
    </div>
  ))}


        {/* Rever (Lapel) */}
        {lapelSrc && (
          <div className="absolute inset-0 z-0">
            <Image
              src={replaceColorInSrc(lapelSrc)}
              alt="lapel"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            {/* Lapel fabric overlay (no extra brightness at runtime) */}
            <div
              className="absolute inset-0"
              style={fabricStyle(lapelSrc)}
            />
          </div>
        )}
      </div>

      {/* === DONJI DEO (PANTALONE) === */}
      {pantsLayer && (
        <div className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]">
          {/* Osnovni sloj pantalona */}
          <div className="absolute inset-0">
            <Image
              src={replaceColorInSrc(pantsLayer.src)}
              alt="pants"
              fill
              sizes="(max-width: 768px) 100vw, 760px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
          </div>
          {/* ManÅ¾etne na pantalonama (ako su odabrane) */}
          {cuffSrc && (
            <div className="absolute inset-0">
              <Image
                src={replaceColorInSrc(cuffSrc)}
                alt="cuffs"
                fill
                sizes="(max-width: 768px) 100vw, 760px"
                priority
                style={{ objectFit: "contain", pointerEvents: "none" }}
              />
              <div className="absolute inset-0" style={fabricStyle(cuffSrc)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;




