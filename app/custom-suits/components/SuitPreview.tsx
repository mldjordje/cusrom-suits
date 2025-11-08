"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { NOISE_DATA, toneBlend, toneVisual, getToneBaseColor, ContrastLevel } from "../utils/visual";
import { cdnPair, shadingPair, specularPair, edgesPair, toTransparentSilhouette, ensureAssetAvailable } from "../utils/assets";
import { useFabrics } from "../hooks/useFabrics";
import { BaseLayer } from "./layers/BaseLayer";
import { FabricUnion } from "./layers/FabricUnion";
import { ShadingLayer } from "./layers/ShadingLayer";
import { SpecularLayer } from "./layers/SpecularLayer";
import { GlobalOverlay } from "./layers/GlobalOverlay";
import { BaseOutlines } from "./layers/BaseOutlines";

/* =====================================================================================
   CDN helpers (ostaju jer maske i strukturalni sprite-ovi su i dalje iz transparent/)
===================================================================================== */
const cdnTransparent = getTransparentCdnBase();
const JACKET_CANVAS = { w: 600, h: 733 } as const;
const PANTS_CANVAS = { w: 600, h: 350 } as const;

/* =====================================================================================
   Komponenta
===================================================================================== */

type Props = { config: SuitState; level?: ContrastLevel };

