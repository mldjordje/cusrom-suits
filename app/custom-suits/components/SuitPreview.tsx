"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { suits, SuitLayer, vestStyles } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getBackendBase, getTransparentCdnBase } from "../utils/backend";
import { toneBlend, getToneConfig, getToneBaseColor, ContrastLevel, Tone, NOISE_DATA } from "../utils/visual";
import {
  buildTextureFilterWithParity,
  getParityPreset,
  isParityModeEnabled,
} from "../utils/parity";
import {
  cdnPair,
  ensureAssetAvailable,
  edgesPair,
  photoPair,
  resolveFabricRenderPair,
  shadingPair,
  specularPair,
  type FabricRenderMode,
  type PhotoVariant,
  type RenderGarment,
} from "../utils/assets";
import { useButtons } from "../hooks/useButtons";
import { useLinings } from "../hooks/useLinings";
import { ButtonLayout, ButtonPosition, getFallbackPositions } from "../data/buttonPositions";
import { BaseLayer } from "./layers/BaseLayer";
import { FabricUnion } from "./layers/FabricUnion";
import { GlobalOverlay } from "./layers/GlobalOverlay";
import { LightingPasses } from "./layers/LightingPasses";
import { spriteBackground } from "./layers/types";
import { buildDeterministicPantsStripeZones } from "./pantsStripeZones";
import { PANTS_STRIPE_TUNING } from "./pantsStripeTuning";

/* =====================================================================================
   CDN helpers (ostaju jer maske i strukturalni sprite-ovi su i dalje iz transparent/)
===================================================================================== */
const cdnTransparent = getTransparentCdnBase();
const SHIRT_PAIR = cdnPair("shirt_to_jacket_open.png");
const JACKET_CANVAS = { w: 600, h: 733 } as const;
const PANTS_CANVAS = { w: 600, h: 350 } as const;
const PANTS_SEAM_MASK_SRC = "/assets/suits/masks/pants_seam.png";
const EMPTY_TEXTURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
const MASK_BLEED_PX = 1.1;
const SPLIT_MASK_BLEED_PX = 0;
const TEXTURE_TILE_PX = 75;
const STRIPE_TILE_SCALE = 0.5;
const STRIPE_TILE_PX = Math.round(TEXTURE_TILE_PX * STRIPE_TILE_SCALE);
const TEXTURE_TILE_CANVAS_SCALE = 0.12;
const TEXTURE_TILE_CANVAS_MAX = 280;
const STRIPE_ANALYSIS_SIZE = 80;
const PANTS_MASK_SAMPLE_W = 160;
const TEXTURE_SCALE_GLOBAL = 1;
const TEXTURE_SCALE_MIN = 0.08;
const TEXTURE_SCALE_MAX = 1.1;
const DEBUG_PANTS_OVERLAY = false;
const ENABLE_PANTS_SPLIT = false;
const ENABLE_PANTS_ZONE_MASKS = true;
const FORCE_PANTS_MID_SPLIT = false;
const FAST_PREVIEW = true;
// Hard guard: pants must use only real fabric texture, never synthetic drawn stripes.
const ENABLE_PANTS_SYNTHETIC_STRIPES = false;
const PARITY_DEBUG_OVERLAY = process.env.NEXT_PUBLIC_PARITY_DEBUG === "1";
const VEST_FEATURE_ENABLED = process.env.NEXT_PUBLIC_VEST_FEATURE !== "0";
const PANTS_MASK_VERSION = "v25";
const ZERO_OFFSET = { x: 0, y: 0 } as const;

const FABRIC_AVG_CACHE = new Map<string, string | null>();
const FABRIC_TILE_CACHE = new Map<string, string>();
const FABRIC_STRIPE_CACHE = new Map<string, StripeHint>();
const JACKET_MASK_CACHE = new Map<string, string>();
const VEST_MASK_CACHE = new Map<string, string>();
const PANTS_MASK_CACHE = new Map<string, string>();
const PANTS_LEG_MASK_CACHE = new Map<string, { left: string; right: string }>();
const PANTS_LEFT_SPLIT_CACHE = new Map<string, { main: string; under: string | null }>();
const PANTS_RIGHT_SPLIT_CACHE = new Map<string, { upper: string; lower: string | null }>();
const PANTS_WAIST_MASK_CACHE = new Map<string, string>();
const PANTS_AXIS_CACHE = new Map<string, number>();
const PANTS_MASK_STATS_CACHE = new Map<string, PantsMaskStats>();

type RGB = { r: number; g: number; b: number };
type StripeOrientation = "vertical" | "horizontal" | "none";
type StripeHint = { strength: number; orientation: StripeOrientation; contrast: number };
type PantsMaskStats = {
  union: number;
  left: number;
  right: number;
  leftMain: number;
  leftUnder: number;
  rightFly: number;
  rightUnder: number;
  main: number;
  waist: number;
  overlap?: number;
  unassigned?: number;
  zoneUnion?: number;
  coverage?: number;
};
type PantsStripeZoneMode = "single" | "secondary" | "primary";
type PantsStripeZoneConfig = {
  mode: PantsStripeZoneMode;
  coverageRatio: number;
  zonePixelsSum: number;
  unionPixels: number;
  coverageOk: boolean;
  keyZoneOk: boolean;
  masks: {
    union: string | null;
    leftMain: string | null;
    leftUnder: string | null;
    rightUpper: string | null;
    rightLower: string | null;
    leftLeg: string | null;
    rightLeg: string | null;
    waist: string | null;
  };
  rotations: {
    single: number;
    leftMain: number;
    rightUpper: number;
    rightLower: number;
    waist: number;
  };
};

const EMPTY_STRIPE: StripeHint = { strength: 0, orientation: "none", contrast: 0 };

const HEX_COLOR = /^[0-9a-f]{6}$/i;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeRotation = (value: number) => {
  let v = value % 180;
  if (v > 90) v -= 180;
  if (v < -90) v += 180;
  return v;
};
const PREVIEW_EXPOSURE = (() => {
  const raw =
    process.env.NEXT_PUBLIC_PREVIEW_EXPOSURE_PHOTO ?? process.env.NEXT_PUBLIC_PREVIEW_EXPOSURE;
  const num = raw ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return 1.06;
  return clamp(num, 0.95, 1.18);
})();
const FORCE_PHOTO_VARIANT = (() => {
  const raw = process.env.NEXT_PUBLIC_FORCE_PHOTO_VARIANT;
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return normalized === "blue" || normalized === "black" || normalized === "light"
    ? (normalized as PhotoVariant)
    : null;
})();
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

const normalizePattern = (value?: string | null) => String(value ?? "").trim().toLowerCase();
const inferPatternFromText = (value?: string | null) => {
  const raw = normalizePattern(value);
  if (!raw) return "";
  if (raw.includes("tanke") || raw.includes("pinstripe")) return "tanke pruge";
  if (raw.includes("pruge") || raw.includes("stripe")) return "pruge";
  return "";
};
const getFabricPatternRaw = (fabric: unknown) => {
  if (!fabric || typeof fabric !== "object") return "";
  const data = fabric as Record<string, unknown>;
  const candidates = [
    data.pattern,
    data.uzorak,
    data.weave,
    data.weave_name,
    data.weaveName,
    data.pattern_name,
    data.patternName,
    data.pattern_type,
    data.patternType,
    data.texturePattern,
    data.texture_pattern,
    data.design,
    data.motif,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};
const shouldUsePantsPatternOverlay = (fabric: unknown) => {
  const raw = normalizePattern(getFabricPatternRaw(fabric));
  return raw.includes("pruge") || raw.includes("pinstripe") || raw.includes("stripe") || raw === "karo";
};

const normalizePhotoVariantMeta = (value: unknown): PhotoVariant | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "blue" || normalized === "black" || normalized === "light") {
    return normalized as PhotoVariant;
  }
  return null;
};

const normalizeRenderModeMeta = (value: unknown): FabricRenderMode | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "fabricspecific" ||
    normalized === "fabric_specific" ||
    normalized === "fabric-specific"
  ) {
    return "fabricSpecific";
  }
  if (
    normalized === "photovariant" ||
    normalized === "photo_variant" ||
    normalized === "photo-variant"
  ) {
    return "photoVariant";
  }
  return null;
};

const getFabricRenderBasePath = (fabric: unknown): string | null => {
  if (!fabric || typeof fabric !== "object") return null;
  const data = fabric as Record<string, unknown>;
  const candidates = [
    data.renderBasePath,
    data.render_base_path,
    data.renderPath,
    data.render_path,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const selectPhotoVariantForFabric = ({
  fabric,
  tone,
  metrics,
  isStripeFabric,
  fallbackHex,
}: {
  fabric: unknown;
  tone: Tone;
  metrics: { luminance: number; saturation: number; lightness: number };
  isStripeFabric: boolean;
  fallbackHex?: string | null;
}): PhotoVariant => {
  if (FORCE_PHOTO_VARIANT) return FORCE_PHOTO_VARIANT;
  const explicit = normalizePhotoVariantMeta(
    (fabric as Record<string, unknown> | null)?.photoVariant ??
      (fabric as Record<string, unknown> | null)?.photo_variant
  );
  if (explicit) return explicit;
  if (tone === "light") return "light";

  const referenceRgb = hexToRgb(fallbackHex ?? extractFabricHex(fabric));
  const hsl = referenceRgb
    ? rgbToHsl(referenceRgb)
    : { h: 0, s: metrics.saturation, l: metrics.lightness };
  const blueHue = hsl.h >= 178 && hsl.h <= 255;
  const warmHue = hsl.h >= 8 && hsl.h <= 55;
  const nearNeutral = hsl.s < 0.13;
  const blueSatThreshold = isStripeFabric ? 0.11 : 0.16;

  if ((blueHue || warmHue) && hsl.s >= blueSatThreshold) return "blue";
  if (tone === "dark") {
    if (!nearNeutral && hsl.s >= 0.14) return "blue";
    return "black";
  }
  if (metrics.luminance > 0.66 || hsl.l > 0.72) return "light";
  if (isStripeFabric && tone === "medium") return "blue";
  if (metrics.luminance < 0.085 && hsl.s < 0.2) return "black";
  return "blue";
};

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
  if (strength < 0.06) orientation = "none";
  return { strength, orientation, contrast };
};

const computeMaskAxisAngle = (data: Uint8ClampedArray, w: number, h: number, yMin = 0, yMax = h - 1) => {
  if (!data.length || w < 2 || h < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < h; y++) {
    if (y < yMin || y > yMax) continue;
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha < 10) continue;
      sumX += x;
      sumY += y;
      count++;
    }
  }
  if (count < 2) return 0;
  const meanX = sumX / count;
  const meanY = sumY / count;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha < 10) continue;
      const dx = x - meanX;
      const dy = y - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
  }
  if (!sxx && !syy) return 0;
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const deg = (angle * 180) / Math.PI;
  return Number.isFinite(deg) ? deg : 0;
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

const applyPreviewExposure = (hex: string, exposure: number) => {
  if (exposure === 1) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(scaleRgb(rgb, exposure));
};

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

const computeRobustAverageColor = (data: Uint8ClampedArray) => {
  const pixels: Array<{ r: number; g: number; b: number; lum: number }> = [];
  const luminances: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    pixels.push({ r, g, b, lum });
    luminances.push(lum);
  }
  if (!pixels.length) return null;
  luminances.sort((a, b) => a - b);
  const lo = luminances[Math.floor((luminances.length - 1) * 0.16)];
  const hi = luminances[Math.floor((luminances.length - 1) * 0.82)];

  let wr = 0;
  let wg = 0;
  let wb = 0;
  let ws = 0;
  for (const p of pixels) {
    if (p.lum < lo || p.lum > hi) continue;
    const max = Math.max(p.r, p.g, p.b);
    const min = Math.min(p.r, p.g, p.b);
    const saturation = max > 0 ? (max - min) / max : 0;
    const weight = 1 + saturation * 0.7;
    wr += p.r * weight;
    wg += p.g * weight;
    wb += p.b * weight;
    ws += weight;
  }
  if (ws <= 0) return null;
  return rgbToHex({
    r: wr / ws,
    g: wg / ws,
    b: wb / ws,
  });
};

/* =====================================================================================
   Komponenta
===================================================================================== */

type LayerVisibility = Partial<Record<"fabric" | "style" | "vignette" | "ao", boolean>>;
export type SuitPreviewRenderDebug = {
  renderMode: "transparent" | FabricRenderMode;
  requestedRenderMode: FabricRenderMode;
  photoVariant: PhotoVariant;
  forcedPhotoVariant: PhotoVariant | null;
  renderBasePath: string | null;
  usePhotoBase: boolean;
  isStripeFabric: boolean;
  hasTextureStripes: boolean;
  jacketPhotoLayerCount: number;
  pantsPhotoLayerCount: number;
};

type Props = {
  config: SuitState;
  level?: ContrastLevel;
  view?: "both" | "jacket" | "pants";
  layerVisibility?: LayerVisibility;
  onAssetStatus?: (status: { missing: string[] }) => void;
  onRenderDebug?: (debug: SuitPreviewRenderDebug) => void;
  fabrics: any[];
  fabricsLoading: boolean;
};

