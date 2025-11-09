export type Tone = "light" | "medium" | "dark";
export type ContrastLevel = "low" | "medium" | "high";
type BlendMode = "multiply" | "overlay" | "soft-light";

export type ToneVisual = {
  shading: { opacity: number; blend: BlendMode };
  specular: { opacity: number; blend: BlendMode };
  fabric: { opacity: number; blend: BlendMode };
  edgesOpacity: number;
  outlinesOpacity: number;
  noise: number;
  vignette: number;
  highlightTop: number;
  highlightBottom: number;
  detailOpacity: number;
  detailScale: number;
  weaveSharpness: number;
};

export const NOISE_DATA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWMYefz/fwAI1QLS/7j4OQAAAABJRU5ErkJggg==";

const LEVEL_MULTIPLIER: Record<ContrastLevel, number> = {
  low: 0.9,
  medium: 1,
  high: 1.15,
};

const FABRIC_BLEND: Record<Tone, BlendMode> = {
  light: "overlay",
  medium: "soft-light",
  dark: "soft-light",
};

export const toneBlend = (tone?: string, level: ContrastLevel = "medium") => {
  const safeTone = (tone as Tone) || "medium";
  const profile = {
    light: { brightness: 1.05, contrast: 1.05, saturate: 1.1 },
    medium: { brightness: 1.05, contrast: 1.05, saturate: 1.1 },
    dark: { brightness: 1.02, contrast: 1.08, saturate: 1.05 },
  }[safeTone];
  const contrastBoost = level === "high" ? 0.06 : level === "low" ? -0.03 : 0;
  const brightnessBoost = level === "high" ? 0.02 : level === "low" ? -0.015 : 0;
  const saturateBoost = level === "high" ? 0.05 : level === "low" ? -0.03 : 0;
  return {
    filter: `brightness(${(profile.brightness + brightnessBoost).toFixed(3)}) contrast(${(
      profile.contrast + contrastBoost
    ).toFixed(3)}) saturate(${(profile.saturate + saturateBoost).toFixed(3)})`,
  } as const;
};

export const getToneConfig = (tone?: string, level: ContrastLevel = "medium"): ToneVisual => {
  const safeTone = (tone as Tone) || "medium";
  const levelMul = LEVEL_MULTIPLIER[level];

  const fabricBase = { light: 0.26, medium: 0.24, dark: 0.22 }[safeTone];
  const shadingBase = { light: 0.5, medium: 0.45, dark: 0.4 }[safeTone];
  const specularBase = { light: 0.18, medium: 0.15, dark: 0.12 }[safeTone];
  const edgesBase = 0.1;
  const outlinesBase = { light: 0.3, medium: 0.28, dark: 0.25 }[safeTone];
  const noiseBase = { light: 0.04, medium: 0.045, dark: 0.05 }[safeTone];
  const vignetteBase = { light: 0.07, medium: 0.08, dark: 0.09 }[safeTone];
  const detailOpacityBase = { light: 0.13, medium: 0.12, dark: 0.11 }[safeTone];
  const detailScaleBase = { light: 0.2, medium: 0.22, dark: 0.24 }[safeTone];
  const weaveSharpnessBase = { light: 1.05, medium: 1, dark: 0.95 }[safeTone];

  return {
    shading: {
      opacity: Number((shadingBase * levelMul).toFixed(3)),
      blend: "multiply",
    },
    specular: {
      opacity: Number((specularBase * (level === "high" ? 1.05 : level === "low" ? 0.9 : 1)).toFixed(3)),
      blend: "soft-light",
    },
    fabric: {
      opacity: Number(Math.min(fabricBase * (level === "high" ? 1.02 : level === "low" ? 0.95 : 1), 0.3).toFixed(3)),
      blend: FABRIC_BLEND[safeTone],
    },
    edgesOpacity: Number((edgesBase * (level === "high" ? 1.05 : 1)).toFixed(3)),
    outlinesOpacity: Number((outlinesBase * (level === "high" ? 1.05 : 1)).toFixed(3)),
    noise: Number((noiseBase * (level === "high" ? 1.05 : 1)).toFixed(3)),
    vignette: Number((vignetteBase * (level === "high" ? 1.05 : level === "low" ? 0.9 : 1)).toFixed(3)),
    highlightTop: safeTone === "light" ? 0.1 : safeTone === "dark" ? 0.06 : 0.08,
    highlightBottom: safeTone === "light" ? 0.06 : safeTone === "dark" ? 0.04 : 0.05,
    detailOpacity: Number((detailOpacityBase * (levelMul >= 1 ? levelMul : 1)).toFixed(3)),
    detailScale: detailScaleBase,
    weaveSharpness: weaveSharpnessBase,
  };
};

export const toneVisual = getToneConfig;

export const getToneBaseColor = (tone?: string) => {
  const safe = (tone as Tone) || "medium";
  if (safe === "dark") return "#2b2b2b";
  if (safe === "light") return "#c8c8c8";
  return "#8f8f8f";
};
