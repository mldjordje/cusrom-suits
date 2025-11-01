import { SuitModel } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";

export type PriceResult = { total: number; items: { label: string; price: number }[] };

// Simple pricing tables without changing data structures
const basePrices: Record<string, number> = {
  single_1btn: 300,
  double_4btn: 350,
};

export function computePrice(config: SuitState, suits: SuitModel[]): PriceResult {
  const items: { label: string; price: number }[] = [];
  const model = suits.find((s) => s.id === config.styleId);
  if (!model) return { total: 0, items: [] };

  // Base
  const base = basePrices[model.id] ?? 300;
  items.push({ label: `Model ${model.name}`, price: base });

  // Lapel type + width
  if (config.lapelId) {
    const lapel = model.lapels.find((l) => l.id === config.lapelId);
    const width = lapel?.widths.find((w) => w.id === config.lapelWidthId);
    let lp = 0;
    if (lapel?.id === "peak") {
      // peak is premium
      lp += 10;
      if (width?.id === "medium") lp += 5;
      if (width?.id === "wide") lp += 10;
    } else if (lapel?.id === "notch") {
      if (width?.id === "wide") lp += 10;
    }
    if (lp) items.push({ label: `Lapel ${lapel?.name} ${width?.name ?? ""}`.trim(), price: lp });
  }

  // Pockets
  if (config.pocketId) {
    const p = model.pockets?.find((x) => x.id === config.pocketId);
    const pp = p?.id === "patched" ? 15 : 0;
    if (pp) items.push({ label: `Pockets ${p?.name}`, price: pp });
  }

  // Interiors (default to first if none selected)
  const activeInteriorId = config.interiorId ?? model.interiors?.[0]?.id;
  if (activeInteriorId) {
    const i = model.interiors?.find((x) => x.id === activeInteriorId);
    const ip = i?.id === "contrast" ? 25 : 0;
    if (ip) items.push({ label: `Interior ${i?.name}`, price: ip });
  }

  // Breast pocket
  if (config.breastPocketId) {
    const bp = model.breastPocket?.find((x) => x.id === config.breastPocketId);
    const bpp = bp?.id === "none" ? 0 : 0; // no extra charge by default
    if (bpp) items.push({ label: `Breast pocket ${bp?.name}`, price: bpp });
  }

  // Cuffs
  if (config.cuffId) {
    const c = model.cuffs?.find((x) => x.id === config.cuffId);
    const cp = c?.id === "cuffed" ? 10 : 0;
    if (cp) items.push({ label: `Cuffs ${c?.name}`, price: cp });
  }

  const total = items.reduce((s, x) => s + x.price, 0);
  return { total, items };
}

