export type Tone = "light" | "medium" | "dark";
export type ContrastLevel = "low" | "medium" | "high";

export type ToneVisual = {
  shadingOpacity: number;
  specularOpacity: number;
  specularBlend: "screen" | "overlay" | "soft-light";
  textureBlend: "overlay" | "soft-light";
  textureOpacity: number;
  noise: number;
  vignette: number;
  highlightTop: number;
  highlightBottom: number;
  ambientTint: string;
  ambientOpacity: number;
  edgesOpacity: number;
  detailScale: number;
  detailOpacity: number;
  weaveSharpness: number;
};

export const NOISE_DATA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWMYefz/fwAI1QLS/7j4OQAAAABJRU5ErkJggg==";

const LEVEL_MULTIPLIER: Record<ContrastLevel, number> = {
  low: 0.9,
  medium: 1,
  high: 1.12,
};

const SPECULAR_BLEND: Record<Tone, ToneVisual["specularBlend"]> = {
  light: "screen",
  medium: "overlay",
  dark: "soft-light",
};

const TEXTURE_BLEND: Record<Tone, ToneVisual["textureBlend"]> = {
  light: "overlay",
  medium: "soft-light",
  dark: "soft-light",
};

const AMBIENT_TINT: Record<Tone, string> = {
  light: "rgba(253, 248, 245, 1)",
  medium: "rgba(248, 244, 238, 1)",
  dark: "rgba(243, 241, 236, 1)",
};

export const toneBlend = (tone?: string, level: ContrastLevel = "medium") => {
  const safeTone = (tone as Tone) || "medium";
  const levelMul = LEVEL_MULTIPLIER[level];
  const baseFilter = {
    light: { brightness: 1.05, contrast: 1.04, saturate: 1.03 },
    medium: { brightness: 1.04, contrast: 1.08, saturate: 1.06 },
    dark: { brightness: 1.02, contrast: 1.12, saturate: 1.08 },
  }[safeTone];
  const contrastBoost = level === "high" ? 0.08 : level === "low" ? -0.04 : 0;
  const brightnessBoost = level === "high" ? 0.03 : level === "low" ? -0.02 : 0;
  const saturateBoost = level === "high" ? 0.04 : level === "low" ? -0.03 : 0;
  return {
    opacity: 0.96 + levelMul * 0.04,
    filter: `brightness(${(baseFilter.brightness + brightnessBoost).toFixed(3)}) contrast(${(
      baseFilter.contrast + contrastBoost
    ).toFixed(3)}) saturate(${(baseFilter.saturate + saturateBoost).toFixed(3)})`,
  } as const;
};

export const toneVisual = (tone?: string, level: ContrastLevel = "medium"): ToneVisual => {
  const safeTone = (tone as Tone) || "medium";
  const levelMul = LEVEL_MULTIPLIER[level];

  const shadingBase = { light: 0.4, medium: 0.36, dark: 0.3 }[safeTone];
  const specularBase = { light: 0.12, medium: 0.105, dark: 0.09 }[safeTone];
  const textureBase = { light: 0.35, medium: 0.31, dark: 0.29 }[safeTone];
  const noiseBase = { light: 0.04, medium: 0.042, dark: 0.045 }[safeTone];
  const vignetteBase = { light: 0.05, medium: 0.065, dark: 0.08 }[safeTone];
  const edgesBase = { light: 0.08, medium: 0.075, dark: 0.07 }[safeTone];
  const detailScaleBase = { light: 0.2, medium: 0.22, dark: 0.24 }[safeTone];
  const detailOpacityBase = { light: 0.13, medium: 0.11, dark: 0.1 }[safeTone];
  const weaveSharpnessBase = { light: 1.05, medium: 1, dark: 0.95 }[safeTone];

  return {
    shadingOpacity: Number((shadingBase * levelMul).toFixed(3)),
    specularOpacity: Number((specularBase * (level === "low" ? 0.9 : level === "high" ? 1.1 : 1)).toFixed(3)),
    specularBlend: SPECULAR_BLEND[safeTone],
    textureBlend: TEXTURE_BLEND[safeTone],
    textureOpacity: Number((textureBase * (level === "high" ? 1.05 : level === "low" ? 0.92 : 1)).toFixed(3)),
    noise: Number(noiseBase.toFixed(3)),
    vignette: Number((vignetteBase * (level === "high" ? 1.1 : level === "low" ? 0.85 : 1)).toFixed(3)),
    highlightTop: safeTone === "light" ? 0.09 : safeTone === "dark" ? 0.07 : 0.08,
    highlightBottom: safeTone === "light" ? 0.05 : safeTone === "dark" ? 0.04 : 0.045,
    ambientTint: AMBIENT_TINT[safeTone],
    ambientOpacity: safeTone === "light" ? 0.07 : safeTone === "dark" ? 0.05 : 0.06,
    edgesOpacity: Number((edgesBase * (level === "high" ? 1.05 : 1)).toFixed(3)),
    detailScale: detailScaleBase,
    detailOpacity: Number((detailOpacityBase * (levelMul >= 1 ? levelMul : 1)).toFixed(3)),
    weaveSharpness: weaveSharpnessBase,
  };
};

export const getToneBaseColor = (tone?: string) => {
  const safe = (tone as Tone) || "medium";
  if (safe === "dark") return "#2b2b2b";
  if (safe === "light") return "#c8c8c8";
  return "#8f8f8f";
};
