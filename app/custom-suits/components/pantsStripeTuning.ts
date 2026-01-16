export const PANTS_STRIPE_TUNING = {
  // Rotation deltas relative to the stripe tile base orientation.
  // Base orientation is computed from the tile and treated as "horizontal".
  // Assumes stripe tile base is vertical for pinstripes.
  // Deltas rotate the base to the desired visual directions.
  diagDeltaDeg: 46,
  flyDeltaDeg: 90,
  waistDeltaDeg: 0,

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
  },

  stripeOffsets: {
    leftMain: { x: 0, y: 0 },
    leftUnderlap: { x: 0, y: 24 },
    rightFly: { x: 0, y: 0 },
    rightUnder: { x: 0, y: 0 },
    waist: { x: 0, y: 0 },
  },

  // Keep split neutral to avoid breaking stripe continuity.
  rightSplitRatio: 98 / 254,

  // Gentle X push for continuity on the right.
  rightForceXRatio: 0.88,
  waistbandXRatio: 0.975,

  // Must stay low to preserve zone separation.
  stripeRotationMinStrength: 0.02,
};
