"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// 🔹 Ispravan putanja ka transparent slojevima
const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop();
  return `https://customsuits.adspire.rs/uploads/transparent/${filename}`;
};

type Props = {
  config: SuitState;
};

const SuitPreview: React.FC<Props> = ({ config }) => {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // 🔹 Poziva backend sa PUNIM URL-om
  useEffect(() => {
    fetch("https://customsuits.adspire.rs/api/fabrics.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFabrics(data.data);
      })
      .catch((err) => console.error("Greška pri učitavanju tkanina:", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedFabric = fabrics.find((f) => f.id === config.colorId);
 const fabricTexture = selectedFabric?.texture || "";

  const tone = selectedFabric?.tone || "medium";

  // 🔹 Dinamičan filter i režim blend-a prema tonu tkanine
  const fabricFilter =
    tone === "light"
      ? "brightness(1.25) saturate(1.3)"
      : tone === "dark"
      ? "brightness(1) contrast(1.1)"
      : "brightness(1.1) contrast(1.05)";
  const blendMode = tone === "dark" ? "soft-light" : "overlay";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Učitavanje tkanina...
      </div>
    );
  }

  if (!selectedFabric) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Izaberi tkaninu da se prikaže odelo.
      </div>
    );
  }

  // 🔹 Slojevi definisani za trenutni stil odela
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const torsoLayers = baseLayers.filter((l) => l.id !== "pants");
  const pantsLayer = baseLayers.find((l) => l.id === "pants");

  // 🔹 Izbor slike revera na osnovu selektovanog tipa i širine revera
  const lapelSrc =
    config.lapelId &&
    config.lapelWidthId &&
    currentSuit.lapels
      ?.find((l) => l.id === config.lapelId)
      ?.widths.find((w) => w.id === config.lapelWidthId)?.src;

  // 🔹 Izbor slike džepova na osnovu selektovanog stila džepova
  const pocketSrc =
    config.pocketId &&
    currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;

  // 🔹 Izbor slike za grudni džep (samo ako opcija uključuje džep)
  // 🔹 Unutrašnjost (uzima sve slojeve i renderuje ih redom)
const interiorLayers =
  config.interiorId &&
  currentSuit.interiors?.find((i) => i.id === config.interiorId)?.layers;

// 🔹 Grudni džep (uzima sve slojeve)
const breastPocketLayers =
  config.breastPocketId &&
  currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)?.layers;

  // 🔹 Izbor slike manžetni na pantalonama ako su odabrane
  const cuffSrc =
    config.cuffId &&
    currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;

  // 🔹 Generisanje stila za overlay teksture tkanine (maskiranje oblikom sloja)
  const fabricStyle = (src: string): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.95,
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
  });

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-white">
      {/* === GORNJI DEO (SAKO + SLOJEVI) === */}
      <div className="relative w-[320px] md:w-[420px] aspect-[2/3] mb-[-40px]">
        {/* ==== UNUTRAŠNJOST SAKOA (bez tkanine) ==== */}
{interiorLayers &&
  interiorLayers.map((layer) => (
    <div key={layer.id} className="absolute inset-0">
      <Image
        src={replaceColorInSrc(layer.src)}
        alt={layer.name}
        fill
        sizes="(max-width: 768px) 100vw, 420px"
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
              sizes="(max-width: 768px) 100vw, 420px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(layer.src)} />
          </div>
        ))}

        {/* Džepovi na saku (npr. flapped ili patch pockets) */}
        {pocketSrc && (
          <div className="absolute inset-0">
            <Image
              src={replaceColorInSrc(pocketSrc)}
              alt="pockets"
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(pocketSrc)} />
          </div>
        )}

        {/* Grudni džep (breast pocket) */}
       {breastPocketLayers &&
  breastPocketLayers.map((layer) => (
    <div key={layer.id} className="absolute inset-0">
      <Image
        src={replaceColorInSrc(layer.src)}
        alt={layer.name}
        fill
        sizes="(max-width: 768px) 100vw, 420px"
        priority
        style={{ objectFit: "contain", pointerEvents: "none" }}
      />
      <div className="absolute inset-0" style={fabricStyle(layer.src)} />
    </div>
  ))}


        {/* Rever (Lapel) */}
        {lapelSrc && (
          <div className="absolute inset-0">
            <Image
              src={replaceColorInSrc(lapelSrc)}
              alt="lapel"
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(lapelSrc)} />
          </div>
        )}
      </div>

      {/* === DONJI DEO (PANTALONE) === */}
      {pantsLayer && (
        <div className="relative w-[480px] md:w-[660px] aspect-[3/1] mt-[-20px]">
          {/* Osnovni sloj pantalona */}
          <div className="absolute inset-0">
            <Image
              src={replaceColorInSrc(pantsLayer.src)}
              alt="pants"
              fill
              sizes="(max-width: 768px) 100vw, 660px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
            <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
          </div>
          {/* Manžetne na pantalonama (ako su odabrane) */}
          {cuffSrc && (
            <div className="absolute inset-0">
              <Image
                src={replaceColorInSrc(cuffSrc)}
                alt="cuffs"
                fill
                sizes="(max-width: 768px) 100vw, 660px"
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
