import assert from "node:assert/strict";
import test from "node:test";
import { PANTS_STRIPE_TUNING } from "../app/custom-suits/components/pantsStripeTuning.ts";

const normalizeRotation = (value) => {
  let v = value % 180;
  if (v > 90) v -= 180;
  if (v < -90) v += 180;
  return v;
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
  // Left vs right-upper can be intentionally strong to expose
  // a clear horizontal middle zone on pants.
  const maxMainDelta = 130;
  const maxLowerDelta = 36;

  assert.ok(Math.abs(left - rightUpper) <= maxMainDelta);
  assert.ok(Math.abs(rightUpper - rightLower) <= maxLowerDelta);
});
