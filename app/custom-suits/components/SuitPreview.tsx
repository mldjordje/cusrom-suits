"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { toneBlend, getToneConfig, getToneBaseColor, ContrastLevel, Tone, NOISE_DATA } from "../utils/visual";
import { cdnPair, ensureAssetAvailable, edgesPair, shadingPair, specularPair } from "../utils/assets";
import { useFabrics } from "../hooks/useFabrics";
import { useButtons } from "../hooks/useButtons";
import { useLinings } from "../hooks/useLinings";
import { ButtonLayout, ButtonPosition, getFallbackPositions } from "../data/buttonPositions";
import { BaseLayer } from "./layers/BaseLayer";
import { FabricUnion } from "./layers/FabricUnion";
import { GlobalOverlay } from "./layers/GlobalOverlay";
import { LightingPasses } from "./layers/LightingPasses";

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

const rgbToHsl = ({ r, g, b }: RGB) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
};

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }): RGB => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  const map = (r1: number, g1: number, b1: number): RGB => ({
    r: clampChannel((r1 + m) * 255),
    g: clampChannel((g1 + m) * 255),
    b: clampChannel((b1 + m) * 255),
  });

  if (h < 60) return map(c, x, 0);
  if (h < 120) return map(x, c, 0);
  if (h < 180) return map(0, c, x);
  if (h < 240) return map(0, x, c);
  if (h < 300) return map(x, 0, c);
  return map(c, 0, x);
};

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
  const candidateHex = normalizeHex(overrideColor ?? avgColor);
  return candidateHex ?? fallbackHex;
};

