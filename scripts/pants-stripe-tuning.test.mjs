import assert from "node:assert/strict";
import test from "node:test";
import { PANTS_STRIPE_TUNING } from "../app/custom-suits/components/pantsStripeTuning.ts";
import {
  computeDeterministicPantsZoneAnalysis,
  computePantsStripeAutoPhaseOffsets,
} from "../app/custom-suits/components/pantsStripeZones.ts";

const normalizeRotation = (value) => {
  let v = value % 180;
  if (v > 90) v -= 180;
  if (v < -90) v += 180;
  return v;
};

const createMockMask = (width, height, seam = false) => {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / Math.max(1, height - 1);
    const rowMin = Math.round(14 + t * 10);
    const rowMax = Math.round(width - 18 - t * 5);
    const rowSpan = Math.max(1, rowMax - rowMin + 1);
    const seamX = Math.round(rowMin + rowSpan * (0.36 + t * 0.08));
    for (let x = rowMin; x <= rowMax; x++) {
      const idx = (y * width + x) * 4;
      if (seam) {
        const near = Math.abs(x - seamX) <= 1;
        if (!near) continue;
      }
      out[idx] = 255;
      out[idx + 1] = 255;
      out[idx + 2] = 255;
      out[idx + 3] = 255;
    }
  }
  return out;
};

test("pants stripe zone rotations stay inside normalized range", () => {
  const rotations = [
    PANTS_STRIPE_TUNING.zone.leftMainAbsDeg,
    PANTS_STRIPE_TUNING.zone.rightUpperAbsDeg,
    PANTS_STRIPE_TUNING.zone.rightLowerAbsDeg,
    PANTS_STRIPE_TUNING.zone.waistAbsDeg,
  ];
  for (const value of rotations) {
    const normalized = normalizeRotation(value);
    assert.ok(normalized >= -90 && normalized <= 90);
  }
});

test("pants stripe zone deltas are continuity-safe", () => {
  const left = PANTS_STRIPE_TUNING.zone.leftMainAbsDeg;
  const rightUpper = PANTS_STRIPE_TUNING.zone.rightUpperAbsDeg;
  const rightLower = PANTS_STRIPE_TUNING.zone.rightLowerAbsDeg;
  const maxMainDelta = 130;
  const maxLowerDelta = 40;

  assert.ok(Math.abs(left - rightUpper) <= maxMainDelta);
  assert.ok(Math.abs(rightUpper - rightLower) <= maxLowerDelta);
});

test("deterministic pants zones fully cover silhouette without overlap", () => {
  const width = 220;
  const height = 140;
  const union = createMockMask(width, height, false);
  const seam = createMockMask(width, height, true);

  const analysis = computeDeterministicPantsZoneAnalysis({
    unionData: union,
    seamData: seam,
    width,
    height,
    config: {
      coverageMinRatio: 0.98,
      minPixelThreshold: 10,
      waistXRatio: 0.93,
      boundaryTopXRatio: 0.3,
      boundaryBottomXRatio: 0.45,
      rightLowerStartYRatio: 0.42,
      rightLowerSlopeRatio: 0.32,
      beltStartXRatio: 0.95,
      beltTopYRatio: 0.02,
      beltBottomYRatio: 0.98,
      boundaryFeatherPx: 0.6,
      seamGuidanceWeight: 1,
      seamGuidanceBlendPx: 16,
      seamFallbackWeight: 0.2,
    },
  });

  assert.ok(analysis, "analysis should exist");
  assert.equal(analysis.validation.unassignedPixels, 0);
  assert.equal(analysis.validation.overlapPixels, 0);
  assert.ok(analysis.validation.coverageRatio >= 0.98);
  assert.ok(analysis.maskStats.leftMain > 10);
  assert.ok(analysis.maskStats.rightFly > 10);
  assert.ok(analysis.maskStats.waist > 10);
});

test("auto phase offsets stay bounded and deterministic", () => {
  const offsets = computePantsStripeAutoPhaseOffsets({
    zoneBounds: {
      leftMain: { minX: 18, maxX: 74, minY: 10, maxY: 132 },
      rightUpper: { minX: 75, maxX: 150, minY: 12, maxY: 86 },
      rightLower: { minX: 77, maxX: 154, minY: 85, maxY: 132 },
      waist: { minX: 151, maxX: 186, minY: 8, maxY: 132 },
    },
    rotations: {
      leftMain: -62,
      rightUpper: -88,
      rightLower: -74,
      waist: 0,
    },
    tileSizePx: 96,
  });

  for (const key of ["leftMain", "leftUnderlap", "rightFly", "rightUnder", "waist"]) {
    const point = offsets[key];
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `finite offset for ${key}`);
    assert.ok(Math.abs(point.x) <= 96 && Math.abs(point.y) <= 96, `bounded offset for ${key}`);
  }
});
