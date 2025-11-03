"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

const TRANSPARENT_BASE = process.env.NEXT_PUBLIC_TRANSPARENT_BASE ?? "https://customsuits.adspire.rs/uploads/transparent";

const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop() || "";
  const webpName = filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `${TRANSPARENT_BASE}/${webpName}`;
};

// Overlay (fabric) stays bright; shading image above adds detail
const toneOverlay = (tone: string) => {
  switch (tone) {
    case "light":
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.02) saturate(1.04)" };
    case "dark":
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.06)" };
    default:
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.03) contrast(1.02)" };
  }
};

// Subtle shading strength on the grayscale silhouette
const shadeOpacity = 0.6;

type Props = { config: SuitState };

const SuitPreview: React.FC<Props> = ({ config }) => {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  useEffect(() => {
    fetch("/api/fabrics", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { if (data.success) setFabrics(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedFabric = fabrics.find((f) => f.id === config.colorId);
  const fabricTexture = selectedFabric?.texture || "";
  const tone = selectedFabric?.tone || "medium";
  const { opacity: overlayOpacity, blendMode: overlayBlend, filter: overlayFilter } = toneOverlay(tone);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Učitavanje tkanina...</div>;
  if (!selectedFabric) return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Izaberi tkaninu da se prikaže odelo.</div>;

  const baseLayers: SuitLayer[] = currentSuit.layers || [];

  const selectedLapel = currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
  const selectedLapelWidth =
    selectedLapel?.widths.find((w) => w.id === config.lapelWidthId) ||
    selectedLapel?.widths.find((w) => w.id === "medium") ||
    selectedLapel?.widths?.[0];

  const swapLapelInPath = (src: string, lapelType?: string, lapelWidth?: string) => {
    const type = lapelType ?? "notch";
    const width = lapelWidth ?? "medium";
    return src.replace(
      /lapel_(narrow|medium|wide)\+style_lapel_(notch|peak)/,
      `lapel_${width}+style_lapel_${type}`
    );
  };

  const dynamicLayers = baseLayers.map((l) =>
    l.id === "torso"
      ? { ...l, src: swapLapelInPath(l.src, selectedLapel?.id, selectedLapelWidth?.id) }
      : l
  );

  const torsoLayers = dynamicLayers.filter((l) => l.id !== "pants");
  const pantsLayer = dynamicLayers.find((l) => l.id === "pants");

  const shirtSrc = config.showShirt ? "/assets/suits/blue/shirt_to_jacket_open.png" : undefined;
  const pantsPleatSrc = config.pantsPleatId === "double" ? "/assets/suits/blue/pleats_double.png" : undefined;
  const lapelSrc = selectedLapelWidth?.src;
  const pocketSrc = config.pocketId && currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;
  const cuffSrc = config.cuffId && currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;
  const defaultInterior = currentSuit.interiors?.[0];
  const activeInteriorId = config.interiorId ?? defaultInterior?.id;
  const interiorLayers = activeInteriorId && currentSuit.interiors?.find((i) => i.id === activeInteriorId)?.layers;
  const breastPocketLayers = config.breastPocketId && currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)?.layers;

  const fabricStyle = (src: string): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: overlayOpacity,
    mixBlendMode: overlayBlend,
    filter: overlayFilter,
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

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const next = Math.min(3, Math.max(1, scale + delta * 0.0015));
    setScale(next);
  };

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, active: true };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current.active) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onMouseUp = () => { dragRef.current.active = false; };

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full h-full bg-white touch-pan-y"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUp}
      onMouseUp={onMouseUp}
      style={{ cursor: scale > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "default" }}
    >
      {/* === UPPER (JACKET) === */}
      <div
        className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
      >
        {/* Interior */}
        {interiorLayers && interiorLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image
              src={layer.src}
              alt={layer.name}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
          </div>
        ))}

        {/* Torso + sleeves + bottom: fabric overlay, then shading */}
        {torsoLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <div className="absolute inset-0" style={fabricStyle(layer.src)} />
            <Image
              src={layer.src}
              alt={layer.id}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }}
            />
          </div>
        ))}

        {shirtSrc && (
          <div className="absolute inset-0 z-10">
            <Image src={replaceColorInSrc(shirtSrc)} alt="shirt" fill sizes="(max-width: 768px) 100vw, 520px" priority style={{ objectFit: "contain", pointerEvents: "none" }} />
          </div>
        )}

        {/* Hip pockets */}
        {pocketSrc && (
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0" style={fabricStyle(pocketSrc)} />
            <Image src={pocketSrc} alt="pockets" fill sizes="(max-width: 768px) 100vw, 520px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
          </div>
        )}

        {/* Breast pocket */}
        {breastPocketLayers && breastPocketLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0 z-20">
            <div className="absolute inset-0" style={fabricStyle(layer.src)} />
            <Image src={layer.src} alt={layer.name} fill sizes="(max-width: 768px) 100vw, 520px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
          </div>
        ))}

        {/* Lapel */}
        {lapelSrc && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0" style={fabricStyle(lapelSrc)} />
            <Image src={lapelSrc} alt="lapel" fill sizes="(max-width: 768px) 100vw, 520px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
          </div>
        )}
      </div>

      {/* === LOWER (PANTS) === */}
      {pantsLayer && (
        <div
          className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
            <Image src={pantsLayer.src} alt="pants" fill sizes="(max-width: 768px) 100vw, 760px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
          </div>

          {cuffSrc && (
            <div className="absolute inset-0">
              <div className="absolute inset-0" style={fabricStyle(cuffSrc)} />
              <Image src={cuffSrc} alt="cuffs" fill sizes="(max-width: 768px) 100vw, 760px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
            </div>
          )}

          {pantsPleatSrc && (
            <div className="absolute inset-0">
              <div className="absolute inset-0" style={fabricStyle(pantsPleatSrc)} />
              <Image src={pantsPleatSrc} alt="pants-pleats" fill sizes="(max-width: 768px) 100vw, 760px" priority style={{ objectFit: "contain", pointerEvents: "none", mixBlendMode: "multiply", opacity: shadeOpacity, filter: "grayscale(1) brightness(0.78) contrast(1.22)" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;