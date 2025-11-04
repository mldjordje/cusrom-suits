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

// Build WebP/PNG pair for CDN assets and prefer WebP with PNG fallback
const cdnPair = (src: string) => {
  const base = fileBase(src).replace(/\.(png|jpg|jpeg|webp)$/i, "");
  return { webp: `${cdnTransparent}${base}.webp`, png: `${cdnTransparent}${base}.png` } as const;
};

// For CSS masks we can provide multiple URLs; browser uses the first that loads
const toTransparentSilhouette = (src: string) => {
  const u = cdnPair(src);
  return `url(${u.webp}), url(${u.png})`;
};

// Shade <img>: start with WebP and on error fallback to PNG
const shadeSrcWebP = (src: string) => cdnPair(src).webp;
const shadeSrcPNG = (src: string) => cdnPair(src).png;

// Structural overlays from colored sprites removed to avoid tinted backgrounds; rely on transparent silhouettes only

// Tone-aware fabric compositing settings for realistic depth and contrast
const toneBlend = (tone?: string) => {
  switch (tone) {
    case "dark":
      return {
        opacity: 0.75,
        filter: "brightness(1.05) contrast(1.15) saturate(1.1)",
        blendMode: "multiply" as React.CSSProperties["mixBlendMode"],
      } as const;
    case "light":
      return {
        opacity: 0.9,
        blendMode: "overlay" as React.CSSProperties["mixBlendMode"],
      } as const;
    case "medium":
    default:
      return {
        opacity: 0.85,
        blendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
      } as const;
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
      shadeOpacity: 0.34,
      shadeContrast: 1.06,
      softLightTop: 0.045,
      softLightBottom: 0.04,
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

  // Helper: build a fabric-masked layer using a silhouette as mask
  // Important: Keep identical background mapping across parts by using fixed pixel bgSize/bgPosition
  const JACKET_CANVAS = { w: 600, h: 733 } as const;
  const PANTS_CANVAS = { w: 600, h: 350 } as const;

  const fabricMaskStyle = (
    src: string,
    align: "center" | "top center" = "center",
    canvas: { w: number; h: number } = JACKET_CANVAS
  ): React.CSSProperties => {
    const bgSize = `${Math.round(canvas.w * scale)}px ${Math.round(canvas.h * scale)}px`;
    const bgPos = `${Math.round(offset.x)}px ${Math.round(offset.y)}px`;
    return {
      backgroundImage: `url(${fabricTexture})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: fabricOpacity,
      filter: fabricFilter,
      WebkitMaskImage: toTransparentSilhouette(src),
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      WebkitMaskPosition: align,
      maskImage: toTransparentSilhouette(src),
      maskRepeat: "no-repeat",
      maskSize: "contain",
      maskPosition: align,
      pointerEvents: "none",
    } as React.CSSProperties;
  };

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
        className="relative mx-auto bg-white"
        style={{ width: "100%", aspectRatio: "600 / 733", maxWidth: 720, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18)) drop-shadow(0 8px 16px rgba(0,0,0,0.12))" }}
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

        {/* Optional shirt overlay (between interiors and fabric) */}
        {config.showShirt && (
          <img
            src={`${cdnTransparent}shirt_to_jacket_open.png`}
            onError={(e) => {
              // Fallback to local asset if remote shirt is missing on CDN
              const local = "/assets/suits/transparent/shirt_to_jacket_open.png";
              if (e.currentTarget.src !== local) e.currentTarget.src = local;
            }}
            alt="Shirt"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 1 }}
          />
        )}

        {/* Premium depth overlays (soft-light highlights and vignette) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              `radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,${vis.softLightTop}), rgba(255,255,255,0) 60%), radial-gradient(140% 120% at 50% 120%, rgba(0,0,0,${vis.softLightBottom}), rgba(0,0,0,0) 55%)`,
            mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
          }}
        />
        {/* Vertical highlight to simulate fabric sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.0) 55%, rgba(255,255,255,0.08) 85%, rgba(255,255,255,0.0) 100%)",
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
            {/* Base color wash (subtle, adds softness) */}
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center", JACKET_CANVAS),
                opacity: Math.min(1, fabricOpacity * 0.18),
                filter: `${fabricFilter} blur(5px) saturate(1.02)`,
              }}
            />
            {/* Primary fabric */}
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center", JACKET_CANVAS),
              }}
            />
            {/* Fine detail (very light) */}
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(l.src, "center", JACKET_CANVAS),
                backgroundSize: vis.detailScale,
                opacity: l.id === "sleeves" ? 0.06 : 0.1,
                filter: "contrast(1.02)",
                mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
              }}
            />
            <img
              src={shadeSrcWebP(l.src)} onError={(e)=>{const f=shadeSrcPNG(l.src); if(e.currentTarget.src!==f) e.currentTarget.src=f;}}
              alt={l.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: vis.shadeOpacity,
                filter: `grayscale(1) contrast(${vis.shadeContrast}) blur(0.2px)`,
                mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"],
              }}
            />
            {/* Lapel emphasis: subtle V shadow + edge soft-light */}
            {l.id === "torso" && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    `radial-gradient(80% 80% at 50% 10%, rgba(0,0,0,${Math.max(0.04, vis.softLightBottom - 0.02)}), rgba(0,0,0,0) 45%),` +
                    `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 25%),` +
                    `linear-gradient(225deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 25%)`,
                  mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
                }}
              />
            )}
          </div>
        ))}

        {/* Optional overlays on jacket (fabric-masked) */}
        {pocketSrc && (
          <>
            <div
              className="absolute inset-0"
              style={{
                ...fabricMaskStyle(pocketSrc, "center", JACKET_CANVAS),
                opacity: fabricOpacity,
                filter: fabricFilter,
              }}
            />
            <img
              src={shadeSrcWebP(pocketSrc as string)} onError={(e)=>{const f=shadeSrcPNG(pocketSrc as string); if(e.currentTarget.src!==f) e.currentTarget.src=f;}}
              alt="Pockets shade"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: 0.18, filter: `grayscale(1) contrast(${Math.max(1.05, vis.shadeContrast - 0.06)})`, mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"] }}
            />
          </>
        )}
        {breastPocketLayers?.map((l) => (
          <React.Fragment key={`bp-${l.id}`}>
            <div
              className="absolute inset-0"
              style={{ ...fabricMaskStyle(l.src, "center", JACKET_CANVAS), opacity: fabricOpacity, filter: fabricFilter }}
            />
            <img
              src={shadeSrcWebP(l.src)} onError={(e)=>{const f=shadeSrcPNG(l.src); if(e.currentTarget.src!==f) e.currentTarget.src=f;}}
              alt={l.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: 0.16, filter: `grayscale(1) contrast(${Math.max(1.05, vis.shadeContrast - 0.08)})`, mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"] }}
            />
          </React.Fragment>
        ))}
      </div>

      {/* CANVAS: Pants (images are 600x350) */}
      {pants && (
        <div className="relative mx-auto mt-2 bg-white" style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 720, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18)) drop-shadow(0 8px 16px rgba(0,0,0,0.12))" }}>
          {/* Base color wash for pants (subtle) */}
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center", PANTS_CANVAS),
              opacity: Math.min(1, fabricOpacity * 0.16),
              filter: `${fabricFilter} blur(4px) saturate(1.02)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center", PANTS_CANVAS),
            }}
          />
          {/* Fine weave detail for pants */}
          <div
            className="absolute inset-0"
            style={{
              ...fabricMaskStyle(pants.src, "center", PANTS_CANVAS),
              backgroundRepeat: "repeat",
              backgroundSize: vis.detailScale,
              opacity: Math.max(0, vis.detailOpacity - 0.08),
              filter: "contrast(1.04)",
              mixBlendMode: vis.detailBlend,
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
          {/* Vertical highlight for pants */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.0) 60%, rgba(255,255,255,0.08) 90%, rgba(255,255,255,0.0) 100%)",
              mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
            }}
          />
          {/* Shade using transparent silhouette */}
          <img
            src={shadeSrcWebP(pants.src)} onError={(e)=>{const f=shadeSrcPNG(pants.src); if(e.currentTarget.src!==f) e.currentTarget.src=f;}}
            alt={pants.name}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.34, filter: `grayscale(1) contrast(${vis.shadeContrast}) blur(0.15px)`, mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"] }}
          />

          {/* Optional overlays for pants */}
          {cuffSrc && (
            <>
              <div
                className="absolute inset-0"
                style={{ ...fabricMaskStyle(cuffSrc, "center", PANTS_CANVAS), opacity: fabricOpacity, filter: fabricFilter }}
              />
              <img
                src={shadeSrcWebP(cuffSrc as string)} onError={(e)=>{const f=shadeSrcPNG(cuffSrc as string); if(e.currentTarget.src!==f) e.currentTarget.src=f;}}
                alt="Cuffs"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ opacity: 0.16, filter: `grayscale(1) contrast(${Math.max(1.04, vis.shadeContrast - 0.1)})`, mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"] }}
              />
            </>
          )}
          {pantsPleatSrc && (
            <img src={pantsPleatSrc} alt="Pleats" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );
}





