import test from "node:test";
import assert from "node:assert/strict";
import { parseLegacyCsv, toLegacyCsv } from "../lib/integrations/core/csv.ts";
import { createPayloadHash } from "../lib/integrations/core/hash.ts";
import { aggregateWarehouseRows } from "../lib/integrations/stock/warehouseAggregation.ts";

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

test("warehouse aggregation keeps unique product rows and sums stock correctly", () => {
  const aggregated = aggregateWarehouseRows(
    [
      { legacyId: 1001, warehouseId: 2, amount: 2, price: 1350, reservedAmount: 0, orderedAmount: 0 },
      { legacyId: 1001, warehouseId: 1, amount: 3, price: 1400, reservedAmount: 0, orderedAmount: 0 },
      { legacyId: 1001, warehouseId: 1, amount: 4, price: 1450, reservedAmount: 0, orderedAmount: 0 },
      { legacyId: 2002, warehouseId: 3, amount: 5, price: 0, reservedAmount: 0, orderedAmount: 0 },
      { legacyId: 2002, warehouseId: 5, amount: 1, price: 980, reservedAmount: 0, orderedAmount: 0 },
    ],
    1,
  );

  assert.equal(aggregated.length, 2);
  assert.equal(aggregated[0].legacyId, 1001);
  assert.equal(aggregated[0].stockWarehouse1, 7);
  assert.equal(aggregated[0].stockTotal, 9);
  assert.equal(aggregated[0].priceNet, 1450);
  assert.equal(aggregated[0].warehouseRows.length, 3);

  assert.equal(aggregated[1].legacyId, 2002);
  assert.equal(aggregated[1].stockWarehouse1, 0);
  assert.equal(aggregated[1].stockTotal, 6);
  assert.equal(aggregated[1].priceNet, 980);
  assert.equal(aggregated[1].warehouseRows.length, 2);
});
