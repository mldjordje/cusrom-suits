"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// CDN folder sa tvojim transparent slojevima
const CDN_BASE = "https://customsuits.adspire.rs/uploads/transparent";

const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop() || "";
  const webpName = filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `${CDN_BASE}/${webpName}`;
};

// 🔹 Realističan blend – Hockerty stil
const toneBlend = (tone: string) => {
  switch (tone) {
    case "light":
      return { opacity: 0.9, blendMode: "multiply" as const, filter: "brightness(1.06) contrast(1.1)" };
    case "dark":
      return { opacity: 0.95, blendMode: "overlay" as const, filter: "brightness(1.04) contrast(1.05)" };
    default:
      return { opacity: 0.92, blendMode: "soft-light" as const, filter: "brightness(1.05) contrast(1.08)" };
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

  // Učitavanje tkanina iz CMS-a
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

  // Lapel sinhronizacija sa torzom
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
    l.id === "torso" ? { ...l, src: swapLapelInPath(l.src, selectedLapel?.id, selectedLapelWidth?.id) } : l
  );

  const torsoLayers = dynamicLayers.filter((l) => l.id !== "pants");
  const pantsLayer = dynamicLayers.find((l) => l.id === "pants");

  const lapelSrc = selectedLapelWidth?.src;
  const pocketSrc = config.pocketId && currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;
  const cuffSrc = config.cuffId && currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;
  const pantsPleatSrc = config.pantsPleatId === "double" ? `${CDN_BASE}/pleats_double.webp` : undefined;

  const defaultInterior = currentSuit.interiors?.[0];
  const activeInteriorId = config.interiorId ?? defaultInterior?.id;
  const interiorLayers = activeInteriorId && currentSuit.interiors?.find((i) => i.id === activeInteriorId)?.layers;
  const breastPocketLayers = config.breastPocketId && currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)?.layers;

  // Stil za tkaninu – maskirano i blago “3D”
  const fabricStyle = (src: string): React.CSSProperties => ({
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
      {/* 🧥 Gornji deo */}
      <div
        className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
      >
        {/* Interior */}
        {interiorLayers && interiorLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image src={replaceColorInSrc(layer.src)} alt={layer.name} fill priority style={{ objectFit: "contain" }} />
          </div>
        ))}

        {/* Fabric overlay (maskirano) */}
        {torsoLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0" style={fabricStyle(layer.src)} />
        ))}

        {/* Rever i džepovi */}
        {[lapelSrc, pocketSrc].filter(Boolean).map((src) => (
          <div key={src} className="absolute inset-0" style={fabricStyle(src!)} />
        ))}

        {/* Grudni džep */}
        {breastPocketLayers && breastPocketLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0" style={fabricStyle(layer.src)} />
        ))}
      </div>

      {/* 👖 Donji deo (pantalone) */}
      {pantsLayer && (
        <div
          className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
        >
          <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
          {[cuffSrc, pantsPleatSrc].filter(Boolean).map((src) => (
            <div key={src} className="absolute inset-0" style={fabricStyle(src!)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;
