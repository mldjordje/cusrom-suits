// Manual knobs for pants stripe zoning.
// Edit only this file while you tune boundaries and stripe direction.

export type ManualOffset = { x: number; y: number };

export const PANTS_STRIPE_MANUAL_TUNING = {
  directions: {
    // Single-split fallback angles (used when deterministic zone masks are not available).
    singleLeftAbsDeg: 6,
    singleFlyAbsDeg: 6,
    singleRightAbsDeg: 6,

    // Deterministic zone directions.
    // Negative = clockwise diagonal, 0 = native weave orientation.
    // Keep right side closer to horizontal but not too steep,
    // otherwise stripe contrast can visually collapse on dark fabrics.
    leftMainAbsDeg: 6,
    rightUpperAbsDeg: 6,
    rightLowerAbsDeg: 6,
    waistAbsDeg: 90,
  },

  boundaries: {
    // Main boundary between left-main and right-upper zones.
    // 0 = far left, 1 = far right (within pants union bbox).
    boundaryTopXRatio: 0.5,
    boundaryBottomXRatio: 0.53,

    // Right-lower split line controls.
    // Larger start means lower zone appears less often.
    rightLowerStartYRatio: 1.05,
    // Positive slope tilts the split down as X increases.
    rightLowerSlopeRatio: 0,

    // Legacy/fallback clamps still used by split logic.
    boundaryMinXRatio: 0.5,
    boundaryMaxXRatio: 0.59,

    // Waist partition start.
    waistXRatio: 1,

    // Extra belt strip on far right.
    beltStartXRatio: 0.985,
    beltTopYRatio: 0.02,
    beltBottomYRatio: 0.98,

    // Feather to soften hard seams between masks.
    boundaryFeatherPx: 0.9,
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