const SuitPreview = ({
  config,
  level = "medium",
  view = "both",
  layerVisibility,
  onAssetStatus,
  onRenderDebug,
  fabrics,
  fabricsLoading,
}: Props) => {
  const { buttons } = useButtons();
  const { linings } = useLinings(config.styleId);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [buttonLayouts, setButtonLayouts] = useState<ButtonLayout[]>([]);
  const resolveCdn = useCallback((layer: SuitLayer) => cdnPair(layer.src), []);
  const resolveVest = useCallback(
    (layer: SuitLayer) => ({ webp: layer.src, png: layer.src }),
    []
  );
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
    const isLowEndDevice = () => {
      if (typeof navigator === "undefined") return false;
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        hardwareConcurrency?: number;
        connection?: { saveData?: boolean };
      };
      return (
        Boolean(nav.connection?.saveData) ||
        (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) ||
        (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4)
      );
    };
    const update = () => setLowPowerMode(smallScreen.matches || reducedMotion.matches || isLowEndDevice());
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

  const vestEnabled = VEST_FEATURE_ENABLED && Boolean(config.vestEnabled);
  const selectedVestStyle = useMemo(() => {
    if (!vestEnabled) return null;
    return vestStyles.find((style) => style.id === config.vestStyleId) ?? vestStyles[0] ?? null;
  }, [config.vestStyleId, vestEnabled]);
  const vestLayers = useMemo(() => selectedVestStyle?.layers ?? [], [selectedVestStyle]);
  const vestInteriorLayers = useMemo(
    () => vestLayers.filter((layer) => layer.id.includes("interior")),
    [vestLayers]
  );
  const vestFabricLayers = useMemo(
    () => vestLayers.filter((layer) => !layer.id.includes("interior")),
    [vestLayers]
  );

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId)) ?? fabrics[0] ?? null;
  const fabricRenderBasePath = useMemo(() => getFabricRenderBasePath(selectedFabric), [selectedFabric]);
  const requestedRenderMode = useMemo<FabricRenderMode>(() => {
    const explicit = normalizeRenderModeMeta(
      (selectedFabric as Record<string, unknown> | null)?.renderMode ??
        (selectedFabric as Record<string, unknown> | null)?.render_mode
    );
    if (explicit) return explicit;
    return fabricRenderBasePath ? "fabricSpecific" : "photoVariant";
  }, [fabricRenderBasePath, selectedFabric]);
  const parityModeEnabled = isParityModeEnabled(process.env.NEXT_PUBLIC_PARITY_MODE);
  const parityPreset = useMemo(() => getParityPreset(selectedFabric), [selectedFabric]);
  const effectiveFastPreview = FAST_PREVIEW && !parityModeEnabled;
  const effectiveView: "both" | "jacket" | "pants" = parityModeEnabled ? "both" : view;
  const fabricTexture = selectedFabric?.texture || "";
  const [fabricTileTexture, setFabricTileTexture] = useState<string | null>(null);
  const [fabricStripe, setFabricStripe] = useState<StripeHint>(EMPTY_STRIPE);
  const [pantsLegMasks, setPantsLegMasks] = useState<{ left: string; right: string } | null>(null);
  const [pantsLeftSplitMasks, setPantsLeftSplitMasks] = useState<{
    main: string;
    under: string | null;
  } | null>(null);
  const [pantsRightSplitMasks, setPantsRightSplitMasks] = useState<{
    upper: string;
    lower: string | null;
  } | null>(null);
  const [pantsWaistMask, setPantsWaistMask] = useState<string | null>(null);
  const [vestUnionMask, setVestUnionMask] = useState<string | null>(null);
  const [pantsMaskStats, setPantsMaskStats] = useState<PantsMaskStats | null>(null);
  const fabricTextureSourceRaw = fabricTileTexture || fabricTexture;
  const cmsPatternRaw = useMemo(() => getFabricPatternRaw(selectedFabric), [selectedFabric]);
  const cmsPatternNorm = useMemo(() => normalizePattern(cmsPatternRaw), [cmsPatternRaw]);
  const isExplicitSolid = cmsPatternNorm === "solid";
  const namePatternNorm = useMemo(() => {
    const name = String((selectedFabric as any)?.name ?? "");
    const texture = String(fabricTexture ?? "");
    return inferPatternFromText(`${name} ${texture}`);
  }, [fabricTexture, selectedFabric]);
  const pantsPatternValue = useMemo(
    () => (isExplicitSolid ? "" : cmsPatternNorm) || namePatternNorm,
    [cmsPatternNorm, isExplicitSolid, namePatternNorm]
  );
  const stripeNameHint = useMemo(() => {
    const name = String((selectedFabric as any)?.name || "");
    const texture = String(fabricTexture || "");
    const haystack = `${name} ${texture}`.toLowerCase();
    return /pinstripe|stripe|linije|lines|pruga|pruge/.test(haystack);
  }, [fabricTexture, selectedFabric]);
  const stripeSpacingBaseOverride = useMemo(
    () => parseNumber((selectedFabric as any)?.stripeSpacing ?? (selectedFabric as any)?.stripe_spacing),
    [selectedFabric]
  );
  const stripeSpacingJacketRaw = useMemo(() => {
    const raw = parseNumber(
      (selectedFabric as any)?.stripeSpacingJacket ?? (selectedFabric as any)?.stripe_spacing_jacket
    );
    if (parityModeEnabled && parityPreset) return parityPreset.stripeSpacingJacket;
    return typeof raw === "number" ? raw : stripeSpacingBaseOverride;
  }, [parityModeEnabled, parityPreset, selectedFabric, stripeSpacingBaseOverride]);
  const stripeSpacingPantsRaw = useMemo(() => {
    const raw = parseNumber(
      (selectedFabric as any)?.stripeSpacingPants ?? (selectedFabric as any)?.stripe_spacing_pants
    );
    if (parityModeEnabled && parityPreset) return parityPreset.stripeSpacingPants;
    return typeof raw === "number" ? raw : stripeSpacingBaseOverride;
  }, [parityModeEnabled, parityPreset, selectedFabric, stripeSpacingBaseOverride]);
  const stripeSpacingJacketValue =
    typeof stripeSpacingJacketRaw === "number" ? clamp(stripeSpacingJacketRaw, 1, 10) : null;
  const stripeSpacingPantsValue =
    typeof stripeSpacingPantsRaw === "number" ? clamp(stripeSpacingPantsRaw, 1, 10) : null;
  const hasStripeSpacingJacketOverride =
    typeof stripeSpacingJacketValue === "number" && Math.abs(stripeSpacingJacketValue - 6) > 0.01;
  const hasStripeSpacingPantsOverride =
    typeof stripeSpacingPantsValue === "number" && Math.abs(stripeSpacingPantsValue - 6) > 0.01;
  const hasStripeSpacingOverride = hasStripeSpacingJacketOverride || hasStripeSpacingPantsOverride;
  const stripeSpacingScaleJacket = useMemo(() => {
    if (!hasStripeSpacingJacketOverride || stripeSpacingJacketValue === null) return 1;
    return clamp(1 + (stripeSpacingJacketValue - 6) * 0.07, 0.65, 1.35);
  }, [hasStripeSpacingJacketOverride, stripeSpacingJacketValue]);
  const stripeSpacingScalePants = useMemo(() => {
    if (!hasStripeSpacingPantsOverride || stripeSpacingPantsValue === null) return 1;
    return clamp(1 + (stripeSpacingPantsValue - 6) * 0.07, 0.65, 1.35);
  }, [hasStripeSpacingPantsOverride, stripeSpacingPantsValue]);
  const stripeSpacingScaleBase = useMemo(() => {
    if (hasStripeSpacingJacketOverride && hasStripeSpacingPantsOverride) {
      return clamp((stripeSpacingScaleJacket + stripeSpacingScalePants) / 2, 0.65, 1.35);
    }
    if (hasStripeSpacingJacketOverride) return stripeSpacingScaleJacket;
    if (hasStripeSpacingPantsOverride) return stripeSpacingScalePants;
    return 1;
  }, [
    hasStripeSpacingJacketOverride,
    hasStripeSpacingPantsOverride,
    stripeSpacingScaleJacket,
    stripeSpacingScalePants,
  ]);
  const allowAutoStripe = useMemo(() => !isExplicitSolid, [isExplicitSolid]);
  const autoStripePattern = useMemo(() => {
    if (!allowAutoStripe) return "";
    if (fabricStripe.orientation === "none") return "";
    const minStrength = 0.12;
    const minContrast = 0.06;
    if (fabricStripe.strength < minStrength && fabricStripe.contrast < minContrast) return "";
    if (fabricStripe.contrast >= 0.22 || fabricStripe.strength >= 0.4) return "pruge";
    return "tanke pruge";
  }, [allowAutoStripe, fabricStripe]);
  const pantsPatternValueResolved = useMemo(
    () => (isExplicitSolid ? "" : pantsPatternValue || autoStripePattern || (stripeNameHint ? "pruge" : "")),
    [autoStripePattern, isExplicitSolid, pantsPatternValue, stripeNameHint]
  );
  const hasCheckPattern = useMemo(
    () => pantsPatternValueResolved.includes("karo") || pantsPatternValueResolved.includes("check"),
    [pantsPatternValueResolved]
  );
  const stripeSpacingHint = useMemo(
    () => hasStripeSpacingOverride && !hasCheckPattern,
    [hasCheckPattern, hasStripeSpacingOverride]
  );
  const allowCheckOverlay = useMemo(
    () => !hasCheckPattern || fabricStripe.strength >= 0.22,
    [fabricStripe.strength, hasCheckPattern]
  );
  const isPantsCmsStripe = useMemo(
    () =>
      pantsPatternValueResolved.includes("pruge") ||
      pantsPatternValueResolved.includes("pinstripe") ||
      pantsPatternValueResolved.includes("stripes") ||
      pantsPatternValueResolved.includes("stripe"),
    [pantsPatternValueResolved]
  );
  const fabricPattern = useMemo(() => pantsPatternValueResolved, [pantsPatternValueResolved]);
  const patternStripe =
    fabricPattern === "pinstripe" ||
    fabricPattern === "stripe" ||
    fabricPattern.includes("pruge") ||
    fabricPattern.includes("stripe") ||
    fabricPattern.includes("pinstripe") ||
    stripeSpacingHint ||
    (!isExplicitSolid && stripeNameHint);
  const stripeScopePants = useMemo(() => {
    if (isExplicitSolid || hasCheckPattern) return false;
    const token = pantsPatternValueResolved;
    if (
      token.includes("pinstripe") ||
      token.includes("stripe") ||
      token.includes("pruge") ||
      token.includes("tanke")
    ) {
      return true;
    }
    return stripeNameHint;
  }, [hasCheckPattern, isExplicitSolid, pantsPatternValueResolved, stripeNameHint]);
  const stripeAnalysis = useMemo(() => (isExplicitSolid ? EMPTY_STRIPE : fabricStripe), [fabricStripe, isExplicitSolid]);
  const hasTextureStripes = useMemo(() => {
    if (!fabricTexture) return false;
    if (fabricStripe.orientation === "none") return false;
    const hinted = stripeNameHint || patternStripe;
    const minStrength = hinted ? 0.055 : 0.07;
    const minContrast = hinted ? 0.02 : 0.03;
    return fabricStripe.strength >= minStrength || fabricStripe.contrast >= minContrast;
  }, [fabricTexture, fabricStripe, stripeNameHint, patternStripe]);
  const isStripeFabric = useMemo(() => {
    if (hasCheckPattern) return false;
    if (patternStripe || stripeScopePants || stripeNameHint || isPantsCmsStripe) return true;
    if (hasTextureStripes) return true;
    const token = `${cmsPatternNorm} ${pantsPatternValueResolved}`.toLowerCase();
    return /pinstripe|hairline|chalk|banker|railroad|rope|shadow|ticking|wide[\s-_]?stripe|double[\s-_]?stripe|halo[\s-_]?stripe|bengal/.test(
      token
    );
  }, [
    cmsPatternNorm,
    hasCheckPattern,
    hasTextureStripes,
    isPantsCmsStripe,
    pantsPatternValueResolved,
    patternStripe,
    stripeNameHint,
    stripeScopePants,
  ]);
  const pantsStripeZoneEligible = useMemo(() => {
    if (hasCheckPattern || isExplicitSolid) return false;
    if (
      patternStripe ||
      stripeScopePants ||
      stripeNameHint ||
      isPantsCmsStripe ||
      hasStripeSpacingOverride
    ) {
      return true;
    }
    // For texture-only stripe detection use stricter thresholds to avoid false positives on solids.
    return hasTextureStripes && (fabricStripe.strength >= 0.16 || fabricStripe.contrast >= 0.1);
  }, [
    fabricStripe.contrast,
    fabricStripe.strength,
    hasCheckPattern,
    hasStripeSpacingOverride,
    hasTextureStripes,
    isExplicitSolid,
    isPantsCmsStripe,
    patternStripe,
    stripeNameHint,
    stripeScopePants,
  ]);
  const stripeProfile = useMemo(() => {
    if (!isStripeFabric) {
      return {
        active: false,
        thin: false,
        contrastBias: 0,
        brightnessBias: 0,
        saturateMul: 1,
        tileScaleMul: 1,
        textureScaleMul: 1,
      };
    }
    const thin = pantsPatternValueResolved.includes("tanke") || pantsPatternValueResolved.includes("pinstripe");
    const spacing = stripeSpacingPantsValue ?? stripeSpacingJacketValue ?? 6;
    const spacingNorm = clamp((spacing - 6) / 4, -1, 1);
    const strength = clamp(stripeAnalysis.strength, 0, 1);
    const contrastBias = thin ? 0.16 + strength * 0.12 : 0.1 + strength * 0.08;
    const brightnessBias = thin ? 0.03 : 0.02;
    const saturateMul = thin ? 0.92 : 0.96;
    const tileScaleMul = clamp((thin ? 1.35 : 1.15) + spacingNorm * 0.22, 1.0, 1.6);
    const textureScaleMul = clamp((thin ? 1.14 : 1.08) + spacingNorm * 0.08, 1.0, 1.3);
    return {
      active: true,
      thin,
      contrastBias,
      brightnessBias,
      saturateMul,
      tileScaleMul,
      textureScaleMul,
    };
  }, [
    isStripeFabric,
    pantsPatternValueResolved,
    stripeAnalysis.strength,
    stripeSpacingJacketValue,
    stripeSpacingPantsValue,
  ]);
  const useFullFabricTexture = useMemo(
    () => isStripeFabric || stripeSpacingHint || hasTextureStripes,
    [hasTextureStripes, isStripeFabric, stripeSpacingHint]
  );
  const fabricTextureSource = useMemo(
    () => (useFullFabricTexture ? fabricTexture : fabricTextureSourceRaw),
    [fabricTexture, fabricTextureSourceRaw, useFullFabricTexture]
  );
  const fabricTextureSourcePants = useMemo(
    () => fabricTexture || fabricTextureSource,
    [fabricTexture, fabricTextureSource]
  );
  const textureStrength = useMemo(() => {
    const raw = parseNumber((selectedFabric as any)?.textureStrength ?? (selectedFabric as any)?.texture_strength);
    const presetRaw = parityModeEnabled && parityPreset ? parityPreset.textureStrength : null;
    const normalized = typeof presetRaw === "number" ? presetRaw : typeof raw === "number" ? raw : 0.24;
    const boost = patternStripe ? 1.1 : 1.05;
    const max = patternStripe ? 0.42 : 0.46;
    return clamp(normalized * boost, 0.16, max);
  }, [parityModeEnabled, parityPreset, patternStripe, selectedFabric]);
  const explicitTextureScale = useMemo(() => {
    return parseNumber((selectedFabric as any)?.textureScale ?? (selectedFabric as any)?.texture_scale);
  }, [selectedFabric]);
  const textureContrastOverride = useMemo(
    () =>
      parityModeEnabled && parityPreset
        ? parityPreset.textureContrast
        : parseNumber((selectedFabric as any)?.textureContrast ?? (selectedFabric as any)?.texture_contrast),
    [parityModeEnabled, parityPreset, selectedFabric]
  );
  const textureBrightnessOverride = useMemo(
    () =>
      parityModeEnabled && parityPreset
        ? parityPreset.textureBrightness
        : parseNumber((selectedFabric as any)?.textureBrightness ?? (selectedFabric as any)?.texture_brightness),
    [parityModeEnabled, parityPreset, selectedFabric]
  );
  const hasExplicitTextureScale = typeof explicitTextureScale === "number" && Number.isFinite(explicitTextureScale);
  const textureScaleBoost = clamp(
    (explicitTextureScale ?? 1) * TEXTURE_SCALE_GLOBAL,
    TEXTURE_SCALE_MIN,
    TEXTURE_SCALE_MAX
  );
  const useTexture = Boolean(fabricTextureSource && textureStrength > 0);
  const usePantsTexture = Boolean(fabricTextureSourcePants);
  const usePhotoBase = Boolean(process.env.NEXT_PUBLIC_PHOTO_CDN_BASE);
  const activeRenderMode: "transparent" | FabricRenderMode = usePhotoBase
    ? requestedRenderMode === "fabricSpecific" && Boolean(fabricRenderBasePath)
      ? "fabricSpecific"
      : "photoVariant"
    : "transparent";
  const allowStripeOverlay = !useTexture || !hasTextureStripes;
  const usePantsPatternOverlay = useMemo(
    () =>
      stripeScopePants &&
      !isExplicitSolid &&
      (Boolean(pantsPatternValueResolved) ||
        shouldUsePantsPatternOverlay(selectedFabric) ||
        stripeNameHint ||
        hasStripeSpacingOverride) &&
      allowCheckOverlay &&
      allowStripeOverlay,
    [
      allowCheckOverlay,
      allowStripeOverlay,
      hasStripeSpacingOverride,
      isExplicitSolid,
      pantsPatternValueResolved,
      selectedFabric,
      stripeScopePants,
      stripeNameHint,
    ]
  );
  // Pants must always use real woven lines from fabric texture.
  // Never enable synthetic stripe overlay for pants.
  const usePantsPatternOverlayForPants = false;
  const useJacketPatternOverlay = false;
  const renderJacketPatternOverlay = false;
  const stripeTileSizePx = useMemo(() => {
    const wovenStripeTileScale = PANTS_STRIPE_TUNING.texture?.wovenStripeTileScale ?? 1.55;
    if (isStripeFabric && hasTextureStripes) {
      return Math.round(TEXTURE_TILE_PX * wovenStripeTileScale * stripeProfile.tileScaleMul);
    }
    if (patternStripe) return STRIPE_TILE_PX;
    return TEXTURE_TILE_PX;
  }, [hasTextureStripes, isStripeFabric, patternStripe, stripeProfile.tileScaleMul]);

  const tb = toneBlend(selectedFabric?.tone, level);
  const toneVis = getToneConfig(selectedFabric?.tone, level);
  const detailTone = useMemo(
    () => ({
      ...toneVis,
      shading: { ...toneVis.shading, opacity: toneVis.shading.opacity * (usePhotoBase ? 0.46 : 0.9) },
      specular: { ...toneVis.specular, opacity: toneVis.specular.opacity * (usePhotoBase ? 0.68 : 0.85) },
      edgesOpacity: toneVis.edgesOpacity * (usePhotoBase ? 0.9 : 0.85),
      outlinesOpacity: toneVis.outlinesOpacity * (usePhotoBase ? 0.9 : 0.85),
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
  const photoToneLift = useMemo(() => {
    if (!usePhotoBase) return 1;
    const rgb = hexToRgb(fabricFillColorBase);
    if (!rgb) return 1.08;
    const hsl = rgbToHsl(rgb);
    const base = fabricTone === "dark" ? 1.14 : fabricTone === "medium" ? 1.1 : 1.06;
    const saturationLift = hsl.s > 0.18 ? 0.04 : hsl.s < 0.08 ? 0.02 : 0.03;
    const darknessLift = hsl.l < 0.34 ? 0.02 : 0;
    return clamp(base + saturationLift + darknessLift, 1.02, 1.2);
  }, [fabricFillColorBase, fabricTone, usePhotoBase]);
  const fabricFillColor = useMemo(() => {
    const base = usePhotoBase ? fabricFillColorBase : enhanceFabricColor(fabricFillColorBase, fabricTone);
    const exposure = usePhotoBase ? PREVIEW_EXPOSURE * photoToneLift : PREVIEW_EXPOSURE;
    return applyPreviewExposure(base, exposure);
  }, [fabricFillColorBase, fabricTone, photoToneLift, usePhotoBase]);
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
    if (stripeAnalysis.orientation !== "none") return stripeAnalysis.orientation;
    return "none";
  }, [patternStripe, stripeAnalysis.orientation]);
  const baseStripeAngleDeg = useMemo(() => {
    const orientation =
      stripeAnalysis.orientation !== "none" ? stripeAnalysis.orientation : stripeOrientation;
    if (orientation === "vertical") return -90;
    if (orientation === "horizontal") return 0;
    return 0;
  }, [stripeAnalysis.orientation, stripeOrientation]);
  const stripeStrength = useMemo(
    () => (patternStripe ? Math.max(0.65, stripeAnalysis.strength) : stripeAnalysis.strength),
    [patternStripe, stripeAnalysis.strength]
  );
  const stripeBoost = useMemo(() => patternStripe, [patternStripe]);
  const stripeWhiteBoost = useMemo(
    () => stripeBoost && (fabricTone === "dark" || fabricMetrics.lightness < 0.4),
    [stripeBoost, fabricMetrics.lightness, fabricTone]
  );
  const stripeShadingMul = stripeWhiteBoost ? 0.82 : 1;
  const stripeEdgeMul = stripeWhiteBoost ? 0.88 : 1;
  const [pantsAxisAngle, setPantsAxisAngle] = useState<number | null>(null);
  const fabricTextureScale = useMemo(() => {
    if (patternStripe && hasExplicitTextureScale) return textureScaleBoost;
    const stripeScale = stripeBoost
      ? clamp((1.02 + stripeStrength * 0.16) * stripeProfile.textureScaleMul, 1.0, 1.28)
      : 1;
    const spacingScale = hasStripeSpacingOverride ? stripeSpacingScaleBase : 1;
    return clamp(textureScaleBoost * stripeScale * spacingScale, TEXTURE_SCALE_MIN, TEXTURE_SCALE_MAX);
  }, [
    hasExplicitTextureScale,
    hasStripeSpacingOverride,
    patternStripe,
    stripeProfile.textureScaleMul,
    stripeBoost,
    stripeSpacingScaleBase,
    stripeStrength,
    textureScaleBoost,
  ]);
  const stripeRotationActive =
    stripeBoost || stripeAnalysis.strength > PANTS_STRIPE_TUNING.stripeRotationMinStrength;
  const pantsStripeRotationDeg = useMemo(() => {
    if (!stripeRotationActive) return 0;
    const axis = pantsAxisAngle ?? 0;
    const baseAngle =
      stripeOrientation === "horizontal" ? 0 : stripeOrientation === "vertical" ? 90 : 0;
    return normalizeRotation(axis - baseAngle);
  }, [pantsAxisAngle, stripeOrientation, stripeRotationActive]);
  const pantsTextureRotationResolved = useMemo(
    () => {
      const base = stripeRotationActive ? pantsStripeRotationDeg : 0;
      if (parityModeEnabled && parityPreset) {
        return normalizeRotation(base + parityPreset.pantsTextureRotation);
      }
      return base;
    },
    [pantsStripeRotationDeg, parityModeEnabled, parityPreset, stripeRotationActive]
  );
  const pantsTextureRotation = useMemo(
    () => pantsTextureRotationResolved,
    [pantsTextureRotationResolved]
  );
  const fabricTextureFilter = useMemo(() => {
    const paritySaturate =
      parityModeEnabled && parityPreset ? parityPreset.textureSaturateMul ?? 1 : 1;
    const stripeSaturateMul = stripeProfile.active ? stripeProfile.saturateMul : 1;
    if (usePhotoBase) {
      // Keep photo textures neutral but avoid crushing stripe contrast on dark tones.
      const darkStripe = stripeProfile.active && fabricTone === "dark";
      const brightnessBase = textureBrightnessOverride ?? (darkStripe ? 1.01 : 1.04);
      const contrastBase = textureContrastOverride ?? (darkStripe ? 1.0 : 0.99);
      const brightness = clamp(brightnessBase * PREVIEW_EXPOSURE, 0.95, 1.22);
      const contrast = clamp(
        contrastBase + (stripeProfile.active ? stripeProfile.contrastBias * 0.24 : 0),
        0.94,
        1.12
      );
      const saturate = clamp(
        (darkStripe ? 0.2 : 0.24) * paritySaturate * stripeSaturateMul,
        0.14,
        0.35
      );
      return buildTextureFilterWithParity({
        baseFilter: "grayscale(1)",
        brightness: brightness + (stripeProfile.active ? stripeProfile.brightnessBias : 0),
        contrast,
        saturate,
      }).trim();
    }
    if (fabricTone === "dark") {
      const baseBrightness = 0.97;
      const baseContrast = 1.08;
      const baseSaturate = 1.02;
      const stripeContrast = stripeBoost
        ? stripeWhiteBoost
          ? 0.16 + stripeStrength * 0.08
          : 0.05 + stripeStrength * 0.04
        : 0;
      const stripeBrightness = stripeBoost
        ? stripeWhiteBoost
          ? 0.03 + stripeStrength * 0.015
          : 0.005 + stripeStrength * 0.008
        : 0;
      const stripeSaturate = stripeBoost ? (stripeWhiteBoost ? -0.04 : 0) : 0;
      const baseBrightnessValue = textureBrightnessOverride ?? baseBrightness;
      const baseContrastValue = textureContrastOverride ?? baseContrast;
      const brightness = clamp((baseBrightnessValue + stripeBrightness) * PREVIEW_EXPOSURE, 0.82, 1.34);
      const contrast = clamp(
        baseContrastValue + stripeContrast + (stripeProfile.active ? stripeProfile.contrastBias : 0),
        0.95,
        1.32
      );
      const saturate = clamp((baseSaturate + stripeSaturate) * paritySaturate * stripeSaturateMul, 0.88, 1.12);
      return buildTextureFilterWithParity({
        baseFilter: tb.filter,
        brightness: brightness + (stripeProfile.active ? stripeProfile.brightnessBias : 0),
        contrast,
        saturate,
      });
    }
    if (fabricTone === "light") {
      const brightness = clamp((textureBrightnessOverride ?? 1.05) * PREVIEW_EXPOSURE, 0.9, 1.6);
      const contrast = textureContrastOverride ?? 1.08;
      return buildTextureFilterWithParity({
        baseFilter: tb.filter,
        brightness: brightness + (stripeProfile.active ? stripeProfile.brightnessBias : 0),
        contrast: contrast + (stripeProfile.active ? stripeProfile.contrastBias : 0),
        saturate: 1.08 * paritySaturate * stripeSaturateMul,
      });
    }
    const midBrightness = clamp((textureBrightnessOverride ?? 1.03) * PREVIEW_EXPOSURE, 0.9, 1.9);
    const midContrast = textureContrastOverride ?? (stripeBoost ? 1.24 : 1.12);
    const midSaturate = (stripeBoost ? 1.1 : 1.07) * paritySaturate;
    return buildTextureFilterWithParity({
      baseFilter: tb.filter,
      brightness: midBrightness + (stripeProfile.active ? stripeProfile.brightnessBias : 0),
      contrast: midContrast + (stripeProfile.active ? stripeProfile.contrastBias : 0),
      saturate: midSaturate * stripeSaturateMul,
    });
  }, [
    parityModeEnabled,
    parityPreset,
    stripeProfile.active,
    stripeProfile.brightnessBias,
    stripeProfile.contrastBias,
    stripeProfile.saturateMul,
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
    const stripeDamp =
      (usePantsPatternOverlayForPants || useJacketPatternOverlay) && (patternStripe || stripeNameHint)
        ? 0.28
        : 1;
    if (usePhotoBase) {
      const sat = fabricMetrics.saturation;
      const lum = fabricMetrics.lightness;
      const satBoost = sat > 0.55 ? 0.22 : sat < 0.2 ? 0.1 : 0.16;
      const lumBoost = lum > 0.6 ? 0.12 : lum < 0.25 ? 0.08 : 0.1;
      const stripeDensity = stripeProfile.active ? 0.05 : 0;
      const baseOpacity = clamp(
        baseTextureOpacity * (0.42 + satBoost * 0.7 + lumBoost * 0.65 + stripeDensity),
        0.12,
        0.3
      );
      return clamp(baseOpacity * stripeDamp, 0.06, 0.3);
    }
    const stripeBoostMul = stripeBoost ? 1 + clamp(stripeStrength * 0.4, 0.12, 0.3) : 1;
    const maxOpacity = stripeBoost ? 0.58 : 0.54;
    const baseOpacity = clamp(baseTextureOpacity * autoTuning.texture.opacity * stripeBoostMul, 0.12, maxOpacity);
    return clamp(baseOpacity * stripeDamp, 0.08, maxOpacity);
  }, [
    autoTuning.texture.opacity,
    baseTextureOpacity,
    fabricMetrics.lightness,
    fabricMetrics.saturation,
    patternStripe,
    stripeProfile.active,
    stripeBoost,
    stripeStrength,
    stripeNameHint,
    useJacketPatternOverlay,
    usePantsPatternOverlayForPants,
    usePhotoBase,
  ]);
  const textureBlendMode = useMemo<React.CSSProperties["mixBlendMode"]>(() => {
    if (usePhotoBase) {
      if (isStripeFabric) return fabricTone === "dark" ? "overlay" : "soft-light";
      return "soft-light";
    }
    if (stripeWhiteBoost) return "screen";
    if (fabricTone === "dark") return "soft-light";
    return fabricMetrics.saturation > 0.5 ? "soft-light" : "overlay";
  }, [fabricMetrics.saturation, fabricTone, isStripeFabric, stripeWhiteBoost, usePhotoBase]);
  const fabricTextureStyle = useMemo<React.CSSProperties>(
    () => ({
      filter: fabricTextureFilter,
      mixBlendMode: textureBlendMode,
      opacity: tunedTextureOpacity,
    }),
    [fabricTextureFilter, textureBlendMode, tunedTextureOpacity]
  );
  type PatternOverlayConfig = {
    pattern: string;
    lineWidth: number;
    spacing: number;
    opacity: number;
    lineColor: string;
    lineRgb: RGB;
    maxOpacity: number;
  };
  const jacketPatternOverlayConfig = useMemo(() => {
    if (!useJacketPatternOverlay) return null;
    const darkBoost = fabricTone === "dark" || fabricMetrics.lightness < 0.45;
    const defaults =
      pantsPatternValueResolved === "tanke pruge"
        ? { lineWidth: 0.8, spacing: 5, opacity: 0.22 }
        : pantsPatternValueResolved === "pruge"
          ? { lineWidth: 1, spacing: 8, opacity: 0.2 }
          : { lineWidth: 0.9, spacing: 12, opacity: 0.18 };
    const scale = hasExplicitTextureScale ? textureScaleBoost : 1;
    const isThinStripe =
      pantsPatternValueResolved.includes("tanke") || pantsPatternValueResolved.includes("pinstripe");
    const spacingBase = defaults.spacing / Math.max(0.2, scale);
    const spacingScale = hasStripeSpacingOverride ? stripeSpacingScaleBase : 1;
    const spacingRaw = spacingBase * spacingScale * (isThinStripe ? 1.0 : 1);
    const spacing = clamp(spacingRaw, 3, 80);
    const strengthRaw = parseNumber(
      (selectedFabric as any)?.textureStrength ?? (selectedFabric as any)?.texture_strength
    );
    const opacityBase =
      typeof strengthRaw === "number"
        ? clamp(0.05 + strengthRaw * 0.2, 0.06, 0.24)
        : defaults.opacity;
    const opacityScale = hasStripeSpacingOverride ? 0.85 : 1;
    const boostedOpacity = (opacityBase + (darkBoost ? 0.02 : 0)) * opacityScale;
    const opacity = isStripeFabric
      ? clamp(boostedOpacity + 0.12, 0.2, 0.42)
      : isPantsCmsStripe
        ? clamp(boostedOpacity, 0.1, 0.26)
        : clamp(boostedOpacity, 0.06, 0.22);
    const brightnessRaw = parseNumber(
      (selectedFabric as any)?.textureBrightness ?? (selectedFabric as any)?.texture_brightness
    );
    const brightenBase = brightnessRaw ?? (darkBoost ? 1.18 : 1.08);
    const brighten = clamp(brightenBase, 1.03, darkBoost ? 1.24 : 1.16);
    const baseHex = tunedFabricFill || toneBaseColor;
    const baseRgb = hexToRgb(baseHex) ?? { r: 255, g: 255, b: 255 };
    const lineRgb = {
      r: clampChannel(baseRgb.r * brighten),
      g: clampChannel(baseRgb.g * brighten),
      b: clampChannel(baseRgb.b * brighten),
    };
    const lineColor = `rgb(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b})`;
    const lineWidth = isStripeFabric
      ? clamp((hasStripeSpacingOverride ? spacing * 0.12 : defaults.lineWidth) * 1.2, 0.8, 1.6)
      : hasStripeSpacingOverride
        ? clamp(spacing * 0.12, 0.4, 1.1)
        : defaults.lineWidth;
    return {
      pattern: pantsPatternValueResolved,
      lineWidth,
      spacing,
      opacity,
      lineColor,
      lineRgb,
      maxOpacity: isStripeFabric ? 0.62 : hasStripeSpacingOverride ? 0.2 : 0.24,
    };
  }, [
    fabricMetrics.lightness,
    fabricTone,
    hasExplicitTextureScale,
    hasStripeSpacingOverride,
    isPantsCmsStripe,
    pantsPatternValueResolved,
    selectedFabric,
    stripeSpacingScaleBase,
    textureScaleBoost,
    toneBaseColor,
    tunedFabricFill,
    isStripeFabric,
    useJacketPatternOverlay,
  ]);
  const buildPatternStyle = useCallback(
    (
      config: PatternOverlayConfig | null,
      angleDeg: number,
      options?: {
        opacityMul?: number;
        brightenMul?: number;
        mixBlendMode?: React.CSSProperties["mixBlendMode"];
        opacityMin?: number;
      }
    ): React.CSSProperties => {
      // Synthetic stripe overlays are permanently disabled.
      void config;
      void angleDeg;
      void options;
      return {};
    },
    []
  );
  const pantsStripeRealBoost = isStripeFabric || hasTextureStripes || patternStripe || stripeNameHint;
  const pantsTextureStyle = useMemo<React.CSSProperties>(() => ({ ...fabricTextureStyle }), [fabricTextureStyle]);
  const pantsZoneTextureStyle = pantsTextureStyle;
  const stripeHighlightStyle = useMemo<React.CSSProperties | null>(() => {
    if (lowPowerMode || !useTexture || !stripeBoost) return null;
    const boostDark = fabricTone === "dark" || fabricMetrics.lightness < 0.45;
    const baseOpacity = usePhotoBase ? 0.14 : boostDark ? 0.3 : 0.24;
    const spacingOpacityMul = hasStripeSpacingOverride ? 0.7 : 1;
    const opacityBoost = usePhotoBase ? 1.15 : 1.3;
    const opacity = clamp(
      (baseOpacity + stripeStrength * (usePhotoBase ? 0.14 : 0.24)) * spacingOpacityMul * opacityBoost,
      baseOpacity * spacingOpacityMul,
      usePhotoBase ? 0.38 : 0.62
    );
    const baseBrightness = textureBrightnessOverride ?? (boostDark ? 1.55 : 1.3);
    const baseContrast = textureContrastOverride ?? (boostDark ? 1.75 : 1.45);
    const brightness = clamp(baseBrightness + (usePhotoBase ? 0.07 : 0.16), 1.1, 2.2);
    const contrast = clamp(baseContrast + (usePhotoBase ? 0.12 : 0.28), 1.1, 2.35);
    return {
      mixBlendMode: boostDark ? "screen" : "overlay",
      opacity,
      filter: `grayscale(1) brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)})`,
    };
  }, [
    fabricMetrics.lightness,
    fabricTone,
    hasStripeSpacingOverride,
    lowPowerMode,
    stripeBoost,
    stripeStrength,
    textureBrightnessOverride,
    textureContrastOverride,
    useTexture,
    usePhotoBase,
  ]);
  const stripeHighlightStyleActive =
    !effectiveFastPreview && !hasTextureStripes ? stripeHighlightStyle : null;
  const jacketPatternBlendMode: React.CSSProperties["mixBlendMode"] = stripeWhiteBoost ? "screen" : "normal";
  const jacketPatternOverlayStyle = useMemo<React.CSSProperties | null>(() => {
    if (!jacketPatternOverlayConfig) return null;
    const angle = stripeOrientation === "horizontal" ? 0 : 90;
    return buildPatternStyle(jacketPatternOverlayConfig, angle, {
      opacityMul: 1.0,
      mixBlendMode: jacketPatternBlendMode,
    });
  }, [buildPatternStyle, jacketPatternBlendMode, jacketPatternOverlayConfig, stripeOrientation]);
  const photoVariant = useMemo<PhotoVariant>(
    () =>
      selectPhotoVariantForFabric({
        fabric: selectedFabric,
        tone: fabricTone,
        metrics: fabricMetrics,
        isStripeFabric,
        fallbackHex: fabricFillColorBase,
      }),
    [fabricFillColorBase, fabricMetrics, fabricTone, isStripeFabric, selectedFabric]
  );
  const photoExposure = useMemo(() => {
    if (!usePhotoBase) return 1;
    const lum = fabricMetrics.lightness;
    const sat = fabricMetrics.saturation;
    const exposure = 1.04 + (lum - 0.45) * 0.18 + (sat > 0.14 ? 0.015 : 0);
    return clamp(exposure, 1.0, 1.12);
  }, [fabricMetrics.lightness, fabricMetrics.saturation, usePhotoBase]);
  const photoFilter = useMemo(() => {
    if (usePhotoBase) {
      return `grayscale(1) brightness(${(photoExposure * PREVIEW_EXPOSURE).toFixed(2)}) contrast(0.98) saturate(1.05)`;
    }
    const brightness = clamp((1 + autoTuning.photo.brightness) * PREVIEW_EXPOSURE, 0.8, 1.6).toFixed(2);
    const contrast = autoTuning.photo.contrast.toFixed(2);
    const saturate = clamp(autoTuning.photo.saturate, 0.85, 1.15).toFixed(2);
    return `grayscale(1) brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
  }, [autoTuning.photo.brightness, autoTuning.photo.contrast, autoTuning.photo.saturate, photoExposure, usePhotoBase]);
  const photoOpacity = useMemo(() => (usePhotoBase ? 1 : autoTuning.photo.opacity), [autoTuning.photo.opacity, usePhotoBase]);
  const photoBaseOpacity = useMemo(() => {
    if (!usePhotoBase) return 0.95;
    const lum = fabricMetrics.lightness;
    const sat = fabricMetrics.saturation;
    const lumShift = lum > 0.62 ? -0.02 : lum < 0.24 ? 0.04 : 0.01;
    const satShift = sat < 0.2 ? 0.07 : sat > 0.55 ? 0.03 : 0.05;
    return clamp(0.79 + lumShift + satShift, 0.74, 0.92);
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
  const photoStructuralShadingOpacity = useMemo(
    () => clamp(structuralShadingOpacityTuned * 0.28, 0.05, 0.16),
    [structuralShadingOpacityTuned]
  );
  const photoStructuralEdgesOpacity = useMemo(
    () => clamp(structuralEdgesOpacityTuned * 0.34, 0.08, 0.2),
    [structuralEdgesOpacityTuned]
  );
  const photoStyleShadingOpacity = useMemo(
    () => clamp(styleShadingOpacityTuned * 0.24, 0.05, 0.14),
    [styleShadingOpacityTuned]
  );
  const photoStyleEdgesOpacity = useMemo(
    () => clamp(styleEdgesOpacityTuned * 0.3, 0.07, 0.18),
    [styleEdgesOpacityTuned]
  );
  const photoPantsShadingOpacity = useMemo(
    () => clamp(styleShadingOpacityTuned * 0.3, 0.06, 0.16),
    [styleShadingOpacityTuned]
  );
  const photoPantsEdgesOpacity = useMemo(
    () => clamp(styleEdgesOpacityTuned * 0.34, 0.08, 0.2),
    [styleEdgesOpacityTuned]
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
    const jacketMul = parityModeEnabled && parityPreset ? parityPreset.jacketLightingMul : 1;
    const intensity = fabricTone === "light" ? 0.92 : fabricTone === "dark" ? 1.02 : 0.98;
    const shadow = fabricTone === "dark" ? 1.0 : 0.9;
    const specular = Math.min(0.18, structuralSpecularOpacityTuned * 0.75);
    const opacity = fabricTone === "dark" ? 0.34 : 0.3;
    return {
      intensity: clamp(intensity * jacketMul, 0.7, 1.25),
      shadow: clamp(shadow * jacketMul, 0.7, 1.2),
      specular: clamp(specular * jacketMul, 0.04, 0.2),
      opacity,
    };
  }, [fabricTone, parityModeEnabled, parityPreset, structuralSpecularOpacityTuned]);
  const pantsLighting = useMemo(() => {
    const pantsMul = parityModeEnabled && parityPreset ? parityPreset.pantsLightingMul : 1;
    if (isStripeFabric) {
      const intensity = fabricTone === "light" ? 0.86 : fabricTone === "dark" ? 0.92 : 0.9;
      const shadow = fabricTone === "dark" ? 0.8 : 0.74;
      const specular = Math.min(0.12, structuralSpecularOpacityTuned * 0.55);
      const opacity = fabricTone === "dark" ? 0.2 : 0.18;
      return {
        intensity: clamp(intensity * pantsMul, 0.64, 1.1),
        shadow: clamp(shadow * pantsMul, 0.6, 1),
        specular: clamp(specular * pantsMul, 0.03, 0.14),
        opacity,
      };
    }
    const intensity = fabricTone === "light" ? 0.7 : fabricTone === "dark" ? 0.82 : 0.78;
    const shadow = fabricTone === "dark" ? 0.88 : 0.78;
    const specular = Math.min(0.14, structuralSpecularOpacityTuned * 0.65);
    const opacity = fabricTone === "dark" ? 0.28 : 0.26;
    return {
      intensity: clamp(intensity * pantsMul, 0.58, 1.05),
      shadow: clamp(shadow * pantsMul, 0.62, 1.04),
      specular: clamp(specular * pantsMul, 0.03, 0.14),
      opacity,
    };
  }, [fabricTone, isStripeFabric, parityModeEnabled, parityPreset, structuralSpecularOpacityTuned]);
  const isBlackFabric = fabricTone === "dark" && fabricLuminance < 0.12;
  const darkBoostOpacity =
    (isBlackFabric ? 0.26 : 0.16) * (stripeWhiteBoost ? 0.55 : stripeBoost ? 0.7 : 1);
  const darkBoostColor = isBlackFabric ? "#020202" : "#080808";
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);
  const [maskBuilding, setMaskBuilding] = useState(false);
  const [pantsUnionMask, setPantsUnionMask] = useState<string | null>(null);
  const [pantsMaskBuilding, setPantsMaskBuilding] = useState(false);
  const [assetWarnings, setAssetWarnings] = useState<string[]>([]);
  const texturePanEnabled = !isStripeFabric;
  const panZoom = useMemo(
    () => (texturePanEnabled ? { scale, offset } : { scale: 1, offset: ZERO_OFFSET }),
    [offset, scale, texturePanEnabled]
  );
  const showLayer = (key: keyof LayerVisibility) => (layerVisibility?.[key] ?? true) !== false;
  const showAo = showLayer("ao") && !lowPowerMode && effectsReady && !effectiveFastPreview;
  const showVignette = showLayer("vignette") && !lowPowerMode && effectsReady && !effectiveFastPreview;
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
  const pantsMaskLayers = useMemo(() => pantsFabricLayers, [pantsFabricLayers]);
  const vestMaskKey = useMemo(
    () => vestFabricLayers.map((layer) => layer.src).filter(Boolean).join("|"),
    [vestFabricLayers]
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
          const size = lowPowerMode ? 48 : STRIPE_ANALYSIS_SIZE;
          c.width = size;
          c.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          const d = ctx.getImageData(0, 0, size, size).data;
          const avg = computeRobustAverageColor(d);
          if (avg) {
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
          const tileScaleBase = lowPowerMode ? TEXTURE_TILE_CANVAS_SCALE * 0.85 : TEXTURE_TILE_CANVAS_SCALE;
          const tileScale = stripeTileStrength > 0.22 ? tileScaleBase * 1.6 : tileScaleBase;
          const tileMax = lowPowerMode ? Math.min(160, TEXTURE_TILE_CANVAS_MAX) : TEXTURE_TILE_CANVAS_MAX;
          const tilePx = Math.round(clamp(crop * tileScale, minTile, tileMax));
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
  }, [fabricTexture, lowPowerMode, patternStripe]);

  useEffect(() => {
    if (onAssetStatus) {
      onAssetStatus({ missing: assetWarnings });
    }
  }, [assetWarnings, onAssetStatus]);

  // Build a union mask for vest layers to avoid overlap darkening.
  useEffect(() => {
    if (!vestMaskKey) {
      setVestUnionMask(null);
      return;
    }
    const cached = VEST_MASK_CACHE.get(vestMaskKey);
    if (cached) {
      setVestUnionMask(cached);
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
      (async () => {
        try {
          const c = document.createElement("canvas");
          c.width = JACKET_CANVAS.w;
          c.height = JACKET_CANVAS.h;
          const ctx = c.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.globalCompositeOperation = "source-over";
          for (const layer of vestFabricLayers) {
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
              img = await tryLoad(layer.src);
            } catch {
              img = null;
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
            VEST_MASK_CACHE.set(vestMaskKey, url);
            setVestUnionMask(url);
          }
        } catch {
          if (!cancelled) setVestUnionMask(null);
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
    };
  }, [vestFabricLayers, vestMaskKey]);

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
      ...vestLayers,
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
  }, [detailLayers, pantsOverlayLayers, pantsFabricLayers, pantsLayer, vestLayers]);

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
    if (!texturePanEnabled) return;
    e.preventDefault();
    const delta = -e.deltaY;
    setScale((s) => Math.min(3, Math.max(0.35, s + delta * 0.0015)));
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!texturePanEnabled) return;
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, active: true };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!texturePanEnabled) return;
    if (!dragRef.current.active) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    if (dragRef.current.active) dragRef.current.active = false;
  };

  const includeStyle = showLayer("style");
  const showStyleOverlays = includeStyle && !effectiveFastPreview;
  const showJacket = effectiveView !== "pants";
  const previewGarment = vestEnabled ? config.previewGarment ?? "vest" : "jacket";
  const vestPreviewActive = vestEnabled && previewGarment === "vest";
  const showJacketLayers = showJacket && !vestPreviewActive;
  const showPants = effectiveView !== "jacket";
  const jacketBaseLayers = structuralJacketLayers;
  const jacketDetailStructureLayers = structuralJacketLayers;
  const jacketDetailStyleLayers = useMemo(
    () => (showStyleOverlays ? styleOverlayLayers : []),
    [showStyleOverlays, styleOverlayLayers]
  );
  const pantsBaseLayers = useMemo(
    () => (pantsFabricLayers.length ? pantsFabricLayers : pantsLayer ? [pantsLayer] : []),
    [pantsFabricLayers, pantsLayer]
  );
  const pantsLayerOnly = useMemo(() => (pantsLayer ? [pantsLayer] : []), [pantsLayer]);
  const pantsFabricLayersResolved = useMemo(
    () => (pantsFabricLayers.length ? pantsFabricLayers : pantsLayerOnly),
    [pantsFabricLayers, pantsLayerOnly]
  );
  const pantsTextureLayers = useMemo(() => pantsFabricLayersResolved, [pantsFabricLayersResolved]);
  const pantsDetailLayers = pantsBaseLayers;
  const pantsStyleLayers = useMemo(
    () => (showStyleOverlays ? pantsOverlayLayers : []),
    [showStyleOverlays, pantsOverlayLayers]
  );
  const jacketPhotoLayers = useMemo(() => (usePhotoBase ? detailLayers : []), [detailLayers, usePhotoBase]);
  const pantsPhotoLayers = useMemo(
    () => (usePhotoBase ? [...pantsBaseLayers, ...pantsPhotoDetailLayers] : []),
    [pantsBaseLayers, pantsPhotoDetailLayers, usePhotoBase]
  );
  useEffect(() => {
    if (!onRenderDebug) return;
    onRenderDebug({
      renderMode: activeRenderMode,
      requestedRenderMode,
      photoVariant,
      forcedPhotoVariant: FORCE_PHOTO_VARIANT,
      renderBasePath: fabricRenderBasePath,
      usePhotoBase,
      isStripeFabric,
      hasTextureStripes,
      jacketPhotoLayerCount: jacketPhotoLayers.length,
      pantsPhotoLayerCount: pantsPhotoLayers.length,
    });
  }, [
    activeRenderMode,
    fabricRenderBasePath,
    hasTextureStripes,
    isStripeFabric,
    jacketPhotoLayers.length,
    onRenderDebug,
    pantsPhotoLayers.length,
    photoVariant,
    requestedRenderMode,
    usePhotoBase,
  ]);
  const pantsMaskSourceLayers = useMemo(() => pantsMaskLayers, [pantsMaskLayers]);
  const pantsMaskKey = useMemo(
    () => `${pantsMaskSourceLayers.map((layer) => layer.src).filter(Boolean).join("|")}|${PANTS_MASK_VERSION}`,
    [pantsMaskSourceLayers]
  );
  const resolvePhotoLayer = useCallback(
    (layer: SuitLayer, garment: RenderGarment) => {
      if (activeRenderMode === "transparent") return cdnPair(layer.src);
      const resolved = resolveFabricRenderPair({
        src: layer.src,
        variant: photoVariant,
        renderMode: activeRenderMode,
        renderBasePath: fabricRenderBasePath,
        garment,
        fabricId: selectedFabric?.id,
      });
      return resolved.pair ?? photoPair(layer.src, photoVariant);
    },
    [activeRenderMode, fabricRenderBasePath, photoVariant, selectedFabric]
  );
  const resolveJacketPhoto = useCallback(
    (layer: SuitLayer) => resolvePhotoLayer(layer, "jacket"),
    [resolvePhotoLayer]
  );
  const resolvePantsPhoto = useCallback(
    (layer: SuitLayer) => resolvePhotoLayer(layer, "pants"),
    [resolvePhotoLayer]
  );
  const jacketMask = jacketUnionMask;
  const pantsMask = pantsUnionMask;
  const jacketShadowClass = "drop-shadow-[0_24px_40px_rgba(15,23,42,0.16)]";
  const pantsShadowClass = "drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)]";
  const pantsSplitTextureRotation = useMemo(() => {
    const base = pantsTextureRotationResolved;
    if (!stripeRotationActive) {
      return { left: base, right: base, fly: base, lower: base, waist: base };
    }
    return {
      left: base + PANTS_STRIPE_TUNING.diagAbsDeg,
      right: base + PANTS_STRIPE_TUNING.flyAbsDeg,
      fly: base + PANTS_STRIPE_TUNING.flyAbsDeg,
      lower: base + (PANTS_STRIPE_TUNING.rightLowerAbsDeg ?? PANTS_STRIPE_TUNING.diagAbsDeg),
      waist: base + PANTS_STRIPE_TUNING.waistAbsDeg,
    };
  }, [pantsTextureRotationResolved, stripeRotationActive]);
  const pantsLeftMainMask = pantsLeftSplitMasks?.main ?? null;
  const pantsLeftUnderMask = pantsLeftSplitMasks?.under ?? null;
  const pantsRightUpperMask = pantsRightSplitMasks?.upper ?? null;
  const pantsRightLowerMask = pantsRightSplitMasks?.lower ?? null;
  const pantsLeftLegMask = pantsLegMasks?.left ?? null;
  const pantsRightLegMask = pantsLegMasks?.right ?? null;
  const pantsRightFlyMask = pantsRightUpperMask;
  const useSplitPantsTexture = ENABLE_PANTS_SPLIT && usePantsTexture && stripeRotationActive;
  const pantsOverlayTexture = fabricTileTexture ?? fabricTextureSourcePants ?? EMPTY_TEXTURE_DATA_URL;
  const jacketOverlayTexture = fabricTileTexture ?? fabricTextureSource ?? EMPTY_TEXTURE_DATA_URL;
  const shouldRenderPantsPatternOverlay =
    ENABLE_PANTS_SYNTHETIC_STRIPES && usePantsPatternOverlayForPants;
  const allowPantsPatternOverlay =
    ENABLE_PANTS_SYNTHETIC_STRIPES && usePantsPatternOverlayForPants;
  const pantsZoneOverlayReady = Boolean(
    ENABLE_PANTS_ZONE_MASKS && pantsLegMasks?.left && pantsLegMasks?.right
  );
  const pantsStripeDetectedForZones = useMemo(
    () => Boolean(usePantsTexture && pantsStripeZoneEligible),
    [pantsStripeZoneEligible, usePantsTexture]
  );
  const pantsZoneTextureRequested = Boolean(
    pantsZoneOverlayReady && pantsStripeDetectedForZones && usePantsTexture
  );
  const pantsZoneRotationBaseDeg = pantsStripeRealBoost ? 0 : pantsTextureRotationResolved;
  const pantsLeftZoneRotationDeg = normalizeRotation(
    pantsZoneRotationBaseDeg + (PANTS_STRIPE_TUNING.zone?.leftMainAbsDeg ?? PANTS_STRIPE_TUNING.diagAbsDeg)
  );
  const pantsRightUpperZoneRotationDeg = normalizeRotation(
    pantsZoneRotationBaseDeg + (PANTS_STRIPE_TUNING.zone?.rightUpperAbsDeg ?? PANTS_STRIPE_TUNING.flyAbsDeg)
  );
  const pantsRightLowerZoneRotationDeg = normalizeRotation(
    pantsZoneRotationBaseDeg +
      (PANTS_STRIPE_TUNING.zone?.rightLowerAbsDeg ?? PANTS_STRIPE_TUNING.rightLowerAbsDeg)
  );
  const pantsWaistZoneRotationDeg = normalizeRotation(
    pantsZoneRotationBaseDeg + (PANTS_STRIPE_TUNING.zone?.waistAbsDeg ?? PANTS_STRIPE_TUNING.waistAbsDeg)
  );
  const pantsStripeZoneConfig = useMemo<PantsStripeZoneConfig>(() => {
    const union = pantsMask ?? null;
    const minCoverage = clamp(PANTS_STRIPE_TUNING.zone?.coverageMinRatio ?? 0.96, 0.9, 1);
    const minPrimaryCoverage = clamp(
      PANTS_STRIPE_TUNING.zone?.primaryCoverageMinRatio ?? 0.96,
      0.9,
      1
    );
    const minPixels = PANTS_STRIPE_TUNING.zone?.minPixelThreshold ?? 50;
    const unionPixels = pantsMaskStats?.union ?? 0;
    const overlapPixels = pantsMaskStats?.overlap ?? 0;
    const unassignedPixels = pantsMaskStats?.unassigned ?? 0;
    const strictIntegrityOk = overlapPixels === 0 && unassignedPixels === 0;

    const secondaryLeftPixelsRaw = pantsMaskStats?.left ?? 0;
    const secondaryRightPixelsRaw = pantsMaskStats?.right ?? 0;
    const primaryLeftPixelsRaw = (pantsMaskStats?.leftMain ?? 0) + (pantsMaskStats?.leftUnder ?? 0);
    const primaryRightUpperPixelsRaw = pantsMaskStats?.rightFly ?? 0;
    const primaryRightLowerPixels = pantsMaskStats?.rightUnder ?? 0;
    const primaryWaistPixels = pantsMaskStats?.waist ?? 0;
    const primaryLeftMask = pantsLeftMainMask ?? pantsLeftLegMask;
    const primaryRightUpperMask = pantsRightUpperMask ?? pantsRightLegMask;
    const primaryLeftPixels = primaryLeftPixelsRaw > 0 ? primaryLeftPixelsRaw : secondaryLeftPixelsRaw;
    const primaryRightUpperPixels =
      primaryRightUpperPixelsRaw > 0 ? primaryRightUpperPixelsRaw : secondaryRightPixelsRaw;
    const primaryZonePixelsSum =
      primaryLeftPixels + primaryRightUpperPixels + primaryRightLowerPixels + primaryWaistPixels;
    const primaryCoverageRatio = unionPixels > 0 ? primaryZonePixelsSum / unionPixels : 0;
    const primaryCoverageOk =
      unionPixels > 0 && primaryCoverageRatio >= minPrimaryCoverage && strictIntegrityOk;
    const primaryHasWaistMask = Boolean(pantsWaistMask);
    const primaryHasRightLowerMask = Boolean(pantsRightLowerMask);
    const primaryMasksReady = Boolean(
      primaryLeftMask && primaryRightUpperMask
    );
    const primaryKeyZoneOk =
      unionPixels <= 0
        ? primaryMasksReady
        : primaryLeftPixels >= minPixels &&
          primaryRightUpperPixels >= minPixels &&
          (!primaryHasRightLowerMask || primaryRightLowerPixels >= 1) &&
          (!primaryHasWaistMask || primaryWaistPixels >= 1);
    const primaryEnabled = PANTS_STRIPE_TUNING.zone?.enablePrimarySplit === true;
    const primaryReady =
      primaryEnabled &&
      pantsZoneTextureRequested &&
      primaryMasksReady &&
      primaryCoverageOk &&
      primaryKeyZoneOk;

    if (primaryReady) {
      return {
        mode: "primary",
        coverageRatio: primaryCoverageRatio,
        zonePixelsSum: primaryZonePixelsSum,
        unionPixels,
        coverageOk: primaryCoverageOk,
        keyZoneOk: primaryKeyZoneOk,
        masks: {
          union,
          leftMain: primaryLeftMask,
          leftUnder: null,
          rightUpper: primaryRightUpperMask,
          rightLower: null,
          leftLeg: pantsLeftLegMask,
          rightLeg: pantsRightLegMask,
          waist: pantsWaistMask,
        },
        rotations: {
          single: pantsRightUpperZoneRotationDeg,
          leftMain: pantsLeftZoneRotationDeg,
          rightUpper: pantsRightUpperZoneRotationDeg,
          rightLower: pantsRightLowerZoneRotationDeg,
          waist: pantsWaistZoneRotationDeg,
        },
      };
    }

    const secondaryLeftPixels = secondaryLeftPixelsRaw;
    const secondaryRightPixels = secondaryRightPixelsRaw;
    const secondaryWaistPixels = pantsMaskStats?.waist ?? 0;
    const secondaryZonePixelsSum = secondaryLeftPixels + secondaryRightPixels + secondaryWaistPixels;
    const secondaryCoverageRatio = unionPixels > 0 ? secondaryZonePixelsSum / unionPixels : 0;
    const secondaryCoverageOk =
      unionPixels > 0 && secondaryCoverageRatio >= minCoverage && strictIntegrityOk;
    const secondaryMasksReady = Boolean(pantsLeftLegMask && pantsRightLegMask);
    const secondaryKeyZoneOk =
      unionPixels <= 0
        ? secondaryMasksReady
        : secondaryLeftPixels >= minPixels &&
          secondaryRightPixels >= minPixels &&
          (!pantsWaistMask || secondaryWaistPixels >= 1);
    const secondaryReady =
      pantsZoneTextureRequested && secondaryMasksReady && secondaryKeyZoneOk && secondaryCoverageOk;

    if (secondaryReady) {
      return {
        mode: "secondary",
        coverageRatio: secondaryCoverageRatio,
        zonePixelsSum: secondaryZonePixelsSum,
        unionPixels,
        coverageOk: secondaryCoverageOk,
        keyZoneOk: secondaryKeyZoneOk,
        masks: {
          union,
          leftMain: null,
          leftUnder: null,
          rightUpper: null,
          rightLower: null,
          leftLeg: pantsLeftLegMask,
          rightLeg: pantsRightLegMask,
          waist: pantsWaistMask,
        },
        rotations: {
          single: pantsRightUpperZoneRotationDeg,
          leftMain: pantsLeftZoneRotationDeg,
          rightUpper: pantsRightUpperZoneRotationDeg,
          rightLower: pantsRightLowerZoneRotationDeg,
          waist: pantsWaistZoneRotationDeg,
        },
      };
    }

    if (pantsStripeDetectedForZones) {
      return {
        mode: "single",
        coverageRatio: primaryCoverageRatio,
        zonePixelsSum: primaryZonePixelsSum,
        unionPixels,
        coverageOk: primaryCoverageOk,
        keyZoneOk: primaryKeyZoneOk,
        masks: {
          union,
          leftMain: null,
          leftUnder: null,
          rightUpper: null,
          rightLower: null,
          leftLeg: null,
          rightLeg: null,
          waist: pantsWaistMask,
        },
        rotations: {
          single: pantsRightUpperZoneRotationDeg,
          leftMain: pantsLeftZoneRotationDeg,
          rightUpper: pantsRightUpperZoneRotationDeg,
          rightLower: pantsRightLowerZoneRotationDeg,
          waist: pantsWaistZoneRotationDeg,
        },
      };
    }

    return {
      mode: "single",
      coverageRatio: 0,
      zonePixelsSum: 0,
      unionPixels,
      coverageOk: false,
      keyZoneOk: false,
        masks: {
          union,
          leftMain: null,
          leftUnder: null,
          rightUpper: null,
          rightLower: null,
          leftLeg: pantsLeftLegMask,
          rightLeg: pantsRightLegMask,
          waist: pantsWaistMask,
        },
      rotations: {
        single: pantsRightUpperZoneRotationDeg,
        leftMain: pantsLeftZoneRotationDeg,
        rightUpper: pantsRightUpperZoneRotationDeg,
        rightLower: pantsRightLowerZoneRotationDeg,
        waist: pantsWaistZoneRotationDeg,
      },
    };
  }, [
    pantsLeftLegMask,
    pantsLeftMainMask,
    pantsLeftUnderMask,
    pantsMask,
    pantsMaskStats,
    pantsRightLegMask,
    pantsRightLowerMask,
    pantsRightUpperMask,
    pantsStripeRotationDeg,
    pantsWaistMask,
    pantsWaistZoneRotationDeg,
    pantsZoneTextureRequested,
    pantsLeftZoneRotationDeg,
    pantsRightLowerZoneRotationDeg,
    pantsRightUpperZoneRotationDeg,
    pantsStripeDetectedForZones,
  ]);
  const pantsZoneTextureActive = pantsStripeZoneConfig.mode !== "single";
  const pantsTextureFallbackRotationDeg =
    pantsStripeDetectedForZones && !pantsZoneTextureActive
      ? pantsRightUpperZoneRotationDeg
      : pantsStripeZoneConfig.rotations.single;
  const getZoneTextureOffset = useCallback(
    (zone: "leftMain" | "leftUnderlap" | "rightFly" | "rightUnder" | "waist") => {
      if (!pantsStripeDetectedForZones) return undefined;
      const base = PANTS_STRIPE_TUNING.stripeOffsets?.[zone];
      if (!base) return undefined;
      return base;
    },
    [pantsStripeDetectedForZones]
  );
  const jacketTextureStyleReal = useMemo<React.CSSProperties>(() => {
    const baseOpacity = Number(fabricTextureStyle.opacity ?? tunedTextureOpacity);
    if (usePhotoBase) {
      const blend: React.CSSProperties["mixBlendMode"] =
        isStripeFabric ? "overlay" : "soft-light";
      const opacity = clamp(baseOpacity * (isStripeFabric ? 0.68 : 0.72), 0.1, 0.3);
      return {
        ...fabricTextureStyle,
        mixBlendMode: blend,
        opacity,
      };
    }
    const opacity = clamp(baseOpacity * 0.82, 0.06, 0.52);
    const blend: React.CSSProperties["mixBlendMode"] =
      fabricTone === "dark" ? "soft-light" : fabricTextureStyle.mixBlendMode;
    return {
      ...fabricTextureStyle,
      mixBlendMode: blend,
      opacity,
    };
  }, [fabricTextureStyle, fabricTone, isStripeFabric, tunedTextureOpacity, usePhotoBase]);
  const pantsTextureStyleReal = useMemo<React.CSSProperties>(() => {
    const baseOpacity = Number(pantsZoneTextureStyle.opacity ?? tunedTextureOpacity);
    const stripeZoneEnhanced = pantsZoneTextureActive && (hasTextureStripes || isStripeFabric);
    if (usePhotoBase) {
      const blend: React.CSSProperties["mixBlendMode"] =
        isStripeFabric ? "overlay" : "soft-light";
      const preserveMul = stripeZoneEnhanced ? 0.72 : pantsZoneTextureActive ? 0.66 : 0.7;
      const opacity = clamp(baseOpacity * preserveMul, 0.1, 0.32);
      return {
        ...pantsZoneTextureStyle,
        mixBlendMode: blend,
        opacity,
      };
    }
    const preserveMul = stripeZoneEnhanced ? 0.98 : pantsZoneTextureActive ? 0.56 : 0.72;
    const opacity = clamp(baseOpacity * preserveMul, stripeZoneEnhanced ? 0.14 : 0.05, 0.56);
    const blend: React.CSSProperties["mixBlendMode"] =
      pantsZoneTextureActive && hasTextureStripes
        ? fabricTone === "dark"
          ? "soft-light"
          : "overlay"
        : pantsZoneTextureStyle.mixBlendMode;
    return {
      ...pantsZoneTextureStyle,
      mixBlendMode: blend,
      opacity,
    };
  }, [
    fabricTone,
    hasTextureStripes,
    isStripeFabric,
    pantsZoneTextureActive,
    pantsZoneTextureStyle,
    tunedTextureOpacity,
    usePhotoBase,
  ]);
  const pantsDetailProtectTextureStyle = useMemo<React.CSSProperties>(() => {
    if (usePhotoBase) return pantsTextureStyleReal;
    const baseOpacity = Number(pantsTextureStyleReal.opacity ?? 0.18);
    const stripeEnhanced = hasTextureStripes || isStripeFabric;
    const minOpacity = stripeEnhanced ? 0.11 : 0.04;
    const maxOpacity = stripeEnhanced ? 0.54 : 0.34;
    const preserveMul = stripeEnhanced ? 1.0 : 0.92;
    return {
      ...pantsTextureStyleReal,
      opacity: clamp(baseOpacity * preserveMul, minOpacity, maxOpacity),
    };
  }, [hasTextureStripes, isStripeFabric, pantsTextureStyleReal, usePhotoBase]);
  const pantsStripeShadingMul = 1;
  const pantsStripeEdgeMul = 1;
  const pantsRightZoneMask =
    pantsStripeZoneConfig.mode === "primary"
      ? (pantsStripeZoneConfig.masks.rightUpper ?? pantsStripeZoneConfig.masks.rightLeg ?? pantsMask)
      : (pantsStripeZoneConfig.masks.rightLeg ?? pantsMask);
  const pantsLeftZoneMask =
    pantsStripeZoneConfig.mode === "primary"
    ? (pantsStripeZoneConfig.masks.leftMain ?? pantsStripeZoneConfig.masks.leftLeg ?? pantsMask)
    : (pantsStripeZoneConfig.masks.leftLeg ?? pantsMask);
  const pantsZoneStripeActive =
    ENABLE_PANTS_SYNTHETIC_STRIPES && Boolean(jacketPatternOverlayConfig) && !hasCheckPattern;
  const pantsStripeHighlightStyle = useMemo<React.CSSProperties | null>(() => {
    if (!stripeHighlightStyle) return null;
    if (usePhotoBase && (hasTextureStripes || isStripeFabric)) return null;
    if (!(hasTextureStripes || isStripeFabric)) return stripeHighlightStyle;
    const baseOpacity = Number(stripeHighlightStyle.opacity ?? 0.2);
    return {
      ...stripeHighlightStyle,
      mixBlendMode: fabricTone === "dark" ? "screen" : "overlay",
      opacity: clamp(baseOpacity * (pantsZoneTextureActive ? 0.56 : 0.62), 0.08, 0.24),
    };
  }, [
    fabricTone,
    hasTextureStripes,
    isStripeFabric,
    pantsZoneTextureActive,
    stripeHighlightStyle,
    usePhotoBase,
  ]);
  const pantsLeftPatternOverlayStyle = useMemo<React.CSSProperties | null>(() => {
    if (!pantsZoneStripeActive || !jacketPatternOverlayConfig) return null;
    const overlayAngle = normalizeRotation(
      PANTS_STRIPE_TUNING.zone?.leftMainAbsDeg ?? PANTS_STRIPE_TUNING.diagAbsDeg
    );
    return buildPatternStyle(jacketPatternOverlayConfig, overlayAngle, {
      opacityMul: 1.35,
      brightenMul: 1.12,
      mixBlendMode: fabricTone === "dark" ? "screen" : "normal",
      opacityMin: 0.08,
    });
  }, [
    buildPatternStyle,
    fabricTone,
    jacketPatternOverlayConfig,
    pantsZoneStripeActive,
  ]);
  const pantsRightPatternOverlayStyle = useMemo<React.CSSProperties | null>(() => {
    if (!pantsZoneStripeActive || !jacketPatternOverlayConfig) return null;
    const overlayAngle = normalizeRotation(
      PANTS_STRIPE_TUNING.zone?.rightUpperAbsDeg ?? PANTS_STRIPE_TUNING.flyAbsDeg
    );
    return buildPatternStyle(jacketPatternOverlayConfig, overlayAngle, {
      opacityMul: 1.35,
      brightenMul: 1.12,
      mixBlendMode: fabricTone === "dark" ? "screen" : "normal",
      opacityMin: 0.08,
    });
  }, [
    buildPatternStyle,
    fabricTone,
    jacketPatternOverlayConfig,
    pantsZoneStripeActive,
  ]);
  const pantsRightLowerPatternOverlayStyle = useMemo<React.CSSProperties | null>(() => {
    if (!pantsZoneStripeActive || !jacketPatternOverlayConfig) return null;
    const overlayAngle = normalizeRotation(
      PANTS_STRIPE_TUNING.zone?.rightLowerAbsDeg ?? PANTS_STRIPE_TUNING.rightLowerAbsDeg
    );
    return buildPatternStyle(jacketPatternOverlayConfig, overlayAngle, {
      opacityMul: 1.2,
      brightenMul: 1.1,
      mixBlendMode: fabricTone === "dark" ? "screen" : "normal",
      opacityMin: 0.08,
    });
  }, [
    buildPatternStyle,
    fabricTone,
    jacketPatternOverlayConfig,
    pantsZoneStripeActive,
  ]);
  const pantsWaistPatternOverlayStyle = useMemo<React.CSSProperties | null>(() => {
    if (!pantsZoneStripeActive || !jacketPatternOverlayConfig) return null;
    const overlayAngle = normalizeRotation(
      PANTS_STRIPE_TUNING.zone?.waistAbsDeg ?? PANTS_STRIPE_TUNING.waistAbsDeg
    );
    return buildPatternStyle(jacketPatternOverlayConfig, overlayAngle, {
      opacityMul: 1.15,
      brightenMul: 1.08,
      mixBlendMode: fabricTone === "dark" ? "screen" : "normal",
      opacityMin: 0.07,
    });
  }, [
    buildPatternStyle,
    fabricTone,
    jacketPatternOverlayConfig,
    pantsZoneStripeActive,
  ]);
  const pantsBaseFillOpacity = useMemo(
    () => (usePhotoBase ? photoBaseOpacity : 0.95),
    [photoBaseOpacity, usePhotoBase]
  );
  const pantsOverlayDebugLoggedRef = useRef(false);
  const pantsSplitRotationLoggedRef = useRef(false);
  useEffect(() => {
    if (!DEBUG_PANTS_OVERLAY) return;
    if (pantsOverlayDebugLoggedRef.current) return;
    if (!showPants || fabricsLoading || pantsMaskBuilding) return;
    if (!selectedFabric) return;
    if (!pantsMaskStats) return;
    const rawFields = {
      pattern: (selectedFabric as any)?.pattern,
      uzorak: (selectedFabric as any)?.uzorak,
      weave: (selectedFabric as any)?.weave,
      weave_name: (selectedFabric as any)?.weave_name,
      weaveName: (selectedFabric as any)?.weaveName,
      pattern_name: (selectedFabric as any)?.pattern_name,
      patternName: (selectedFabric as any)?.patternName,
      pattern_type: (selectedFabric as any)?.pattern_type,
      patternType: (selectedFabric as any)?.patternType,
      texturePattern: (selectedFabric as any)?.texturePattern,
      texture_pattern: (selectedFabric as any)?.texture_pattern,
      design: (selectedFabric as any)?.design,
      motif: (selectedFabric as any)?.motif,
    };
    const maskStats = pantsMaskStats ?? {
      union: 0,
      left: 0,
      right: 0,
      leftMain: 0,
      leftUnder: 0,
      rightFly: 0,
      rightUnder: 0,
      main: 0,
      waist: 0,
      overlap: 0,
      unassigned: 0,
      zoneUnion: 0,
      coverage: 0,
    };
    console.log("[pants overlay debug]", {
      configColorId: config.colorId,
      fabricId: (selectedFabric as any)?.id,
      fabricName: (selectedFabric as any)?.name,
      rawPatternFields: rawFields,
      normalizedPattern: pantsPatternValueResolved,
      isStripeFabric,
      overlayEnabled: usePantsPatternOverlayForPants,
      stripeScopePants,
      hasTextureStripes,
      hasUnionMask: Boolean(pantsMask),
      hasLeftMask: Boolean(pantsLeftMainMask),
      hasRightMask: Boolean(pantsLegMasks?.right),
      hasFlyMask: Boolean(pantsRightFlyMask),
      hasRightLowerMask: Boolean(pantsRightLowerMask),
      hasWaistMask: Boolean(pantsWaistMask),
      maskPixelCount: maskStats,
      zoneRenderMode: pantsStripeZoneConfig.mode,
      zoneCoverage: {
        unionPixels: pantsStripeZoneConfig.unionPixels,
        zonePixelsSum: pantsStripeZoneConfig.zonePixelsSum,
        coverageRatio: Number(pantsStripeZoneConfig.coverageRatio.toFixed(5)),
        coverageOk: pantsStripeZoneConfig.coverageOk,
        keyZoneOk: pantsStripeZoneConfig.keyZoneOk,
        overlapPixels: maskStats.overlap ?? 0,
        unassignedPixels: maskStats.unassigned ?? 0,
      },
      effectivePantsPassOpacity: {
        darkBoost: pantsStripeDetectedForZones ? 0 : darkBoostOpacity * 0.68,
        structuralShading: structuralShadingOpacityTuned * 0.9 * pantsStripeShadingMul,
        structuralEdges: structuralEdgesOpacityTuned * pantsStripeEdgeMul,
        styleShading: styleShadingOpacityTuned * 0.85 * pantsStripeShadingMul,
        styleEdges: styleEdgesOpacityTuned * 0.9 * pantsStripeEdgeMul,
      },
      activeZoneMasks: {
        leftMain: Boolean(pantsStripeZoneConfig.masks.leftMain),
        leftUnder: Boolean(pantsStripeZoneConfig.masks.leftUnder),
        rightUpper: Boolean(pantsStripeZoneConfig.masks.rightUpper),
        rightLower: Boolean(pantsStripeZoneConfig.masks.rightLower),
        leftLeg: Boolean(pantsStripeZoneConfig.masks.leftLeg),
        rightLeg: Boolean(pantsStripeZoneConfig.masks.rightLeg),
        waist: Boolean(pantsStripeZoneConfig.masks.waist),
      },
      zoneRotationsDeg: {
        single: pantsStripeZoneConfig.rotations.single,
        leftMain: pantsStripeZoneConfig.rotations.leftMain,
        rightUpper: pantsStripeZoneConfig.rotations.rightUpper,
        rightLower: pantsStripeZoneConfig.rotations.rightLower,
        waist: pantsStripeZoneConfig.rotations.waist,
      },
      usingStripeTile: Boolean(fabricTileTexture),
    });
    pantsOverlayDebugLoggedRef.current = true;
  }, [
    pantsPatternValueResolved,
    fabricTileTexture,
    pantsLeftMainMask,
    pantsLegMasks?.right,
    pantsRightLowerMask,
    pantsMask,
    pantsMaskStats,
    pantsRightFlyMask,
    pantsStripeZoneConfig,
    pantsWaistMask,
    pantsMaskBuilding,
    fabricsLoading,
    hasTextureStripes,
    config.colorId,
    selectedFabric,
    showPants,
    isStripeFabric,
    stripeScopePants,
    usePantsPatternOverlayForPants,
    darkBoostOpacity,
    structuralShadingOpacityTuned,
    structuralEdgesOpacityTuned,
    styleShadingOpacityTuned,
    styleEdgesOpacityTuned,
    pantsStripeShadingMul,
    pantsStripeEdgeMul,
    pantsStripeDetectedForZones,
  ]);

  useEffect(() => {
    if (pantsSplitRotationLoggedRef.current) return;
    if (!showPants || fabricsLoading || pantsMaskBuilding) return;
    if (!useSplitPantsTexture) return;
    console.log("[pants split rotation]", {
      baseStripeAngleDeg,
      stripeOrientation,
      diagAbsDeg: PANTS_STRIPE_TUNING.diagAbsDeg,
      flyAbsDeg: PANTS_STRIPE_TUNING.flyAbsDeg,
      waistAbsDeg: PANTS_STRIPE_TUNING.waistAbsDeg,
      finalDiagDeg: pantsSplitTextureRotation.left,
      finalFlyDeg: pantsSplitTextureRotation.fly,
      finalWaistDeg: pantsSplitTextureRotation.waist,
      finalRightDeg: pantsSplitTextureRotation.right,
    });
    pantsSplitRotationLoggedRef.current = true;
  }, [
    baseStripeAngleDeg,
    fabricsLoading,
    pantsMaskBuilding,
    pantsSplitTextureRotation,
    stripeOrientation,
    showPants,
    useSplitPantsTexture,
  ]);

  // Build a union mask over the pants silhouette to avoid halo/background bleed
  useEffect(() => {
    if (!pantsMaskKey) {
      setPantsUnionMask(null);
      setPantsLegMasks(null);
      setPantsLeftSplitMasks(null);
      setPantsRightSplitMasks(null);
      setPantsWaistMask(null);
      setPantsAxisAngle(null);
      setPantsMaskStats(null);
      return;
    }

    const cached = PANTS_MASK_CACHE.get(pantsMaskKey);
    const cachedLegMasks = PANTS_LEG_MASK_CACHE.get(pantsMaskKey) ?? null;
    const cachedLeftSplit = PANTS_LEFT_SPLIT_CACHE.get(pantsMaskKey) ?? null;
    const cachedRightSplit = PANTS_RIGHT_SPLIT_CACHE.get(pantsMaskKey) ?? null;
    const cachedWaist = PANTS_WAIST_MASK_CACHE.get(pantsMaskKey) ?? null;
    const cachedAxis = PANTS_AXIS_CACHE.get(pantsMaskKey);
    const cachedStats = PANTS_MASK_STATS_CACHE.get(pantsMaskKey) ?? null;

    if (cached) {
      setPantsUnionMask(cached);
      setPantsLegMasks(cachedLegMasks);
      setPantsLeftSplitMasks(cachedLeftSplit);
      setPantsRightSplitMasks(cachedRightSplit);
      setPantsWaistMask(cachedWaist);
      setPantsAxisAngle(typeof cachedAxis === "number" ? cachedAxis : null);
      setPantsMaskStats(cachedStats);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const requestIdle = (typeof window !== "undefined" ? (window as any).requestIdleCallback : undefined) as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (typeof window !== "undefined" ? (window as any).cancelIdleCallback : undefined) as
      | ((id: number) => void)
      | undefined;

    const clearZoneMasks = () => {
      setPantsLegMasks(null);
      setPantsLeftSplitMasks(null);
      setPantsRightSplitMasks(null);
      setPantsWaistMask(null);
      PANTS_LEG_MASK_CACHE.delete(pantsMaskKey);
      PANTS_LEFT_SPLIT_CACHE.delete(pantsMaskKey);
      PANTS_RIGHT_SPLIT_CACHE.delete(pantsMaskKey);
      PANTS_WAIST_MASK_CACHE.delete(pantsMaskKey);
    };

    const run = () => {
      if (cancelled) return;
      setPantsMaskBuilding(true);
      (async () => {
        try {
          const loadImage = (url: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = url;
            });

          const c = document.createElement("canvas");
          c.width = PANTS_CANVAS.w;
          c.height = PANTS_CANVAS.h;
          const ctx = c.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, c.width, c.height);
          ctx.globalCompositeOperation = "source-over";

          for (const layer of pantsMaskSourceLayers) {
            const pair = cdnPair(layer.src);
            let img: HTMLImageElement | null = null;
            try {
              img = await loadImage(pair.webp);
            } catch {
              try {
                img = await loadImage(pair.png);
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
          const unionRaw = unionData.data;
          const axisAngle = computeMaskAxisAngle(unionRaw, c.width, c.height);

          let unionPixels = 0;
          let minX = c.width;
          let maxX = -1;
          for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              const alpha = unionRaw[idx + 3];
              if (alpha < 10) continue;
              unionPixels++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }

          if (ENABLE_PANTS_ZONE_MASKS) {
            if (pantsStripeDetectedForZones) {
              const deterministicConfig = PANTS_STRIPE_TUNING.deterministic;
              const deterministicZones = buildDeterministicPantsStripeZones({
                ctx,
                unionData,
                width: c.width,
                height: c.height,
                config: {
                  coverageMinRatio: clamp(deterministicConfig?.coverageMinRatio ?? 0.96, 0.9, 1),
                  minPixelThreshold: PANTS_STRIPE_TUNING.zone?.minPixelThreshold ?? 50,
                  waistXRatio:
                    deterministicConfig?.waistXRatio ??
                    PANTS_STRIPE_TUNING.waistMaskXRatio ??
                    PANTS_STRIPE_TUNING.waistbandXRatio,
                  boundaryTopXRatio:
                    deterministicConfig?.boundaryTopXRatio ??
                    PANTS_STRIPE_TUNING.zone?.boundaryMinXRatio ??
                    0.62,
                  boundaryBottomXRatio:
                    deterministicConfig?.boundaryBottomXRatio ??
                    PANTS_STRIPE_TUNING.zone?.boundaryMaxXRatio ??
                    0.86,
                  rightLowerStartYRatio:
                    deterministicConfig?.rightLowerStartYRatio ??
                    PANTS_STRIPE_TUNING.zone?.rightLowerStartYRatio ??
                    0.58,
                  rightLowerSlopeRatio:
                    deterministicConfig?.rightLowerSlopeRatio ??
                    PANTS_STRIPE_TUNING.zone?.rightLowerSlopeRatio ??
                    0.16,
                  beltStartXRatio: deterministicConfig?.beltStartXRatio ?? 0.93,
                  beltTopYRatio: deterministicConfig?.beltTopYRatio ?? 0.02,
                  beltBottomYRatio: deterministicConfig?.beltBottomYRatio ?? 0.98,
                  boundaryFeatherPx: deterministicConfig?.boundaryFeatherPx ?? 1.2,
                },
              });

              if (!cancelled && deterministicZones) {
                const masks = {
                  left: deterministicZones.leftMaskUrl,
                  right: deterministicZones.rightMaskUrl,
                };
                const leftSplit = {
                  main: deterministicZones.leftMainUrl,
                  under: deterministicZones.leftUnderUrl,
                };
                const splitMasks = {
                  upper: deterministicZones.rightUpperUrl,
                  lower: deterministicZones.rightLowerUrl,
                };
                const stats = deterministicZones.maskStats;
                setPantsLegMasks(masks);
                setPantsLeftSplitMasks(leftSplit);
                setPantsRightSplitMasks(splitMasks);
                setPantsWaistMask(deterministicZones.waistMaskUrl);
                setPantsMaskStats(stats);
                PANTS_LEG_MASK_CACHE.set(pantsMaskKey, masks);
                PANTS_LEFT_SPLIT_CACHE.set(pantsMaskKey, leftSplit);
                PANTS_RIGHT_SPLIT_CACHE.set(pantsMaskKey, splitMasks);
                if (deterministicZones.waistMaskUrl) {
                  PANTS_WAIST_MASK_CACHE.set(pantsMaskKey, deterministicZones.waistMaskUrl);
                } else {
                  PANTS_WAIST_MASK_CACHE.delete(pantsMaskKey);
                }
                PANTS_MASK_STATS_CACHE.set(pantsMaskKey, stats);
              } else if (!cancelled) {
                const fallbackStats: PantsMaskStats = deterministicZones?.maskStats ?? {
                  union: unionPixels,
                  left: 0,
                  right: 0,
                  leftMain: 0,
                  leftUnder: 0,
                  rightFly: 0,
                  rightUnder: 0,
                  main: unionPixels,
                  waist: 0,
                  overlap: 0,
                  unassigned: unionPixels,
                  zoneUnion: 0,
                  coverage: 0,
                };
                clearZoneMasks();
                setPantsMaskStats(fallbackStats);
                PANTS_MASK_STATS_CACHE.set(pantsMaskKey, fallbackStats);
              }
            } else if (!cancelled) {
              if (unionPixels > 0 && maxX >= minX) {
                const midX = Math.round((minX + maxX) / 2);
                const leftMask = ctx.createImageData(c.width, c.height);
                const rightMask = ctx.createImageData(c.width, c.height);
                let leftCount = 0;
                let rightCount = 0;
                for (let y = 0; y < c.height; y++) {
                  for (let x = 0; x < c.width; x++) {
                    const idx = (y * c.width + x) * 4;
                    const alpha = unionRaw[idx + 3];
                    if (alpha < 10) continue;
                    const target = x <= midX ? leftMask.data : rightMask.data;
                    target[idx] = 255;
                    target[idx + 1] = 255;
                    target[idx + 2] = 255;
                    target[idx + 3] = alpha;
                    if (x <= midX) leftCount++;
                    else rightCount++;
                  }
                }
                const toUrl = (imgData: ImageData) => {
                  const canvas = document.createElement("canvas");
                  canvas.width = c.width;
                  canvas.height = c.height;
                  const ictx = canvas.getContext("2d");
                  if (!ictx) return null;
                  ictx.putImageData(imgData, 0, 0);
                  return canvas.toDataURL("image/png");
                };
                const leftUrl = toUrl(leftMask);
                const rightUrl = toUrl(rightMask);
                if (leftUrl && rightUrl) {
                  const masks = { left: leftUrl, right: rightUrl };
                  const stats: PantsMaskStats = {
                    union: unionPixels,
                    left: leftCount,
                    right: rightCount,
                    leftMain: 0,
                    leftUnder: 0,
                    rightFly: 0,
                    rightUnder: 0,
                    main: unionPixels,
                    waist: 0,
                    overlap: 0,
                    unassigned: 0,
                    zoneUnion: unionPixels,
                    coverage: 1,
                  };
                  setPantsLegMasks(masks);
                  setPantsLeftSplitMasks(null);
                  setPantsRightSplitMasks(null);
                  setPantsWaistMask(null);
                  setPantsMaskStats(stats);
                  PANTS_LEG_MASK_CACHE.set(pantsMaskKey, masks);
                  PANTS_LEFT_SPLIT_CACHE.delete(pantsMaskKey);
                  PANTS_RIGHT_SPLIT_CACHE.delete(pantsMaskKey);
                  PANTS_WAIST_MASK_CACHE.delete(pantsMaskKey);
                  PANTS_MASK_STATS_CACHE.set(pantsMaskKey, stats);
                } else {
                  clearZoneMasks();
                  setPantsMaskStats(null);
                  PANTS_MASK_STATS_CACHE.delete(pantsMaskKey);
                }
              } else {
                clearZoneMasks();
                setPantsMaskStats(null);
                PANTS_MASK_STATS_CACHE.delete(pantsMaskKey);
              }
            }
          } else if (!cancelled) {
            clearZoneMasks();
            setPantsMaskStats(null);
            PANTS_MASK_STATS_CACHE.delete(pantsMaskKey);
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
            if (Number.isFinite(axisAngle)) {
              PANTS_AXIS_CACHE.set(pantsMaskKey, axisAngle);
              setPantsAxisAngle(axisAngle);
            } else {
              PANTS_AXIS_CACHE.delete(pantsMaskKey);
              setPantsAxisAngle(null);
            }
          }
        } catch {
          if (!cancelled) {
            setPantsUnionMask(null);
            clearZoneMasks();
            setPantsAxisAngle(null);
            setPantsMaskStats(null);
            PANTS_MASK_CACHE.delete(pantsMaskKey);
            PANTS_AXIS_CACHE.delete(pantsMaskKey);
            PANTS_MASK_STATS_CACHE.delete(pantsMaskKey);
          }
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
  }, [pantsMaskKey, pantsMaskSourceLayers, pantsStripeDetectedForZones]);

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
  const jacketFrameClass = vestPreviewActive
    ? "relative mx-auto w-full origin-top transform scale-[1.08] sm:scale-[1.14] lg:scale-[1.18]"
    : parityModeEnabled
      ? "relative mx-auto w-full origin-top transform scale-[0.84] sm:scale-[0.89] lg:scale-[0.89]"
      : `relative mx-auto w-full origin-top transform scale-[0.8] sm:scale-[0.86] lg:scale-[0.86] ${jacketShadowClass}`;
  const jacketAspectRatio = vestPreviewActive ? "600 / 620" : "600 / 733";
  const pantsFrameClass = parityModeEnabled
    ? "relative mx-auto w-full max-w-[560px] origin-top transform scale-[0.9] sm:scale-[0.94] lg:scale-[0.94]"
    : `relative mx-auto w-full max-w-[560px] origin-top transform scale-[0.86] sm:scale-[0.92] lg:scale-[0.92] ${pantsShadowClass}`;
  const pantsTopSpacingClass = showJacket
    ? parityModeEnabled
      ? "-mt-16 sm:-mt-12 lg:-mt-10"
      : "-mt-20 sm:-mt-16 lg:-mt-12"
    : "mt-0";
  const showParityDebug = parityModeEnabled && PARITY_DEBUG_OVERLAY;
  return (
    <div className="relative w-full select-none">
      {showJacket && (
        <div className="relative mx-auto w-full max-w-[580px] sm:max-w-[540px]">
        <div
          className={jacketFrameClass}
          data-testid="jacket-preview"
          style={{ width: "100%", aspectRatio: jacketAspectRatio, maxWidth: 560 }}
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
        {showJacketLayers && activeInteriorTexture && interiorLayers?.length
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
          : showJacketLayers
            ? interiorLayers?.map((l) => {
              const isLcpLayer = l.id === "interior_base";
              return (
                <img
                  key={`int-${l.id}`}
                  src={l.src}
                  alt={l.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  decoding="async"
                  fetchPriority={isLcpLayer ? "high" : undefined}
                  loading={isLcpLayer ? "eager" : undefined}
                />
              );
            })
            : null}
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
        {showLayer("fabric") && vestPreviewActive && vestLayers.length > 0 && (
          <>
            {activeInteriorTexture && vestInteriorLayers.length > 0
              ? vestInteriorLayers.map((layer) => (
                  <div
                    key={`vest-int-${layer.id}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url(${activeInteriorTexture})`,
                      backgroundSize: "140% auto",
                      backgroundRepeat: "repeat",
                      mixBlendMode: "multiply",
                      opacity: 0.95,
                      WebkitMaskImage: `url(${layer.src})`,
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      WebkitMaskPosition: "center",
                      maskImage: `url(${layer.src})`,
                      maskRepeat: "no-repeat",
                      maskSize: "contain",
                      maskPosition: "center",
                    }}
                  />
                ))
              : vestInteriorLayers.length > 0 && (
                  <BaseLayer
                    layers={vestInteriorLayers}
                    resolve={resolveVest}
                    blendMode="normal"
                    opacity={0.98}
                  />
                )}
            {vestFabricLayers.length > 0 && (
              <>
                <BaseLayer
                  layers={vestFabricLayers}
                  resolve={resolveVest}
                  blendMode="normal"
                  opacity={usePhotoBase ? photoOpacity : 0.98}
                  filter={usePhotoBase ? photoFilter : undefined}
                />
                <FabricUnion
                  layers={vestFabricLayers}
                  resolve={resolveVest}
                  fabricTexture={useTexture ? fabricTextureSource : undefined}
                  textureStyle={jacketTextureStyleReal}
                  baseColor={tunedFabricFill || toneBaseColor}
                  fabricAvgColor={tunedFabricFill}
                  baseBlendMode="color"
                  baseOpacity={usePhotoBase ? photoBaseOpacity : 0.95}
                  panZoom={panZoom}
                  canvas={JACKET_CANVAS}
                  mask={vestUnionMask}
                  textureScale={fabricTextureScale}
                  textureTileSizePx={stripeTileSizePx}
                  textureRotationDeg={0}
                  rotationScaleMode="none"
                  backgroundAnchor="top-left"
                  rotationOrigin="top left"
                  backgroundOffset={ZERO_OFFSET}
                />
              </>
            )}
            {vestFabricLayers.length > 0 && renderJacketPatternOverlay && jacketPatternOverlayStyle && (
              <FabricUnion
                layers={vestFabricLayers}
                resolve={resolveVest}
                fabricTexture={jacketOverlayTexture}
                textureStyle={jacketPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="color"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={JACKET_CANVAS}
                mask={vestUnionMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
              />
            )}
            {vestFabricLayers.length > 0 && stripeHighlightStyleActive && (
              <FabricUnion
                layers={vestFabricLayers}
                resolve={resolveVest}
                fabricTexture={useTexture ? fabricTextureSource : undefined}
                textureStyle={stripeHighlightStyleActive}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={JACKET_CANVAS}
                mask={vestUnionMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
              />
            )}
          </>
        )}
        {showJacketLayers && (
          <>
            {showLayer("fabric") && usePhotoBase && jacketPhotoLayers.length > 0 && (
              <BaseLayer
                layers={jacketPhotoLayers}
                resolve={resolveJacketPhoto}
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
                textureStyle={jacketTextureStyleReal}
                baseColor={tunedFabricFill || toneBaseColor}
                fabricAvgColor={tunedFabricFill}
                baseBlendMode="color"
                baseOpacity={usePhotoBase ? photoBaseOpacity : 0.95}
                panZoom={panZoom}
                canvas={JACKET_CANVAS}
                mask={jacketMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
                textureRotationDeg={0}
                rotationScaleMode="none"
                backgroundAnchor="top-left"
                rotationOrigin="top left"
                backgroundOffset={ZERO_OFFSET}
              />
            )}
            {showLayer("fabric") && renderJacketPatternOverlay && jacketPatternOverlayStyle && (
              <FabricUnion
                layers={fabricMaskLayers}
                resolve={resolveCdn}
                fabricTexture={jacketOverlayTexture}
                textureStyle={jacketPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={JACKET_CANVAS}
                mask={jacketMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
              />
            )}
            {showLayer("fabric") && stripeHighlightStyleActive && (
              <FabricUnion
                layers={fabricMaskLayers}
                resolve={resolveCdn}
                fabricTexture={useTexture ? fabricTextureSource : undefined}
                textureStyle={stripeHighlightStyleActive}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={JACKET_CANVAS}
                mask={jacketMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
              />
            )}
            {usePhotoBase && showLayer("fabric") && jacketDetailStructureLayers.length > 0 && (
              <>
                <BaseLayer
                  layers={jacketDetailStructureLayers}
                  resolve={resolveShading}
                  blendMode={detailTone.shading.blend}
                  opacity={photoStructuralShadingOpacity}
                  mask={jacketMask}
                />
                <BaseLayer
                  layers={jacketDetailStructureLayers}
                  resolve={resolveEdges}
                  blendMode="multiply"
                  opacity={photoStructuralEdgesOpacity}
                  mask={jacketMask}
                />
              </>
            )}
            {usePhotoBase && showLayer("fabric") && jacketDetailStyleLayers.length > 0 && (
              <>
                <BaseLayer
                  layers={jacketDetailStyleLayers}
                  resolve={resolveShading}
                  blendMode={detailTone.shading.blend}
                  opacity={photoStyleShadingOpacity}
                  mask={jacketMask}
                />
                <BaseLayer
                  layers={jacketDetailStyleLayers}
                  resolve={resolveEdges}
                  blendMode="multiply"
                  opacity={photoStyleEdgesOpacity}
                  mask={jacketMask}
                />
              </>
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
            {!usePhotoBase && showStyleOverlays && styleOverlayLayers.length > 0 && (
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
                {!effectiveFastPreview && (
                  <BaseLayer
                    layers={jacketDetailStructureLayers}
                    resolve={resolveSpecular}
                    blendMode={detailTone.specular.blend}
                    opacity={structuralSpecularOpacityTuned * 0.7}
                    mask={jacketMask}
                  />
                )}
                {!effectiveFastPreview && (
                  <BaseLayer
                    layers={jacketDetailStructureLayers}
                    resolve={resolveEdges}
                    blendMode="multiply"
                    opacity={structuralEdgesOpacityTuned}
                    mask={jacketMask}
                  />
                )}
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
                {!effectiveFastPreview && (
                  <BaseLayer
                    layers={jacketDetailStyleLayers}
                    resolve={resolveSpecular}
                    blendMode={detailTone.specular.blend}
                    opacity={styleSpecularOpacityTuned * 0.7}
                    mask={jacketMask}
                  />
                )}
                {!effectiveFastPreview && (
                  <BaseLayer
                    layers={jacketDetailStyleLayers}
                    resolve={resolveEdges}
                    blendMode="multiply"
                    opacity={styleEdgesOpacityTuned}
                    mask={jacketMask}
                  />
                )}
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
          </>
        )}
      </div>
    </div>
      )}
    {/* ======================== PANTS CANVAS ======================== */}
      {showPants && pantsLayer && (
        <div
          className={`${pantsFrameClass} ${pantsTopSpacingClass}`}
          style={{ width: "100%", aspectRatio: "600 / 350", maxWidth: 520 }}
        >
        {showLayer("fabric") && usePhotoBase && pantsPhotoLayers.length > 0 && (
            <BaseLayer
              layers={pantsPhotoLayers}
              resolve={resolvePantsPhoto}
            blendMode="normal"
            opacity={photoOpacity}
            filter={photoFilter}
            mask={pantsMask}
          />
        )}
        {showLayer("fabric") && (!usePhotoBase || pantsPhotoLayers.length === 0) && (
          <BaseLayer
            layers={pantsBaseLayers}
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
            fabricTexture={undefined}
            textureStyle={pantsTextureStyleReal}
            baseColor={tunedFabricFill || toneBaseColor}
            fabricAvgColor={tunedFabricFill}
            baseBlendMode="color"
            baseOpacity={pantsBaseFillOpacity}
            panZoom={panZoom}
            canvas={PANTS_CANVAS}
            mask={pantsMask}
            textureScale={fabricTextureScale}
            textureTileSizePx={stripeTileSizePx}
          />
        )}
        {showLayer("fabric") && usePantsTexture && (
          pantsZoneTextureActive ? (
            <>
              {pantsStripeZoneConfig.mode === "primary" ? (
                <>
                  {pantsStripeZoneConfig.masks.leftMain && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftMain}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftMain")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.leftUnder && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftUnder}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftUnderlap")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightUpper && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightUpper}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightUpper}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightFly")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightLower && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightLower}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightLower}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightUnder")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.waist && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.waist}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.waist}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("waist")}
                    />
                  )}
                </>
              ) : (
                <>
                  {pantsStripeZoneConfig.masks.leftLeg && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftLeg}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftMain")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightLeg && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightLeg}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightUpper}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightFly")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.waist && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={fabricTextureSourcePants}
                      textureStyle={pantsDetailProtectTextureStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.waist}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.waist}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("waist")}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <FabricUnion
              layers={pantsTextureLayers}
              resolve={resolveCdn}
              fabricTexture={fabricTextureSourcePants}
              textureStyle={pantsDetailProtectTextureStyle}
              baseColor={tunedFabricFill || toneBaseColor}
              baseBlendMode="normal"
              baseOpacity={0}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              mask={pantsMask}
              textureScale={fabricTextureScale}
              textureTileSizePx={stripeTileSizePx}
              textureRotationDeg={pantsTextureFallbackRotationDeg}
            />
          )
        )}
        {showLayer("fabric") && pantsStripeHighlightStyle && (
          pantsZoneTextureActive ? (
            <>
              {pantsStripeZoneConfig.mode === "primary" ? (
                <>
                  {pantsStripeZoneConfig.masks.leftMain && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftMain}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftMain")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.leftUnder && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftUnder}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftUnderlap")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightUpper && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightUpper}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightUpper}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightFly")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightLower && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightLower}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightLower}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightUnder")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.waist && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.waist}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.waist}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("waist")}
                    />
                  )}
                </>
              ) : (
                <>
                  {pantsStripeZoneConfig.masks.leftLeg && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.leftLeg}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.leftMain}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("leftMain")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.rightLeg && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.rightLeg}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.rightUpper}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("rightFly")}
                    />
                  )}
                  {pantsStripeZoneConfig.masks.waist && (
                    <FabricUnion
                      layers={pantsTextureLayers}
                      resolve={resolveCdn}
                      fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
                      textureStyle={pantsStripeHighlightStyle}
                      baseColor={tunedFabricFill || toneBaseColor}
                      baseBlendMode="normal"
                      baseOpacity={0}
                      panZoom={panZoom}
                      canvas={PANTS_CANVAS}
                      mask={pantsStripeZoneConfig.masks.waist}
                      textureScale={fabricTextureScale}
                      textureTileSizePx={stripeTileSizePx}
                      textureRotationDeg={pantsStripeZoneConfig.rotations.waist}
                      rotationScaleMode="none"
                      backgroundAnchor="top-left"
                      rotationOrigin="top left"
                      backgroundOffset={getZoneTextureOffset("waist")}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <FabricUnion
              layers={pantsTextureLayers}
              resolve={resolveCdn}
              fabricTexture={useTexture ? fabricTextureSourcePants : undefined}
              textureStyle={pantsStripeHighlightStyle}
              baseColor={tunedFabricFill || toneBaseColor}
              baseBlendMode="normal"
              baseOpacity={0}
              panZoom={panZoom}
              canvas={PANTS_CANVAS}
              mask={pantsMask}
              textureScale={fabricTextureScale}
              textureTileSizePx={stripeTileSizePx}
              textureRotationDeg={pantsStripeRotationDeg}
            />
          )
        )}
        {showLayer("fabric") &&
          allowPantsPatternOverlay &&
          shouldRenderPantsPatternOverlay &&
          !pantsZoneTextureActive &&
          !hasTextureStripes &&
          !pantsZoneStripeActive &&
          jacketPatternOverlayStyle && (
          <FabricUnion
            layers={pantsTextureLayers}
            resolve={resolveCdn}
            fabricTexture={pantsOverlayTexture}
            textureStyle={jacketPatternOverlayStyle}
            baseColor={tunedFabricFill || toneBaseColor}
            baseBlendMode="normal"
            baseOpacity={0}
            panZoom={panZoom}
            canvas={PANTS_CANVAS}
            mask={pantsMask}
            textureScale={fabricTextureScale}
            textureTileSizePx={stripeTileSizePx}
            textureRotationDeg={pantsTextureFallbackRotationDeg}
          />
        )}
        {showLayer("fabric") && allowPantsPatternOverlay && pantsZoneStripeActive && (
          <>
            {pantsLeftPatternOverlayStyle && (
              <FabricUnion
                layers={pantsTextureLayers}
                resolve={resolveCdn}
                fabricTexture={EMPTY_TEXTURE_DATA_URL}
                textureStyle={pantsLeftPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={PANTS_CANVAS}
                mask={pantsLeftZoneMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
                textureRotationDeg={0}
              />
            )}
            {pantsRightPatternOverlayStyle && (
              <FabricUnion
                layers={pantsTextureLayers}
                resolve={resolveCdn}
                fabricTexture={EMPTY_TEXTURE_DATA_URL}
                textureStyle={pantsRightPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={PANTS_CANVAS}
                mask={pantsRightZoneMask}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
                textureRotationDeg={0}
              />
            )}
            {pantsStripeZoneConfig.mode === "primary" &&
              pantsStripeZoneConfig.masks.rightLower &&
              pantsRightLowerPatternOverlayStyle && (
              <FabricUnion
                layers={pantsTextureLayers}
                resolve={resolveCdn}
                fabricTexture={EMPTY_TEXTURE_DATA_URL}
                textureStyle={pantsRightLowerPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={PANTS_CANVAS}
                mask={pantsStripeZoneConfig.masks.rightLower}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
                textureRotationDeg={0}
              />
            )}
            {pantsStripeZoneConfig.masks.waist && pantsWaistPatternOverlayStyle && (
              <FabricUnion
                layers={pantsTextureLayers}
                resolve={resolveCdn}
                fabricTexture={EMPTY_TEXTURE_DATA_URL}
                textureStyle={pantsWaistPatternOverlayStyle}
                baseColor={tunedFabricFill || toneBaseColor}
                baseBlendMode="normal"
                baseOpacity={0}
                panZoom={panZoom}
                canvas={PANTS_CANVAS}
                mask={pantsStripeZoneConfig.masks.waist}
                textureScale={fabricTextureScale}
                textureTileSizePx={stripeTileSizePx}
                textureRotationDeg={0}
              />
            )}
          </>
        )}
        {usePhotoBase && showLayer("fabric") && pantsPhotoDetailLayers.length > 0 && (
          <>
            <BaseLayer
              layers={pantsPhotoDetailLayers}
              resolve={resolveShading}
              blendMode={detailTone.shading.blend}
              opacity={photoPantsShadingOpacity}
              mask={pantsMask}
            />
            <BaseLayer
              layers={pantsPhotoDetailLayers}
              resolve={resolveEdges}
              blendMode="multiply"
              opacity={photoPantsEdgesOpacity}
              mask={pantsMask}
            />
          </>
        )}
        {!usePhotoBase && showStyleOverlays && pantsOverlayLayers.length > 0 && (
          <BaseLayer
            layers={pantsOverlayLayers}
            resolve={resolveCdn}
            blendMode="soft-light"
            opacity={styleBaseOverlayOpacityTuned * (pantsZoneTextureActive ? 0.45 : 0.7)}
            mask={pantsMask}
          />
        )}
        {!usePhotoBase && needsDarkBoost && pantsMask && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "multiply",
              opacity: darkBoostOpacity * (pantsZoneTextureActive ? 0.28 : 0.68),
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
              opacity={structuralShadingOpacityTuned * 1.08 * pantsStripeShadingMul}
              mask={pantsMask}
            />
            {!effectiveFastPreview && (
              <BaseLayer
                layers={pantsDetailLayers}
                resolve={resolveSpecular}
                blendMode={detailTone.specular.blend}
                opacity={structuralSpecularOpacityTuned * 0.6}
                mask={pantsMask}
              />
            )}
            {!effectiveFastPreview && (
              <BaseLayer
                layers={pantsDetailLayers}
                resolve={resolveEdges}
                blendMode="multiply"
                opacity={structuralEdgesOpacityTuned * 1.18 * pantsStripeEdgeMul}
                mask={pantsMask}
              />
            )}
          </>
        )}
        {!usePhotoBase && showLayer("fabric") && pantsStyleLayers.length > 0 && (
            <>
              <BaseLayer
                layers={pantsStyleLayers}
                resolve={resolveShading}
                blendMode={detailTone.shading.blend}
                opacity={styleShadingOpacityTuned * 0.98 * pantsStripeShadingMul}
                mask={pantsMask}
              />
              {!effectiveFastPreview && (
                <BaseLayer
                  layers={pantsStyleLayers}
                  resolve={resolveSpecular}
                  blendMode={detailTone.specular.blend}
                  opacity={styleSpecularOpacityTuned * 0.6}
                  mask={pantsMask}
                />
              )}
              {!effectiveFastPreview && (
                <BaseLayer
                  layers={pantsStyleLayers}
                  resolve={resolveEdges}
                  blendMode="multiply"
                  opacity={styleEdgesOpacityTuned * 1.12 * pantsStripeEdgeMul}
                  mask={pantsMask}
                />
              )}
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
      {showParityDebug && (
        <div className="pointer-events-none absolute right-2 top-2 z-40 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white">
          <div>parity: {process.env.NEXT_PUBLIC_PARITY_MODE}</div>
          <div>preset: {parityPreset?.key ?? "none"}</div>
          <div>
            render: {activeRenderMode} / variant: {photoVariant}
          </div>
          <div>
            rot: L {pantsStripeZoneConfig.rotations.leftMain.toFixed(1)} / R{" "}
            {pantsStripeZoneConfig.rotations.rightUpper.toFixed(1)} / RL{" "}
            {pantsStripeZoneConfig.rotations.rightLower.toFixed(1)} / W{" "}
            {pantsStripeZoneConfig.rotations.waist.toFixed(1)}
          </div>
          <div>coverage: {(pantsStripeZoneConfig.coverageRatio * 100).toFixed(2)}%</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SuitPreview);


