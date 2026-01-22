export const PANTS_STRIPE_TUNING = {
  // Absolute rotations for pants split zones (ignore tile base orientation).
  diagAbsDeg: 55,
  flyAbsDeg: 0,
  waistAbsDeg: 90,

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
    underBiasPx: 12,
    xPadPx: 2,
    smoothPx: 5,
    sampleMaxJumpRatio: 0.12,
    diagonalMaxXRatio: 0.86,
    boundaryPadPx: 18,
    boundaryMaxPadPx: 22,
  },

  stripeOffsets: {
    leftMain: { x: 0, y: 0 },
    leftUnderlap: { x: 0, y: 0 },
    rightFly: { x: 0, y: 0 },
    rightUnder: { x: 0, y: 0 },
    waist: { x: 0, y: 0 },
  },

  // Keep split neutral to avoid breaking stripe continuity.
  rightSplitRatio: 98 / 254,

  // Gentle X push for continuity on the right.
  rightForceXRatio: 0.975,
  boundaryPadPx: 28,
  boundarySmoothPx: 6,
  waistbandXRatio: 0.94,
  waistMaskXRatio: 0.965,

  // Must stay low to preserve zone separation.
  stripeRotationMinStrength: 0.02,
};
