import type { SizeGuideTable } from "@/lib/catalog/sizeGuides";

export type SizeRecommenderMeasurements = {
  height: string;
  weight: string;
  chest: string;
  waist: string;
  sleeveLength: string;
  shoulderWidth: string;
};

/** Parses admin / storefront cells: decimals, optional ranges like "42-43" or "42 - 43". */
export function parseMeasurementCell(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const range = /^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)$/.exec(s.replace(/\s+/g, " "));
  if (range) {
    const a = Number(range[1].replace(",", "."));
    const b = Number(range[2].replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const normHeader = (h: string) => h.trim().toLowerCase();

function findChestIndex(headers: string[]): number {
  return headers.findIndex((header) => {
    const h = normHeader(header);
    if (/^b$/.test(h)) return false;
    return /grudi|chest/.test(h) || h === "c";
  });
}

function findWaistIndex(headers: string[]): number {
  return headers.findIndex((header) => {
    const h = normHeader(header);
    return /struk|waist|talia/.test(h) || h === "d";
  });
}

function findFootLengthIndex(headers: string[]): number {
  return headers.findIndex((header) => {
    const h = normHeader(header);
    return /gazist|foot|duzin|dužin|length/.test(h) && !/grudi|struk|ramen/.test(h);
  });
}

function findSizeColumnIndex(headers: string[]): number {
  const idx = headers.findIndex((header) => {
    const h = normHeader(header);
    return /velicin|size|broj|eur|us\b/.test(h);
  });
  return idx >= 0 ? idx : 0;
}

/**
 * Picks the closest matching size across all relevant tables (not only the first table).
 */
export function computeRecommendedSize(
  tables: SizeGuideTable[],
  measurements: SizeRecommenderMeasurements,
): string | null {
  const height = parseMeasurementCell(measurements.height);
  const chest = parseMeasurementCell(measurements.chest);
  const waist = parseMeasurementCell(measurements.waist);

  if (!chest && !waist && !height) return null;

  type Candidate = { score: number; signals: number; label: string; tableTitle: string };
  const candidates: Candidate[] = [];

  for (const table of tables) {
    const headers = table.headers;
    if (!headers.length) continue;

    const sizeIdx = findSizeColumnIndex(headers);
    const chestIdx = findChestIndex(headers);
    const waistIdx = findWaistIndex(headers);
    const footIdx = findFootLengthIndex(headers);
    const shoeLengthCol =
      table.group === "shoes"
        ? footIdx >= 0
          ? footIdx
          : headers.length >= 2
            ? 1
            : -1
        : -1;

    if (table.group === "shoes" && shoeLengthCol >= 0) {
      const userFoot = height ?? chest ?? waist;
      if (userFoot == null) continue;
      for (const row of table.rows) {
        const footCell = parseMeasurementCell(row.cells[shoeLengthCol] || "");
        if (footCell == null) continue;
        const score = Math.abs(footCell - userFoot);
        const label = row.cells[sizeIdx] || row.cells[0];
        if (!label) continue;
        candidates.push({ score, signals: 1, label: String(label).trim(), tableTitle: table.title });
      }
      continue;
    }

    for (const row of table.rows) {
      let score = 0;
      let signals = 0;

      if (chest != null && chestIdx >= 0) {
        const chestCell = parseMeasurementCell(row.cells[chestIdx] || "");
        if (chestCell != null) {
          score += Math.abs(chestCell - chest);
          signals += 1;
        }
      }

      if (waist != null && waistIdx >= 0) {
        const waistCell = parseMeasurementCell(row.cells[waistIdx] || "");
        if (waistCell != null) {
          score += Math.abs(waistCell - waist);
          signals += 1;
        }
      }

      if (signals === 0) continue;

      const label = row.cells[sizeIdx] || row.cells[0];
      if (!label) continue;

      candidates.push({
        score: score / signals,
        signals,
        label: String(label).trim(),
        tableTitle: table.title,
      });
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.score - b.score || b.signals - a.signals);
  const best = candidates[0];
  return `${best.label} (${best.tableTitle})`;
}
