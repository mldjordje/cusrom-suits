import { SuitLayer } from "../data/options";
import { getTransparentCdnBase } from "../utils/backend";
import { type Tone } from "../utils/visual";
import {
  cdnPair,
  type FabricRenderMode,
  type PhotoVariant,
} from "../utils/assets";
import { type JacketStripeZones } from "./jacketStripeZones";
import { type PantsStripePhaseBounds } from "./pantsStripeTuning";
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
const TEXTURE_SCALE_MIN = 0.03;
const TEXTURE_SCALE_MAX = 2.6;
const DEBUG_PANTS_OVERLAY = false;
const ENABLE_PANTS_SPLIT = false;
const ENABLE_PANTS_ZONE_MASKS = true;
const FORCE_PANTS_MID_SPLIT = false;
const FAST_PREVIEW = true;
// Hard guard: pants must use only real fabric texture, never synthetic drawn stripes.
const ENABLE_PANTS_SYNTHETIC_STRIPES = false;
const ENABLE_JACKET_LAPEL_ROTATION = true;
const PARITY_DEBUG_OVERLAY = process.env.NEXT_PUBLIC_PARITY_DEBUG === "1";
const VEST_FEATURE_ENABLED = process.env.NEXT_PUBLIC_VEST_FEATURE !== "0";
const PANTS_MASK_VERSION = "v26";
const ZERO_OFFSET = { x: 0, y: 0 } as const;

const toTextureProxyUrl = (src: string): string => {
  if (!src) return src;
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return src;
  try {
    const resolved = new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (typeof window !== "undefined" && resolved.origin === window.location.origin) return resolved.toString();
    return `/api/fabric-proxy?url=${encodeURIComponent(resolved.toString())}`;
  } catch {
    return src;
  }
};

const isPocketLikeLayer = (layer: SuitLayer) => {
  const haystack = `${layer.id} ${layer.name} ${layer.src}`.toLowerCase();
  return (
    haystack.includes("pocket") ||
    haystack.includes("pockets") ||
    haystack.includes("welt") ||
    haystack.includes("flap")
  );
};

const collectPocketLayers = (layers: SuitLayer[]) => {
  const seen = new Set<string>();
  const out: SuitLayer[] = [];
  for (const layer of layers) {
    if (!isPocketLikeLayer(layer)) continue;
    const key = `${layer.id}|${layer.src}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(layer);
  }
  return out;
};

const FABRIC_AVG_CACHE = new Map<string, string | null>();
const FABRIC_TILE_CACHE = new Map<string, string>();
const FABRIC_STRIPE_CACHE = new Map<string, StripeHint>();
const JACKET_MASK_CACHE = new Map<string, string>();
const JACKET_STRIPE_ZONES_CACHE = new Map<string, JacketStripeZones>();
const VEST_MASK_CACHE = new Map<string, string>();
const PANTS_MASK_CACHE = new Map<string, string>();
const PANTS_LEG_MASK_CACHE = new Map<string, { left: string; right: string }>();
const PANTS_LEFT_SPLIT_CACHE = new Map<string, { main: string; under: string | null }>();
const PANTS_RIGHT_SPLIT_CACHE = new Map<string, { upper: string; lower: string | null }>();
const PANTS_WAIST_MASK_CACHE = new Map<string, string>();
const PANTS_AXIS_CACHE = new Map<string, number>();
const PANTS_MASK_STATS_CACHE = new Map<string, PantsMaskStats>();
const PANTS_MASK_BOUNDS_CACHE = new Map<string, PantsStripePhaseBounds | null>();

const setBoundedCache = <T,>(cache: Map<string, T>, key: string, value: T, maxEntries: number) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
};

const FABRIC_ANALYSIS_CACHE_LIMIT = 128;
const MASK_CACHE_LIMIT = 24;
const PANTS_MASK_CACHE_LIMIT = 18;

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

export type {
  RGB,
  StripeOrientation,
  StripeHint,
  PantsMaskStats,
  PantsStripeZoneMode,
  PantsStripeZoneConfig,
};

export {
  cdnTransparent,
  SHIRT_PAIR,
  JACKET_CANVAS,
  PANTS_CANVAS,
  PANTS_SEAM_MASK_SRC,
  EMPTY_TEXTURE_DATA_URL,
  MASK_BLEED_PX,
  SPLIT_MASK_BLEED_PX,
  TEXTURE_TILE_PX,
  STRIPE_TILE_SCALE,
  STRIPE_TILE_PX,
  TEXTURE_TILE_CANVAS_SCALE,
  TEXTURE_TILE_CANVAS_MAX,
  STRIPE_ANALYSIS_SIZE,
  PANTS_MASK_SAMPLE_W,
  TEXTURE_SCALE_GLOBAL,
  TEXTURE_SCALE_MIN,
  TEXTURE_SCALE_MAX,
  DEBUG_PANTS_OVERLAY,
  ENABLE_PANTS_SPLIT,
  ENABLE_PANTS_ZONE_MASKS,
  FORCE_PANTS_MID_SPLIT,
  FAST_PREVIEW,
  ENABLE_PANTS_SYNTHETIC_STRIPES,
  ENABLE_JACKET_LAPEL_ROTATION,
  PARITY_DEBUG_OVERLAY,
  VEST_FEATURE_ENABLED,
  PANTS_MASK_VERSION,
  ZERO_OFFSET,
  toTextureProxyUrl,
  collectPocketLayers,
  FABRIC_AVG_CACHE,
  FABRIC_TILE_CACHE,
  FABRIC_STRIPE_CACHE,
  JACKET_MASK_CACHE,
  JACKET_STRIPE_ZONES_CACHE,
  VEST_MASK_CACHE,
  PANTS_MASK_CACHE,
  PANTS_LEG_MASK_CACHE,
  PANTS_LEFT_SPLIT_CACHE,
  PANTS_RIGHT_SPLIT_CACHE,
  PANTS_WAIST_MASK_CACHE,
  PANTS_AXIS_CACHE,
  PANTS_MASK_STATS_CACHE,
  PANTS_MASK_BOUNDS_CACHE,
  setBoundedCache,
  FABRIC_ANALYSIS_CACHE_LIMIT,
  MASK_CACHE_LIMIT,
  PANTS_MASK_CACHE_LIMIT,
  EMPTY_STRIPE,
  clampChannel,
  clamp,
  normalizeRotation,
  PREVIEW_EXPOSURE,
  FORCE_PHOTO_VARIANT,
  parseNumber,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  normalizePattern,
  inferPatternFromText,
  getFabricPatternRaw,
  shouldUsePantsPatternOverlay,
  normalizePhotoVariantMeta,
  normalizeRenderModeMeta,
  getFabricRenderBasePath,
  selectPhotoVariantForFabric,
  rgbToHsl,
  hslToRgb,
  relativeLuminance,
  computeStripeHint,
  computeMaskAxisAngle,
  applyPreviewExposure,
  extractFabricHex,
  computeFabricBaseColor,
  enhanceFabricColor,
  tuneFabricColor,
  computeRobustAverageColor,
};

