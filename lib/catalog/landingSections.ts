export const LANDING_PRODUCT_SECTION_CONFIG = [
  {
    key: "heroStripProductIds",
    label: "Hero traka",
    description: "Proizvodi u hero/landing traci.",
    limit: 8,
    placement: "hero",
    defaultOrder: 0,
    defaultTitle: "",
    defaultSubtitle: "",
    defaultCtaLabel: "",
    defaultCtaHref: "/web-shop",
  },
  {
    key: "highlightedProductIds",
    label: "Izdvojeni modeli",
    description: "Prva velika produkt sekcija.",
    limit: 8,
    placement: "grid",
    defaultOrder: 1,
    defaultTitle: "Izdvojeni Modeli",
    defaultSubtitle: "",
    defaultCtaLabel: "Pogledaj sve",
    defaultCtaHref: "/web-shop",
  },
  {
    key: "popularProductIds",
    label: "Popularni proizvodi",
    description: "Sekcija popularnih proizvoda.",
    limit: 4,
    placement: "grid",
    defaultOrder: 2,
    defaultTitle: "Popularni Proizvodi",
    defaultSubtitle: "",
    defaultCtaLabel: "Pogledaj sve",
    defaultCtaHref: "/web-shop",
  },
  {
    key: "arrivalsProductIds",
    label: "Nova kolekcija",
    description: "Sekcija novih modela.",
    limit: 4,
    placement: "grid",
    defaultOrder: 3,
    defaultTitle: "Novi Modeli",
    defaultSubtitle: "",
    defaultCtaLabel: "",
    defaultCtaHref: "/web-shop",
  },
  {
    key: "saleProductIds",
    label: "Akcije na pocetnoj",
    description: "Ako je prazno, landing sam povlaci proizvode sa akcijskom cenom.",
    limit: 4,
    placement: "grid",
    defaultOrder: 4,
    defaultTitle: "Aktuelne Akcije",
    defaultSubtitle: "",
    defaultCtaLabel: "Pogledaj sve",
    defaultCtaHref: "/akcije",
  },
  {
    key: "trendingProductIds",
    label: "Trendinzi",
    description: "Sekcija trendova i preporuka.",
    limit: 4,
    placement: "grid",
    defaultOrder: 5,
    defaultTitle: "Aktuelno Sada",
    defaultSubtitle: "",
    defaultCtaLabel: "",
    defaultCtaHref: "/web-shop",
  },
] as const;

export type LandingProductSectionKey = (typeof LANDING_PRODUCT_SECTION_CONFIG)[number]["key"];
export type LandingProductSectionPlacement = (typeof LANDING_PRODUCT_SECTION_CONFIG)[number]["placement"];

/** grid = klasicna mreza; carousel = horizontalni strip (manje ponavljanje na duzoj stranici) */
export type LandingProductLayout = "grid" | "carousel";

export type LandingProductSectionState = {
  key: LandingProductSectionKey;
  enabled: boolean;
  order: number;
  layout: LandingProductLayout;
};

export type LandingProductSectionContent = {
  key: LandingProductSectionKey;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

export type LandingCustomSection = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  enabled: boolean;
  order: number;
  layout: LandingProductLayout;
  productIds: number[];
};

const configByKey = new Map(
  LANDING_PRODUCT_SECTION_CONFIG.map((section) => [section.key, section] as const),
);

const parseProductLayout = (value: unknown, fallback: LandingProductLayout): LandingProductLayout => {
  if (value == null) return fallback;
  const token = String(value).toLowerCase().trim();
  if (token === "carousel") return "carousel";
  return "grid";
};

export const DEFAULT_LANDING_PRODUCT_SECTIONS: LandingProductSectionState[] =
  LANDING_PRODUCT_SECTION_CONFIG.map((section) => ({
    key: section.key,
    enabled: true,
    order: section.defaultOrder,
    layout: "grid",
  }));

export const DEFAULT_LANDING_PRODUCT_SECTION_CONTENT: LandingProductSectionContent[] =
  LANDING_PRODUCT_SECTION_CONFIG.map((section) => ({
    key: section.key,
    title: section.defaultTitle,
    subtitle: section.defaultSubtitle,
    ctaLabel: section.defaultCtaLabel,
    ctaHref: section.defaultCtaHref,
  }));

export const getLandingProductSectionConfig = (key: LandingProductSectionKey) => configByKey.get(key);

