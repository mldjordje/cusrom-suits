import { PANTS_STRIPE_MANUAL_TUNING } from "./pantsStripeManualTuning.ts";

export type PantsStripePhaseBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const manual = PANTS_STRIPE_MANUAL_TUNING;

export const PANTS_STRIPE_TUNING = {
  // Absolute rotations for pants split zones (ignore tile base orientation).
  // These stay global across all stripe fabrics to match the visual reference.
  diagAbsDeg: manual.directions.singleLeftAbsDeg,
  flyAbsDeg: manual.directions.singleFlyAbsDeg,
  rightLowerAbsDeg: manual.directions.singleRightAbsDeg,
  waistAbsDeg: manual.directions.waistAbsDeg,

  zone: {
    coverageMinRatio: 0.985,
    primaryCoverageMinRatio: 0.985,
    minPixelThreshold: 50,
    enablePrimarySplit: true,
    texturedOverlayOpacityMul: 0.78,
    texturedOverlayBrightenMul: 0.92,
    leftMainAbsDeg: manual.directions.leftMainAbsDeg,
    rightUpperAbsDeg: manual.directions.rightUpperAbsDeg,
    rightLowerAbsDeg: manual.directions.rightLowerAbsDeg,
    waistAbsDeg: manual.directions.waistAbsDeg,
    rightLowerStartYRatio: manual.boundaries.rightLowerStartYRatio,
    rightLowerSlopeRatio: manual.boundaries.rightLowerSlopeRatio,
    boundaryMinXRatio: manual.boundaries.boundaryMinXRatio,
    boundaryMaxXRatio: manual.boundaries.boundaryMaxXRatio,
  },

  deterministic: {
    coverageMinRatio: 0.985,
    waistXRatio: manual.boundaries.waistXRatio,
    boundaryTopXRatio: manual.boundaries.boundaryTopXRatio,
    boundaryBottomXRatio: manual.boundaries.boundaryBottomXRatio,
    rightLowerStartYRatio: manual.boundaries.rightLowerStartYRatio,
    rightLowerSlopeRatio: manual.boundaries.rightLowerSlopeRatio,
    beltStartXRatio: manual.boundaries.beltStartXRatio,
    beltTopYRatio: manual.boundaries.beltTopYRatio,
    beltBottomYRatio: manual.boundaries.beltBottomYRatio,
    boundaryFeatherPx: manual.boundaries.boundaryFeatherPx,
    seamGuidanceWeight: 1,
    seamGuidanceBlendPx: 16,
    seamFallbackWeight: 0.2,
  },

  texture: {
    // Stripe fabrics that already include woven lines need a larger tile
    // to avoid noisy micro repetition on pants.
    wovenStripeTileScale: 1.55,
  },

  seam: {
    refWidth: 484,
    refHeight: 254,
    slope: 0.43496,
    intercept: 16.11,
    underBiasPx: 12,
    xPadPx: 2,
    minPadPx: 14,
    smoothPx: 5,
    sampleMaxJumpRatio: 0.12,
    diagonalMaxXRatio: 0.78,
    boundaryPadPx: 10,
    boundaryMaxPadPx: 14,
  },

  stripeOffsets: manual.offsets,
  rightSplitRatio: 98 / 254,
  rightForceXRatio: 0.975,
  boundaryPadPx: 10,
  boundarySmoothPx: 4,
  waistbandXRatio: 0.94,
  waistMaskXRatio: 0.94,
  boundaryClampMinYRatio: 0.35,
  boundaryClampPadPx: 2,
  boundaryBiasTopPx: 24,
  boundaryBiasBottomPx: -14,
  stripeRotationMinStrength: 0.02,
} as const;
