import { describe, expect, it } from "vitest";
import {
  WASH_CARE_GROUPS,
  WASH_CARE_SYMBOLS,
  getLocalizedWashCareItems,
  parseWashCareSymbolKeys,
  validateWashCareSymbolKeys,
} from "@/lib/catalog/washCare";

describe("wash-care catalogue", () => {
  it("contains a complete consumer set with unique stable keys in all five groups", () => {
    const keys = WASH_CARE_SYMBOLS.map((symbol) => symbol.key);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(WASH_CARE_SYMBOLS.map((symbol) => symbol.group))).toEqual(
      new Set(["washing", "bleaching", "drying", "ironing", "professional"]),
    );
    expect(Object.keys(WASH_CARE_GROUPS)).toHaveLength(5);
  });

  it("provides Serbian and English names and descriptions for every symbol", () => {
    for (const symbol of WASH_CARE_SYMBOLS) {
      expect(symbol.sr.name.trim()).not.toBe("");
      expect(symbol.sr.description.trim()).not.toBe("");
      expect(symbol.en.name.trim()).not.toBe("");
      expect(symbol.en.description.trim()).not.toBe("");
    }
  });

  it("removes unknown and duplicate keys and returns catalogue order", () => {
    expect(parseWashCareSymbolKeys([
      "doNotIron",
      "unknown",
      "wash30",
      "doNotIron",
    ])).toEqual(["wash30", "doNotIron"]);
  });

  it("preserves an explicit empty selection", () => {
    expect(parseWashCareSymbolKeys([])).toEqual([]);
    expect(parseWashCareSymbolKeys(undefined)).toEqual([]);
  });

  it("strictly validates API submissions while accepting an explicit empty array", () => {
    expect(validateWashCareSymbolKeys([])).toEqual([]);
    expect(validateWashCareSymbolKeys(["wash30", "doNotIron"])).toEqual(["wash30", "doNotIron"]);
    expect(validateWashCareSymbolKeys(["wash30", "unknown"])).toBeNull();
    expect(validateWashCareSymbolKeys(null)).toBeNull();
  });

  it("localizes selected items without accepting unknown keys", () => {
    const items = getLocalizedWashCareItems(["wash30", "invalid", "doNotIron"], "sr");
    expect(items.map((item) => item.icon)).toEqual(["wash30", "doNotIron"]);
    expect(items.every((item) => item.title.length > 0 && item.description.length > 0)).toBe(true);
  });
});
