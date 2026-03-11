export type JacketStripeBoundaries = {
  topYRatio: number;
  bottomYRatio: number;
  innerTopXRatio: number;
  innerBottomXRatio: number;
  outerTopXRatio: number;
  outerBottomXRatio: number;
  featherPx: number;
  minLapelPixels: number;
};

export type JacketStripeAngles = {
  bodyAbsDeg: number;
  lapelLeftAbsDeg: number;
  lapelRightAbsDeg: number;
};

export type JacketStripeTuning = {
  boundaries: JacketStripeBoundaries;
  angles: JacketStripeAngles;
};

const BASE_BOUNDARIES: JacketStripeBoundaries = {
  topYRatio: 0.04,
  bottomYRatio: 0.48,
  innerTopXRatio: 0.03,
  innerBottomXRatio: 0.1,
  outerTopXRatio: 0.34,
  outerBottomXRatio: 0.24,
  featherPx: 0.85,
  minLapelPixels: 700,
};

const ANGLES_BY_LAPEL: Record<string, Record<string, JacketStripeAngles>> = {
  notch: {
    narrow: { bodyAbsDeg: 0, lapelLeftAbsDeg: -10, lapelRightAbsDeg: 10 },
    medium: { bodyAbsDeg: 0, lapelLeftAbsDeg: -8, lapelRightAbsDeg: 8 },
    wide: { bodyAbsDeg: 0, lapelLeftAbsDeg: -6, lapelRightAbsDeg: 6 },
  },
  peak: {
    narrow: { bodyAbsDeg: 0, lapelLeftAbsDeg: -12, lapelRightAbsDeg: 12 },
    medium: { bodyAbsDeg: 0, lapelLeftAbsDeg: -10, lapelRightAbsDeg: 10 },
    wide: { bodyAbsDeg: 0, lapelLeftAbsDeg: -8, lapelRightAbsDeg: 8 },
  },
};

const normalizeLapelType = (value: string | undefined) => {
  const token = String(value || "").trim().toLowerCase();
  if (token === "peak") return "peak";
  return "notch";
};

const normalizeLapelWidth = (value: string | undefined) => {
  const token = String(value || "").trim().toLowerCase();
  if (token === "narrow" || token === "wide") return token;
  return "medium";
};

export const getJacketStripeTuning = (
  lapelType?: string,
  lapelWidth?: string
): JacketStripeTuning => {
  const type = normalizeLapelType(lapelType);
  const width = normalizeLapelWidth(lapelWidth);
  const fallbackAngles = ANGLES_BY_LAPEL.notch.medium;
  const angles = ANGLES_BY_LAPEL[type]?.[width] ?? fallbackAngles;
  return {
    boundaries: BASE_BOUNDARIES,
    angles,
  };
};
