import {
  getLandingProductSectionConfig,
  normalizeLandingCustomSections,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductSectionKey,
  type LandingProductSectionState,
} from "@/lib/catalog/landingSections";

export const LANDING_FIXED_SECTION_CONFIG = [
  {
    key: "categoryTiles",
    label: "Kolekcije / kategorije",
    description: "Kartice kolekcija na pocetnoj strani.",
    defaultOrder: 1,
  },
  {
    key: "story",
    label: "Brand prica",
    description: "Tri editorial kartice ispod kolekcija.",
    defaultOrder: 2,
  },
  {
    key: "banners",
    label: "Dva promo banera",
    description: "Ready to Wear i Aktuelne akcije baneri.",
    defaultOrder: 8,
  },
  {
    key: "customSuits",
    label: "Odelo po meri",
    description: "Editorial banner za custom suits.",
    defaultOrder: 9,
  },
  {
    key: "aboutContact",
    label: "O nama i kontakt",
    description: "Informativni blok sa podacima za kontakt.",
    defaultOrder: 10,
  },
  {
    key: "customerInfo",
    label: "Informacije za kupce",
    description: "Prava potrosaca, uputstvo, PIB, MB i dokumenta.",
    defaultOrder: 11,
  },
  {
    key: "uniforms",
    label: "Poslovne uniforme",
    description: "Uniforme, slike i CTA ka stranici uniformi.",
    defaultOrder: 12,
  },
  {
    key: "blog",
    label: "Blog",
    description: "Najnoviji blog tekstovi.",
    defaultOrder: 13,
  },
] as const;

export type LandingFixedSectionKey = (typeof LANDING_FIXED_SECTION_CONFIG)[number]["key"];

export type LandingFixedSectionState = {
  key: LandingFixedSectionKey;
  enabled: boolean;
  order: number;
};

export type LandingPageOrderEntry =
  | { kind: "fixed"; key: LandingFixedSectionKey; order: number }
  | { kind: "builtin"; key: LandingProductSectionKey; order: number }
  | { kind: "custom"; id: string; order: number };

export type LandingPageOrderRef =
  | { kind: "fixed"; key: LandingFixedSectionKey }
  | { kind: "builtin"; key: LandingProductSectionKey }
  | { kind: "custom"; id: string };

const fixedConfigByKey = new Map(LANDING_FIXED_SECTION_CONFIG.map((section) => [section.key, section] as const));

export const DEFAULT_LANDING_FIXED_SECTIONS: LandingFixedSectionState[] =
  LANDING_FIXED_SECTION_CONFIG.map((section) => ({
    key: section.key,
    enabled: section.key !== "customSuits",
    order: section.defaultOrder,
  }));

export const getLandingFixedSectionConfig = (key: LandingFixedSectionKey) => fixedConfigByKey.get(key);

export function normalizeLandingFixedSections(value: unknown): LandingFixedSectionState[] {
  const merged = new Map<LandingFixedSectionKey, LandingFixedSectionState>(
    DEFAULT_LANDING_FIXED_SECTIONS.map((section) => [section.key, { ...section }]),
  );

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const key = row.key;
      if (typeof key !== "string" || !fixedConfigByKey.has(key as LandingFixedSectionKey)) continue;
      const defaults = merged.get(key as LandingFixedSectionKey);
      if (!defaults) continue;
      const parsedOrder = Number(row.order);
      merged.set(key as LandingFixedSectionKey, {
        key: key as LandingFixedSectionKey,
        enabled: row.enabled == null ? defaults.enabled : Boolean(row.enabled),
        order: Number.isFinite(parsedOrder) ? Math.max(1, Math.floor(parsedOrder)) : defaults.order,
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return (fixedConfigByKey.get(left.key)?.defaultOrder ?? 0) - (fixedConfigByKey.get(right.key)?.defaultOrder ?? 0);
  });
}

const productDefaultPageOrder = (key: LandingProductSectionKey) => {
  const config = getLandingProductSectionConfig(key);
  if (!config) return 20;
  if (key === "heroStripProductIds") return 3;
  return (config.defaultOrder ?? 0) + 3;
};

export function getOrderedLandingPageEntries(
  fixedSections: LandingFixedSectionState[],
  productSections: LandingProductSectionState[],
  customSections: LandingCustomSection[],
): LandingPageOrderEntry[] {
  const fixed = normalizeLandingFixedSections(fixedSections).map((section) => ({
    kind: "fixed" as const,
    key: section.key,
    order: section.order,
    defaultOrder: fixedConfigByKey.get(section.key)?.defaultOrder ?? 0,
  }));

  const builtins = normalizeLandingProductSections(productSections).map((section) => ({
    kind: "builtin" as const,
    key: section.key,
    order: section.order,
    defaultOrder: productDefaultPageOrder(section.key),
  }));

  const customs = normalizeLandingCustomSections(customSections).map((section, index) => ({
    kind: "custom" as const,
    id: section.id,
    order: section.order,
    defaultOrder: 20 + index,
  }));

  return [...fixed, ...builtins, ...customs]
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.defaultOrder - right.defaultOrder;
    })
    .map(({ defaultOrder: _defaultOrder, ...entry }) => entry);
}

export function applyLandingPageOrder(
  fixedSections: LandingFixedSectionState[],
  productSections: LandingProductSectionState[],
  customSections: LandingCustomSection[],
  orderedEntries: LandingPageOrderEntry[],
): {
  fixedSections: LandingFixedSectionState[];
  productSections: LandingProductSectionState[];
  customSections: LandingCustomSection[];
} {
  const fixedOrderMap = new Map<LandingFixedSectionKey, number>();
  const builtInOrderMap = new Map<LandingProductSectionKey, number>();
  const customOrderMap = new Map<string, number>();

  orderedEntries.forEach((entry, index) => {
    const order = index + 1;
    if (entry.kind === "fixed") fixedOrderMap.set(entry.key, order);
    if (entry.kind === "builtin") builtInOrderMap.set(entry.key, order);
    if (entry.kind === "custom") customOrderMap.set(entry.id, order);
  });

  return {
    fixedSections: normalizeLandingFixedSections(
      fixedSections.map((section) => ({ ...section, order: fixedOrderMap.get(section.key) ?? section.order })),
    ),
    productSections: normalizeLandingProductSections(
      productSections.map((section) => ({ ...section, order: builtInOrderMap.get(section.key) ?? section.order })),
    ),
    customSections: normalizeLandingCustomSections(
      customSections.map((section) => ({ ...section, order: customOrderMap.get(section.id) ?? section.order })),
    ),
  };
}
