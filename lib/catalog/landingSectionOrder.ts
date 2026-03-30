import {
  getLandingProductSectionConfig,
  normalizeLandingCustomSections,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductSectionKey,
  type LandingProductSectionState,
} from "@/lib/catalog/landingSections";

export type LandingGridOrderEntry =
  | { kind: "builtin"; key: LandingProductSectionKey; order: number }
  | { kind: "custom"; id: string; order: number };

export type LandingGridOrderRef =
  | { kind: "builtin"; key: LandingProductSectionKey }
  | { kind: "custom"; id: string };

export function getOrderedGridEntries(
  productSections: LandingProductSectionState[],
  customSections: LandingCustomSection[],
): LandingGridOrderEntry[] {
  const builtins = normalizeLandingProductSections(productSections)
    .filter((section) => getLandingProductSectionConfig(section.key)?.placement === "grid")
    .map((section) => ({
      kind: "builtin" as const,
      key: section.key,
      order: section.order,
      defaultOrder: getLandingProductSectionConfig(section.key)?.defaultOrder ?? 0,
    }));

  const customs = normalizeLandingCustomSections(customSections).map((section, index) => ({
    kind: "custom" as const,
    id: section.id,
    order: section.order,
    defaultOrder: 100 + index,
  }));

  return [...builtins, ...customs]
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.defaultOrder - right.defaultOrder;
    })
    .map(({ defaultOrder: _d, ...entry }) => entry);
}

export function applyGridOrderToSections(
  productSections: LandingProductSectionState[],
  customSections: LandingCustomSection[],
  orderedEntries: LandingGridOrderEntry[],
): { productSections: LandingProductSectionState[]; customSections: LandingCustomSection[] } {
  const builtInOrderMap = new Map<LandingProductSectionKey, number>();
  const customOrderMap = new Map<string, number>();

  orderedEntries.forEach((entry, index) => {
    const order = index + 1;
    if (entry.kind === "builtin") {
      builtInOrderMap.set(entry.key, order);
      return;
    }
    customOrderMap.set(entry.id, order);
  });

  return {
    productSections: normalizeLandingProductSections(
      productSections.map((section) => {
        const placement = getLandingProductSectionConfig(section.key)?.placement;
        if (placement !== "grid") return section;
        return { ...section, order: builtInOrderMap.get(section.key) ?? section.order };
      }),
    ),
    customSections: normalizeLandingCustomSections(
      customSections.map((section) => ({
        ...section,
        order: customOrderMap.get(section.id) ?? section.order,
      })),
    ),
  };
}
