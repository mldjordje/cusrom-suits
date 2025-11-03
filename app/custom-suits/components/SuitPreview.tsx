"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// Ispravan putanja ka transparent slojevima
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
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // Poziva backend sa PUNIM URL-om
  useEffect(() => {
    fetch("/api/fabrics", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFabrics(data.data);
      })
      .catch((err) => console.error("Greska pri ucitavanju tkanina:", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedFabric = fabrics.find((f) => f.id === config.colorId);
  const fabricTexture = selectedFabric?.texture || "";

  const tone = selectedFabric?.tone || "medium";

  // Dinamican filter i rezim blend-a prema tonu tkanine
  const { opacity: blendOpacity, blendMode, filter: fabricFilter } = toneBlend(tone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Ucitavanje tkanina...
      </div>
    );
  }

  if (!selectedFabric) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Izaberi tkaninu da se prikaze odelo.
      </div>
    );
  }

  // Slojevi definisani za trenutni stil odela
  const baseLayers: SuitLayer[] = currentSuit.layers || [];

  // Ensure lapel selection always has a concrete width/type for image derivations
  const selectedLapel =
    currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
  const selectedLapelWidth =
    selectedLapel?.widths.find((w) => w.id === config.lapelWidthId) ||
    selectedLapel?.widths.find((w) => w.id === "medium") ||
    selectedLapel?.widths?.[0];

  // When lapel changes, the torso base sprite in options still points to
  // a default lapel variant (e.g. notch/medium). Update the torso image path
  // to match the currently selected lapel type/width so masks stay in sync.
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

  // Lapel image based on selected type and width (with defaults)
  const lapelSrc = selectedLapelWidth?.src;

  // Pocket image based on selection
  const pocketSrc = config.pocketId && currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;

  // Cuffs image on pants if selected
  const cuffSrc = config.cuffId && currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;

  // Interior (render all layers in order)
  const defaultInterior = currentSuit.interiors?.[0];
  const activeInteriorId = config.interiorId ?? defaultInterior?.id;
  const interiorLayers = activeInteriorId && currentSuit.interiors?.find((i) => i.id === activeInteriorId)?.layers;

  // Breast pocket (all layers)
  const breastPocketLayers =
    config.breastPocketId && currentSuit.breastPocket?.find((bp) => bp.id === config.breastPocketId)?.layers;

  // Generate style for fabric texture overlay masked by a given layer
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
      {/* === GORNJI DEO (SAKO + SLOJEVI) === */}
      <div
        className="relative w-[360px] md:w-[520px] aspect-[2/3] mb-[-40px]"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
      >
        {/* ==== UNUTRASNJOST SAKOA (bez tkanine) ==== */}
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
          </div>
        ))}

        {/* Jedan zajednicki fabric overlay (union mask) */}
        {(() => {
          const maskSrcs: string[] = [];
          torsoLayers.forEach((l) => maskSrcs.push(l.src));
          if (lapelSrc) maskSrcs.push(lapelSrc);

          const maskList = maskSrcs.map((s) => `url(${replaceColorInSrc(s)})`).join(',');
          const repeatList = maskSrcs.map(() => 'no-repeat').join(',');
          const sizeList = maskSrcs.map(() => 'contain').join(',');
          const posList = maskSrcs.map(() => 'center').join(',');
          const compList = maskSrcs.length > 0 ? new Array(maskSrcs.length).fill('add').join(',') : undefined;

          const unionStyle: React.CSSProperties = {
            backgroundImage: `url(${fabricTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: blendOpacity,
            mixBlendMode: blendMode,
            filter: fabricFilter,
            WebkitMaskImage: maskList,
            WebkitMaskRepeat: repeatList,
            WebkitMaskSize: sizeList,
            WebkitMaskPosition: posList,
            // @ts-ignore vendor property supported in Chromium/WebKit
            WebkitMaskComposite: compList as any,
            maskImage: maskList,
            maskRepeat: repeatList,
            maskSize: sizeList,
            maskPosition: posList,
            // @ts-ignore standard property in some browsers
            maskComposite: compList as any,
            pointerEvents: 'none',
          };
          const unionKey = `fabric-union-${maskList}-${fabricTexture}`;
          return <div key={unionKey} className="absolute inset-0" style={unionStyle} />;
        })()}

        {shirtSrc && (
          <div className="absolute inset-0 z-10">
            <Image
              src={replaceColorInSrc(shirtSrc)}
              alt="shirt"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
          </div>
        )}

        {/* Dzepovi na saku */}
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

        {/* Grudni dzep */}
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
          </div>
        )}
      </div>

      {/* === DONJI DEO (PANTALONE) === */}
      {pantsLayer && (
        <div
          className="relative w-[540px] md:w-[760px] aspect-[3/1] mt-[-20px]"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }}
        >
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
          {/* Manzetne na pantalonama */}
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

          {pantsPleatSrc && (
            <div className="absolute inset-0">
              <Image
                src={replaceColorInSrc(pantsPleatSrc)}
                alt="pants-pleats"
                fill
                sizes="(max-width: 768px) 100vw, 760px"
                priority
                style={{ objectFit: "contain", pointerEvents: "none" }}
              />
              <div className="absolute inset-0" style={fabricStyle(pantsPleatSrc)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuitPreview;