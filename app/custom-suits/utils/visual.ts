export type Tone = "light" | "medium" | "dark" | undefined;
export type Level = "low" | "medium" | "high";

export type ToneConfig = {
  // fabric base filter
  filter: string;
  // fabric weave
  weaveBlend: "soft-light" | "overlay";
  weaveOpacity: number;
  // shading
  shadingOpacity: number;
  // specular
  specularBlend: "soft-light" | "overlay" | "screen";
  specularOpacity: number;
  // global overlays
  vignetteStrength: number; // 0..1
  noiseOpacity: number; // 0..1
  // outlines
  baseOutlineOpacity: number;
  pantsOutlineOpacity: number;
};

export const TONE_CONFIGS: Record<Exclude<Tone, undefined>, ToneConfig> = {
  light: {
    filter: "brightness(1.06) contrast(1.10) saturate(1.08)",
    weaveBlend: "overlay",
    weaveOpacity: 0.36,
    shadingOpacity: 0.40,
    specularBlend: "screen",
    specularOpacity: 0.12,
    vignetteStrength: 0.08,
    noiseOpacity: 0.04,
    baseOutlineOpacity: 0.35,
    pantsOutlineOpacity: 0.30,
  },
  medium: {
    filter: "brightness(1.05) contrast(1.14) saturate(1.10)",
    weaveBlend: "soft-light",
    weaveOpacity: 0.32,
    shadingOpacity: 0.35,
    specularBlend: "overlay",
    specularOpacity: 0.10,
    vignetteStrength: 0.09,
    noiseOpacity: 0.05,
    baseOutlineOpacity: 0.35,
    pantsOutlineOpacity: 0.30,
  },
  dark: {
    filter: "brightness(1.04) contrast(1.20) saturate(1.12)",
    weaveBlend: "soft-light",
    weaveOpacity: 0.28,
    shadingOpacity: 0.28,
    specularBlend: "soft-light",
    specularOpacity: 0.08,
    vignetteStrength: 0.10,
    noiseOpacity: 0.05,
    baseOutlineOpacity: 0.35,
    pantsOutlineOpacity: 0.30,
  },
};

function withLevel(cfg: ToneConfig, level?: Level): ToneConfig {
  if (!level || level === "medium") return cfg;
  const mult = (l: Level, low: number, high: number) => (l === "low" ? low : high);
  const scale = (v: number, l: Level, low: number, high: number) => v * (l === "low" ? low : high);
  const append = level === "low" ? " contrast(0.98) saturate(0.98)" : " contrast(1.04) saturate(1.03)";
  return {
    ...cfg,
    filter: `${cfg.filter}${append}`,
    weaveOpacity: scale(cfg.weaveOpacity, level, 0.95, 1.05),
    shadingOpacity: scale(cfg.shadingOpacity, level, 0.90, 1.15),
    specularOpacity: scale(cfg.specularOpacity, level, 0.90, 1.20),
    vignetteStrength: scale(cfg.vignetteStrength, level, 0.90, 1.15),
    noiseOpacity: scale(cfg.noiseOpacity, level, 0.90, 1.10),
    baseOutlineOpacity: scale(cfg.baseOutlineOpacity, level, 0.95, 1.05),
    pantsOutlineOpacity: scale(cfg.pantsOutlineOpacity, level, 0.95, 1.05),
  };
}

export function getToneConfig(tone: Tone, level?: Level): ToneConfig {
  const base = tone === "light" ? TONE_CONFIGS.light : tone === "dark" ? TONE_CONFIGS.dark : TONE_CONFIGS.medium;
  return withLevel(base, level);
}

export function toneBlend(tone?: string, level?: Level) {
  const cfg = getToneConfig((tone as Tone) || undefined, level);
  return { opacity: 1, filter: cfg.filter } as const;
}
