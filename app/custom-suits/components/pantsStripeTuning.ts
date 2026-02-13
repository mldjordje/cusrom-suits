import { PANTS_STRIPE_MANUAL_TUNING } from "./pantsStripeManualTuning.ts";

const manual = PANTS_STRIPE_MANUAL_TUNING;

export const PANTS_STRIPE_TUNING = {
  // Absolute rotations for pants split zones (ignore tile base orientation).
  // These follow the red-line direction reference:
  // - left leg: stronger diagonal
  // - right upper: almost horizontal
  // - right lower: mild diagonal
  // - waistband: vertical
  diagAbsDeg: manual.directions.singleLeftAbsDeg,
  flyAbsDeg: manual.directions.singleFlyAbsDeg,
  rightLowerAbsDeg: manual.directions.singleRightAbsDeg,
  waistAbsDeg: manual.directions.waistAbsDeg,

  zone: {
    // Zoned texture is accepted only when masks cover the union silhouette.
    coverageMinRatio: 0.96,
    primaryCoverageMinRatio: 0.96,
    minPixelThreshold: 50,
    enablePrimarySplit: false,
    texturedOverlayOpacityMul: 0.78,
    texturedOverlayBrightenMul: 0.92,
    leftMainAbsDeg: manual.directions.leftMainAbsDeg,
    rightUpperAbsDeg: manual.directions.rightUpperAbsDeg,
    rightLowerAbsDeg: manual.directions.rightLowerAbsDeg,
    waistAbsDeg: manual.directions.waistAbsDeg,
    // Lower-right zone starts around the lower-middle area and slopes down to the right.
    rightLowerStartYRatio: manual.boundaries.rightLowerStartYRatio,
    rightLowerSlopeRatio: manual.boundaries.rightLowerSlopeRatio,
    // Keep right zone from swallowing the whole pants area.
    boundaryMinXRatio: manual.boundaries.boundaryMinXRatio,
    boundaryMaxXRatio: manual.boundaries.boundaryMaxXRatio,
  },

  deterministic: {
    // Deterministic stripe zoning (used for stripe fabrics).
    coverageMinRatio: 0.96,
    waistXRatio: manual.boundaries.waistXRatio,
    boundaryTopXRatio: manual.boundaries.boundaryTopXRatio,
    boundaryBottomXRatio: manual.boundaries.boundaryBottomXRatio,
    rightLowerStartYRatio: manual.boundaries.rightLowerStartYRatio,
    rightLowerSlopeRatio: manual.boundaries.rightLowerSlopeRatio,
    // Extra belt strip on the far right (vertical lines).
    beltStartXRatio: manual.boundaries.beltStartXRatio,
    beltTopYRatio: manual.boundaries.beltTopYRatio,
    beltBottomYRatio: manual.boundaries.beltBottomYRatio,
    // Softens visual seam between stripe zones.
    boundaryFeatherPx: manual.boundaries.boundaryFeatherPx,
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

  // Keep split neutral to avoid breaking stripe continuity.
  rightSplitRatio: 98 / 254,

  // Gentle X push for continuity on the right.
  rightForceXRatio: 0.975,
  boundaryPadPx: 10,
  boundarySmoothPx: 4,
  waistbandXRatio: 0.94,
  waistMaskXRatio: 0.94,
  boundaryClampMinYRatio: 0.35,
  boundaryClampPadPx: 2,
  boundaryBiasTopPx: 24,
  boundaryBiasBottomPx: -14,

  // Must stay low to preserve zone separation.
  stripeRotationMinStrength: 0.02,
};
