"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase } from "../utils/backend";
import { NOISE_DATA, toneBlend, getToneConfig, getToneBaseColor, ContrastLevel, Tone } from "../utils/visual";
import { cdnPair, ensureAssetAvailable } from "../utils/assets";
import { useFabrics } from "../hooks/useFabrics";
import { useButtons } from "../hooks/useButtons";
import { useLinings } from "../hooks/useLinings";
import { ButtonLayout, ButtonPosition, getFallbackPositions } from "../data/buttonPositions";
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
const STRIPE_ANALYSIS_SIZE = 80;
const PANTS_MASK_SAMPLE_W = 120;
const PANTS_STRIPE_LEFT_ROT_DEG = 11.3;
const PANTS_RIGHT_UPPER_ROT_DEG = 90;
const PANTS_RIGHT_SPLIT_RATIO = 98 / 254;
const PANTS_RIGHT_FORCE_X_RATIO = 0.9;

const PANTS_MASK_CACHE = new Map<string, string>();
const PANTS_LEG_MASK_CACHE = new Map<string, { left: string; right: string }>();
const PANTS_RIGHT_SPLIT_CACHE = new Map<string, { upper: string; lower: string }>();

type RGB = { r: number; g: number; b: number };
type StripeOrientation = "vertical" | "horizontal" | "none";
type StripeHint = { strength: number; orientation: StripeOrientation; contrast: number };

const EMPTY_STRIPE: StripeHint = { strength: 0, orientation: "none", contrast: 0 };

