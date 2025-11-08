export type Tone = "light" | "medium" | "dark";

export type ToneVisual = {
  softLightTop: number;
  softLightBottom: number;
  edgeGlow: number;
  specular: number;
  noise: number;
  vignette: number;
  fineDetail: number;
  fineDetailSleeve: number;
  detailScale: string;
};

export const NOISE_DATA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWMYefz/fwAI1QLS/7j4OQAAAABJRU5ErkJggg==";

export const toneBlend = (tone?: string) => {
  switch ((tone as Tone) || "medium") {
    case "dark":
      return { opacity: 1, filter: "brightness(1.04) contrast(1.2) saturate(1.12)" } as const;
    case "light":
      return { opacity: 1, filter: "brightness(1.06) contrast(1.1) saturate(1.08)" } as const;
    default:
      return { opacity: 1, filter: "brightness(1.05) contrast(1.14) saturate(1.1)" } as const;
  }
};

export const toneVisual = (tone?: string): ToneVisual => {
  if (tone === "dark")
    return {
      softLightTop: 0.08,
      softLightBottom: 0.07,
      edgeGlow: 0.055,
      specular: 0.18,
      noise: 0.16,
      vignette: 0.25,
      fineDetail: 0.06,
      fineDetailSleeve: 0.06,
      detailScale: "24%",
    };
  if (tone === "light")
    return {
      softLightTop: 0.06,
      softLightBottom: 0.05,
      edgeGlow: 0.04,
      specular: 0.13,
      noise: 0.12,
      vignette: 0.18,
      fineDetail: 0.07,
      fineDetailSleeve: 0.07,
      detailScale: "26%",
    };
  return {
    softLightTop: 0.07,
    softLightBottom: 0.06,
    edgeGlow: 0.05,
    specular: 0.16,
    noise: 0.15,
    vignette: 0.21,
    fineDetail: 0.08,
    fineDetailSleeve: 0.08,
    detailScale: "25%",
  };
};

export const getToneBaseColor = (tone?: string) => {
  const safe = (tone as Tone) || "medium";
  if (safe === "dark") return "#2b2b2b";
  if (safe === "light") return "#c8c8c8";
  return "#8f8f8f";
};
