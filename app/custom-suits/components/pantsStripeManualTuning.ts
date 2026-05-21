// Manual knobs for pants stripe zoning.
// Edit only this file while you tune boundaries and stripe direction.

export type ManualOffset = { x: number; y: number };

export const PANTS_STRIPE_MANUAL_TUNING = {
  directions: {
    // Single-split fallback angles (used when deterministic zone masks are not available).
    singleLeftAbsDeg: -62,
    singleFlyAbsDeg: -88,
    singleRightAbsDeg: -74,

    // Deterministic zone directions.
    // leftMain  = left-leg diagonal fold
    // rightUpper = centre / fly area (near-vertical to match how stripes read on folded fabric)
    // rightLower = lower-right fold (steeper diagonal)
    // waist      = waistband strip on far right
    leftMainAbsDeg: -62,
    rightUpperAbsDeg: -88,
    rightLowerAbsDeg: -74,
    waistAbsDeg: 0,
  },

  boundaries: {
    // Main boundary between left-main and right-upper zones.
    // 0 = far left, 1 = far right (within pants union bbox).
    boundaryTopXRatio: 0.31,
    boundaryBottomXRatio: 0.44,

    // Right-lower split line controls.
    rightLowerStartYRatio: 0.44,
    rightLowerSlopeRatio: 0.32,

    // Legacy/fallback clamps still used by split logic.
    boundaryMinXRatio: 0.26,
    boundaryMaxXRatio: 0.5,

    // Waist partition: slightly wider than original (0.94) so the belt strip
    // is more visible, but not so wide it swallows the body zone.
    waistXRatio: 0.88,

    // Extra belt strip on far right.
    beltStartXRatio: 0.90,
    beltTopYRatio: 0.02,
    beltBottomYRatio: 0.98,

    // Feather to soften hard seams between masks.
    boundaryFeatherPx: 10,
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
