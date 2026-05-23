// Manual knobs for pants stripe zoning.
// Edit only this file while you tune boundaries and stripe direction.

export type ManualOffset = { x: number; y: number };

export const PANTS_STRIPE_MANUAL_TUNING = {
  directions: {
    // Single-split fallback angles (used when deterministic zone masks are not available).
    // Left leg folds at ~55° diagonal; right body stripes near-vertical.
    singleLeftAbsDeg: -55,
    singleFlyAbsDeg: -88,
    singleRightAbsDeg: -70,

    // Deterministic zone directions.
    // leftMain  = left-leg diagonal fold (folded at ~55° from horizontal)
    // rightUpper = centre / fly area (near-vertical, slight tilt right)
    // rightLower = lower-right fold (steeper diagonal toward bottom crease)
    // waist      = horizontal waistband strip on far right
    leftMainAbsDeg: -55,
    rightUpperAbsDeg: -88,
    rightLowerAbsDeg: -68,
    waistAbsDeg: 0,
  },

  boundaries: {
    // Main boundary between left-main and right-upper zones.
    // Moved slightly right so the left leg zone captures the full diagonal fold.
    boundaryTopXRatio: 0.34,
    boundaryBottomXRatio: 0.47,

    // Right-lower split line controls.
    rightLowerStartYRatio: 0.48,
    rightLowerSlopeRatio: 0.28,

    // Legacy/fallback clamps still used by split logic.
    boundaryMinXRatio: 0.28,
    boundaryMaxXRatio: 0.52,

    // Waist partition: narrow belt strip on far right.
    waistXRatio: 0.87,

    // Extra belt strip on far right.
    beltStartXRatio: 0.89,
    beltTopYRatio: 0.02,
    beltBottomYRatio: 0.98,

    // Feather to soften hard seams between masks.
    boundaryFeatherPx: 12,
  },

  offsets: {
    // Per-zone stripe phase nudge (pixels in tile space).
    leftMain: { x: 0, y: 0 } as ManualOffset,
    leftUnderlap: { x: 0, y: 0 } as ManualOffset,
    rightFly: { x: 0, y: 0 } as ManualOffset,
    rightUnder: { x: 0, y: 0 } as ManualOffset,
    waist: { x: 0, y: 0 } as ManualOffset,
  },
} as const;
