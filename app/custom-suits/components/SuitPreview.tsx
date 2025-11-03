"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// tvoje slike sa servera
const CDN_BASE = "https://customsuits.adspire.rs/uploads/transparent";

// funkcija da dobiješ putanju
const layerSrc = (src: string) => {
  const file = src.split("/").pop()?.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return `${CDN_BASE}/${file}`;
};

// realistično ponašanje tkanine
const toneBlend = (tone: string) => {
  switch (tone) {
    case "light":
      return {
        opacity: 0.88,
        blendMode: "soft-light" as const,
        filter: "brightness(1.1) contrast(1.05) saturate(1.1)",
      };
    case "dark":
      return {
        opacity: 0.95,
        blendMode: "multiply" as const,
        filter: "brightness(1.05) contrast(1.15)",
      };
    default:
      return {
        opacity: 0.9,
        blendMode: "overlay" as const,
        filter: "brightness(1.08) contrast(1.08)",
      };
  }
};

type Props = { config: SuitState };

const SuitPreview: React.FC<Props> = ({ config }) => {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ x: 0, y: 0, active: false });

  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // učitaj tkanine
  useEffect(() => {
    fetch("/api/fabrics", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => data.success && setFabrics(data.data))
      .finally(() => setLoading(false));
  }, []);

  const fabric = fabrics.find((f) => f.id === config.colorId);
  const fabricTexture = fabric?.texture || "";
  const tone = fabric?.tone || "medium";
  const { opacity, blendMode, filter } = toneBlend(tone);

  if (loading) return <div className="text-gray-400 text-sm text-center">Učitavanje...</div>;
  if (!fabric) return <div className="text-gray-500 text-sm text-center">Izaberi tkaninu...</div>;

  // lapel sinhronizacija
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const lapel = currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
  const lapelWidth =
    lapel?.widths.find((w) => w.id === config.lapelWidthId) ||
    lapel?.widths.find((w) => w.id === "medium") ||
    lapel?.widths?.[0];

  const swapLapel = (src: string, type?: string, width?: string) =>
    src.replace(
      /lapel_(narrow|medium|wide)\+style_lapel_(notch|peak)/,
      `lapel_${width ?? "medium"}+style_lapel_${type ?? "notch"}`
    );

  const layers = baseLayers.map((l) =>
    l.id === "torso" ? { ...l, src: swapLapel(l.src, lapel?.id, lapelWidth?.id) } : l
  );

  const torso = layers.filter((l) => l.id !== "pants");
  const pants = layers.find((l) => l.id === "pants");
  const lapelSrc = lapelWidth?.src;
  const pocketSrc = config.pocketId && currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;
  const cuffSrc = config.cuffId && currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;

  // maska tkanine
  const fabricStyle = (src: string): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity,
    mixBlendMode: blendMode,
    filter,
    WebkitMaskImage: `url(${layerSrc(src)})`,
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    maskImage: `url(${layerSrc(src)})`,
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: "center",
    pointerEvents: "none",
  });

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setScale(Math.min(3, Math.max(1, scale - e.deltaY * 0.0015)));
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, active: true };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (dragRef.current.active) setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onMouseUp = () => (dragRef.current.active = false);

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full h-full bg-white select-none"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUp}
      onMouseUp={onMouseUp}
      style={{ cursor: dragRef.current.active ? "grabbing" : "grab" }}
    >
      {/* 🧥 Gornji deo */}
      <div
        className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {torso.map((layer) => (
          <div key={layer.id} className="absolute inset-0" style={fabricStyle(layer.src)} />
        ))}

        {[lapelSrc, pocketSrc].filter(Boolean).map((src) => (
          <div key={src} className="absolute inset-0" style={fabricStyle(src!)} />
        ))}
      </div>

      {/* 👖 Donji deo */}
      {pants && (
        <div
          className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <div className="absolute inset-0" style={fabricStyle(pants.src)} />
          {[cuffSrc].filter(Boolean).map((src) => (
            <div key={src} className="absolute inset-0" style={fabricStyle(src!)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;