const enhanceFabricColor = (hex: string, tone: Tone) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb);
  // Ako je tkanina gotovo neutralna (crna/siva), ne dodaj saturaciju da ne povuce braon nijansu
  const neutral = isNeutralTone(rgb, 10);
  if (neutral) {
    const lum = relativeLuminance(rgb);
    const lightnessBoost =
      tone === "dark"
        ? lum < 0.12
          ? -0.05
          : 0
        : tone === "light"
          ? 0.04
          : 0.03;
    const neutralized = hslToRgb({
      h,
      s: 0,
      l: Math.min(1, Math.max(0, l + lightnessBoost)),
    });
    return rgbToHex(neutralized);
  }

  const saturationBoost = tone === "dark" ? 0.18 : tone === "light" ? 0.08 : 0.14;
  const lightnessBoost = tone === "dark" ? 0.08 : tone === "light" ? 0.04 : 0.06;
  const vivid = hslToRgb({
    h,
    s: Math.min(1, s + saturationBoost),
    l: Math.min(0.82, l + lightnessBoost),
  });
  return rgbToHex(vivid);
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
  const { buttons } = useButtons();
  const { linings } = useLinings(config.styleId);
  const [buttonLayouts, setButtonLayouts] = useState<ButtonLayout[]>([]);

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

  const selectedCuff = useMemo(
    () => currentSuit?.cuffs?.find((c) => c.id === config.cuffId) ?? currentSuit?.cuffs?.[0],
    [currentSuit, config.cuffId]
  );

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

  const detailLayers = useMemo(
    () => [...structuralJacketLayers, ...styleOverlayLayers],
    [structuralJacketLayers, styleOverlayLayers]
  );
  const fabricMaskLayers = useMemo(() => structuralJacketLayers, [structuralJacketLayers]);

  const pantsLayer = useMemo(() => suitLayers.find((l) => l.id === "pants") ?? null, [suitLayers]);
  const cuffsLayer = useMemo(() => {
    if (!selectedCuff?.src) return null;
    return { id: selectedCuff.id || "cuff-overlay", name: selectedCuff.name, src: selectedCuff.src } as SuitLayer;
  }, [selectedCuff]);
  const pantsFabricLayers = useMemo(() => {
    const layers: SuitLayer[] = [];
    if (pantsLayer) layers.push(pantsLayer);
    if (cuffsLayer && cuffsLayer.src !== pantsLayer?.src) layers.push(cuffsLayer);
    return layers;
  }, [pantsLayer, cuffsLayer]);
  const pantsOverlayLayers = useMemo(
    () =>
      pantsLayer
        ? [
            {
              id: "pants-front-pocket",
              name: "Front Pocket",
              src: "/assets/suits/transparent/front_pocket+diagonal.png",
            },
          ]
        : [],
    [pantsLayer]
  );

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";
  const textureStrength = useMemo(() => {
    const raw = (selectedFabric as any)?.textureStrength;
    const normalized = typeof raw === "number" ? raw : 0.18;
    return Math.max(0, Math.min(0.35, normalized * 0.75));
  }, [selectedFabric]);
  const textureScaleBoost = (selectedFabric as any)?.textureScale ?? 0.85;
  const useTexture = Boolean(fabricTexture && textureStrength > 0);

  const tb = toneBlend(selectedFabric?.tone, level);
  const toneVis = getToneConfig(selectedFabric?.tone, level);
  const softenedTone = useMemo(
    () => ({
      ...toneVis,
      fabric: { ...toneVis.fabric, opacity: toneVis.fabric.opacity * 0.65 },
      weaveSharpness: toneVis.weaveSharpness * 0.85,
      ambientOcclusion: toneVis.ambientOcclusion * 0.7,
      noise: toneVis.noise * 0.4,
      vignette: toneVis.vignette * 0.6,
      highlightTop: toneVis.highlightTop * 0.6,
      highlightBottom: toneVis.highlightBottom * 0.6,
      detailOpacity: toneVis.detailOpacity * 0.5,
      detailScale: toneVis.detailScale * 0.85,
      edgesOpacity: toneVis.edgesOpacity * 0.7,
      outlinesOpacity: toneVis.outlinesOpacity * 0.7,
    }),
    [toneVis]
  );
  const detailTone = useMemo(
    () => ({
      ...toneVis,
      shading: { ...toneVis.shading, opacity: toneVis.shading.opacity * 0.9 },
      specular: { ...toneVis.specular, opacity: toneVis.specular.opacity * 0.85 },
      edgesOpacity: toneVis.edgesOpacity * 0.85,
      outlinesOpacity: toneVis.outlinesOpacity * 0.85,
      noise: toneVis.noise * 0.6,
      vignette: toneVis.vignette * 0.7,
      highlightTop: toneVis.highlightTop * 0.75,
      highlightBottom: toneVis.highlightBottom * 0.75,
    }),
    [toneVis]
  );
  const structuralShadingOpacity = useMemo(
    () => Math.min(0.55, detailTone.shading.opacity * 1.05),
    [detailTone.shading.opacity]
  );
  const structuralSpecularOpacity = useMemo(
    () => Math.min(0.25, detailTone.specular.opacity * 1.2),
    [detailTone.specular.opacity]
  );
  const structuralEdgesOpacity = useMemo(() => detailTone.edgesOpacity * 0.6, [detailTone.edgesOpacity]);
  const styleShadingOpacity = useMemo(
    () => Math.min(0.5, detailTone.shading.opacity * 0.9),
    [detailTone.shading.opacity]
  );
  const styleSpecularOpacity = useMemo(
    () => Math.min(0.22, detailTone.specular.opacity * 0.95),
    [detailTone.specular.opacity]
  );
  const styleEdgesOpacity = useMemo(() => detailTone.edgesOpacity * 0.7, [detailTone.edgesOpacity]);
  const styleBaseOverlayOpacity = useMemo(
    () => Math.min(0.18, detailTone.shading.opacity * 0.25),
    [detailTone.shading.opacity]
  );

  const toneBaseColor = getToneBaseColor(selectedFabric?.tone);
  const fabricTone = (selectedFabric?.tone as Tone | undefined) ?? "medium";
  const fabricTextureFilter = useMemo(() => {
    if (fabricTone === "dark") {
      return `${tb.filter} brightness(0.99) contrast(1.02) saturate(1.02)`;
    }
    if (fabricTone === "light") {
      return `${tb.filter} brightness(1.02) contrast(1.03) saturate(1.04)`;
    }
    return `${tb.filter} brightness(1.01) contrast(1.04) saturate(1.03)`;
  }, [fabricTone, tb.filter]);
  const fabricTextureOpacity = useMemo(
    () =>
      useTexture
        ? Math.min(0.7, softenedTone.fabric.opacity * (fabricTone === "dark" ? 0.8 : 0.72)) * textureStrength
        : 0,
    [fabricTone, softenedTone.fabric.opacity, textureStrength, useTexture]
  );
  const fabricTextureStyle = useMemo(
    () => ({
      filter: fabricTextureFilter,
      mixBlendMode: fabricTone === "dark" ? "overlay" : softenedTone.fabric.blend,
      opacity: fabricTextureOpacity,
    }),
    [fabricTextureFilter, fabricTone, fabricTextureOpacity, softenedTone.fabric.blend]
  );
  const fabricTextureScale = useMemo(
    () => softenedTone.weaveSharpness * (fabricTone === "dark" ? 0.8 : 0.7) * textureScaleBoost,
    [fabricTone, softenedTone.weaveSharpness, textureScaleBoost]
  );
  const needsDarkBoost = fabricTone === "dark";
  const photoOverlayTone = useMemo(
    () => ({
      ...detailTone,
      noise: detailTone.noise * 0.2,
      vignette: detailTone.vignette * 0.7,
      highlightTop: detailTone.highlightTop * 0.8,
      highlightBottom: detailTone.highlightBottom * 0.7,
    }),
    [detailTone]
  );
  const jacketLighting = useMemo(() => {
    const intensity = fabricTone === "light" ? 0.92 : fabricTone === "dark" ? 1.02 : 0.98;
    const shadow = fabricTone === "dark" ? 1.0 : 0.9;
    const specular = Math.min(0.16, structuralSpecularOpacity * 0.7);
    const opacity = fabricTone === "dark" ? 0.34 : 0.3;
    return { intensity, shadow, specular, opacity };
  }, [fabricTone, structuralSpecularOpacity]);
  const pantsLighting = useMemo(() => {
    const intensity = fabricTone === "light" ? 0.7 : fabricTone === "dark" ? 0.82 : 0.78;
    const shadow = fabricTone === "dark" ? 0.88 : 0.78;
    const specular = Math.min(0.12, structuralSpecularOpacity * 0.6);
    const opacity = fabricTone === "dark" ? 0.28 : 0.26;
    return { intensity, shadow, specular, opacity };
  }, [fabricTone, structuralSpecularOpacity]);

  // Average color from fabric texture (to better match hue)
  const [fabricAvgColor, setFabricAvgColor] = useState<string | null>(null);
  const explicitFabricColor = useMemo(() => extractFabricHex(selectedFabric), [selectedFabric]);
  const fabricFillColorBase = useMemo(
    () =>
      computeFabricBaseColor(fabricAvgColor, toneBaseColor, selectedFabric?.tone as Tone | undefined, explicitFabricColor),
    [fabricAvgColor, toneBaseColor, selectedFabric?.tone, explicitFabricColor]
  );
  const fabricFillColor = useMemo(
    () => enhanceFabricColor(fabricFillColorBase, fabricTone),
    [fabricFillColorBase, fabricTone]
  );
  const fabricBaseRgb = useMemo(() => hexToRgb(fabricFillColorBase), [fabricFillColorBase]);
  const fabricLuminance = useMemo(
    () => (fabricBaseRgb ? relativeLuminance(fabricBaseRgb) : 1),
    [fabricBaseRgb]
  );
  const isBlackFabric = fabricTone === "dark" && fabricLuminance < 0.12;
  const darkBoostOpacity = isBlackFabric ? 0.4 : 0.26;
  const darkBoostColor = isBlackFabric ? "#020202" : "#080808";
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [maskBuilding, setMaskBuilding] = useState(false);
  const [pantsUnionMask, setPantsUnionMask] = useState<string | null>(null);
  const [pantsMaskBuilding, setPantsMaskBuilding] = useState(false);
  const [assetWarnings, setAssetWarnings] = useState<string[]>([]);
  const panZoom = { scale, offset };
  const showLayer = (key: keyof LayerVisibility) => (layerVisibility?.[key] ?? true) !== false;
  useEffect(() => {
    let cancelled = false;
    fetch("/api/button-positions", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        setButtonLayouts(list.length ? list : getFallbackPositions(config.styleId));
      })
      .catch(() => {
        if (cancelled) return;
        setButtonLayouts(getFallbackPositions(config.styleId));
      });
    return () => {
      cancelled = true;
    };
  }, [config.styleId]);
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

  // Build a single union mask (PNG data URL) over the jacket silhouette to eliminate any anti-alias seams
  useEffect(() => {
    if (!fabricMaskLayers.length) {
      setJacketUnionMask(null);
      return;
    }

    let cancelled = false;
    setMaskBuilding(true);
    (async () => {
      try {
        const c = document.createElement("canvas");
        c.width = JACKET_CANVAS.w;
        c.height = JACKET_CANVAS.h;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
        for (const layer of fabricMaskLayers) {
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
      } finally {
        if (!cancelled) setMaskBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
      setMaskBuilding(false);
    };
  }, [fabricMaskLayers]);

  // Build a union mask over the pants silhouette to avoid halo/background bleed
  useEffect(() => {
    if (!pantsFabricLayers.length) {
      setPantsUnionMask(null);
      return;
    }

    let cancelled = false;
    setPantsMaskBuilding(true);
    (async () => {
      try {
        const c = document.createElement("canvas");
        c.width = PANTS_CANVAS.w;
        c.height = PANTS_CANVAS.h;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
        for (const layer of pantsFabricLayers) {
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
        if (!cancelled) setPantsUnionMask(c.toDataURL("image/png"));
      } catch {
        if (!cancelled) setPantsUnionMask(null);
      } finally {
        if (!cancelled) setPantsMaskBuilding(false);
      }
    })();

    return () => {
      cancelled = true;
      setPantsMaskBuilding(false);
    };
  }, [pantsFabricLayers]);

  useEffect(() => {
    if (!detailLayers.length && !pantsLayer) {
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
    [
      ...detailLayers,
      ...pantsOverlayLayers,
      ...(pantsFabricLayers.length ? pantsFabricLayers : pantsLayer ? [pantsLayer] : []),
    ].forEach((layer) => {
        enqueue(cdnPair(layer.src));
      }
    );

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
  }, [detailLayers, pantsOverlayLayers, pantsFabricLayers, pantsLayer]);

  const interiorOptions = useMemo(() => {
    const fromRemote =
      linings?.map((l) => ({
        id: l.id,
        name: l.name,
        texture: (l as any)?.texture,
        layers: [
          l.base ? ({ id: "interior_base", name: "Base", src: l.base } as SuitLayer) : null,
          l.left ? ({ id: "interior_left", name: "Left", src: l.left } as SuitLayer) : null,
          l.right ? ({ id: "interior_right", name: "Right", src: l.right } as SuitLayer) : null,
        ].filter(Boolean) as SuitLayer[],
      })) || [];
    if (fromRemote.length) return fromRemote;
    return currentSuit?.interiors || [];
  }, [linings, currentSuit?.interiors]);

  const activeInterior = (() => {
    const def = interiorOptions?.[0];
    const active = config.interiorId ?? def?.id;
    return interiorOptions?.find((i) => i.id === active) || def;
  })();
  const interiorLayers: SuitLayer[] | undefined =
    Array.isArray(activeInterior?.layers) && activeInterior.layers.length
      ? activeInterior.layers
      : currentSuit?.interiors?.[0]?.layers;
  const activeInteriorTexture = (activeInterior as any)?.texture as string | undefined;
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
        {fabricsLoading ? "Uitavanje tkanina..." : "Odaberi tkaninu da vidi prikaz."}
      </div>
    );
  }

  /* =====================================================================================
     RENDER
  ====================================================================================== */
  const activeButton =
    buttons.find((b: any) => String(b.id) === String(config.buttonId)) || buttons[0] || null;
  const frontLayout =
    buttonLayouts.find((l) => l.styleId === currentSuit.id && (l.area === "front" || !l.area)) ||
    getFallbackPositions(currentSuit.id).find((l) => l.area === "front");
  const jacketButtons: ButtonPosition[] = frontLayout?.positions || [];
  const pantsLayout =
    buttonLayouts.find((l) => l.styleId === currentSuit.id && (l.area === "pants" || l.area === "back_pocket")) ||
    getFallbackPositions(currentSuit.id).find((l) => l.area === "pants" || l.area === "back_pocket");
  const pantsButtons: ButtonPosition[] = pantsLayout?.positions || [];

  const includeStyle = showLayer("style");
  const jacketBaseLayers = structuralJacketLayers;
  const jacketDetailStructureLayers = structuralJacketLayers;
  const jacketDetailStyleLayers = includeStyle ? styleOverlayLayers : [];
  const pantsMaskPair = pantsLayer ? cdnPair(pantsLayer.src) : null;
  const pantsBaseLayers =
    pantsFabricLayers.length ? pantsFabricLayers : pantsLayer ? [pantsLayer] : [];
  const pantsDetailLayers = pantsBaseLayers;
  const pantsStyleLayers = includeStyle ? pantsOverlayLayers : [];
  const jacketMask = jacketUnionMask;
  const pantsMask = pantsUnionMask ?? pantsMaskPair?.png ?? null;
  const jacketShadowClass = "drop-shadow-[0_32px_50px_rgba(15,23,42,0.18)]";
  const pantsShadowClass = "drop-shadow-[0_18px_30px_rgba(15,23,42,0.16)]";
  return (
    <div className="relative w-full select-none">
      <div className="relative mx-auto w-full max-w-[580px] sm:max-w-[540px]">
        <div
          className={`relative mx-auto w-full origin-top transform scale-[0.86] sm:scale-[0.86] lg:scale-[0.86] ${jacketShadowClass}`}
          data-testid="jacket-preview"
          style={{ width: "100%", aspectRatio: "600 / 733", maxWidth: 560 }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
        {(maskBuilding || pantsMaskBuilding) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[32px] bg-white/60 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          </div>
        )}
        {activeInteriorTexture && interiorLayers?.length
          ? interiorLayers.map((l) => {
            const pair = cdnPair(l.src);
            const maskUrl = pair?.png || l.src;
            return (
              <div
                key={`int-${l.id}`}
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url(${activeInteriorTexture})`,
                    backgroundSize: "140% auto",
                    backgroundRepeat: "repeat",
                    mixBlendMode: "multiply",
                    opacity: 0.95,
                    WebkitMaskImage: `url(${maskUrl})`,
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    WebkitMaskPosition: "center",
                    maskImage: `url(${maskUrl})`,
                    maskRepeat: "no-repeat",
                    maskSize: "contain",
                    maskPosition: "center",
                  }}
                />
              );
            })
          : interiorLayers?.map((l) => (
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
        {showLayer("fabric") && (
          <BaseLayer
            layers={jacketBaseLayers}
            resolve={(layer) => cdnPair(layer.src)}
            blendMode="normal"
            opacity={0.95}
            mask={jacketMask}
          />
        )}
        {showLayer("fabric") && (
          <FabricUnion
            layers={fabricMaskLayers}
            resolve={(layer) => cdnPair(layer.src)}
            fabricTexture={useTexture ? fabricTexture : undefined}
            textureStyle={fabricTextureStyle}
            baseColor={fabricFillColor || toneBaseColor}
            fabricAvgColor={fabricFillColor}
            baseBlendMode="color"
            baseOpacity={0.95}
            panZoom={panZoom}
            canvas={JACKET_CANVAS}
            mask={jacketMask}
            textureScale={fabricTextureScale}
          />
        )}
        {needsDarkBoost && jacketMask && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "multiply",
              opacity: darkBoostOpacity,
              backgroundColor: darkBoostColor,
              WebkitMaskImage: `url(${jacketMask})`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
              maskImage: `url(${jacketMask})`,
              maskRepeat: "no-repeat",
              maskSize: "contain",
              maskPosition: "center",
            }}
          />
        )}
        {includeStyle && styleOverlayLayers.length > 0 && (
          <BaseLayer
            layers={styleOverlayLayers}
            resolve={(layer) => cdnPair(layer.src)}
            blendMode="soft-light"
            opacity={styleBaseOverlayOpacity}
            mask={jacketMask}
          />
        )}
        {showLayer("fabric") && jacketDetailStructureLayers.length > 0 && (
          <>
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={(layer) => shadingPair(layer.src)}
              blendMode={detailTone.shading.blend}
              opacity={structuralShadingOpacity}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={(layer) => specularPair(layer.src)}
              blendMode={detailTone.specular.blend}
              opacity={structuralSpecularOpacity * 0.7}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={(layer) => edgesPair(layer.src)}
              blendMode="multiply"
              opacity={structuralEdgesOpacity}
              mask={jacketMask}
            />
          </>
        )}
        {showLayer("fabric") && jacketDetailStyleLayers.length > 0 && (
          <>
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={(layer) => shadingPair(layer.src)}
              blendMode={detailTone.shading.blend}
              opacity={styleShadingOpacity}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={(layer) => specularPair(layer.src)}
              blendMode={detailTone.specular.blend}
              opacity={styleSpecularOpacity * 0.7}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={(layer) => edgesPair(layer.src)}
              blendMode="multiply"
              opacity={styleEdgesOpacity}
              mask={jacketMask}
            />
          </>
        )}
        {jacketMask && showLayer("ao") && (
          <LightingPasses
            mask={jacketMask}
            canvas={JACKET_CANVAS}
            intensity={jacketLighting.intensity}
            shadow={jacketLighting.shadow}
            specular={jacketLighting.specular}
            opacity={jacketLighting.opacity}
          />
        )}
        {jacketMask && showLayer("vignette") && (
          <GlobalOverlay noiseData={NOISE_DATA} settings={photoOverlayTone} mask={jacketMask} />
        )}
        {activeButton?.image_url &&
          jacketButtons.map((pos, idx) => (
            <img
              key={`btn-${idx}`}
              src={activeButton.image_url}
              alt={activeButton.name || "Button"}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                width: `${((pos.size ?? 0.022) * 100).toFixed(2)}%`,
                transform: "translate(-50%, -50%)",
                mixBlendMode: "multiply",
                opacity: 0.9,
                filter: "saturate(0.9) contrast(1.05)",
                borderRadius: "50%",
                objectFit: "contain",
              }}
            />
          ))}
      </div>
    </div>
    {/* ======================== PANTS CANVAS ======================== */}
      {pantsLayer && (
        <div
          className={`relative mx-auto -mt-20 w-full max-w-[560px] origin-top transform scale-[0.92] sm:-mt-16 sm:scale-[0.92] lg:-mt-12 lg:scale-[0.92] ${pantsShadowClass}`}
          style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 520 }}
        >
          {cuffsLayer && cuffsLayer.src !== pantsLayer.src && (
            <BaseLayer
              layers={[cuffsLayer]}
              resolve={(layer) => cdnPair(layer.src)}
              blendMode="soft-light"
              opacity={0.8}
            />
          )}
          {showLayer("fabric") && (
            <BaseLayer
              layers={[pantsLayer]}
              resolve={(layer) => cdnPair(layer.src)}
              blendMode="normal"
              opacity={0.95}
              mask={pantsMask}
            />
          )}
          {showLayer("fabric") && (
            <FabricUnion
              layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
              resolve={(layer) => cdnPair(layer.src)}
              fabricTexture={useTexture ? fabricTexture : undefined}
              textureStyle={fabricTextureStyle}
              baseColor={fabricFillColor || toneBaseColor}
              fabricAvgColor={fabricFillColor}
              baseBlendMode="color"
              baseOpacity={0.95}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              mask={pantsMask}
              textureScale={fabricTextureScale}
            />
          )}
          {includeStyle && pantsOverlayLayers.length > 0 && (
            <BaseLayer
              layers={pantsOverlayLayers}
              resolve={(layer) => cdnPair(layer.src)}
              blendMode="soft-light"
              opacity={styleBaseOverlayOpacity * 0.8}
              mask={pantsMask}
            />
          )}
          {needsDarkBoost && pantsMask && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                mixBlendMode: "multiply",
                opacity: darkBoostOpacity,
                backgroundColor: darkBoostColor,
                WebkitMaskImage: `url(${pantsMask})`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                WebkitMaskPosition: "center",
                maskImage: `url(${pantsMask})`,
                maskRepeat: "no-repeat",
                maskSize: "contain",
                maskPosition: "center",
              }}
            />
          )}
          {showLayer("fabric") && pantsDetailLayers.length > 0 && (
            <>
              <BaseLayer
                layers={pantsDetailLayers}
                resolve={(layer) => shadingPair(layer.src)}
                blendMode={detailTone.shading.blend}
                opacity={structuralShadingOpacity * 0.9}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsDetailLayers}
                resolve={(layer) => specularPair(layer.src)}
                blendMode={detailTone.specular.blend}
                opacity={structuralSpecularOpacity * 0.6}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsDetailLayers}
                resolve={(layer) => edgesPair(layer.src)}
                blendMode="multiply"
                opacity={structuralEdgesOpacity}
                mask={pantsMask}
              />
            </>
          )}
          {showLayer("fabric") && pantsStyleLayers.length > 0 && (
            <>
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={(layer) => shadingPair(layer.src)}
                blendMode={detailTone.shading.blend}
                opacity={styleShadingOpacity * 0.85}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={(layer) => specularPair(layer.src)}
                blendMode={detailTone.specular.blend}
                opacity={styleSpecularOpacity * 0.6}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={(layer) => edgesPair(layer.src)}
                blendMode="multiply"
                opacity={styleEdgesOpacity * 0.9}
                mask={pantsMask}
              />
            </>
          )}
          {pantsMask && showLayer("ao") && (
            <LightingPasses
              mask={pantsMask}
              canvas={PANTS_CANVAS}
              intensity={pantsLighting.intensity}
              shadow={pantsLighting.shadow}
              specular={pantsLighting.specular}
              opacity={pantsLighting.opacity}
            />
          )}
          {pantsMask && showLayer("vignette") && (
            <GlobalOverlay noiseData={NOISE_DATA} settings={photoOverlayTone} mask={pantsMask} />
          )}
          {activeButton?.image_url &&
            pantsButtons.map((pos, idx) => (
              <img
                key={`pant-btn-${idx}`}
                src={activeButton.image_url}
                alt={activeButton.name || "Button"}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  width: `${((pos.size ?? 0.018) * 100).toFixed(2)}%`,
                  transform: "translate(-50%, -50%)",
                  mixBlendMode: "multiply",
                  opacity: 0.9,
                  filter: "saturate(0.9) contrast(1.05)",
                  borderRadius: "50%",
                  objectFit: "contain",
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