export default function SuitPreview({ config, level = "medium" }: Props) {
  const { fabrics, loading: fabricsLoading } = useFabrics();

  // Pan/zoom samo na teksturu tkanine (ne menja maske)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const currentSuit = useMemo(
    () => suits.find((s) => s.id === config.styleId) ?? null,
    [config.styleId]
  );

  const selectedLapel =
    currentSuit?.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit?.lapels?.[0];
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

  const suitLayers = useMemo(() => {
    if (!currentSuit?.layers) return [];
    return currentSuit.layers.map((layer) =>
      layer.id === "torso"
        ? { ...layer, src: swapLapelInPath(layer.src, selectedLapel?.id, selectedLapelWidth?.id) }
        : layer
    );
  }, [currentSuit, selectedLapel?.id, selectedLapelWidth?.id]);

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";

  const tb = toneBlend(selectedFabric?.tone, level);
  const vis = toneVisual(selectedFabric?.tone, level);

  const toneBaseColor = getToneBaseColor(selectedFabric?.tone);

  // Average color from fabric texture (to better match hue)
  const [fabricAvgColor, setFabricAvgColor] = useState<string | null>(null);
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [compositeBase, setCompositeBase] = useState<string | null>(null);
  const [compositeShading, setCompositeShading] = useState<string | null>(null);
  const [compositeSpecular, setCompositeSpecular] = useState<string | null>(null);
  const [compositeEdges, setCompositeEdges] = useState<string | null>(null);
  const [assetWarnings, setAssetWarnings] = useState<string[]>([]);
  const panZoom = { scale, offset };
  useEffect(() => {
    if (!fabricTexture) {
      setFabricAvgColor(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const w = 32,
          h = 32;
        c.width = w;
        c.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3];
          if (a < 10) continue;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          n++;
        }
        if (n > 0) {
          const toHex = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
          setFabricAvgColor(`#${toHex(r / n)}${toHex(g / n)}${toHex(b / n)}`);
        } else setFabricAvgColor(null);
      } catch {}
    };
    img.onerror = () => setFabricAvgColor(null);
    img.src = fabricTexture;
  }, [fabricTexture]);

  // Build a single union mask (PNG data URL) over torso+sleeves+bottom to eliminate any anti-alias seams
  useEffect(() => {
    const torso = suitLayers.find((x) => x.id === "torso");
    const sleevesL = suitLayers.find((x) => x.id === "sleeves");
    const bottomL = suitLayers.find((x) => x.id === "bottom");
    const parts = [torso, sleevesL, bottomL].filter(Boolean) as SuitLayer[];
    if (!parts.length) return setJacketUnionMask(null);

    let cancelled = false;
    (async () => {
      try {
        const c = document.createElement("canvas");
        c.width = JACKET_CANVAS.w;
        c.height = JACKET_CANVAS.h;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
        for (const L of parts) {
          // try webp then png
          const pair = cdnPair(L.src);
          const tryLoad = (url: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = url;
            });
          let img: HTMLImageElement | null = null;
          try {
            img = await tryLoad(pair.webp);
          } catch {
            try {
              img = await tryLoad(pair.png);
            } catch {}
          }
          if (!img) continue;
          const scale = Math.min(c.width / img.width, c.height / img.height);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const dx = Math.round((c.width - w) / 2);
          const dy = Math.round((c.height - h) / 2);
          // draw alpha as mask (opaque where sprite has pixels)
          ctx.drawImage(img, dx, dy, w, h);
        }
        if (!cancelled) setJacketUnionMask(c.toDataURL("image/png"));
      } catch {
        if (!cancelled) setJacketUnionMask(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [suitLayers]);

  useEffect(() => {
    if (!suitLayers.length) {
      setAssetWarnings([]);
      return;
    }
    let cancelled = false;
    const urls = new Set<string>();
    const enqueue = (pair: { webp: string; png: string }) => {
      urls.add(pair.webp);
      urls.add(pair.png);
    };
    suitLayers.forEach((layer) => {
      enqueue(cdnPair(layer.src));
      enqueue(shadingPair(layer.src));
      enqueue(specularPair(layer.src));
      enqueue(edgesPair(layer.src));
    });

    (async () => {
      const missing: string[] = [];
      for (const url of urls) {
        const ok = await ensureAssetAvailable(url);
        if (!ok) missing.push(url);
      }
      if (!cancelled) setAssetWarnings(missing);
    })();

    return () => {
      cancelled = true;
    };
  }, [suitLayers]);

  // Build unified sprite composites (base/shading/specular/edges) for jacket parts
  useEffect(() => {
    const parts = suitLayers.filter((x) => x.id === "torso" || x.id === "sleeves" || x.id === "bottom");
    if (!parts.length) return;

    let cancelled = false;
    const compose = async (
      picker: (l: SuitLayer) => { webp: string; png: string },
      w: number,
      h: number,
      customParts?: SuitLayer[]
    ) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.clearRect(0, 0, w, h);
      const loopParts = customParts || parts;
      for (const L of loopParts) {
        const p = picker(L);
        const tryLoad = (url: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
        let img: HTMLImageElement | null = null;
        try {
          img = await tryLoad(p.webp);
        } catch {
          try {
            img = await tryLoad(p.png);
          } catch {}
        }
        if (!img) continue;
        const scale = Math.min(w / img.width, h / img.height);
        const dw = Math.round(img.width * scale);
        const dh = Math.round(img.height * scale);
        const dx = Math.round((w - dw) / 2);
        const dy = Math.round((h - dh) / 2);
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      return c.toDataURL("image/png");
    };

    (async () => {
      const baseUrl = await compose((l) => cdnPair(l.src), JACKET_CANVAS.w, JACKET_CANVAS.h, parts);
      const shadingUrl = await compose((l) => shadingPair(l.src), JACKET_CANVAS.w, JACKET_CANVAS.h, parts);
      const specularUrl = await compose((l) => specularPair(l.src), JACKET_CANVAS.w, JACKET_CANVAS.h, parts);
      const edgesUrl = await compose((l) => edgesPair(l.src), JACKET_CANVAS.w, JACKET_CANVAS.h, parts);
      if (!cancelled) {
        setCompositeBase(baseUrl);
        setCompositeShading(shadingUrl);
        setCompositeSpecular(specularUrl);
        setCompositeEdges(edgesUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [suitLayers]);
  const interiorLayers: SuitLayer[] | undefined = (() => {
    const def = currentSuit?.interiors?.[0];
    const active = config.interiorId ?? def?.id;
    const found = currentSuit?.interiors?.find((i) => i.id === active);
    return Array.isArray(found?.layers) ? found.layers : undefined;
  })();
  /* -----------------------------------------------------------------------------
     Helperi za tkaninu (sa pan/zoom param.)
  ----------------------------------------------------------------------------- */
  const colorBaseMaskStyle = (src: string): React.CSSProperties => ({
    backgroundColor: fabricAvgColor || toneBaseColor,
    WebkitMaskImage: toTransparentSilhouette(src),
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    maskImage: toTransparentSilhouette(src),
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: "center",
    pointerEvents: "none",
  });

  const fabricWeaveOverlayStyle = (
    src: string,
    canvas: { w: number; h: number } = JACKET_CANVAS,
    options?: { opacity?: number; blend?: React.CSSProperties["mixBlendMode"]; scale?: number }
  ): React.CSSProperties => {
    const scaleFactor = options?.scale ?? vis.weaveSharpness;
    const bgSize = `${Math.round(canvas.w * panZoom.scale * scaleFactor)}px ${Math.round(
      canvas.h * panZoom.scale * scaleFactor
    )}px`;
    const bgPos = `${Math.round(offset.x)}px ${Math.round(offset.y)}px`;
    return {
      backgroundImage: fabricTexture ? `url(${fabricTexture})` : undefined,
      backgroundSize: bgSize,
      backgroundPosition: bgPos,
      backgroundRepeat: "repeat",
      opacity: options?.opacity ?? vis.textureOpacity,
      mixBlendMode: options?.blend ?? vis.textureBlend,
      filter: tb.filter,
      WebkitMaskImage: toTransparentSilhouette(src),
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      WebkitMaskPosition: "center",
      maskImage: toTransparentSilhouette(src),
      maskRepeat: "no-repeat",
      maskSize: "contain",
      maskPosition: "center",
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  const baseSpriteOverlayStyle = (
    src: string,
    blend: "multiply" | "soft-light" | "overlay" = "multiply",
    opacity = 0.35
  ): React.CSSProperties => {
    const sprite = cdnPair(src);
    return {
      backgroundImage: `url(${sprite.webp}), url(${sprite.png})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      backgroundPosition: "center",
      mixBlendMode: blend,
      opacity,
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  const shadingOverlayStyle = (src: string, opacity = vis.shadingOpacity): React.CSSProperties => {
    const sprite = shadingPair(src);
    return {
      backgroundImage: `url(${sprite.webp}), url(${sprite.png})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      backgroundPosition: "center",
      mixBlendMode: "multiply",
      opacity,
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  const specularOverlayStyle = (
    src: string,
    opacity = vis.specularOpacity,
    blendMode: React.CSSProperties["mixBlendMode"] = vis.specularBlend
  ): React.CSSProperties => {
    const sprite = specularPair(src);
    return {
      backgroundImage: `url(${sprite.webp}), url(${sprite.png})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      backgroundPosition: "center",
      mixBlendMode: blendMode,
      opacity,
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  const fineDetailStyle = (
    src: string,
    opacity = vis.detailOpacity,
    detailScale = vis.detailScale,
    canvas: { w: number; h: number } = JACKET_CANVAS
  ): React.CSSProperties => {
    const weavePx = Math.max(6, Math.round(canvas.h * detailScale));
    return {
      backgroundImage: fabricTexture ? `url(${fabricTexture})` : undefined,
      backgroundRepeat: "repeat",
      backgroundSize: `${weavePx}px ${weavePx}px`,
      backgroundPosition: `${Math.round(offset.x)}px ${Math.round(offset.y)}px`,
      opacity,
      mixBlendMode: "normal",
      filter: "contrast(1.04)",
      WebkitMaskImage: toTransparentSilhouette(src),
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      WebkitMaskPosition: "center",
      maskImage: toTransparentSilhouette(src),
      maskRepeat: "no-repeat",
      maskSize: "contain",
      maskPosition: "center",
      pointerEvents: "none",
    } as React.CSSProperties;
  };

  /* -----------------------------------------------------------------------------
     Pan/zoom handlers
  ----------------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------------
     Render redosled
  ----------------------------------------------------------------------------- */
  const pants = suitLayers.find((l) => l.id === "pants");
  const bodyLayers = suitLayers.filter((l) => l.id !== "pants");

  /* -----------------------------------------------------------------------------
     Simulirani shading/specular bez foldera:
     - global vignette (multiply)
     - top/bottom soft-light tok
     - centralni vertical specular (overlay)
     - edge glow (soft-light)
     - micro-noise (overlay)
     - per-part dodatni gradijenti (rukavi, ramena, rever)
  ----------------------------------------------------------------------------- */
  // Global overlays uklonjeni sa canvas-a da ne prave pozadinski halo izvan maske.
  // Zadr?avamo per-part naglaske i generisane mape.

  if (!currentSuit) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        Stil nije dostupan za prikaz.
      </div>
    );
  }

  if (!selectedFabric) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {fabricsLoading ? "Ucitavanje tkanina..." : "Odaberi tkaninu da vidis preview."}
      </div>
    );
  }

  /* =====================================================================================
     RENDER
  ====================================================================================== */
  const allJacketLayers = suitLayers.filter((x) => x.id === 'torso' || x.id === 'sleeves' || x.id === 'bottom');
  return (
    <div className="relative w-full select-none bg-white">
      {assetWarnings.length > 0 && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md bg-red-600/90 px-3 py-1 text-xs text-white shadow">
          Nedostaju sprite fajlovi ({assetWarnings.length})
        </div>
      )}
      <div
        className="relative mx-auto"
        data-testid="jacket-preview"
        style={{ width: '100%', aspectRatio: '600 / 733', maxWidth: 720 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {interiorLayers?.map((l) => (
          <img key={`int-${l.id}`} src={l.src} alt={l.name} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        ))}
        {config.showShirt && (
          <img
            src={`${cdnTransparent}shirt_to_jacket_open.png`}
            onError={(e) => {
              const local = '/assets/suits/transparent/shirt_to_jacket_open.png';
              if (e.currentTarget.src !== local) e.currentTarget.src = local;
            }}
            alt="Shirt"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
        <BaseLayer
          layers={allJacketLayers}
          resolve={(layer) => cdnPair(layer.src)}
          composite={compositeBase}
          mask={jacketUnionMask}
        />
        <FabricUnion
          layers={allJacketLayers}
          resolve={(layer) => cdnPair(layer.src)}
          fabricTexture={fabricTexture}
          textureStyle={{ ...tb, mixBlendMode: vis.textureBlend, opacity: vis.textureOpacity }}
          baseColor={toneBaseColor}
          fabricAvgColor={fabricAvgColor}
          panZoom={panZoom}
          canvas={JACKET_CANVAS}
          mask={jacketUnionMask}
          textureScale={vis.weaveSharpness}
        />
        {jacketUnionMask && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                `radial-gradient(70% 45% at 50% 0%, rgba(255,255,255,0.25), transparent 65%),` +
                `linear-gradient(180deg, rgba(0,0,0,0.25), transparent 35%)`,
              backgroundColor: vis.ambientTint,
              mixBlendMode: "soft-light",
              opacity: vis.ambientOpacity,
              WebkitMaskImage: `url(${jacketUnionMask})`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
              maskImage: `url(${jacketUnionMask})`,
              maskRepeat: "no-repeat",
              maskSize: "contain",
              maskPosition: "center",
            }}
          />
        )}
        <ShadingLayer
          opacity={vis.shadingOpacity}
          blendMode="multiply"
          mask={jacketUnionMask}
          composite={compositeShading}
        />
        <SpecularLayer
          opacity={vis.specularOpacity}
          blendMode={vis.specularBlend}
          mask={jacketUnionMask}
          composite={compositeSpecular}
        />
        <GlobalOverlay noiseData={NOISE_DATA} settings={vis} />
        <BaseOutlines opacity={vis.edgesOpacity} mask={jacketUnionMask} composite={compositeEdges} />
      </div>
      {/* ======================== PANTS CANVAS ======================== */}
      {pants && (
        <div className="relative mx-auto mt-2" style={{ width: '100%', aspectRatio: '600 / 350', maxWidth: 720 }}>
          {/* CLEAN FABRIC MODE - unified pants tone */}
          <div className="absolute inset-0" style={{ ...colorBaseMaskStyle(pants.src) }} />
          <div
            className="absolute inset-0"
            style={{
              ...fabricWeaveOverlayStyle(pants.src, PANTS_CANVAS, {
                opacity: vis.textureOpacity,
                blend: vis.textureBlend,
                scale: vis.weaveSharpness,
              }),
            }}
          />
          <div className="absolute inset-0" style={baseSpriteOverlayStyle(pants.src, 'multiply', 0.45)} />
          <div className="absolute inset-0" style={shadingOverlayStyle(pants.src, vis.shadingOpacity)} />
          <div className="absolute inset-0" style={specularOverlayStyle(pants.src, vis.specularOpacity, vis.specularBlend)} />
          <div className="absolute inset-0" style={{ ...fineDetailStyle(pants.src, vis.detailOpacity, vis.detailScale, PANTS_CANVAS) }} />
        </div>
      )}
    </div>
  );
}



