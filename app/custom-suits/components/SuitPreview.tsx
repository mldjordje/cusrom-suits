"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { NOISE_DATA, toneBlend, getToneConfig, getToneBaseColor, ContrastLevel, Tone } from "../utils/visual";
import { cdnPair, ensureAssetAvailable } from "../utils/assets";
import { useFabrics } from "../hooks/useFabrics";
import { BaseLayer } from "./layers/BaseLayer";
import { FabricUnion } from "./layers/FabricUnion";
import { GlobalOverlay } from "./layers/GlobalOverlay";

/* =====================================================================================
   CDN helpers (ostaju jer maske i strukturalni sprite-ovi su i dalje iz transparent/)
===================================================================================== */
const cdnTransparent = getTransparentCdnBase();
const SHIRT_PAIR = cdnPair("shirt_to_jacket_open.png");
const JACKET_CANVAS = { w: 600, h: 733 } as const;
const PANTS_CANVAS = { w: 600, h: 350 } as const;

type RGB = { r: number; g: number; b: number };

const HEX_COLOR = /^[0-9a-f]{6}$/i;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const normalizeHex = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!HEX_COLOR.test(raw)) return null;
  return `#${raw.toLowerCase()}`;
};

const hexToRgb = (value?: string | null): RGB | null => {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = (rgb: RGB) =>
  `#${clampChannel(rgb.r).toString(16).padStart(2, "0")}${clampChannel(rgb.g)
    .toString(16)
    .padStart(2, "0")}${clampChannel(rgb.b).toString(16).padStart(2, "0")}`;

const linearChannel = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (rgb: RGB) =>
  0.2126 * linearChannel(rgb.r) +
  0.7152 * linearChannel(rgb.g) +
  0.0722 * linearChannel(rgb.b);

const isNeutralTone = (rgb: RGB, tolerance = 12) => {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max - min <= tolerance;
};

const scaleRgb = (rgb: RGB, factor: number): RGB => ({
  r: clampChannel(rgb.r * factor),
  g: clampChannel(rgb.g * factor),
  b: clampChannel(rgb.b * factor),
});

const extractFabricHex = (fabric: any): string | null => {
  if (!fabric || typeof fabric !== "object") return null;
  const keys = [
    "colorHex",
    "color_hex",
    "color",
    "hex",
    "hexColor",
    "hex_color",
    "baseColor",
    "base_color",
    "dominantColor",
    "dominant_color",
  ];
  for (const key of keys) {
    const value = fabric[key];
    if (typeof value !== "string") continue;
    const normalized = normalizeHex(value);
    if (normalized) return normalized;
  }
  return null;
};

const computeFabricBaseColor = (
  avgColor: string | null,
  fallbackColor: string,
  tone?: Tone,
  overrideColor?: string | null
) => {
  const fallbackHex = normalizeHex(fallbackColor) ?? "#8f8f8f";
  const fallbackRgb = hexToRgb(fallbackHex);
  const candidateHex = normalizeHex(overrideColor ?? avgColor);
  if (!fallbackRgb) return fallbackHex;
  if (!candidateHex) return fallbackHex;
  const candidateRgb = hexToRgb(candidateHex);
  if (!candidateRgb) return fallbackHex;

  if (tone === "dark" && isNeutralTone(candidateRgb)) {
    const fallbackLum = relativeLuminance(fallbackRgb);
    const lum = relativeLuminance(candidateRgb);
    const delta = lum - fallbackLum;
    if (delta > 0.015) {
      const targetLum = fallbackLum + delta * 0.4;
      const factor = Math.max(0.25, Math.min(1, targetLum / lum));
      const adjusted = scaleRgb(candidateRgb, factor);
      return rgbToHex(adjusted);
    }
  }

  return candidateHex;
};

/* =====================================================================================
   Komponenta
===================================================================================== */

type LayerVisibility = Partial<Record<"fabric" | "style" | "vignette" | "ao", boolean>>;

type Props = {
  config: SuitState;
  level?: ContrastLevel;
  layerVisibility?: LayerVisibility;
  onAssetStatus?: (status: { missing: string[] }) => void;
};

export default function SuitPreview({ config, level = "medium", layerVisibility, onAssetStatus }: Props) {
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

  const styleOverlayLayers = useMemo(() => {
    if (!currentSuit) return [];
    const overlays: SuitLayer[] = [];
    const addSingle = (src?: string, key?: string, name?: string) => {
      if (!src) return;
      overlays.push({
        id: key ?? src,
        name: name ?? key ?? "style-layer",
        src,
      });
    };

    const selectedPocket =
        currentSuit.pockets?.find((p) => p.id === config.pocketId) ?? currentSuit.pockets?.[0];
    addSingle(selectedPocket?.src, `pocket-${selectedPocket?.id}`, selectedPocket?.name);

    const selectedBreast =
        currentSuit.breastPocket?.find((b) => b.id === config.breastPocketId) ?? currentSuit.breastPocket?.[0];
    if (selectedBreast?.layers?.length) {
      selectedBreast.layers.forEach((layer, index) => {
        overlays.push({
          ...layer,
          id: `${layer.id || "breast"}-${selectedBreast?.id ?? "default"}-${index}`,
        });
      });
    } else {
      addSingle(selectedBreast?.src, `breast-${selectedBreast?.id}`, selectedBreast?.name);
    }

    return overlays;
  }, [currentSuit, config.pocketId, config.breastPocketId]);

  const structuralJacketLayers = useMemo(
    () => suitLayers.filter((layer) => layer.id === "torso" || layer.id === "sleeves" || layer.id === "bottom"),
    [suitLayers]
  );

  const fabricLayers = useMemo(
    () => [...structuralJacketLayers, ...styleOverlayLayers],
    [structuralJacketLayers, styleOverlayLayers]
  );

  const pantsLayer = useMemo(() => suitLayers.find((l) => l.id === "pants") ?? null, [suitLayers]);

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";

  const tb = toneBlend(selectedFabric?.tone, level);
  const toneVis = getToneConfig(selectedFabric?.tone, level);

  const toneBaseColor = getToneBaseColor(selectedFabric?.tone);

  // Average color from fabric texture (to better match hue)
  const [fabricAvgColor, setFabricAvgColor] = useState<string | null>(null);
  const explicitFabricColor = useMemo(() => extractFabricHex(selectedFabric), [selectedFabric]);
  const fabricFillColor = useMemo(
    () =>
      computeFabricBaseColor(
        fabricAvgColor,
        toneBaseColor,
        selectedFabric?.tone as Tone | undefined,
        explicitFabricColor
      ),
    [fabricAvgColor, toneBaseColor, selectedFabric?.tone, explicitFabricColor]
  );
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [assetWarnings, setAssetWarnings] = useState<string[]>([]);
  const panZoom = { scale, offset };
  const showLayer = (key: keyof LayerVisibility) => (layerVisibility?.[key] ?? true) !== false;
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

  useEffect(() => {
    if (onAssetStatus) {
      onAssetStatus({ missing: assetWarnings });
    }
  }, [assetWarnings, onAssetStatus]);

  // Build a single union mask (PNG data URL) over all jacket + style layers to eliminate any anti-alias seams
  useEffect(() => {
    if (!fabricLayers.length) {
      setJacketUnionMask(null);
      return;
    }

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
        for (const layer of fabricLayers) {
          const pair = cdnPair(layer.src);
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
            } catch {
              img = null;
            }
          }
          if (!img) continue;
          const scale = Math.min(c.width / img.width, c.height / img.height);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const dx = Math.round((c.width - w) / 2);
          const dy = Math.round((c.height - h) / 2);
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
  }, [fabricLayers]);

  useEffect(() => {
    if (!fabricLayers.length && !pantsLayer) {
      setAssetWarnings([]);
      return;
    }
    let cancelled = false;
    const urls = new Set<string>();
    const enqueue = (pair: { webp: string; png: string } | null) => {
      if (!pair) return;
      urls.add(pair.webp);
      urls.add(pair.png);
    };
    [...fabricLayers, ...(pantsLayer ? [pantsLayer] : [])].forEach((layer) => {
      enqueue(cdnPair(layer.src));
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
  }, [fabricLayers, pantsLayer]);

  const interiorLayers: SuitLayer[] | undefined = (() => {
    const def = currentSuit?.interiors?.[0];
    const active = config.interiorId ?? def?.id;
    const found = currentSuit?.interiors?.find((i) => i.id === active);
    return Array.isArray(found?.layers) ? found.layers : undefined;
  })();
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
  const allJacketLayers = structuralJacketLayers;
  return (
    <div className="relative w-full select-none">
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
            src={SHIRT_PAIR.webp}
            onError={(e) => {
              if (e.currentTarget.src !== SHIRT_PAIR.png) {
                e.currentTarget.src = SHIRT_PAIR.png;
              }
            }}
            alt="Shirt"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}
        <BaseLayer
          layers={allJacketLayers}
          resolve={(layer) => cdnPair(layer.src)}
        />
        {showLayer("style") && styleOverlayLayers.length > 0 && (
          <BaseLayer
            layers={styleOverlayLayers}
            resolve={(layer) => cdnPair(layer.src)}
            blendMode="normal"
          />
        )}
        {showLayer("fabric") && (
          <FabricUnion
            layers={showLayer("style") ? fabricLayers : allJacketLayers}
            resolve={(layer) => cdnPair(layer.src)}
            fabricTexture={fabricTexture}
            textureStyle={{
              filter: `${tb.filter} brightness(1.03) contrast(1.08) saturate(0.92)`,
              mixBlendMode: toneVis.fabric.blend,
              opacity: toneVis.fabric.opacity,
            }}
            baseColor={toneBaseColor}
            fabricAvgColor={fabricFillColor}
            panZoom={panZoom}
            canvas={JACKET_CANVAS}
            mask={jacketUnionMask}
            textureScale={toneVis.weaveSharpness}
          />
        )}
        {jacketUnionMask && showLayer("ao") && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "multiply",
              opacity: toneVis.ambientOcclusion,
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, transparent 85%)",
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
        {showLayer("vignette") && (
          <GlobalOverlay noiseData={NOISE_DATA} settings={toneVis} mask={jacketUnionMask} />
        )}
      </div>
      {/* ======================== PANTS CANVAS ======================== */}
      {pantsLayer && (
        <div className="relative mx-auto mt-2" style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 720 }}>
          <BaseLayer layers={[pantsLayer]} resolve={(layer) => cdnPair(layer.src)} />
          {showLayer("fabric") && (
            <FabricUnion
              layers={[pantsLayer]}
              resolve={(layer) => cdnPair(layer.src)}
              fabricTexture={fabricTexture}
              textureStyle={{
                filter: `${tb.filter} brightness(1.03) contrast(1.08) saturate(0.92)`,
                mixBlendMode: toneVis.fabric.blend,
                opacity: toneVis.fabric.opacity,
              }}
              baseColor={toneBaseColor}
              fabricAvgColor={fabricFillColor}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              textureScale={toneVis.weaveSharpness}
            />
          )}
          {showLayer("vignette") && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                mixBlendMode: "multiply",
                opacity: toneVis.vignette * 0.8,
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.18) 10%, transparent 60%)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}



