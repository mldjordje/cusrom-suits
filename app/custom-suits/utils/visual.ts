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
  ambientOcclusion: number;
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

const CONTRAST_OFFSET: Record<ContrastLevel, number> = {
  low: -0.05,
  medium: 0,
  high: 0.08,
};

export const toneBlend = (tone?: string, level: ContrastLevel = "medium") => {
  const safeTone = (tone as Tone) || "medium";
  const target = {
    light: { brightness: 1.05, contrast: 1.07, saturate: 1.1 },
    medium: { brightness: 1.05, contrast: 1.07, saturate: 1.1 },
    dark: { brightness: 1.03, contrast: 1.06, saturate: 1.05 },
  }[safeTone];
  const contrastAdj = CONTRAST_OFFSET[level];
  const brightnessAdj = level === "high" ? 0.02 : level === "low" ? -0.015 : 0;
  const saturateAdj = level === "high" ? 0.04 : level === "low" ? -0.02 : 0;
  return {
    filter: `brightness(${(target.brightness + brightnessAdj).toFixed(3)}) contrast(${(
      target.contrast + contrastAdj
    ).toFixed(3)}) saturate(${(target.saturate + saturateAdj).toFixed(3)})`,
  } as const;
};

export const getToneConfig = (tone?: string, level: ContrastLevel = "medium"): ToneVisual => {
  const safeTone = (tone as Tone) || "medium";
  const levelMul = LEVEL_MULTIPLIER[level];

  const fabricBase = { light: 0.34, medium: 0.32, dark: 0.3 }[safeTone];
  const shadingBase = { light: 0.6, medium: 0.55, dark: 0.5 }[safeTone];
  const specularBase = { light: 0.2, medium: 0.18, dark: 0.16 }[safeTone];
  const edgesBase = 0.29;
  const outlinesBase = 0.28;
  const noiseBase = 0.05;
  const vignetteBase = 0.08;
  const detailOpacityBase = { light: 0.13, medium: 0.12, dark: 0.11 }[safeTone];
  const detailScaleBase = { light: 0.2, medium: 0.22, dark: 0.24 }[safeTone];
  const weaveSharpnessBase = { light: 1.05, medium: 1, dark: 0.95 }[safeTone];
  const aoBase = 0.09;

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
    outlinesOpacity: Number((outlinesBase * (level === "high" ? 1.07 : 1)).toFixed(3)),
    noise: noiseBase,
    vignette: vignetteBase,
    highlightTop: safeTone === "light" ? 0.12 : safeTone === "dark" ? 0.07 : 0.09,
    highlightBottom: safeTone === "light" ? 0.06 : safeTone === "dark" ? 0.045 : 0.05,
    detailOpacity: Number((detailOpacityBase * (levelMul >= 1 ? levelMul : 1)).toFixed(3)),
    detailScale: detailScaleBase,
    weaveSharpness: weaveSharpnessBase,
    ambientOcclusion: aoBase,
  };
};

export const toneVisual = getToneConfig;

export const getToneBaseColor = (tone?: string) => {
  const safe = (tone as Tone) || "medium";
  if (safe === "dark") return "#2b2b2b";
  if (safe === "light") return "#c8c8c8";
  return "#8f8f8f";
};
