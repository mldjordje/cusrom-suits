"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

type Props = {
  config: SuitState;
};

const SHADE_OPACITY = 0.55;
const SHADE_FILTER = "contrast(1.14)";

const replaceColorInSrc = (src: string) => {
  const filename = src.split("/").pop() ?? "";
  const webpName = filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");

  return `https://customsuits.adspire.rs/uploads/transparent/${webpName}`;
};

const toneBlend = (tone: string) => {
  switch (tone) {
    case "light":
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.04) contrast(1.02)" };
    case "dark":
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.06)" };
    default:
      return { opacity: 1, blendMode: "normal" as const, filter: "brightness(1.03) contrast(1.02)" };
  }
};

export default function SuitPreview({ config }: Props) {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const currentSuit = useMemo(() => suits.find((s) => s.id === config.styleId) ?? null, [config.styleId]);

  useEffect(() => {
    fetch("/api/fabrics", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFabrics(data.data);
        }
      })
      .catch(() => {
        // Ignore network errors – UI will show fallback message below.
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedFabric = fabrics.find((fabric) => fabric.id === config.colorId);
  const fabricTexture = selectedFabric?.texture ?? "";
  const tone = selectedFabric?.tone ?? "medium";

  const { opacity: blendOpacity, blendMode, filter: fabricFilter } = toneBlend(tone);

  const baseLayers: SuitLayer[] = currentSuit?.layers ?? [];

  const selectedLapel = currentSuit?.lapels?.find((lapel) => lapel.id === config.lapelId) ?? currentSuit?.lapels?.[0];
  const selectedLapelWidth =
    selectedLapel?.widths.find((width) => width.id === config.lapelWidthId) ??
    selectedLapel?.widths.find((width) => width.id === "medium") ??
    selectedLapel?.widths?.[0];

  const swapLapelInPath = (src: string, lapelType?: string, lapelWidth?: string) => {
    const type = lapelType ?? "notch";
    const width = lapelWidth ?? "medium";

    return src.replace(/lapel_(narrow|medium|wide)\+style_lapel_(notch|peak)/, `lapel_${width}+style_lapel_${type}`);
  };

  const dynamicLayers = useMemo(
    () =>
      baseLayers.map((layer) =>
        layer.id === "torso"
          ? { ...layer, src: swapLapelInPath(layer.src, selectedLapel?.id, selectedLapelWidth?.id) }
          : layer,
      ),
    [baseLayers, selectedLapel?.id, selectedLapelWidth?.id],
  );

  const torsoLayers = dynamicLayers.filter((layer) => layer.id !== "pants");
  const pantsLayer = dynamicLayers.find((layer) => layer.id === "pants");

  const lapelSrc = selectedLapelWidth?.src;
  const pocketSrc = config.pocketId && currentSuit?.pockets?.find((pocket) => pocket.id === config.pocketId)?.src;
  const cuffSrc = config.cuffId && currentSuit?.cuffs?.find((cuff) => cuff.id === config.cuffId)?.src;
  const pantsPleatSrc = config.pantsPleatId === "double" ? "/assets/suits/blue/pleats_double.png" : undefined;

  const defaultInterior = currentSuit?.interiors?.[0];
  const activeInteriorId = config.interiorId ?? defaultInterior?.id;
  const interiorLayers = activeInteriorId
    ? currentSuit?.interiors?.find((interior) => interior.id === activeInteriorId)?.layers
    : undefined;

  const breastPocketLayers = config.breastPocketId
    ? currentSuit?.breastPocket?.find((pocket) => pocket.id === config.breastPocketId)?.layers
    : undefined;

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

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();

    const delta = -event.deltaY;
    setScale((prev) => Math.min(3, Math.max(1, prev + delta * 0.0015)));
  };

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    dragRef.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
      active: true,
    };
  };

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current.active) {
      return;
    }

    setOffset({
      x: event.clientX - dragRef.current.x,
      y: event.clientY - dragRef.current.y,
    });
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const renderFabricUnion = () => {
    const torsoBase = baseLayers.filter((layer) => layer.id !== "pants");
    const maskSources = Array.from(
      new Set([
        ...torsoLayers.map((layer) => layer.src),
        ...torsoBase.map((layer) => layer.src),
        ...(lapelSrc ? [lapelSrc] : []),
      ]),
    );

    if (maskSources.length === 0) {
      return null;
    }

    const maskList = maskSources.map((source) => `url(${replaceColorInSrc(source)})`).join(",");
    const repeatList = maskSources.map(() => "no-repeat").join(",");
    const sizeList = maskSources.map(() => "contain").join(",");
    const positionList = maskSources.map(() => "center").join(",");
    const compositeList = new Array(maskSources.length).fill("add").join(",");

    const style: React.CSSProperties = {
      backgroundImage: `url(${fabricTexture})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: blendOpacity,
      mixBlendMode: blendMode,
      filter: fabricFilter,
      WebkitMaskImage: maskList,
      WebkitMaskRepeat: repeatList,
      WebkitMaskSize: sizeList,
      WebkitMaskPosition: positionList,
      // @ts-ignore - mask composite is still experimental in TS types
      WebkitMaskComposite: compositeList,
      maskImage: maskList,
      maskRepeat: repeatList,
      maskSize: sizeList,
      maskPosition: positionList,
      // @ts-ignore - mask composite is still experimental in TS types
      maskComposite: compositeList,
      pointerEvents: "none",
    };

    const key = `fabric-union-${maskList}-${fabricTexture}-${selectedLapel?.id ?? "none"}-${selectedLapelWidth?.id ?? "none"}`;

    return <div key={key} className="absolute inset-0" style={style} />;
  };

  if (!currentSuit) {
    return null;
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">Ucitavanje tkanina...</div>;
  }

  if (!selectedFabric) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Izaberi tkaninu da se prikaže odelo.
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center bg-white touch-pan-y"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
      style={{ cursor: scale > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "default" }}
    >
      <div
        className="relative mb-[-40px] aspect-[2/3] w-[360px] md:w-[520px]"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {interiorLayers?.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image
              src={replaceColorInSrc(layer.src)}
              alt={layer.name}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
          </div>
        ))}

        {renderFabricUnion()}

        {torsoLayers.map((layer) => (
          <div key={layer.id} className="absolute inset-0">
            <Image
              src={replaceColorInSrc(layer.src)}
              alt={layer.id}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{
                objectFit: "contain",
                pointerEvents: "none",
                mixBlendMode: "multiply",
                opacity: SHADE_OPACITY,
                filter: SHADE_FILTER,
              }}
            />
          </div>
        ))}

        {pocketSrc && (
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0" style={fabricStyle(pocketSrc)} />
            <Image
              src={replaceColorInSrc(pocketSrc)}
              alt="pockets"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority
              style={{
                objectFit: "contain",
                pointerEvents: "none",
                mixBlendMode: "multiply",
                opacity: SHADE_OPACITY,
                filter: SHADE_FILTER,
              }}
            />
          </div>
        )}

        {breastPocketLayers &&
          currentSuit.breastPocket &&
          breastPocketLayers.map((layer) => (
            <div key={layer.id} className="absolute inset-0 z-20">
              <div className="absolute inset-0" style={fabricStyle(layer.src)} />
              <Image
                src={replaceColorInSrc(layer.src)}
                alt={layer.name}
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                priority
                style={{
                  objectFit: "contain",
                  pointerEvents: "none",
                  mixBlendMode: "multiply",
                  opacity: SHADE_OPACITY,
                  filter: SHADE_FILTER,
                }}
              />
            </div>
          ))}
      </div>

      {pantsLayer && (
        <div
          className="relative mt-[-20px] aspect-[3/1] w-[540px] md:w-[760px]"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={fabricStyle(pantsLayer.src)} />
            <Image
              src={replaceColorInSrc(pantsLayer.src)}
              alt="pants"
              fill
              sizes="(max-width: 768px) 100vw, 760px"
              priority
              style={{
                objectFit: "contain",
                pointerEvents: "none",
                mixBlendMode: "multiply",
                opacity: SHADE_OPACITY,
                filter: SHADE_FILTER,
              }}
            />
          </div>

          {cuffSrc && (
            <div className="absolute inset-0">
              <div className="absolute inset-0" style={fabricStyle(cuffSrc)} />
              <Image
                src={replaceColorInSrc(cuffSrc)}
                alt="cuffs"
                fill
                sizes="(max-width: 768px) 100vw, 760px"
                priority
                style={{
                  objectFit: "contain",
                  pointerEvents: "none",
                  mixBlendMode: "multiply",
                  opacity: SHADE_OPACITY,
                  filter: SHADE_FILTER,
                }}
              />
            </div>
          )}

          {pantsPleatSrc && (
            <div className="absolute inset-0">
              <div className="absolute inset-0" style={fabricStyle(pantsPleatSrc)} />
              <Image
                src={replaceColorInSrc(pantsPleatSrc)}
                alt="pants-pleats"
                fill
                sizes="(max-width: 768px) 100vw, 760px"
                priority
                style={{
                  objectFit: "contain",
                  pointerEvents: "none",
                  mixBlendMode: "multiply",
                  opacity: SHADE_OPACITY,
                  filter: SHADE_FILTER,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
