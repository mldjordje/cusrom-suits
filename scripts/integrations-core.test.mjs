import test from "node:test";
import assert from "node:assert/strict";
import { parseLegacyCsv, toLegacyCsv } from "../lib/integrations/core/csv.ts";
import { createPayloadHash } from "../lib/integrations/core/hash.ts";

test("legacy csv parser handles quoted fields and decimals", () => {
  const source = `"1","M. Kosulja","109211","M. Kosulja C23A/2","S","2,0000","011155882","1990,0000","1658,3333","20,0000"\r\n`;
  const rows = parseLegacyCsv(source);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], 1);
  assert.equal(rows[0][2], 109211);
  assert.equal(rows[0][5], 2);
  assert.equal(rows[0][7], 1990);
  assert.equal(rows[0][8], 1658.3333);
});

test("legacy csv serializer round-trips basic values", () => {
  const rows = [
    [1, "abc", "with,comma", '"quoted"'],
    [2, "x", "", null],
  ];
  const csv = toLegacyCsv(rows);
  const parsed = parseLegacyCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0][0], 1);
  assert.equal(parsed[0][2], "with,comma");
  assert.equal(parsed[0][3], '"quoted"');
});

test("payload hash is stable regardless of key order", () => {
  const a = { b: 2, a: 1, deep: { z: 2, k: 9 } };
  const b = { deep: { k: 9, z: 2 }, a: 1, b: 2 };
  assert.equal(createPayloadHash(a), createPayloadHash(b));
});

