"use client";

import React, { useEffect, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { getBackendBase } from "../utils/backend";

// Use the original sprite itself as the mask.
// PNGs already have transparent outside and exact canvas size, giving perfect alignment
// and removing dependency on remote silhouettes that may 404 and break masking.
const cdnTransparent = getTransparentCdnBase();

const fileBase = (p: string) => {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
};

// Always use remote transparent silhouettes for perfect alpha masks
const toTransparentSilhouette = (src: string) => `${cdnTransparent}${fileBase(src)}`;

// Also use the same transparent silhouette as a multiply shade overlay
const toShadeSrc = (src: string) => `${cdnTransparent}${fileBase(src)}`;

// Keep fabric bright enough; tone-aware tweaks
const toneBlend = (tone?: string) => {
  switch (tone) {
    case "light":
      return { opacity: 1, filter: "brightness(1.03) contrast(1.02)" } as const;
    case "dark":
      return { opacity: 1, filter: "brightness(1.06) contrast(1.02)" } as const;
    default:
      return { opacity: 1, filter: "brightness(1.03) contrast(1.03)" } as const;
  }
};

// Visual coefficients by tone for shading/highlights and detail texture
const toneVisual = (tone?: string) => {
  if (tone === "dark")
    return {
      shadeOpacity: 0.42,
      shadeContrast: 1.16,
      softLightTop: 0.08,
      softLightBottom: 0.08,
      detailScale: "22%",
      detailOpacity: 0.26,
      detailBlend: "soft-light" as React.CSSProperties["mixBlendMode"],
      washBlur: 10,
    };
  if (tone === "light")
    return {
      shadeOpacity: 0.36,
      shadeContrast: 1.1,
      softLightTop: 0.07,
      softLightBottom: 0.05,
      detailScale: "24%",
      detailOpacity: 0.30,
      detailBlend: "overlay" as React.CSSProperties["mixBlendMode"],
      washBlur: 12,
    };
  return {
    shadeOpacity: 0.38,
    shadeContrast: 1.14,
    softLightTop: 0.085,
    softLightBottom: 0.075,
    detailScale: "24%",
    detailOpacity: 0.28,
    detailBlend: "overlay" as React.CSSProperties["mixBlendMode"],
    washBlur: 11,
  };
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
    const url = `${getBackendBase()}fabrics.php`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setFabrics(data.data);
      })
      .catch((e) => { console.error("Fabrics load error", e); })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";
  const { opacity: fabricOpacity, filter: fabricFilter } = toneBlend(selectedFabric?.tone);
  const vis = toneVisual(selectedFabric?.tone);

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
  const fabricMaskStyle = (
    src: string,
    align: "center" | "top center" = "center"
  ): React.CSSProperties => ({
    backgroundImage: `url(${fabricTexture})`,
    backgroundSize: "cover",
    backgroundPosition: align,
    opacity: fabricOpacity,
    filter: fabricFilter,
    WebkitMaskImage: `url(${toTransparentSilhouette(src)})`,
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: align,
    maskImage: `url(${toTransparentSilhouette(src)})`,
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: align,
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
      {/* CANVAS: Jacket (images are 600x733) */}
      <div
        className="relative mx-auto"
        style={{ width: "100%", aspectRatio: "600 / 733", maxWidth: 720 }}
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

        {/* Premium depth overlays (soft-light highlights and vignette) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              `radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,${vis.softLightTop}), rgba(255,255,255,0) 60%), radial-gradient(140% 120% at 50% 120%, rgba(0,0,0,${vis.softLightBottom}), rgba(0,0,0,0) 55%)`,
            mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
          }}
        />
        {/* Edge light to crispen silhouette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 15%)," +
              "linear-gradient(270deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 15%)," +
              "radial-gradient(80% 40% at 50% -10%, rgba(255,255,255,0.04), rgba(255,255,255,0) 70%)",
            mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
          }}
        />

        {/* Jacket parts */}
        {bodyLayers.map((l) => (
          <div key={l.id} className="absolute inset-0">
            {/* Base color wash (smooths fabric tone) */}
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center"),
                opacity: Math.min(1, fabricOpacity * 0.76),
                filter: `${fabricFilter} blur(${vis.washBlur}px) saturate(1.06) brightness(1.02)`,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center"),
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
              }}
            />
            {/* Fine weave detail (adds premium texture) */}
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center"),
                backgroundRepeat: "repeat",
                // smaller scale to repeat the weave pattern
                backgroundSize: vis.detailScale,
                opacity: l.id === "sleeves" ? Math.max(0, vis.detailOpacity - 0.06) : vis.detailOpacity,
                filter: "contrast(1.05)",
                mixBlendMode: vis.detailBlend,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
              }}
            />
            <img
              src={toShadeSrc(l.src)}
              alt={l.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: vis.shadeOpacity,
                filter: `grayscale(1) contrast(${vis.shadeContrast}) blur(0.2px)`,
                mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"],
              }}
            />
          </div>
        ))}

        {/* Optional overlays on jacket */}
        {pocketSrc && (
          <img
            src={pocketSrc}
            alt="Pockets"
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

      {/* CANVAS: Pants (images are 600x350) */}
      {pants && (
        <div className="relative mx-auto mt-2" style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 720 }}>
          {/* Base color wash for pants */}
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center"),
              opacity: Math.min(1, fabricOpacity * 0.74),
              filter: `${fabricFilter} blur(${vis.washBlur}px) saturate(1.05) brightness(1.01)`,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center"),
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />
          {/* Fine weave detail for pants */}
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center"),
              backgroundRepeat: "repeat",
              backgroundSize: vis.detailScale,
              opacity: Math.max(0, vis.detailOpacity - 0.08),
              filter: "contrast(1.04)",
              mixBlendMode: vis.detailBlend,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />
          {/* Premium depth overlays for pants */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                `radial-gradient(120% 120% at 20% 10%, rgba(255,255,255,${Math.max(0.04, vis.softLightTop-0.02)}), rgba(255,255,255,0) 50%), ` +
                `radial-gradient(140% 120% at 50% 120%, rgba(0,0,0,${Math.max(0.05, vis.softLightBottom-0.01)}), rgba(0,0,0,0) 55%)`,
              mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
            }}
          />
          <img
            src={toShadeSrc(pants.src)}
            alt={pants.name}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.34, filter: `grayscale(1) contrast(${vis.shadeContrast}) blur(0.15px)`, mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"] }}
          />

          {/* Optional overlays for pants */}
          {cuffSrc && (
            <img src={cuffSrc} alt="Cuffs" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          )}
          {pantsPleatSrc && (
            <img src={pantsPleatSrc} alt="Pleats" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );
}
