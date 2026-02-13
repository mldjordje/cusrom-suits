import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTextureFilterWithParity,
  getParityPreset,
  isParityModeEnabled,
  PARITY_MODE_HOCKERTY_WITHOUT_MODEL,
} from "../app/custom-suits/utils/parity.ts";

test("parity mode matcher accepts exact mode value", () => {
  assert.equal(isParityModeEnabled(PARITY_MODE_HOCKERTY_WITHOUT_MODEL), true);
  assert.equal(isParityModeEnabled("disabled"), false);
});

test("preset resolver returns blue preset for blue-like fabric", () => {
  const preset = getParityPreset({
    id: "blue",
    name: "Plava pinstripe vuna",
    code: "BL-22",
  });
  assert.equal(preset?.key, "blue");
});

test("preset resolver returns brown preset for brown-like fabric", () => {
  const preset = getParityPreset({
    id: "2219",
    name: "Dark Brown pinstripe wool",
  });
  assert.equal(preset?.key, "brown");
});

test("preset resolver returns null for non-target fabric", () => {
  const preset = getParityPreset({
    id: "cream",
    name: "Krem vunena tkanina",
  });
  assert.equal(preset, null);
});

test("texture filter builder clamps brightness/contrast/saturate ranges", () => {
  const filter = buildTextureFilterWithParity({
    baseFilter: "grayscale(1)",
    brightness: 9,
    contrast: 0.1,
    saturate: 4,
  });
  assert.match(filter, /brightness\(2\.40\)/);
  assert.match(filter, /contrast\(0\.90\)/);
  assert.match(filter, /saturate\(1\.30\)/);
});