const HEX_COLOR = /^[0-9a-f]{6}$/i;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
    const lightnessBoost = tone === "dark" ? 0.02 : tone === "light" ? 0.04 : 0.03;
    const neutralized = hslToRgb({
      h,
      s: 0,
      l: Math.min(1, l + lightnessBoost),
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

  const fabricLayers = useMemo(
    () => [...structuralJacketLayers, ...styleOverlayLayers],
    [structuralJacketLayers, styleOverlayLayers]
  );

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
  const pantsMaskLayers = useMemo(
    () => (pantsFabricLayers.length ? pantsFabricLayers : pantsLayer ? [pantsLayer] : []),
    [pantsFabricLayers, pantsLayer]
  );

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";
  const textureStrength = useMemo(() => {
    const raw = (selectedFabric as any)?.textureStrength;
    if (typeof raw !== "number") return 1;
    return Math.max(0, Math.min(1, raw));
  }, [selectedFabric]);
  const textureScaleBoost = (selectedFabric as any)?.textureScale ?? 1;
  const useTexture = Boolean(fabricTexture && textureStrength > 0);
  const [fabricStripe, setFabricStripe] = useState<StripeHint>(EMPTY_STRIPE);
  const fabricPattern = useMemo(
    () => String((selectedFabric as any)?.pattern || "").trim().toLowerCase(),
    [selectedFabric]
  );
  const patternStripe = fabricPattern === "pinstripe" || fabricPattern === "stripe";
  const stripeOrientation = useMemo<StripeOrientation>(() => {
    if (patternStripe) return "vertical";
    if (fabricStripe.orientation !== "none") return fabricStripe.orientation;
    return "none";
  }, [fabricStripe.orientation, patternStripe]);
  const stripeStrength = useMemo(
    () => (patternStripe ? Math.max(0.65, fabricStripe.strength) : fabricStripe.strength),
    [fabricStripe.strength, patternStripe]
  );
  const stripeRotationActive = useMemo(
    () => patternStripe || stripeStrength > 0.22 || fabricStripe.strength > 0.08,
    [fabricStripe.strength, patternStripe, stripeStrength]
  );
  const pantsTextureRotationBase = useMemo(() => {
    const raw = (selectedFabric as any)?.pantsTextureRotation ?? (selectedFabric as any)?.pants_texture_rotation;
    return typeof raw === "number" ? raw : stripeOrientation === "vertical" ? 90 : 0;
  }, [selectedFabric, stripeOrientation]);
  const pantsTextureRotation = useMemo(() => pantsTextureRotationBase, [pantsTextureRotationBase]);
  const pantsTextureRotationLeft = useMemo(
    () => (stripeRotationActive ? PANTS_STRIPE_LEFT_ROT_DEG : pantsTextureRotationBase),
    [pantsTextureRotationBase, stripeRotationActive]
  );
  const pantsTextureRotationRightLower = useMemo(
    () => (stripeRotationActive ? PANTS_STRIPE_LEFT_ROT_DEG : pantsTextureRotationBase),
    [pantsTextureRotationBase, stripeRotationActive]
  );
  const pantsTextureRotationRightUpper = useMemo(
    () => (stripeRotationActive ? PANTS_RIGHT_UPPER_ROT_DEG : pantsTextureRotationBase),
    [pantsTextureRotationBase, stripeRotationActive]
  );

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

  const toneBaseColor = getToneBaseColor(selectedFabric?.tone);
  const fabricTone = (selectedFabric?.tone as Tone | undefined) ?? "medium";
  const fabricTextureFilter = useMemo(() => {
    if (fabricTone === "dark") {
      return `${tb.filter} brightness(1.0) contrast(1.08) saturate(1.05)`;
    }
    if (fabricTone === "light") {
      return `${tb.filter} brightness(1.07) contrast(1.08) saturate(1.05)`;
    }
    return `${tb.filter} brightness(1.08) contrast(1.2) saturate(1.24)`;
  }, [fabricTone, tb.filter]);
  const fabricTextureOpacity = useMemo(
    () =>
      useTexture
        ? Math.min(0.85, softenedTone.fabric.opacity * (fabricTone === "dark" ? 0.9 : 0.82)) * textureStrength
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
    () => softenedTone.weaveSharpness * (fabricTone === "dark" ? 0.9 : 0.88) * textureScaleBoost,
    [fabricTone, softenedTone.weaveSharpness, textureScaleBoost]
  );
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
    () => enhanceFabricColor(fabricFillColorBase, fabricTone),
    [fabricFillColorBase, fabricTone]
  );
  const pantsMaskKey = useMemo(
    () => pantsMaskLayers.map((layer) => layer.src).filter(Boolean).join("|"),
    [pantsMaskLayers]
  );
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [maskBuilding, setMaskBuilding] = useState(false);
  const [pantsUnionMask, setPantsUnionMask] = useState<string | null>(null);
  const [pantsMaskBuilding, setPantsMaskBuilding] = useState(false);
  const [pantsLegMasks, setPantsLegMasks] = useState<{ left: string; right: string } | null>(null);
  const [pantsRightSplitMasks, setPantsRightSplitMasks] = useState<{ upper: string; lower: string } | null>(null);
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
      setFabricStripe(EMPTY_STRIPE);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
          setFabricAvgColor(`#${toHex(r / n)}${toHex(g / n)}${toHex(b / n)}`);
        } else {
          setFabricAvgColor(null);
        }
        setFabricStripe(computeStripeHint(d, size, size));
      } catch {}
    };
    img.onerror = () => {
      setFabricAvgColor(null);
      setFabricStripe(EMPTY_STRIPE);
    };
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
      } finally {
        if (!cancelled) setMaskBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
      setMaskBuilding(false);
    };
  }, [fabricLayers]);

  useEffect(() => {
    if (!pantsMaskKey) {
      setPantsUnionMask(null);
      setPantsLegMasks(null);
      setPantsRightSplitMasks(null);
      return;
    }
    const cached = PANTS_MASK_CACHE.get(pantsMaskKey);
    const cachedLegMasks = PANTS_LEG_MASK_CACHE.get(pantsMaskKey);
    const cachedRightSplit = PANTS_RIGHT_SPLIT_CACHE.get(pantsMaskKey);
    if (cached) setPantsUnionMask(cached);
    else setPantsUnionMask(null);
    setPantsLegMasks(cachedLegMasks ?? null);
    setPantsRightSplitMasks(cachedRightSplit ?? null);
    if (cached && cachedLegMasks && cachedRightSplit) return;

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
        for (const layer of pantsMaskLayers) {
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
        const unionData = ctx.getImageData(0, 0, c.width, c.height);
        const legResult = (() => {
          const sampleW = Math.min(PANTS_MASK_SAMPLE_W, c.width);
          const sampleH = Math.max(1, Math.round((sampleW * c.height) / c.width));
          const sample = document.createElement("canvas");
          sample.width = sampleW;
          sample.height = sampleH;
          const sctx = sample.getContext("2d");
          if (!sctx) return null;
          sctx.clearRect(0, 0, sampleW, sampleH);
          sctx.drawImage(c, 0, 0, sampleW, sampleH);
          const sdata = sctx.getImageData(0, 0, sampleW, sampleH).data;
          const points: Array<{ x: number; y: number }> = [];
          let minPoint: { x: number; y: number } | null = null;
          let maxPoint: { x: number; y: number } | null = null;
          for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
              const alpha = sdata[(y * sampleW + x) * 4 + 3];
              if (alpha < 10) continue;
              points.push({ x, y });
              if (!minPoint || x < minPoint.x) minPoint = { x, y };
              if (!maxPoint || x > maxPoint.x) maxPoint = { x, y };
            }
          }
          if (points.length < 80 || !minPoint || !maxPoint) return null;

          let c0 = { x: minPoint.x, y: minPoint.y };
          let c1 = { x: maxPoint.x, y: maxPoint.y };
          for (let iter = 0; iter < 6; iter++) {
            let sum0x = 0;
            let sum0y = 0;
            let sum1x = 0;
            let sum1y = 0;
            let count0 = 0;
            let count1 = 0;
            for (const p of points) {
              const dx0 = p.x - c0.x;
              const dy0 = p.y - c0.y;
              const dx1 = p.x - c1.x;
              const dy1 = p.y - c1.y;
              if (dx0 * dx0 + dy0 * dy0 <= dx1 * dx1 + dy1 * dy1) {
                sum0x += p.x;
                sum0y += p.y;
                count0++;
              } else {
                sum1x += p.x;
                sum1y += p.y;
                count1++;
              }
            }
            if (count0 > 0) c0 = { x: sum0x / count0, y: sum0y / count0 };
            if (count1 > 0) c1 = { x: sum1x / count1, y: sum1y / count1 };
          }

          const labels = new Int8Array(sampleW * sampleH);
          labels.fill(-1);
          for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
              const alpha = sdata[(y * sampleW + x) * 4 + 3];
              if (alpha < 10) continue;
              const dx0 = x - c0.x;
              const dy0 = y - c0.y;
              const dx1 = x - c1.x;
              const dy1 = y - c1.y;
              labels[y * sampleW + x] = dx0 * dx0 + dy0 * dy0 <= dx1 * dx1 + dy1 * dy1 ? 0 : 1;
            }
          }
          const boundary = new Uint8Array(sampleW * sampleH);
          for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
              const idx = y * sampleW + x;
              const label = labels[idx];
              if (label < 0) continue;
              const left = x > 0 ? labels[idx - 1] : label;
              const right = x < sampleW - 1 ? labels[idx + 1] : label;
              const up = y > 0 ? labels[idx - sampleW] : label;
              const down = y < sampleH - 1 ? labels[idx + sampleW] : label;
              if (
                (left >= 0 && left !== label) ||
                (right >= 0 && right !== label) ||
                (up >= 0 && up !== label) ||
                (down >= 0 && down !== label)
              ) {
                boundary[idx] = 1;
              }
            }
          }
          const seamClassifier = (() => {
            const minY = sampleH * 0.12;
            const maxY = sampleH * 0.95;
            const seamX = (c0.x + c1.x) / 2;
            const maxDx = sampleW * 0.2;
            let sumX = 0;
            let sumY = 0;
            let sumXX = 0;
            let sumXY = 0;
            let count = 0;
            for (let y = 0; y < sampleH; y++) {
              if (y < minY || y > maxY) continue;
              for (let x = 0; x < sampleW; x++) {
                const idx = y * sampleW + x;
                if (boundary[idx] !== 1) continue;
                if (Math.abs(x - seamX) > maxDx) continue;
                sumX += x;
                sumY += y;
                sumXX += x * x;
                sumXY += x * y;
                count++;
              }
            }
            if (count >= 20) {
              const denom = count * sumXX - sumX * sumX;
              if (Math.abs(denom) > 1e-3) {
                const slope = (count * sumXY - sumX * sumY) / denom;
                const intercept = (sumY - slope * sumX) / count;
                const side = (x: number, y: number) => y >= slope * x + intercept;
                return { side, c0Side: side(c0.x, c0.y), line: { slope, intercept } };
              }
            }
            const dx = c1.x - c0.x;
            const dy = c1.y - c0.y;
            if (!dx && !dy) return null;
            const midX = (c0.x + c1.x) / 2;
            const midY = (c0.y + c1.y) / 2;
            const side = (x: number, y: number) => dx * (x - midX) + dy * (y - midY) >= 0;
            return { side, c0Side: side(c0.x, c0.y), line: null as null | { slope: number; intercept: number } };
          })();

          const activeLabels = seamClassifier && seamClassifier.line ? new Int8Array(sampleW * sampleH) : labels;
          if (seamClassifier && seamClassifier.line) {
            activeLabels.fill(-1);
            for (let y = 0; y < sampleH; y++) {
              for (let x = 0; x < sampleW; x++) {
                const idx = y * sampleW + x;
                const alpha = sdata[idx * 4 + 3];
                if (alpha < 10) continue;
                const side = seamClassifier.side(x, y);
                activeLabels[idx] = side === seamClassifier.c0Side ? 0 : 1;
              }
            }
          }

          const leftLabel = c0.x <= c1.x ? 0 : 1;
          const rightLabel = leftLabel === 0 ? 1 : 0;
          const leftMask = ctx.createImageData(c.width, c.height);
          const rightMask = ctx.createImageData(c.width, c.height);
          const full = unionData.data;
          const sampleScaleX = sampleW / c.width;
          const sampleScaleY = sampleH / c.height;
          for (let y = 0; y < c.height; y++) {
            const sy = Math.min(sampleH - 1, Math.floor(y * sampleScaleY));
            for (let x = 0; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              const alpha = full[idx + 3];
              if (alpha < 10) continue;
              const sx = Math.min(sampleW - 1, Math.floor(x * sampleScaleX));
              let label = activeLabels[sy * sampleW + sx];
              if (label < 0) {
                const dx0 = sx - c0.x;
                const dy0 = sy - c0.y;
                const dx1 = sx - c1.x;
                const dy1 = sy - c1.y;
                label = dx0 * dx0 + dy0 * dy0 <= dx1 * dx1 + dy1 * dy1 ? 0 : 1;
              }
              const target = label === leftLabel ? leftMask.data : rightMask.data;
              target[idx] = 255;
              target[idx + 1] = 255;
              target[idx + 2] = 255;
              target[idx + 3] = alpha;
            }
          }

          const rightForceX = Math.round(c.width * PANTS_RIGHT_FORCE_X_RATIO);
          for (let y = 0; y < c.height; y++) {
            for (let x = rightForceX; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              const unionAlpha = full[idx + 3];
              if (unionAlpha < 1) continue;
              rightMask.data[idx] = 255;
              rightMask.data[idx + 1] = 255;
              rightMask.data[idx + 2] = 255;
              rightMask.data[idx + 3] = unionAlpha;
            }
          }
          for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              const unionAlpha = full[idx + 3];
              const rightAlpha = rightMask.data[idx + 3];
              if (rightAlpha > 0) {
                leftMask.data[idx + 3] = 0;
                continue;
              }
              if (unionAlpha > 0) {
                leftMask.data[idx] = 255;
                leftMask.data[idx + 1] = 255;
                leftMask.data[idx + 2] = 255;
                leftMask.data[idx + 3] = unionAlpha;
              } else {
                leftMask.data[idx + 3] = 0;
              }
            }
          }

          const rightUpper = ctx.createImageData(c.width, c.height);
          const rightLower = ctx.createImageData(c.width, c.height);
          for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              const alpha = rightMask.data[idx + 3];
              if (alpha < 1) continue;
              let upper = false;
              if (seamClassifier?.line) {
                const seamY = seamClassifier.line.slope * x + seamClassifier.line.intercept;
                upper = y <= seamY;
              } else {
                const rightSplitY = Math.round(PANTS_CANVAS.h * PANTS_RIGHT_SPLIT_RATIO);
                upper = y <= rightSplitY;
              }
              const target = upper ? rightUpper.data : rightLower.data;
              target[idx] = 255;
              target[idx + 1] = 255;
              target[idx + 2] = 255;
              target[idx + 3] = alpha;
            }
          }

          const leftCanvas = document.createElement("canvas");
          const rightCanvas = document.createElement("canvas");
          const rightUpperCanvas = document.createElement("canvas");
          const rightLowerCanvas = document.createElement("canvas");
          leftCanvas.width = c.width;
          leftCanvas.height = c.height;
          rightCanvas.width = c.width;
          rightCanvas.height = c.height;
          rightUpperCanvas.width = c.width;
          rightUpperCanvas.height = c.height;
          rightLowerCanvas.width = c.width;
          rightLowerCanvas.height = c.height;
          const lctx = leftCanvas.getContext("2d");
          const rctx = rightCanvas.getContext("2d");
          const uctx = rightUpperCanvas.getContext("2d");
          const dctx = rightLowerCanvas.getContext("2d");
          if (!lctx || !rctx || !uctx || !dctx) return null;
          lctx.putImageData(leftMask, 0, 0);
          rctx.putImageData(rightMask, 0, 0);
          uctx.putImageData(rightUpper, 0, 0);
          dctx.putImageData(rightLower, 0, 0);
          return {
            leftMaskUrl: leftCanvas.toDataURL("image/png"),
            rightMaskUrl: rightCanvas.toDataURL("image/png"),
            rightUpperUrl: rightUpperCanvas.toDataURL("image/png"),
            rightLowerUrl: rightLowerCanvas.toDataURL("image/png"),
          };
        })();
        if (!cancelled) {
          if (legResult) {
            const masks = { left: legResult.leftMaskUrl, right: legResult.rightMaskUrl };
            const splitMasks = { upper: legResult.rightUpperUrl, lower: legResult.rightLowerUrl };
            setPantsLegMasks(masks);
            setPantsRightSplitMasks(splitMasks);
            PANTS_LEG_MASK_CACHE.set(pantsMaskKey, masks);
            PANTS_RIGHT_SPLIT_CACHE.set(pantsMaskKey, splitMasks);
          } else {
            setPantsLegMasks(null);
            setPantsRightSplitMasks(null);
          }
        }
        if (!cancelled) {
          const url = c.toDataURL("image/png");
          PANTS_MASK_CACHE.set(pantsMaskKey, url);
          setPantsUnionMask(url);
        }
      } catch {
        if (!cancelled) {
          setPantsUnionMask(null);
          setPantsLegMasks(null);
          setPantsRightSplitMasks(null);
        }
      } finally {
        if (!cancelled) setPantsMaskBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
      setPantsMaskBuilding(false);
    };
  }, [pantsMaskKey, pantsMaskLayers]);

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

  const allJacketLayers = structuralJacketLayers;
  const pantsMaskPair = pantsLayer ? cdnPair(pantsLayer.src) : null;
  const pantsMask = pantsUnionMask ?? pantsMaskPair?.png ?? null;
  const useSplitPantsTexture =
    useTexture && stripeRotationActive && Boolean(pantsLegMasks && pantsRightSplitMasks);
  return (
    <div className="relative w-full select-none">
      <div className="relative mx-auto w-full max-w-[580px] sm:max-w-[540px]">
        <div
          className="relative mx-auto w-full origin-top transform scale-[0.86] sm:scale-[0.86] lg:scale-[0.86]"
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
            fabricTexture={useTexture ? fabricTexture : undefined}
            textureStyle={fabricTextureStyle}
            baseColor={fabricFillColor || toneBaseColor}
            fabricAvgColor={fabricFillColor}
            panZoom={panZoom}
            canvas={JACKET_CANVAS}
            mask={jacketUnionMask}
            textureScale={fabricTextureScale}
          />
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
        {needsDarkBoost && jacketUnionMask && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "multiply",
              opacity: 0.35,
              backgroundColor: "#080808",
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
        {jacketUnionMask && showLayer("ao") && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "multiply",
              opacity: softenedTone.ambientOcclusion,
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
          <GlobalOverlay noiseData={NOISE_DATA} settings={softenedTone} mask={jacketUnionMask} />
        )}
      </div>
    </div>
    {/* ======================== PANTS CANVAS ======================== */}
      {pantsLayer && (
        <div
          className="relative mx-auto -mt-20 w-full max-w-[560px] origin-top transform scale-[0.92] sm:-mt-16 sm:scale-[0.92] lg:-mt-12 lg:scale-[0.92]"
          style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 520 }}
        >
          <BaseLayer layers={[pantsLayer]} resolve={(layer) => cdnPair(layer.src)} />
          {cuffsLayer && cuffsLayer.src !== pantsLayer.src && (
            <BaseLayer
              layers={[cuffsLayer]}
              resolve={(layer) => cdnPair(layer.src)}
              blendMode="soft-light"
              opacity={0.8}
            />
          )}
          {showLayer("fabric") && (
            <>
              <FabricUnion
                layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
                resolve={(layer) => cdnPair(layer.src)}
                fabricTexture={undefined}
                textureStyle={fabricTextureStyle}
                baseColor={fabricFillColor || toneBaseColor}
                fabricAvgColor={fabricFillColor}
                panZoom={panZoom}
                canvas={PANTS_CANVAS}
                mask={pantsMask}
                textureScale={fabricTextureScale}
              />
              {useSplitPantsTexture ? (
                <>
                  <FabricUnion
                    layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
                    resolve={(layer) => cdnPair(layer.src)}
                    fabricTexture={useTexture ? fabricTexture : undefined}
                    textureStyle={fabricTextureStyle}
                    baseColor={fabricFillColor || toneBaseColor}
                    baseBlendMode="normal"
                    baseOpacity={0}
                    panZoom={panZoom}
                    canvas={PANTS_CANVAS}
                    mask={pantsLegMasks?.left ?? pantsMask ?? undefined}
                    textureScale={fabricTextureScale}
                    textureRotationDeg={pantsTextureRotationLeft}
                  />
                  <FabricUnion
                    layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
                    resolve={(layer) => cdnPair(layer.src)}
                    fabricTexture={useTexture ? fabricTexture : undefined}
                    textureStyle={fabricTextureStyle}
                    baseColor={fabricFillColor || toneBaseColor}
                    baseBlendMode="normal"
                    baseOpacity={0}
                    panZoom={panZoom}
                    canvas={PANTS_CANVAS}
                    mask={pantsRightSplitMasks?.upper ?? pantsLegMasks?.right ?? pantsMask ?? undefined}
                    textureScale={fabricTextureScale}
                    textureRotationDeg={pantsTextureRotationRightUpper}
                  />
                  <FabricUnion
                    layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
                    resolve={(layer) => cdnPair(layer.src)}
                    fabricTexture={useTexture ? fabricTexture : undefined}
                    textureStyle={fabricTextureStyle}
                    baseColor={fabricFillColor || toneBaseColor}
                    baseBlendMode="normal"
                    baseOpacity={0}
                    panZoom={panZoom}
                    canvas={PANTS_CANVAS}
                    mask={pantsRightSplitMasks?.lower ?? pantsLegMasks?.right ?? pantsMask ?? undefined}
                    textureScale={fabricTextureScale}
                    textureRotationDeg={pantsTextureRotationRightLower}
                  />
                </>
              ) : (
                <FabricUnion
                  layers={pantsFabricLayers.length ? pantsFabricLayers : [pantsLayer]}
                  resolve={(layer) => cdnPair(layer.src)}
                  fabricTexture={useTexture ? fabricTexture : undefined}
                  textureStyle={fabricTextureStyle}
                  baseColor={fabricFillColor || toneBaseColor}
                  baseBlendMode="normal"
                  baseOpacity={0}
                  panZoom={panZoom}
                  canvas={PANTS_CANVAS}
                  mask={pantsMask}
                  textureScale={fabricTextureScale}
                  textureRotationDeg={pantsTextureRotation}
                />
              )}
            </>
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
          {needsDarkBoost && pantsMask && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                mixBlendMode: "multiply",
                opacity: 0.35,
                backgroundColor: "#080808",
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
          {showLayer("vignette") && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                mixBlendMode: "multiply",
                opacity: softenedTone.vignette * 0.8,
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