export const normalizeLandingProductSections = (value: unknown): LandingProductSectionState[] => {
  const merged = new Map<LandingProductSectionKey, LandingProductSectionState>(
    DEFAULT_LANDING_PRODUCT_SECTIONS.map((section) => [section.key, { ...section }]),
  );

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const key = row.key;
      if (typeof key !== "string" || !configByKey.has(key as LandingProductSectionKey)) continue;
      const defaults = merged.get(key as LandingProductSectionKey);
      if (!defaults) continue;
      const parsedOrder = Number(row.order);
      merged.set(key as LandingProductSectionKey, {
        key: key as LandingProductSectionKey,
        enabled: row.enabled == null ? defaults.enabled : Boolean(row.enabled),
        order: Number.isFinite(parsedOrder) ? Math.max(0, Math.floor(parsedOrder)) : defaults.order,
        layout: parseProductLayout(row.layout, defaults.layout),
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    const leftDefault = configByKey.get(left.key)?.defaultOrder ?? 0;
    const rightDefault = configByKey.get(right.key)?.defaultOrder ?? 0;
    return leftDefault - rightDefault;
  });
};

export const buildLandingProductSectionMap = (value: unknown) =>
  new Map(
    normalizeLandingProductSections(value).map((section) => [section.key, section] as const),
  );

export const normalizeLandingProductSectionContent = (value: unknown): LandingProductSectionContent[] => {
  const merged = new Map<LandingProductSectionKey, LandingProductSectionContent>(
    DEFAULT_LANDING_PRODUCT_SECTION_CONTENT.map((section) => [section.key, { ...section }]),
  );

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const key = row.key;
      if (typeof key !== "string" || !configByKey.has(key as LandingProductSectionKey)) continue;
      const defaults = merged.get(key as LandingProductSectionKey);
      if (!defaults) continue;
      merged.set(key as LandingProductSectionKey, {
        key: key as LandingProductSectionKey,
        title: String(row.title ?? defaults.title).trim() || defaults.title,
        subtitle: String(row.subtitle ?? defaults.subtitle).trim(),
        ctaLabel: String(row.ctaLabel ?? defaults.ctaLabel).trim(),
        ctaHref: String(row.ctaHref ?? defaults.ctaHref).trim() || defaults.ctaHref,
      });
    }
  }

  return LANDING_PRODUCT_SECTION_CONFIG.map((section) => merged.get(section.key) || {
    key: section.key,
    title: section.defaultTitle,
    subtitle: section.defaultSubtitle,
    ctaLabel: section.defaultCtaLabel,
    ctaHref: section.defaultCtaHref,
  });
};

export const buildLandingProductSectionContentMap = (value: unknown) =>
  new Map(
    normalizeLandingProductSectionContent(value).map((section) => [section.key, section] as const),
  );

const normalizeLegacyIdList = (value: unknown, max = 12): number[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

  const unique = new Set<number>();
  for (const raw of source) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    unique.add(Math.floor(id));
    if (unique.size >= max) break;
  }
  return Array.from(unique);
};

export const normalizeLandingCustomSections = (value: unknown, maxSections = 12): LandingCustomSection[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || `custom-section-${index + 1}`).trim() || `custom-section-${index + 1}`;
      const title = String(row.title || "").trim();
      const subtitle = String(row.subtitle || "").trim();
      const ctaLabel = String(row.ctaLabel || "Pogledaj sve").trim() || "Pogledaj sve";
      const ctaHref = String(row.ctaHref || "/web-shop").trim() || "/web-shop";
      const enabled = row.enabled == null ? true : Boolean(row.enabled);
      const parsedOrder = Number(row.order);
      const defaultOrder =
        LANDING_PRODUCT_SECTION_CONFIG.filter((section) => section.placement === "grid").length + index + 1;
      const order = Number.isFinite(parsedOrder) ? Math.max(1, Math.floor(parsedOrder)) : defaultOrder;
      const layout = parseProductLayout(row.layout, "grid");
      const productIds = normalizeLegacyIdList(row.productIds, 12);
      return { id, title, subtitle, ctaLabel, ctaHref, enabled, order, layout, productIds };
    })
    .filter((section): section is LandingCustomSection => Boolean(section))
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.title.localeCompare(right.title);
    })
    .slice(0, maxSections);
};
