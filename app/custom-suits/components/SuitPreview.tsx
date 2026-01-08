"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { toneBlend, getToneConfig, getToneBaseColor, ContrastLevel, Tone, NOISE_DATA } from "../utils/visual";
import {
  cdnPair,
  ensureAssetAvailable,
  edgesPair,
  photoPair,
  shadingPair,
  specularPair,
  toTransparentSilhouette,
} from "../utils/assets";
import { useButtons } from "../hooks/useButtons";
import { useLinings } from "../hooks/useLinings";
import { ButtonLayout, ButtonPosition, getFallbackPositions } from "../data/buttonPositions";
import { BaseLayer } from "./layers/BaseLayer";
import { FabricUnion } from "./layers/FabricUnion";
import { GlobalOverlay } from "./layers/GlobalOverlay";
import { LightingPasses } from "./layers/LightingPasses";
import { spriteBackground } from "./layers/types";

/* =====================================================================================
   CDN helpers (ostaju jer maske i strukturalni sprite-ovi su i dalje iz transparent/)
===================================================================================== */
const cdnTransparent = getTransparentCdnBase();
const SHIRT_PAIR = cdnPair("shirt_to_jacket_open.png");
const JACKET_CANVAS = { w: 600, h: 733 } as const;
const PANTS_CANVAS = { w: 600, h: 350 } as const;
const MASK_BLEED_PX = 1.1;
const TEXTURE_TILE_PX = 90;
const TEXTURE_TILE_CANVAS_SCALE = 0.12;
const TEXTURE_TILE_CANVAS_MAX = 280;
const STRIPE_ANALYSIS_SIZE = 80;
const TEXTURE_SCALE_GLOBAL = 1;
const TEXTURE_SCALE_MIN = 0.08;
const TEXTURE_SCALE_MAX = 1.1;

const FABRIC_AVG_CACHE = new Map<string, string | null>();
const FABRIC_TILE_CACHE = new Map<string, string>();
const FABRIC_STRIPE_CACHE = new Map<string, StripeHint>();
const JACKET_MASK_CACHE = new Map<string, string>();
const PANTS_MASK_CACHE = new Map<string, string>();

type RGB = { r: number; g: number; b: number };
type StripeOrientation = "vertical" | "horizontal" | "none";
type StripeHint = { strength: number; orientation: StripeOrientation; contrast: number };

const EMPTY_STRIPE: StripeHint = { strength: 0, orientation: "none", contrast: 0 };

const HEX_COLOR = /^[0-9a-f]{6}$/i;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

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

const computeStripeHint = (data: Uint8ClampedArray, w: number, h: number): StripeHint => {
  if (!data.length || w < 2 || h < 2) return EMPTY_STRIPE;
  const prevRow = new Float32Array(w);
  let edgeX = 0;
  let edgeY = 0;
  let sum = 0;
  let sumSq = 0;
  const pixels = w * h;

  for (let y = 0; y < h; y++) {
    let prevLum = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      sum += lum;
      sumSq += lum * lum;
      if (x > 0) edgeX += Math.abs(lum - prevLum);
      if (y > 0) edgeY += Math.abs(lum - prevRow[x]);
      prevRow[x] = lum;
      prevLum = lum;
    }
  }

  const mean = sum / pixels;
  const variance = Math.max(0, sumSq / pixels - mean * mean);
  const contrast = Math.min(1, Math.sqrt(variance) / 255);
  const edgeAvg = (edgeX + edgeY) / (pixels * 255);
  const ratio = edgeY < 0.0001 ? 999 : edgeX / edgeY;
  let orientation: StripeOrientation = "none";
  if (ratio > 1.2) orientation = "vertical";
  else if (ratio < 0.83) orientation = "horizontal";

  const strength = clamp(edgeAvg * 1.5 + contrast * 0.9, 0, 1);
  if (strength < 0.12) orientation = "none";
  return { strength, orientation, contrast };
};

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

const tuneFabricColor = (hex: string, luminance: number, saturation: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  const satAdj = saturation > 0.55 ? 0.88 : saturation < 0.18 ? 1.06 : 0.98;
  const lightAdj = luminance < 0.12 ? 0.06 : luminance > 0.65 ? -0.04 : 0.02;
  const tuned = hslToRgb({
    h: hsl.h,
    s: clamp(hsl.s * satAdj, 0, 1),
    l: clamp(hsl.l + lightAdj, 0, 1),
  });
  return rgbToHex(tuned);
};

/* =====================================================================================
   Komponenta
===================================================================================== */

type LayerVisibility = Partial<Record<"fabric" | "style" | "vignette" | "ao", boolean>>;

type Props = {
  config: SuitState;
  level?: ContrastLevel;
  view?: "both" | "jacket" | "pants";
  layerVisibility?: LayerVisibility;
  onAssetStatus?: (status: { missing: string[] }) => void;
  fabrics: any[];
  fabricsLoading: boolean;
};

