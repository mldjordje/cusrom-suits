export type WarehouseCsvRow = {
  legacyId: number;
  warehouseId: number;
  amount: number;
  price: number;
  reservedAmount: number;
  orderedAmount: number;
};

export type AggregatedWarehouseRow = {
  legacyId: number;
  stockWarehouse1: number;
  stockTotal: number;
  priceNet: number;
  warehouseRows: WarehouseCsvRow[];
};

const toFiniteNumber = (value: number, fallback = 0) => {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
};

export function aggregateWarehouseRows(
  rows: WarehouseCsvRow[],
  primaryWarehouseId: number,
): AggregatedWarehouseRow[] {
  const grouped = new Map<number, AggregatedWarehouseRow>();

  for (const row of rows) {
    const current = grouped.get(row.legacyId) || {
      legacyId: row.legacyId,
      stockWarehouse1: 0,
      stockTotal: 0,
      priceNet: 0,
      warehouseRows: [],
    };

    const amount = toFiniteNumber(row.amount, 0);
    const price = toFiniteNumber(row.price, 0);
    current.stockTotal += amount;

    if (row.warehouseId === primaryWarehouseId) {
      current.stockWarehouse1 += amount;
      if (price > 0) {
        // Prefer the primary warehouse price if present.
        current.priceNet = price;
      }
    } else if (current.priceNet <= 0 && price > 0) {
      // Fallback price if primary row has no price.
      current.priceNet = price;
    }

    current.warehouseRows.push(row);
    grouped.set(row.legacyId, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.legacyId - b.legacyId);
}
