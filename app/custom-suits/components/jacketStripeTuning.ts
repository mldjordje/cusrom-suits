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

// Notch lapel: rolls outward at a moderate fold angle.
// Wide notch lies flatter against the chest; narrow notch has a steeper fold.
const NOTCH_BOUNDARIES: JacketStripeBoundaries = {
  topYRatio: 0.03,
  bottomYRatio: 0.52,
  innerTopXRatio: 0.02,
  innerBottomXRatio: 0.09,
  outerTopXRatio: 0.38,
  outerBottomXRatio: 0.27,
  featherPx: 1.2,
  minLapelPixels: 600,
};

// Peak lapel: tip points upward — taller bounding box and wider outer extent.
// topYRatio smaller (zone starts near the very tip), outerTopXRatio larger.
const PEAK_BOUNDARIES: JacketStripeBoundaries = {
  topYRatio: 0.01,
  bottomYRatio: 0.54,
  innerTopXRatio: 0.01,
  innerBottomXRatio: 0.08,
  outerTopXRatio: 0.44,
  outerBottomXRatio: 0.30,
  featherPx: 1.4,
  minLapelPixels: 500,
};

// Stripe rotation angles per lapel type and width.
// bodyAbsDeg = 0 always (body stripes are vertical).
// lapelLeftAbsDeg < 0  → stripes tilt left on the left lapel (correct fold direction).
// lapelRightAbsDeg > 0 → stripes tilt right on the right lapel.
//
// Notch lapel: moderate fold, angle grows as width narrows.
// Peak lapel: steeper upward-pointing fold, larger angles throughout.
// Wide lapels lie flatter (smaller angle); narrow lapels fold more steeply (larger angle).
const ANGLES_BY_LAPEL: Record<string, Record<string, JacketStripeAngles>> = {
  notch: {
    narrow: { bodyAbsDeg: 0, lapelLeftAbsDeg: -34, lapelRightAbsDeg: 34 },
    medium: { bodyAbsDeg: 0, lapelLeftAbsDeg: -28, lapelRightAbsDeg: 28 },
    wide:   { bodyAbsDeg: 0, lapelLeftAbsDeg: -20, lapelRightAbsDeg: 20 },
  },
  peak: {
    narrow: { bodyAbsDeg: 0, lapelLeftAbsDeg: -42, lapelRightAbsDeg: 42 },
    medium: { bodyAbsDeg: 0, lapelLeftAbsDeg: -36, lapelRightAbsDeg: 36 },
    wide:   { bodyAbsDeg: 0, lapelLeftAbsDeg: -28, lapelRightAbsDeg: 28 },
  },
};

const BOUNDARIES_BY_TYPE: Record<string, JacketStripeBoundaries> = {
  notch: NOTCH_BOUNDARIES,
  peak: PEAK_BOUNDARIES,
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
  const boundaries = BOUNDARIES_BY_TYPE[type] ?? NOTCH_BOUNDARIES;
  return { boundaries, angles };
};
