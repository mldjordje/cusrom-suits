export type Tone = "light" | "medium" | "dark";
export type ContrastLevel = "low" | "medium" | "high";
type BlendMode = "multiply" | "overlay" | "soft-light";

export type ToneVisual = {
  shading: { opacity: number; blend: BlendMode };
  specular: { opacity: number; blend: BlendMode };
  fabric: { opacity: number; blend: BlendMode };
  edgesOpacity: number;
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
    filter: `brightness(${(baseFilter.brightness + brightnessBoost).toFixed(3)}) contrast(${(
      baseFilter.contrast + contrastBoost
    ).toFixed(3)}) saturate(${(baseFilter.saturate + saturateBoost).toFixed(3)})`,
  } as const;
};

export const getToneConfig = (tone?: string, level: ContrastLevel = "medium"): ToneVisual => {
  const safeTone = (tone as Tone) || "medium";
  const levelMul = LEVEL_MULTIPLIER[level];

  const shadingBase = { light: 0.4, medium: 0.36, dark: 0.3 }[safeTone];
  const specularBase = { light: 0.12, medium: 0.1, dark: 0.08 }[safeTone];
  const fabricBase = { light: 0.36, medium: 0.33, dark: 0.3 }[safeTone];
  const edgesBase = { light: 0.08, medium: 0.075, dark: 0.07 }[safeTone];
  const noiseBase = { light: 0.04, medium: 0.04, dark: 0.045 }[safeTone];
  const vignetteBase = { light: 0.06, medium: 0.07, dark: 0.08 }[safeTone];
  const detailOpacityBase = { light: 0.13, medium: 0.11, dark: 0.1 }[safeTone];
  const detailScaleBase = { light: 0.2, medium: 0.22, dark: 0.24 }[safeTone];
  const weaveSharpnessBase = { light: 1.05, medium: 1, dark: 0.95 }[safeTone];

  return {
    shading: {
      opacity: Number((shadingBase * levelMul).toFixed(3)),
      blend: "multiply",
    },
    specular: {
      opacity: Number((specularBase * (level === "high" ? 1.1 : level === "low" ? 0.9 : 1)).toFixed(3)),
      blend: "soft-light",
    },
    fabric: {
      opacity: Number((fabricBase * (level === "high" ? 1.05 : level === "low" ? 0.92 : 1)).toFixed(3)),
      blend: FABRIC_BLEND[safeTone],
    },
    edgesOpacity: Number((edgesBase * (level === "high" ? 1.05 : 1)).toFixed(3)),
    noise: Number(noiseBase.toFixed(3)),
    vignette: Number((vignetteBase * (level === "high" ? 1.1 : level === "low" ? 0.88 : 1)).toFixed(3)),
    highlightTop: safeTone === "light" ? 0.09 : safeTone === "dark" ? 0.07 : 0.08,
    highlightBottom: safeTone === "light" ? 0.05 : safeTone === "dark" ? 0.04 : 0.045,
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
