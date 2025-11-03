"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// 🎨 Konstante za izgled i dubinu
const SHADE_OPACITY = 0.58;
const SHADE_FILTER = "grayscale(1) contrast(1.2) brightness(0.94)";
const OVERLAY_FILTER = "brightness(1.05)";

// 🔹 Mapira “kolorni” sprite na transparentnu masku sa CDN-a
const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop() || "";
  const webpName = filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `https://customsuits.adspire.rs/uploads/transparent/${webpName}`;
};

// 🔹 Blending vrednosti po tonu
const toneBlend = (tone: string) => {
  switch (tone) {
    case "light":
      return { opacity: 0.9, blendMode: "multiply" as const, filter: "brightness(1.12) saturate(1.1)" };
    case "dark":
      return { opacity: 0.95, blendMode: "soft-light" as const, filter: "contrast(1.08)" };
    default:
      return { opacity: 0.92, blendMode: "overlay" as const, filter: "brightness(1.06) contrast(1.04)" };
  }
};

type Props = { config: SuitState };

const SuitPreview: React.FC<Props> = ({ config }) => {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // 🔹 Učitavanje tkanina
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
  const { opacity: blendOpacity, blendMode, filter: fabricFilter } = toneBlend(tone);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Učitavanje tkanina...</div>;
  if (!selectedFabric) return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Izaberi tkaninu da se prikaže odelo.</div>;

  // 🔹 Dinamičko sinhronizovanje lapela sa torzom
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const selectedLapel = currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
  const selectedLapelWidth =
    selectedLapel?.widths.find((w) => w.id === config.lapelWidthId) ||
    selectedLapel?.widths.find((w) => w.id === "medium") ||
    selectedLapel?.widths?.[0];
  const swapLapelInPath = (src: string, lapelType?: string, lapelWidth?: string) => {
    const type = lapelType ?? "notch";
    const width = lapelWidth ?? "medium";
    return src.replace(/lapel_(narrow|medium|wide)\+style_lapel_(notch|peak)/, `lapel_${width}+style_lapel_${type}`);
  };
  const dynamicLayers = baseLayers.map((l) => (l.id === "torso" ? { ...l, src: swapLapelInPath(l.src, selectedLapel?.id, selectedLapelWidth?.id) } : l));
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

  // 🔹 Stil za tkaninu (maskiranje)
  const fabricStyle = (src: string): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: blendOpacity,
    mixBlendMode: blendMode,
    filter: `${fabricFilter} ${OVERLAY_FILTER}`,
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
    setScale(Math.min(3, Math.max(1, scale + delta * 0.0015)));
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
      {/* 🧥 Gornji deo (jakna) */}
      <div className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}>

        {/* Interior */}
        {interiorLayers && interiorLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image src={replaceColorInSrc(layer.src)} alt={layer.name} fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
          </div>
        ))}

        {/* Fabric UNION (maskirano) */}
        {(() => {
          const maskSrcs: string[] = [...torsoLayers.map((l) => l.src), ...(lapelSrc ? [lapelSrc] : [])];
          const maskList = maskSrcs.map((s) => `url(${replaceColorInSrc(s)})`).join(",");
          const unionStyle: React.CSSProperties = {
            backgroundImage: `url(${fabricTexture})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: blendOpacity,
            mixBlendMode: blendMode,
            filter: `${fabricFilter} ${OVERLAY_FILTER}`,
            WebkitMaskImage: maskList,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            pointerEvents: "none",
          };
          return <div key="union" className="absolute inset-0" style={unionStyle} />;
        })()}

        {/* 🎨 Shading iz kolornih sprite-ova */}
        {torsoLayers.map((layer) => (
          <div key={`shade-${layer.id}`} className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
            <Image src={layer.src} alt={`${layer.id}-shade`} fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
          </div>
        ))}

        {/* Lapel shading */}
        {lapelSrc && (
          <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
            <Image src={lapelSrc} alt="lapel-shade" fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
          </div>
        )}

        {/* Džepovi */}
        {pocketSrc && (
          <>
            <div className="absolute inset-0" style={fabricStyle(pocketSrc)} />
            <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
              <Image src={pocketSrc} alt="pockets-shade" fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
            </div>
          </>
        )}

        {/* Grudni džep */}
        {breastPocketLayers && breastPocketLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <div className="absolute inset-0" style={fabricStyle(layer.src)} />
            <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
              <Image src={layer.src} alt={layer.name} fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
            </div>
          </div>
        ))}
      </div>

      {/* 👖 Donji deo (pantalone) */}
      {pantsLayer && (
        <div className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}>
          <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
          <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
            <Image src={pantsLayer.src} alt="pants-shade" fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
          </div>

          {cuffSrc && (
            <>
              <div className="absolute inset-0" style={fabricStyle(cuffSrc)} />
              <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
                <Image src={cuffSrc} alt="cuffs-shade" fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
              </div>
            </>
          )}

          {pantsPleatSrc && (
            <>
              <div className="absolute inset-0" style={fabricStyle(pantsPleatSrc)} />
              <div className="absolute inset-0" style={{ mixBlendMode: "multiply", opacity: SHADE_OPACITY, filter: SHADE_FILTER }}>
                <Image src={pantsPleatSrc} alt="pants-pleats-shade" fill priority style={{ objectFit: "contain", pointerEvents: "none" }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;
