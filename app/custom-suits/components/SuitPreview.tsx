"use client";
import Image from "next/image";
import React from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// 🔹 helper koji menja folder boje u putanji (npr. /blue/ → /black/)
const replaceColorInSrc = (src: string, colorId: string) => {
  return src.replace("/blue/", `/${colorId || "blue"}/`);
};

type Props = {
  config: SuitState;
};

const SuitPreview: React.FC<Props> = ({ config }) => {
  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  const color = config.colorId || "blue";

  // === 🔹 Bazni slojevi modela ===
  const baseLayers: SuitLayer[] = currentSuit.layers || [];

  // === 🔹 Rever (lapel) ===
  const lapelSrc =
    config.lapelId &&
    config.lapelWidthId &&
    currentSuit.lapels
      ?.find((l) => l.id === config.lapelId)
      ?.widths.find((w) => w.id === config.lapelWidthId)?.src;

  // === 🔹 Džep (pocket) ===
  const pocketSrc =
    config.pocketId &&
    currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;

  // === 🔹 Unutrašnjost (interior) ===
  const interiorLayers: SuitLayer[] | undefined =
    config.interiorId
      ? currentSuit.interiors?.find((i) => i.id === config.interiorId)?.layers
      : undefined;

  // === 🔹 Grudni džep (breast pocket) ===
  const breastPocketLayers: SuitLayer[] | undefined =
    config.breastPocketId
      ? currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)
          ?.layers
      : undefined;

  // === 🔹 Cuff sloj (porub pantalona) ===
  const cuffSrc =
    config.cuffId &&
    currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;

  // === 🔹 Odvajamo pantalone od sakoa ===
  const torsoLayers = baseLayers.filter((l) => l.id !== "pants");
  const pantsLayer = baseLayers.find((l) => l.id === "pants");

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-white">
      {/* === GORNJI DEO (SAKO + OVERLAY SLOJEVI) === */}
      <div className="relative w-[420px] aspect-[2/3] mb-[-60px]">
        {/* 1️⃣ Interior slojevi */}
        {interiorLayers?.map((layer: SuitLayer) => (
          <Image
            key={`interior-${layer.id}`}
            src={replaceColorInSrc(layer.src, color)}
            alt={layer.id}
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
              mixBlendMode: "normal",
            }}
          />
        ))}

        {/* 2️⃣ Osnovni slojevi sakoa */}
        {torsoLayers.map((layer: SuitLayer) => (
          <Image
            key={layer.id}
            src={replaceColorInSrc(layer.src, color)}
            alt={layer.id}
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
              mixBlendMode: "normal",
            }}
          />
        ))}

        {/* 3️⃣ Rever */}
        {lapelSrc && (
          <Image
            src={replaceColorInSrc(lapelSrc, color)}
            alt="lapel"
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
              mixBlendMode: "normal",
            }}
          />
        )}

        {/* 4️⃣ Džep */}
        {pocketSrc && (
          <Image
            src={replaceColorInSrc(pocketSrc, color)}
            alt="pockets"
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
              mixBlendMode: "normal",
            }}
          />
        )}

        {/* 5️⃣ Grudni džep */}
        {breastPocketLayers?.map((layer: SuitLayer) => (
          <Image
            key={`breast-${layer.id}`}
            src={replaceColorInSrc(layer.src, color)}
            alt={layer.id}
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
              mixBlendMode: "normal",
            }}
          />
        ))}
      </div>

      {/* === DONJI DEO (PANTALONE) === */}
      {pantsLayer && (
        <div className="relative w-[660px] aspect-[3/1] mt-[-40px]">
          {/* Osnovne pantalone */}
          <Image
            src={replaceColorInSrc(pantsLayer.src, color)}
            alt="pants"
            fill
            priority
            style={{
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />

          {/* Porub (Cuff sloj) */}
          {cuffSrc && (
            <Image
              src={replaceColorInSrc(cuffSrc, color)}
              alt="pants-cuff"
              fill
              priority
              style={{
                objectFit: "contain",
                pointerEvents: "none",
                mixBlendMode: "normal",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;
