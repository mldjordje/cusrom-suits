export type Tone = "light" | "medium" | "dark" | undefined;

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
  },
};

export function getToneConfig(tone: Tone): ToneConfig {
  if (tone === "light") return TONE_CONFIGS.light;
  if (tone === "dark") return TONE_CONFIGS.dark;
  return TONE_CONFIGS.medium;
}

export function toneBlend(tone?: string) {
  const cfg = getToneConfig((tone as Tone) || undefined);
  return { opacity: 1, filter: cfg.filter } as const;
}

