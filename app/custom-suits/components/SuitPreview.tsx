"use client";

import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

// Use the original sprite itself as the mask.
// PNGs already have transparent outside and exact canvas size, giving perfect alignment
// and removing dependency on remote silhouettes that may 404 and break masking.
const toTransparentSilhouette = (src: string) => src;

// Keep fabric bright enough; small tweaks by tone
const toneBlend = (tone?: string) => {
  switch (tone) {
    case "light":
      return { opacity: 1, filter: "brightness(1.04) contrast(1.02)" } as const;
    case "dark":
      return { opacity: 1, filter: "brightness(1.06)" } as const;
    default:
      return { opacity: 1, filter: "brightness(1.03) contrast(1.02)" } as const;
  }
};

type Props = { config: SuitState };

export default function SuitPreview({ config }: Props) {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fabric pan/zoom state (applies only to fabric, not silhouettes)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fabrics", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setFabrics(data.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFabric = fabrics.find((f) => f.id === config.colorId);
  const fabricTexture = selectedFabric?.texture || "";
  const { opacity: fabricOpacity, filter: fabricFilter } = toneBlend(selectedFabric?.tone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">Učitavanje tkanina…</div>
    );
  }
  if (!selectedFabric) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">Izaberi tkaninu da vidiš odelo.</div>
    );
  }

  // 1) Ensure torso sprite matches selected lapel so the mask lines up
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const selectedLapel =
    currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
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

  const suitLayers = baseLayers.map((l) =>
    l.id === "torso" ? { ...l, src: swapLapelInPath(l.src, selectedLapel?.id, selectedLapelWidth?.id) } : l
  );

  // 2) Optional overlays from options
  const pocketSrc = config.pocketId && currentSuit.pockets?.find((p) => p.id === config.pocketId)?.src;
  const cuffSrc = config.cuffId && currentSuit.cuffs?.find((c) => c.id === config.cuffId)?.src;
  const pantsPleatSrc = config.pantsPleatId === "double" ? "/assets/suits/blue/pleats_double.png" : undefined;
  const interiorLayers: SuitLayer[] | undefined = (() => {
    const defaultInterior = currentSuit.interiors?.[0];
    const activeInteriorId = config.interiorId ?? defaultInterior?.id;
    const found = currentSuit.interiors?.find((i) => i.id === activeInteriorId);
    return Array.isArray(found?.layers) ? found.layers : undefined;
  })();
  const breastPocketLayers: SuitLayer[] | undefined = (() => {
    const id = config.breastPocketId;
    const found = id ? currentSuit.breastPocket?.find((bp) => bp.id === id) : undefined;
    return Array.isArray(found?.layers) ? found.layers : undefined;
  })();

  // Helper: build a fabric-masked layer using a silhouette as mask (all silhouettes share same canvas size)
  const fabricMaskStyle = (src: string): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: fabricOpacity,
    filter: fabricFilter,
    WebkitMaskImage: `url(${toTransparentSilhouette(src)})`,
    WebkitMaskRepeat: "no-repeat",
    // Use contain+center so the mask scales exactly like the visible sprite (object-contain)
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    maskImage: `url(${toTransparentSilhouette(src)})`,
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: "center",
    pointerEvents: "none",
  });

  // Fabric pan/zoom handlers
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    setScale((s) => Math.min(3, Math.max(1, s + delta * 0.0015)));
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, active: true };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current.active) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    if (dragRef.current.active) dragRef.current.active = false;
  };

  // Render order:
  // - interiors (below jacket so they show through openings)
  // - pants fabric + shade
  // - jacket parts fabric + shade (sleeves, torso, bottom)
  // - option overlays (pockets, cuffs, breast pocket)

  // Prepare grouping by ids for deterministic order
  const pants = suitLayers.find((l) => l.id === "pants");
  const bodyLayers = suitLayers.filter((l) => l.id !== "pants");

  return (
    <div className="w-full select-none">
      {/* Maintain consistent canvas proportion to keep all silhouettes aligned */}
      <div
        className="relative mx-auto"
        style={{
          width: "100%",
          aspectRatio: "3 / 5",
          maxWidth: 720,
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Interiors below fabric */}
        {interiorLayers?.map((l) => (
          <img
            key={`int-${l.id}`}
            src={l.src}
            alt={l.name}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        ))}

        {/* Pants: fabric + shading */}
        {pants && (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(pants.src),
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
              }}
            />
            <img
              src={pants.src}
              alt={pants.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: 0.38, filter: "grayscale(1) contrast(1.18)" }}
            />
          </div>
        )}

        {/* Jacket parts */}
        {bodyLayers.map((l) => (
          <div key={l.id} className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src),
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
              }}
            />
            <img
              src={l.src}
              alt={l.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: 0.42, filter: "grayscale(1) contrast(1.16)" }}
            />
          </div>
        ))}

        {/* Optional overlays */}
        {pocketSrc && (
          <img
            src={pocketSrc}
            alt="Pockets"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
        {cuffSrc && (
          <img
            src={cuffSrc}
            alt="Cuffs"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
        {pantsPleatSrc && (
          <img
            src={pantsPleatSrc}
            alt="Pleats"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
        {breastPocketLayers?.map((l) => (
          <img
            key={`bp-${l.id}`}
            src={l.src}
            alt={l.name}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        ))}
      </div>
    </div>
  );
}