const SuitPreview = ({
  config,
  level = "medium",
  view = "both",
  layerVisibility,
  onAssetStatus,
  fabrics,
  fabricsLoading,
}: Props) => {
  const { buttons } = useButtons();
  const { linings } = useLinings(config.styleId);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [buttonLayouts, setButtonLayouts] = useState<ButtonLayout[]>([]);
  const resolveCdn = useCallback((layer: SuitLayer) => cdnPair(layer.src), []);
  const resolveShading = useCallback((layer: SuitLayer) => shadingPair(layer.src), []);
  const resolveSpecular = useCallback((layer: SuitLayer) => specularPair(layer.src), []);
  const resolveEdges = useCallback((layer: SuitLayer) => edgesPair(layer.src), []);

  // Pan/zoom samo na teksturu tkanine (ne menja maske)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const smallScreen = window.matchMedia("(max-width: 768px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setLowPowerMode(smallScreen.matches || reducedMotion.matches);
    update();
    const add = (mq: MediaQueryList) => {
      if (mq.addEventListener) mq.addEventListener("change", update);
      else mq.addListener(update);
    };
    const remove = (mq: MediaQueryList) => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
    add(smallScreen);
    add(reducedMotion);
    return () => {
      remove(smallScreen);
      remove(reducedMotion);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      setEffectsReady(true);
      return;
    }
    const requestIdle = (window as any).requestIdleCallback as ((cb: () => void, options?: { timeout: number }) => number) | undefined;
    const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const run = () => setEffectsReady(true);
    if (requestIdle) {
      idleId = requestIdle(run, { timeout: 500 });
    } else {
      timeoutId = window.setTimeout(run, 60);
    }
    return () => {
      if (idleId !== null && cancelIdle) cancelIdle(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

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
  const pantsPhotoDetailLayers = useMemo(
    () =>
      pantsLayer
        ? [
            {
              id: "pants-front-pocket",
              name: "Front Pocket",
              src: "/assets/suits/transparent/front_pocket+diagonal.png",
            },
            {
              id: "pants-back-pocket",
              name: "Back Pocket",
              src: "/assets/suits/transparent/back_pocket+with_button.png",
            },
          ]
        : [],
    [pantsLayer]
  );

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";
  const [fabricTileTexture, setFabricTileTexture] = useState<string | null>(null);
  const [fabricStripe, setFabricStripe] = useState<StripeHint>(EMPTY_STRIPE);
  const fabricTextureSource = fabricTileTexture || fabricTexture;
  const fabricTextureSourcePants = fabricTextureSource;
  const fabricPattern = useMemo(
    () => String((selectedFabric as any)?.pattern || "").trim().toLowerCase(),
    [selectedFabric]
  );
  const patternStripe = fabricPattern === "pinstripe" || fabricPattern === "stripe";
  const textureStrength = useMemo(() => {
    const raw = parseNumber((selectedFabric as any)?.textureStrength ?? (selectedFabric as any)?.texture_strength);
    const normalized = typeof raw === "number" ? raw : 0.24;
    const boost = patternStripe ? 1.25 : 1.1;
    const max = patternStripe ? 0.72 : 0.55;
    return clamp(normalized * boost, 0.16, max);
  }, [patternStripe, selectedFabric]);
  const explicitTextureScale = useMemo(() => {
    return parseNumber((selectedFabric as any)?.textureScale ?? (selectedFabric as any)?.texture_scale);
  }, [selectedFabric]);
  const textureContrastOverride = useMemo(
    () => parseNumber((selectedFabric as any)?.textureContrast ?? (selectedFabric as any)?.texture_contrast),
    [selectedFabric]
  );
  const textureBrightnessOverride = useMemo(
    () => parseNumber((selectedFabric as any)?.textureBrightness ?? (selectedFabric as any)?.texture_brightness),
    [selectedFabric]
  );
  const hasExplicitTextureScale = typeof explicitTextureScale === "number" && Number.isFinite(explicitTextureScale);
  const textureScaleBoost = clamp(
    (explicitTextureScale ?? 1) * TEXTURE_SCALE_GLOBAL,
    TEXTURE_SCALE_MIN,
    TEXTURE_SCALE_MAX
  );
  const useTexture = Boolean(fabricTextureSource && textureStrength > 0);
  const usePhotoBase = Boolean(process.env.NEXT_PUBLIC_PHOTO_CDN_BASE);

  const tb = toneBlend(selectedFabric?.tone, level);
  const toneVis = getToneConfig(selectedFabric?.tone, level);
  const detailTone = useMemo(
    () => ({
      ...toneVis,
      shading: { ...toneVis.shading, opacity: toneVis.shading.opacity * (usePhotoBase ? 0.6 : 0.9) },
      specular: { ...toneVis.specular, opacity: toneVis.specular.opacity * (usePhotoBase ? 0.75 : 0.85) },
      edgesOpacity: toneVis.edgesOpacity * (usePhotoBase ? 1.15 : 0.85),
      outlinesOpacity: toneVis.outlinesOpacity * (usePhotoBase ? 1.15 : 0.85),
      noise: toneVis.noise * (usePhotoBase ? 0.8 : 0.6),
      vignette: toneVis.vignette * (usePhotoBase ? 0.85 : 0.7),
      highlightTop: toneVis.highlightTop * (usePhotoBase ? 0.85 : 0.75),
      highlightBottom: toneVis.highlightBottom * (usePhotoBase ? 0.85 : 0.75),
    }),
    [toneVis, usePhotoBase]
  );
  const structuralShadingOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.35, detailTone.shading.opacity * 0.9)
        : Math.min(0.55, detailTone.shading.opacity * 1.05),
    [detailTone.shading.opacity, usePhotoBase]
  );
  const structuralSpecularOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.28, detailTone.specular.opacity * 1.3)
        : Math.min(0.25, detailTone.specular.opacity * 1.2),
    [detailTone.specular.opacity, usePhotoBase]
  );
  const structuralEdgesOpacity = useMemo(
    () => (usePhotoBase ? detailTone.edgesOpacity * 0.8 : detailTone.edgesOpacity * 0.6),
    [detailTone.edgesOpacity, usePhotoBase]
  );
  const styleShadingOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.55, detailTone.shading.opacity * 1.1)
        : Math.min(0.9, detailTone.shading.opacity * 1.8),
    [detailTone.shading.opacity, usePhotoBase]
  );
  const styleSpecularOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.28, detailTone.specular.opacity * 1.1)
        : Math.min(0.35, detailTone.specular.opacity * 1.35),
    [detailTone.specular.opacity, usePhotoBase]
  );
  const styleEdgesOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.7, detailTone.edgesOpacity * 1.4)
        : Math.min(0.6, detailTone.edgesOpacity * 1.8),
    [detailTone.edgesOpacity, usePhotoBase]
  );
  const styleBaseOverlayOpacity = useMemo(
    () =>
      usePhotoBase
        ? Math.min(0.32, detailTone.shading.opacity * 0.5)
        : Math.min(0.28, detailTone.shading.opacity * 0.4),
    [detailTone.shading.opacity, usePhotoBase]
  );

  const toneBaseColor = getToneBaseColor(selectedFabric?.tone);
  const fabricTone = (selectedFabric?.tone as Tone | undefined) ?? "medium";
  const baseTextureOpacity = useMemo(() => {
    if (!useTexture) return 0;
    const base = fabricTone === "dark" ? 0.48 : fabricTone === "light" ? 0.34 : 0.4;
    const strength = Math.max(0.2, textureStrength);
    return Math.min(0.78, base + strength * 0.35);
  }, [fabricTone, textureStrength, useTexture]);
  const needsDarkBoost = fabricTone === "dark";
  // Average color from fabric texture (to better match hue)
  const [fabricAvgColor, setFabricAvgColor] = useState<string | null>(null);
  const explicitFabricColor = useMemo(() => extractFabricHex(selectedFabric), [selectedFabric]);
  const fabricFillColorBase = useMemo(
    () =>
      computeFabricBaseColor(fabricAvgColor, toneBaseColor, selectedFabric?.tone as Tone | undefined, explicitFabricColor),
    [fabricAvgColor, toneBaseColor, selectedFabric?.tone, explicitFabricColor]
  );
  const fabricFillColor = useMemo(
    () => (usePhotoBase ? fabricFillColorBase : enhanceFabricColor(fabricFillColorBase, fabricTone)),
    [fabricFillColorBase, fabricTone, usePhotoBase]
  );
  const fabricMetrics = useMemo(() => {
    const rgb = hexToRgb(fabricFillColor) ?? hexToRgb(fabricFillColorBase);
    if (!rgb) {
      return { luminance: 0.35, saturation: 0.25, lightness: 0.4 };
    }
    const hsl = rgbToHsl(rgb);
    return {
      luminance: relativeLuminance(rgb),
      saturation: hsl.s,
      lightness: hsl.l,
    };
  }, [fabricFillColor, fabricFillColorBase]);
  const stripeOrientation = useMemo<StripeOrientation>(() => {
    if (patternStripe) return "vertical";
    if (fabricStripe.orientation !== "none") return fabricStripe.orientation;
    return "none";
  }, [fabricStripe.orientation, patternStripe]);
  const stripeStrength = useMemo(
    () => (patternStripe ? Math.max(0.65, fabricStripe.strength) : fabricStripe.strength),
    [fabricStripe.strength, patternStripe]
  );
  const stripeBoost = useMemo(
    () => patternStripe || (stripeStrength > 0.22 && stripeOrientation !== "none"),
    [patternStripe, stripeStrength, stripeOrientation]
  );
  const stripeWhiteBoost = useMemo(
    () => stripeBoost && (fabricTone === "dark" || fabricMetrics.lightness < 0.4),
    [stripeBoost, fabricMetrics.lightness, fabricTone]
  );
  const stripeShadingMul = stripeWhiteBoost ? 0.82 : 1;
  const stripeEdgeMul = stripeWhiteBoost ? 0.88 : 1;
  const fabricTextureScale = useMemo(() => {
    if (patternStripe && hasExplicitTextureScale) return textureScaleBoost;
    const stripeScale = stripeBoost ? clamp(0.82 + (1 - stripeStrength) * 0.1, 0.78, 0.95) : 1;
    return clamp(textureScaleBoost * stripeScale, TEXTURE_SCALE_MIN, TEXTURE_SCALE_MAX);
  }, [hasExplicitTextureScale, patternStripe, stripeBoost, stripeStrength, textureScaleBoost]);
  const pantsTextureRotation = useMemo(() => {
    const raw = parseNumber(
      (selectedFabric as any)?.pantsTextureRotation ?? (selectedFabric as any)?.pants_texture_rotation
    );
    if (typeof raw === "number") return raw;
    if (stripeBoost) {
      if (stripeOrientation === "horizontal") return 0;
      return 90;
    }
    return 0;
  }, [selectedFabric, stripeBoost, stripeOrientation]);
  const fabricTextureFilter = useMemo(() => {
    if (usePhotoBase) return "none";
    if (fabricTone === "dark") {
      const baseBrightness = 1.03;
      const baseContrast = 1.25;
      const baseSaturate = 1.06;
      const stripeContrast = stripeBoost
        ? stripeWhiteBoost
          ? 0.42 + stripeStrength * 0.2
          : 0.18 + stripeStrength * 0.12
        : 0;
      const stripeBrightness = stripeBoost
        ? stripeWhiteBoost
          ? 0.12 + stripeStrength * 0.05
          : 0.02 + stripeStrength * 0.02
        : 0;
      const stripeSaturate = stripeBoost ? (stripeWhiteBoost ? -0.06 : 0.03) : 0;
      const baseBrightnessValue = textureBrightnessOverride ?? baseBrightness;
      const baseContrastValue = textureContrastOverride ?? baseContrast;
      const brightness = clamp(baseBrightnessValue + stripeBrightness, 0.9, 1.9);
      const contrast = clamp(baseContrastValue + stripeContrast, 1.0, 2.0);
      const saturate = clamp(baseSaturate + stripeSaturate, 0.9, 1.3);
      return `${tb.filter} brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(${saturate.toFixed(
        2
      )})`;
    }
    if (fabricTone === "light") {
      const brightness = textureBrightnessOverride ?? 1.05;
      const contrast = textureContrastOverride ?? 1.08;
      return `${tb.filter} brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(1.08)`;
    }
    const midBrightness = textureBrightnessOverride ?? 1.03;
    const midContrast = textureContrastOverride ?? (stripeBoost ? 1.24 : 1.12);
    const midSaturate = stripeBoost ? 1.1 : 1.07;
    return `${tb.filter} brightness(${midBrightness.toFixed(2)}) contrast(${midContrast.toFixed(2)}) saturate(${midSaturate.toFixed(
      2
    )})`;
  }, [
    fabricTone,
    stripeBoost,
    stripeStrength,
    stripeWhiteBoost,
    tb.filter,
    textureBrightnessOverride,
    textureContrastOverride,
    usePhotoBase,
  ]);
  const tunedFabricFill = useMemo(
    () =>
      usePhotoBase
        ? fabricFillColor
        : tuneFabricColor(fabricFillColor, fabricMetrics.luminance, fabricMetrics.saturation),
    [fabricFillColor, fabricMetrics.luminance, fabricMetrics.saturation, usePhotoBase]
  );
  const fabricBaseRgb = useMemo(() => hexToRgb(tunedFabricFill), [tunedFabricFill]);
  const fabricLuminance = useMemo(
    () => (fabricBaseRgb ? relativeLuminance(fabricBaseRgb) : 1),
    [fabricBaseRgb]
  );
  const autoTuning = useMemo(() => {
    const lum = fabricMetrics.luminance;
    const sat = fabricMetrics.saturation;
    const isDark = lum < 0.14;
    const isLight = lum > 0.58;
    const satBoost = sat > 0.55 ? -0.06 : sat < 0.18 ? 0.03 : 0;
    const brightness = isDark ? 0.12 : isLight ? 0.02 : 0.06;
    const contrast = isDark ? 1.12 : isLight ? 1.06 : 1.1;
    const textureMul = isDark ? 0.9 : isLight ? 0.7 : 0.88;
    const satTextureMul = sat > 0.5 ? 0.8 : sat < 0.2 ? 1.0 : 0.9;
    return {
      photo: {
        brightness,
        contrast,
        saturate: 1 + satBoost,
        opacity: isDark ? 0.94 : isLight ? 0.9 : 0.92,
      },
      texture: {
        opacity: clamp(textureMul * satTextureMul, 0.55, 1.0),
      },
      shading: isDark ? 0.95 : isLight ? 1.02 : 1.0,
      specular: isDark ? 1.2 : isLight ? 0.95 : 1.05,
      edges: isDark ? 0.85 : isLight ? 0.98 : 0.95,
    };
  }, [fabricMetrics.luminance, fabricMetrics.saturation]);
  const tunedTextureOpacity = useMemo(() => {
    if (usePhotoBase) {
      const sat = fabricMetrics.saturation;
      const lum = fabricMetrics.lightness;
      const satBoost = sat > 0.55 ? 0.22 : sat < 0.2 ? 0.1 : 0.16;
      const lumBoost = lum > 0.6 ? 0.12 : lum < 0.25 ? 0.08 : 0.1;
      return clamp(baseTextureOpacity * (0.55 + satBoost + lumBoost), 0.16, 0.42);
    }
    const stripeBoostMul = stripeBoost ? 1 + clamp(stripeStrength * 0.4, 0.12, 0.3) : 1;
    const maxOpacity = stripeBoost ? 0.82 : 0.72;
    return clamp(baseTextureOpacity * autoTuning.texture.opacity * stripeBoostMul, 0.12, maxOpacity);
  }, [
    autoTuning.texture.opacity,
    baseTextureOpacity,
    fabricMetrics.lightness,
    fabricMetrics.saturation,
    stripeBoost,
    stripeStrength,
    usePhotoBase,
  ]);
  const textureBlendMode = useMemo<React.CSSProperties["mixBlendMode"]>(() => {
    if (usePhotoBase) return "soft-light";
    if (stripeWhiteBoost) return "screen";
    if (fabricTone === "dark") return "overlay";
    return fabricMetrics.saturation > 0.5 ? "soft-light" : "overlay";
  }, [fabricMetrics.saturation, fabricTone, stripeWhiteBoost, usePhotoBase]);
  const fabricTextureStyle = useMemo<React.CSSProperties>(
    () => ({
      filter: fabricTextureFilter,
      mixBlendMode: textureBlendMode,
      opacity: tunedTextureOpacity,
    }),
    [fabricTextureFilter, textureBlendMode, tunedTextureOpacity]
  );
  const stripeHighlightStyle = useMemo<React.CSSProperties | null>(() => {
    if (!useTexture || !stripeBoost) return null;
    const boostDark = fabricTone === "dark" || fabricMetrics.lightness < 0.45;
    const baseOpacity = usePhotoBase ? 0.12 : 0.18;
    const opacity = clamp(baseOpacity + stripeStrength * (usePhotoBase ? 0.12 : 0.18), baseOpacity, usePhotoBase ? 0.32 : 0.46);
    const baseBrightness = textureBrightnessOverride ?? (boostDark ? 1.55 : 1.3);
    const baseContrast = textureContrastOverride ?? (boostDark ? 1.75 : 1.45);
    const brightness = clamp(baseBrightness + (usePhotoBase ? 0.05 : 0.1), 1.1, 2.0);
    const contrast = clamp(baseContrast + (usePhotoBase ? 0.1 : 0.2), 1.1, 2.2);
    return {
      mixBlendMode: boostDark ? "screen" : "overlay",
      opacity,
      filter: `grayscale(1) brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)})`,
    };
  }, [
    fabricMetrics.lightness,
    fabricTone,
    stripeBoost,
    stripeStrength,
    textureBrightnessOverride,
    textureContrastOverride,
    useTexture,
    usePhotoBase,
  ]);
  const photoVariant =
    fabricTone === "light"
      ? "light"
      : fabricTone === "dark"
        ? "black"
        : fabricMetrics.luminance < 0.12
          ? "black"
          : fabricMetrics.luminance > 0.65
            ? "light"
            : "blue";
  const photoExposure = useMemo(() => {
    if (!usePhotoBase) return 1;
    const lum = fabricMetrics.lightness;
    const exposure = 0.9 + (lum - 0.45) * 0.55;
    return clamp(exposure, 0.82, 1.12);
  }, [fabricMetrics.lightness, usePhotoBase]);
  const photoFilter = useMemo(() => {
    if (usePhotoBase) return `grayscale(1) brightness(${photoExposure.toFixed(2)})`;
    const brightness = (1 + autoTuning.photo.brightness).toFixed(2);
    const contrast = autoTuning.photo.contrast.toFixed(2);
    const saturate = clamp(autoTuning.photo.saturate, 0.85, 1.15).toFixed(2);
    return `grayscale(1) brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
  }, [
    autoTuning.photo.brightness,
    autoTuning.photo.contrast,
    autoTuning.photo.saturate,
    photoExposure,
    usePhotoBase,
  ]);
  const photoOpacity = useMemo(() => (usePhotoBase ? 1 : autoTuning.photo.opacity), [autoTuning.photo.opacity, usePhotoBase]);
  const photoBaseOpacity = useMemo(() => {
    if (!usePhotoBase) return 0.95;
    const lum = fabricMetrics.lightness;
    const sat = fabricMetrics.saturation;
    const lumShift = lum > 0.62 ? -0.06 : lum < 0.24 ? 0.08 : 0.02;
    const satShift = sat < 0.2 ? 0.06 : sat > 0.55 ? 0.02 : 0.04;
    return clamp(0.68 + lumShift + satShift, 0.62, 0.82);
  }, [fabricMetrics.lightness, fabricMetrics.saturation, usePhotoBase]);
  const structuralShadingOpacityTuned = useMemo(
    () => clamp(structuralShadingOpacity * autoTuning.shading * stripeShadingMul, 0.12, 0.6),
    [autoTuning.shading, structuralShadingOpacity, stripeShadingMul]
  );
  const structuralSpecularOpacityTuned = useMemo(
    () => clamp(structuralSpecularOpacity * autoTuning.specular, 0.08, 0.4),
    [autoTuning.specular, structuralSpecularOpacity]
  );
  const structuralEdgesOpacityTuned = useMemo(
    () => clamp(structuralEdgesOpacity * autoTuning.edges * stripeEdgeMul, 0.12, 0.7),
    [autoTuning.edges, structuralEdgesOpacity, stripeEdgeMul]
  );
  const styleShadingOpacityTuned = useMemo(
    () => clamp(styleShadingOpacity * autoTuning.shading * stripeShadingMul, 0.12, 0.7),
    [autoTuning.shading, styleShadingOpacity, stripeShadingMul]
  );
  const styleSpecularOpacityTuned = useMemo(
    () => clamp(styleSpecularOpacity * autoTuning.specular, 0.06, 0.35),
    [autoTuning.specular, styleSpecularOpacity]
  );
  const styleEdgesOpacityTuned = useMemo(
    () => clamp(styleEdgesOpacity * autoTuning.edges * stripeEdgeMul, 0.12, 0.8),
    [autoTuning.edges, styleEdgesOpacity, stripeEdgeMul]
  );
  const styleBaseOverlayOpacityTuned = useMemo(
    () => clamp(styleBaseOverlayOpacity * autoTuning.shading * stripeShadingMul, 0.12, 0.5),
    [autoTuning.shading, styleBaseOverlayOpacity, stripeShadingMul]
  );
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
    const specular = Math.min(0.18, structuralSpecularOpacityTuned * 0.75);
    const opacity = fabricTone === "dark" ? 0.34 : 0.3;
    return { intensity, shadow, specular, opacity };
  }, [fabricTone, structuralSpecularOpacityTuned]);
  const pantsLighting = useMemo(() => {
    const intensity = fabricTone === "light" ? 0.7 : fabricTone === "dark" ? 0.82 : 0.78;
    const shadow = fabricTone === "dark" ? 0.88 : 0.78;
    const specular = Math.min(0.14, structuralSpecularOpacityTuned * 0.65);
    const opacity = fabricTone === "dark" ? 0.28 : 0.26;
    return { intensity, shadow, specular, opacity };
  }, [fabricTone, structuralSpecularOpacityTuned]);
  const isBlackFabric = fabricTone === "dark" && fabricLuminance < 0.12;
  const darkBoostOpacity =
    (isBlackFabric ? 0.4 : 0.26) * (stripeWhiteBoost ? 0.55 : stripeBoost ? 0.7 : 1);
  const darkBoostColor = isBlackFabric ? "#020202" : "#080808";
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [maskBuilding, setMaskBuilding] = useState(false);
  const [pantsUnionMask, setPantsUnionMask] = useState<string | null>(null);
  const [pantsMaskBuilding, setPantsMaskBuilding] = useState(false);
  const [assetWarnings, setAssetWarnings] = useState<string[]>([]);
  const panZoom = useMemo(() => ({ scale, offset }), [scale, offset]);
  const showLayer = (key: keyof LayerVisibility) => (layerVisibility?.[key] ?? true) !== false;
  const showAo = showLayer("ao") && !lowPowerMode && effectsReady;
  const showVignette = showLayer("vignette") && !lowPowerMode && effectsReady;
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
  const jacketMaskKey = useMemo(
    () => fabricMaskLayers.map((layer) => layer.src).filter(Boolean).join("|"),
    [fabricMaskLayers]
  );
  const pantsMaskLayers = useMemo(
    () => [...pantsFabricLayers, ...pantsOverlayLayers],
    [pantsFabricLayers, pantsOverlayLayers]
  );
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFabricTileTexture(null);
    setFabricStripe(EMPTY_STRIPE);
    if (!fabricTexture) {
      setFabricAvgColor(null);
      setFabricStripe(EMPTY_STRIPE);
      return;
    }
    const cachedAvg = FABRIC_AVG_CACHE.get(fabricTexture);
    const cachedTile = FABRIC_TILE_CACHE.get(fabricTexture);
    const cachedStripe = FABRIC_STRIPE_CACHE.get(fabricTexture);
    if (cachedAvg !== undefined) setFabricAvgColor(cachedAvg);
    if (cachedTile) setFabricTileTexture(cachedTile);
    if (cachedStripe) setFabricStripe(cachedStripe);
    if (cachedAvg !== undefined && cachedTile && cachedStripe) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const requestIdle = (typeof window !== "undefined" ? (window as any).requestIdleCallback : undefined) as
      | ((cb: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (typeof window !== "undefined" ? (window as any).cancelIdleCallback : undefined) as
      | ((id: number) => void)
      | undefined;
    img.onload = () => {
      const run = () => {
        if (cancelled) return;
        try {
          const c = document.createElement("canvas");
          const ctx = c.getContext("2d");
          if (!ctx) return;
          const size = STRIPE_ANALYSIS_SIZE;
          c.width = size;
          c.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          const d = ctx.getImageData(0, 0, size, size).data;
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
            const avg = `#${toHex(r / n)}${toHex(g / n)}${toHex(b / n)}`;
            setFabricAvgColor(avg);
            FABRIC_AVG_CACHE.set(fabricTexture, avg);
          } else {
            setFabricAvgColor(null);
            FABRIC_AVG_CACHE.set(fabricTexture, null);
          }

          const stripeHint = computeStripeHint(d, size, size);
          setFabricStripe(stripeHint);
          FABRIC_STRIPE_CACHE.set(fabricTexture, stripeHint);
          const stripeTileStrength = patternStripe ? Math.max(stripeHint.strength, 0.35) : stripeHint.strength;

          const tile = document.createElement("canvas");
          const tctx = tile.getContext("2d");
          if (!tctx) return;
          const naturalW = img.naturalWidth || img.width || TEXTURE_TILE_PX;
          const naturalH = img.naturalHeight || img.height || TEXTURE_TILE_PX;
          const crop = Math.min(naturalW, naturalH);
          const sx = Math.max(0, Math.round((naturalW - crop) / 2));
          const sy = Math.max(0, Math.round((naturalH - crop) / 2));
          const minTile = Math.min(TEXTURE_TILE_PX, crop);
          const tileScale =
            stripeTileStrength > 0.22 ? TEXTURE_TILE_CANVAS_SCALE * 1.6 : TEXTURE_TILE_CANVAS_SCALE;
          const tilePx = Math.round(clamp(crop * tileScale, minTile, TEXTURE_TILE_CANVAS_MAX));
          const downscale = crop / tilePx;
          const smooth = stripeTileStrength > 0.22 ? downscale <= 2.5 : downscale <= 4;
          tile.width = tilePx;
          tile.height = tilePx;
          tctx.imageSmoothingEnabled = smooth;
          tctx.imageSmoothingQuality = smooth ? "high" : "low";
          tctx.drawImage(img, sx, sy, crop, crop, 0, 0, tilePx, tilePx);
          try {
            const url = tile.toDataURL("image/png");
            setFabricTileTexture(url);
            FABRIC_TILE_CACHE.set(fabricTexture, url);
          } catch {
            setFabricTileTexture(null);
          }

        } catch {}
      };
      if (requestIdle) {
        idleId = requestIdle(run, { timeout: 250 });
      } else {
        timeoutId = window.setTimeout(run, 0);
      }
    };
    img.onerror = () => {
      setFabricAvgColor(null);
      setFabricTileTexture(null);
      setFabricStripe(EMPTY_STRIPE);
    };
    img.src = fabricTexture;
    return () => {
      cancelled = true;
      if (idleId !== null && cancelIdle) cancelIdle(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [fabricTexture, patternStripe]);

  useEffect(() => {
    if (onAssetStatus) {
      onAssetStatus({ missing: assetWarnings });
    }
  }, [assetWarnings, onAssetStatus]);

  // Build a single union mask (PNG data URL) over the jacket silhouette to eliminate any anti-alias seams
  useEffect(() => {
    if (!jacketMaskKey) {
      setJacketUnionMask(null);
      return;
    }
    const cached = JACKET_MASK_CACHE.get(jacketMaskKey);
    if (cached) {
      setJacketUnionMask(cached);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const requestIdle = (typeof window !== "undefined" ? (window as any).requestIdleCallback : undefined) as
      | ((cb: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (typeof window !== "undefined" ? (window as any).cancelIdleCallback : undefined) as
      | ((id: number) => void)
      | undefined;

    const run = () => {
      if (cancelled) return;
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
          if (MASK_BLEED_PX > 0) {
            const temp = document.createElement("canvas");
            temp.width = c.width;
            temp.height = c.height;
            const tctx = temp.getContext("2d");
            if (tctx) {
              tctx.drawImage(c, 0, 0);
              ctx.clearRect(0, 0, c.width, c.height);
              ctx.drawImage(temp, 0, 0);
              ctx.filter = `blur(${MASK_BLEED_PX}px)`;
              ctx.drawImage(temp, 0, 0);
              ctx.filter = "none";
            }
          }
          if (!cancelled) {
            const url = c.toDataURL("image/png");
            JACKET_MASK_CACHE.set(jacketMaskKey, url);
            setJacketUnionMask(url);
          }
        } catch {
          if (!cancelled) setJacketUnionMask(null);
        } finally {
          if (!cancelled) setMaskBuilding(false);
        }
      })();
    };

    if (requestIdle) {
      idleId = requestIdle(run, { timeout: 400 });
    } else {
      timeoutId = window.setTimeout(run, 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && cancelIdle) cancelIdle(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      setMaskBuilding(false);
    };
  }, [fabricMaskLayers, jacketMaskKey]);

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
    setScale((s) => Math.min(3, Math.max(0.35, s + delta * 0.0015)));
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

  const includeStyle = showLayer("style");
  const showJacket = view !== "pants";
  const showPants = view !== "jacket";
  const jacketBaseLayers = structuralJacketLayers;
  const jacketDetailStructureLayers = structuralJacketLayers;
  const jacketDetailStyleLayers = useMemo(
    () => (includeStyle ? styleOverlayLayers : []),
    [includeStyle, styleOverlayLayers]
  );
  const pantsMaskFallback = pantsLayer ? toTransparentSilhouette(pantsLayer.src) : null;
  const pantsBaseLayers = useMemo(
    () => (pantsFabricLayers.length ? pantsFabricLayers : pantsLayer ? [pantsLayer] : []),
    [pantsFabricLayers, pantsLayer]
  );
  const pantsLayerOnly = useMemo(() => (pantsLayer ? [pantsLayer] : []), [pantsLayer]);
  const pantsFabricLayersResolved = useMemo(
    () => (pantsFabricLayers.length ? pantsFabricLayers : pantsLayerOnly),
    [pantsFabricLayers, pantsLayerOnly]
  );
  const pantsTextureLayers = useMemo(
    () => [...pantsFabricLayersResolved, ...pantsOverlayLayers],
    [pantsFabricLayersResolved, pantsOverlayLayers]
  );
  const pantsDetailLayers = pantsBaseLayers;
  const pantsStyleLayers = useMemo(
    () => (includeStyle ? pantsOverlayLayers : []),
    [includeStyle, pantsOverlayLayers]
  );
  const jacketPhotoLayers = useMemo(() => (usePhotoBase ? detailLayers : []), [detailLayers, usePhotoBase]);
  const pantsPhotoLayers = useMemo(
    () => (usePhotoBase ? [...pantsBaseLayers, ...pantsPhotoDetailLayers] : []),
    [pantsBaseLayers, pantsPhotoDetailLayers, usePhotoBase]
  );
  const pantsMaskSourceLayers = useMemo(() => pantsMaskLayers, [pantsMaskLayers]);
  const pantsMaskKey = useMemo(
    () => pantsMaskSourceLayers.map((layer) => layer.src).filter(Boolean).join("|"),
    [pantsMaskSourceLayers]
  );
  const resolvePhoto = useCallback(
    (layer: SuitLayer) => photoPair(layer.src, photoVariant),
    [photoVariant]
  );
  const jacketMask = jacketUnionMask;
  const pantsMask = pantsUnionMask ?? pantsMaskFallback;
  const jacketShadowClass = "drop-shadow-[0_24px_40px_rgba(15,23,42,0.16)]";
  const pantsShadowClass = "drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)]";

  // Build a union mask over the pants silhouette to avoid halo/background bleed
  useEffect(() => {
    if (!pantsMaskKey) {
      setPantsUnionMask(null);
      return;
    }
    const cached = PANTS_MASK_CACHE.get(pantsMaskKey);
    if (cached) {
      setPantsUnionMask(cached);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const requestIdle = (typeof window !== "undefined" ? (window as any).requestIdleCallback : undefined) as
      | ((cb: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (typeof window !== "undefined" ? (window as any).cancelIdleCallback : undefined) as
      | ((id: number) => void)
      | undefined;

    const run = () => {
      if (cancelled) return;
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
          for (const layer of pantsMaskSourceLayers) {
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
          if (MASK_BLEED_PX > 0) {
            const temp = document.createElement("canvas");
            temp.width = c.width;
            temp.height = c.height;
            const tctx = temp.getContext("2d");
            if (tctx) {
              tctx.drawImage(c, 0, 0);
              ctx.clearRect(0, 0, c.width, c.height);
              ctx.drawImage(temp, 0, 0);
              ctx.filter = `blur(${MASK_BLEED_PX}px)`;
              ctx.drawImage(temp, 0, 0);
              ctx.filter = "none";
            }
          }
          if (!cancelled) {
            const url = c.toDataURL("image/png");
            PANTS_MASK_CACHE.set(pantsMaskKey, url);
            setPantsUnionMask(url);
          }
        } catch {
          if (!cancelled) setPantsUnionMask(null);
        } finally {
          if (!cancelled) setPantsMaskBuilding(false);
        }
      })();
    };

    if (requestIdle) {
      idleId = requestIdle(run, { timeout: 400 });
    } else {
      timeoutId = window.setTimeout(run, 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && cancelIdle) cancelIdle(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      setPantsMaskBuilding(false);
    };
  }, [pantsMaskKey, pantsMaskSourceLayers]);

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
        {fabricsLoading ? "Ucitavanje tkanina..." : "Odaberi tkaninu da vidi prikaz."}
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
  return (
    <div className="relative w-full select-none">
      {showJacket && (
        <div className="relative mx-auto w-full max-w-[580px] sm:max-w-[540px]">
        <div
          className={`relative mx-auto w-full origin-top transform scale-[0.8] sm:scale-[0.86] lg:scale-[0.86] ${jacketShadowClass}`}
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
        {showLayer("fabric") && usePhotoBase && jacketPhotoLayers.length > 0 && (
          <BaseLayer
            layers={jacketPhotoLayers}
            resolve={resolvePhoto}
            blendMode="normal"
            opacity={photoOpacity}
            filter={photoFilter}
            mask={jacketMask}
          />
        )}
        {showLayer("fabric") && (!usePhotoBase || jacketPhotoLayers.length === 0) && (
          <BaseLayer
            layers={jacketBaseLayers}
            resolve={resolveCdn}
            blendMode="normal"
            opacity={0.95}
            mask={jacketMask}
          />
        )}
        {showLayer("fabric") && (
          <FabricUnion
            layers={fabricMaskLayers}
            resolve={resolveCdn}
            fabricTexture={useTexture ? fabricTextureSource : undefined}
            textureStyle={fabricTextureStyle}
            baseColor={tunedFabricFill || toneBaseColor}
            fabricAvgColor={tunedFabricFill}
            baseBlendMode="color"
            baseOpacity={usePhotoBase ? photoBaseOpacity : 0.95}
            panZoom={panZoom}
            canvas={JACKET_CANVAS}
            mask={jacketMask}
            textureScale={fabricTextureScale}
            textureTileSizePx={TEXTURE_TILE_PX}
          />
        )}
        {showLayer("fabric") && stripeHighlightStyle && (
          <FabricUnion
            layers={fabricMaskLayers}
            resolve={resolveCdn}
            fabricTexture={useTexture ? fabricTextureSource : undefined}
            textureStyle={stripeHighlightStyle}
            baseColor={tunedFabricFill || toneBaseColor}
            baseBlendMode="normal"
            baseOpacity={0}
            panZoom={panZoom}
            canvas={JACKET_CANVAS}
            mask={jacketMask}
            textureScale={fabricTextureScale}
            textureTileSizePx={TEXTURE_TILE_PX}
          />
        )}
        {!usePhotoBase && needsDarkBoost && jacketMask && (
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
        {!usePhotoBase && includeStyle && styleOverlayLayers.length > 0 && (
          <BaseLayer
            layers={styleOverlayLayers}
            resolve={resolveCdn}
            blendMode="soft-light"
            opacity={styleBaseOverlayOpacityTuned}
            mask={jacketMask}
          />
        )}
        {!usePhotoBase && showLayer("fabric") && jacketDetailStructureLayers.length > 0 && (
          <>
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={resolveShading}
              blendMode={detailTone.shading.blend}
              opacity={structuralShadingOpacityTuned}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={resolveSpecular}
              blendMode={detailTone.specular.blend}
              opacity={structuralSpecularOpacityTuned * 0.7}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStructureLayers}
              resolve={resolveEdges}
              blendMode="multiply"
              opacity={structuralEdgesOpacityTuned}
              mask={jacketMask}
            />
          </>
        )}
        {!usePhotoBase && showLayer("fabric") && jacketDetailStyleLayers.length > 0 && (
          <>
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={resolveShading}
              blendMode={detailTone.shading.blend}
              opacity={styleShadingOpacityTuned}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={resolveSpecular}
              blendMode={detailTone.specular.blend}
              opacity={styleSpecularOpacityTuned * 0.7}
              mask={jacketMask}
            />
            <BaseLayer
              layers={jacketDetailStyleLayers}
              resolve={resolveEdges}
              blendMode="multiply"
              opacity={styleEdgesOpacityTuned}
              mask={jacketMask}
            />
          </>
        )}
        {!usePhotoBase && jacketMask && showAo && (
          <LightingPasses
            mask={jacketMask}
            canvas={JACKET_CANVAS}
            intensity={jacketLighting.intensity}
            shadow={jacketLighting.shadow}
            specular={jacketLighting.specular}
            opacity={jacketLighting.opacity}
          />
        )}
        {!usePhotoBase && jacketMask && showVignette && (
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
                mixBlendMode: usePhotoBase ? "normal" : "multiply",
                opacity: usePhotoBase ? 0.8 : 0.9,
                filter: usePhotoBase ? "brightness(1.05) saturate(0.95)" : "saturate(0.9) contrast(1.05)",
                borderRadius: "50%",
                objectFit: "contain",
              }}
            />
          ))}
      </div>
    </div>
      )}
    {/* ======================== PANTS CANVAS ======================== */}
      {showPants && pantsLayer && (
        <div
          className={`relative mx-auto w-full max-w-[560px] origin-top transform scale-[0.86] sm:scale-[0.92] lg:scale-[0.92] ${pantsShadowClass} ${
            showJacket ? "-mt-20 sm:-mt-16 lg:-mt-12" : "mt-0"
          }`}
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
        {showLayer("fabric") && usePhotoBase && pantsPhotoLayers.length > 0 && (
          <BaseLayer
            layers={pantsPhotoLayers}
            resolve={resolvePhoto}
            blendMode="normal"
            opacity={photoOpacity}
            filter={photoFilter}
            mask={pantsMask}
          />
        )}
        {showLayer("fabric") && (!usePhotoBase || pantsPhotoLayers.length === 0) && (
          <BaseLayer
            layers={pantsLayerOnly}
            resolve={resolveCdn}
            blendMode="normal"
            opacity={0.95}
            mask={pantsMask}
          />
        )}
        {showLayer("fabric") && (
            <FabricUnion
              layers={pantsTextureLayers}
              resolve={resolveCdn}
              fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
              textureStyle={fabricTextureStyle}
              baseColor={tunedFabricFill || toneBaseColor}
              fabricAvgColor={tunedFabricFill}
              baseBlendMode="color"
              baseOpacity={usePhotoBase ? photoBaseOpacity : 0.95}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              mask={pantsMask}
              textureScale={fabricTextureScale}
              textureTileSizePx={TEXTURE_TILE_PX}
              textureRotationDeg={pantsTextureRotation}
            />
          )}
        {showLayer("fabric") && stripeHighlightStyle && (
            <FabricUnion
              layers={pantsTextureLayers}
              resolve={resolveCdn}
              fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
              textureStyle={stripeHighlightStyle}
              baseColor={tunedFabricFill || toneBaseColor}
              baseBlendMode="normal"
              baseOpacity={0}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              mask={pantsMask}
              textureScale={fabricTextureScale}
              textureTileSizePx={TEXTURE_TILE_PX}
              textureRotationDeg={pantsTextureRotation}
            />
          )}
        {!usePhotoBase && includeStyle && pantsOverlayLayers.length > 0 && (
          <BaseLayer
            layers={pantsOverlayLayers}
            resolve={resolveCdn}
            blendMode="soft-light"
            opacity={styleBaseOverlayOpacityTuned * 0.8}
            mask={pantsMask}
          />
        )}
        {!usePhotoBase && needsDarkBoost && pantsMask && (
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
        {!usePhotoBase && showLayer("fabric") && pantsDetailLayers.length > 0 && (
          <>
            <BaseLayer
              layers={pantsDetailLayers}
              resolve={resolveShading}
              blendMode={detailTone.shading.blend}
              opacity={structuralShadingOpacityTuned * 0.9}
              mask={pantsMask}
            />
            <BaseLayer
              layers={pantsDetailLayers}
              resolve={resolveSpecular}
              blendMode={detailTone.specular.blend}
              opacity={structuralSpecularOpacityTuned * 0.6}
              mask={pantsMask}
            />
            <BaseLayer
              layers={pantsDetailLayers}
              resolve={resolveEdges}
              blendMode="multiply"
              opacity={structuralEdgesOpacityTuned}
              mask={pantsMask}
            />
          </>
        )}
        {!usePhotoBase && showLayer("fabric") && pantsStyleLayers.length > 0 && (
            <>
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={resolveShading}
                blendMode={detailTone.shading.blend}
                opacity={styleShadingOpacityTuned * 0.85}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={resolveSpecular}
                blendMode={detailTone.specular.blend}
                opacity={styleSpecularOpacityTuned * 0.6}
                mask={pantsMask}
              />
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={resolveEdges}
                blendMode="multiply"
                opacity={styleEdgesOpacityTuned * 0.9}
                mask={pantsMask}
              />
            </>
          )}
          {!usePhotoBase && pantsMask && showAo && (
            <LightingPasses
              mask={pantsMask}
              canvas={PANTS_CANVAS}
              intensity={pantsLighting.intensity}
              shadow={pantsLighting.shadow}
              specular={pantsLighting.specular}
              opacity={pantsLighting.opacity}
            />
          )}
          {!usePhotoBase && pantsMask && showVignette && (
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
                  mixBlendMode: usePhotoBase ? "normal" : "multiply",
                  opacity: usePhotoBase ? 0.8 : 0.9,
                  filter: usePhotoBase ? "brightness(1.05) saturate(0.95)" : "saturate(0.9) contrast(1.05)",
                  borderRadius: "50%",
                  objectFit: "contain",
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(SuitPreview);
