import { readJsonFile } from "@/lib/storage/jsonStore";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";
import {
  getCatalogProductCategoryLabel,
  getCatalogProductDisplayName,
  isCatalogProductNameSuspicious,
} from "@/lib/catalog/presentation";
import {
  PROMOTION_RULES_CACHE_TAG,
  applyPromotionRulesToProduct,
  applyPromotionRulesToProducts,
  listPromotionRules,
} from "@/lib/catalog/promotions";
import { unstable_cache } from "next/cache";

const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";

const DIACRITIC_MAP: Record<string, string> = {
  š: "s", Š: "s", č: "c", Č: "c", ć: "c", Ć: "c",
  ž: "z", Ž: "z", đ: "dj", Đ: "dj", dž: "dz", Dž: "dz",
};

const normalizeDiacritics = (str: string) =>
  str.replace(/[šŠčČćĆžŽđĐdžDž]/g, (ch) => DIACRITIC_MAP[ch] ?? ch);

type CatalogCategory = {
  id: number;
  name: string;
  path: string[];
};

export type CatalogProductView = {
  legacyId: number;
  sku: string;
  manufCode: string | null;
  ean: string | null;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  specification: string | null;
  specificationEn: string | null;
  priceGross: number;
  priceFinalGross: number;
  taxPercent: number;
  rebatePercent: number;
  stockWarehouse1: number;
  stockTotal: number;
  brand: string | null;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: number | null;
  categories: CatalogCategory[];
  coverImage: string | null;
  images: string[];
  hasDirectMedia: boolean;
  videoUrl: string | null;
  attributes: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
};

export type CatalogListResult = {
  items: CatalogProductView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: CatalogCategory[];
};

export type CatalogListInput = {
  query?: string;
  categoryId?: number;
  inStock?: boolean;
  onSale?: boolean;
  activeOnly?: boolean;
  exportOnly?: boolean;
  collapseBySku?: boolean;
  page?: number;
  pageSize?: number;
  applyPromotions?: boolean;
  priceMin?: number;
  priceMax?: number;
  sizes?: string[];
  requireImages?: boolean;
  requireDirectImages?: boolean;
  mediaStatus?: "all" | "missing" | "direct" | "fallback" | "video";
  contentStatus?: "all" | "missing_description" | "missing_price" | "missing_category";
  visibilityStatus?: "all" | "visible" | "hidden";
  sourceStatus?: "all" | "moffice" | "manual";
  sort?: "featured" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc" | "newest" | "oldest";
};

type CatalogSnapshotCacheEntry = {
  expiresAt: number;
  items: CatalogProductView[];
};

type CatalogListCacheEntry = {
  expiresAt: number;
  value: CatalogListResult;
  source: "supabase" | "file";
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const CATALOG_SNAPSHOT_TTL_MS = 300_000;
const CATALOG_LIST_TTL_MS = 45_000;
const CATALOG_LIST_CACHE_MAX_ENTRIES = 220;
const CATALOG_LIST_CACHE_VERSION = "v2";
const CATALOG_PERF_LOG_THRESHOLD_MS = Math.max(
  0,
  Number(process.env.CATALOG_PERF_LOG_THRESHOLD_MS || 350),
);
const CATALOG_DEBUG_PERF = process.env.CATALOG_DEBUG_PERF === "1";

const getCatalogSnapshotCache = () => {
  const globalWithCache = globalThis as typeof globalThis & {
    __catalogSnapshotCache?: Map<string, CatalogSnapshotCacheEntry>;
  };
  if (!globalWithCache.__catalogSnapshotCache) {
    globalWithCache.__catalogSnapshotCache = new Map<string, CatalogSnapshotCacheEntry>();
  }
  return globalWithCache.__catalogSnapshotCache;
};

const getCatalogListCache = () => {
  const globalWithCache = globalThis as typeof globalThis & {
    __catalogListCache?: Map<string, CatalogListCacheEntry>;
  };
  if (!globalWithCache.__catalogListCache) {
    globalWithCache.__catalogListCache = new Map<string, CatalogListCacheEntry>();
  }
  return globalWithCache.__catalogListCache;
};

const getCatalogCacheBypassUntil = () => {
  const globalWithCache = globalThis as typeof globalThis & {
    __catalogCacheBypassUntil?: number;
  };
  return globalWithCache.__catalogCacheBypassUntil || 0;
};

const setCatalogCacheBypassUntil = (value: number) => {
  const globalWithCache = globalThis as typeof globalThis & {
    __catalogCacheBypassUntil?: number;
  };
  globalWithCache.__catalogCacheBypassUntil = value;
};

export const invalidateCatalogCaches = (bypassMs = 60_000) => {
  getCatalogSnapshotCache().clear();
  getCatalogListCache().clear();
  setCatalogCacheBypassUntil(Date.now() + Math.max(1_000, bypassMs));
};

const makeCatalogListCacheKey = (input: {
  page: number;
  pageSize: number;
  query: string;
  categoryId: number;
  inStock: boolean;
  onSale: boolean;
  activeOnly: boolean;
  exportOnly: boolean;
  collapseBySku: boolean;
  applyPromotions: boolean;
  priceMin: number;
  priceMax: number;
  sizes: string[];
  requireImages: boolean;
  requireDirectImages: boolean;
  mediaStatus: string;
  contentStatus: string;
  visibilityStatus: string;
  sourceStatus: string;
  sort: string;
}) =>
  [
    CATALOG_LIST_CACHE_VERSION,
    input.page,
    input.pageSize,
    input.query.trim().toLowerCase(),
    input.categoryId,
    input.inStock ? 1 : 0,
    input.onSale ? 1 : 0,
    input.activeOnly ? 1 : 0,
    input.exportOnly ? 1 : 0,
    input.collapseBySku ? 1 : 0,
    input.applyPromotions ? 1 : 0,
    input.priceMin || 0,
    input.priceMax || 0,
    input.sizes.join(",").toUpperCase(),
    input.requireImages ? 1 : 0,
    input.requireDirectImages ? 1 : 0,
    input.mediaStatus,
    input.contentStatus,
    input.visibilityStatus,
    input.sourceStatus,
    input.sort,
  ].join("|");

const maybeLogCatalogPerformance = (payload: {
  source: "supabase" | "file";
  cache: "hit" | "miss";
  totalMs: number;
  loadMs: number;
  promoMs: number;
  filterMs: number;
  collapseMs: number;
  paginateMs: number;
  totalItems: number;
  filteredItems: number;
  pageItems: number;
  page: number;
  pageSize: number;
  query: string;
  categoryId: number;
  inStock: boolean;
  onSale: boolean;
}) => {
  if (!CATALOG_DEBUG_PERF && payload.totalMs < CATALOG_PERF_LOG_THRESHOLD_MS) {
    return;
  }
  console.info(
    `[catalog.perf] source=${payload.source} cache=${payload.cache} total=${payload.totalMs}ms load=${payload.loadMs}ms promotions=${payload.promoMs}ms filter=${payload.filterMs}ms collapse=${payload.collapseMs}ms paginate=${payload.paginateMs}ms items=${payload.pageItems}/${payload.filteredItems}/${payload.totalItems} page=${payload.page} size=${payload.pageSize} query="${payload.query}" category=${payload.categoryId} inStock=${payload.inStock ? 1 : 0} onSale=${payload.onSale ? 1 : 0}`,
  );
};

const listPromotionRulesCached = unstable_cache(
  async () => listPromotionRules(),
  ["catalog-promotion-rules-v1"],
  { revalidate: 60, tags: [PROMOTION_RULES_CACHE_TAG] },
);

const getAvailableStockValue = (item: Pick<CatalogProductView, "stockWarehouse1" | "stockTotal">) => {
  const total = Number(item.stockTotal || 0);
  const warehouse1 = Number(item.stockWarehouse1 || 0);
  return total > 0 ? total : warehouse1;
};

const getCatalogDiscountPercent = (
  item: Pick<CatalogProductView, "priceGross" | "priceFinalGross" | "rebatePercent">,
) => {
  const gross = Number(item.priceGross || 0);
  const finalGross = Number(item.priceFinalGross || 0);
  if (gross > 0 && finalGross >= 0 && gross > finalGross) {
    return Math.round(((gross - finalGross) / gross) * 100);
  }

  const rebatePercent = Math.round(Number(item.rebatePercent || 0));
  return rebatePercent > 0 ? rebatePercent : 0;
};

const hasCatalogDiscount = (
  item: Pick<CatalogProductView, "priceGross" | "priceFinalGross" | "rebatePercent">,
) => getCatalogDiscountPercent(item) > 0;

const parseCategories = (rawPayload: Record<string, unknown> | null | undefined): CatalogCategory[] => {
  const maybeCategories = rawPayload && Array.isArray(rawPayload.categories) ? rawPayload.categories : [];
  return maybeCategories
    .map((cat) => {
      if (!cat || typeof cat !== "object") return null;
      const row = cat as Record<string, unknown>;
      const id = Number(row.id);
      const name = String(row.name || "").trim();
      const path = Array.isArray(row.path)
        ? row.path.map((value) => String(value)).filter((value) => value.length > 0)
        : [];
      if (!Number.isFinite(id) || !name) return null;
      return { id, name, path };
    })
    .filter((cat): cat is CatalogCategory => Boolean(cat));
};

const compactRawPayload = (
  rawPayload: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  const source = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const compact: Record<string, unknown> = {};

  if (Array.isArray(source.categories)) compact.categories = source.categories;
  if (source.landing && typeof source.landing === "object") compact.landing = source.landing;
  if (source.attributes && typeof source.attributes === "object") compact.attributes = source.attributes;
  if (source.media && typeof source.media === "object") compact.media = source.media;
  if (source.productType) compact.productType = source.productType;
  if (source.source) compact.source = source.source;
  if (source.moffice && typeof source.moffice === "object") compact.moffice = source.moffice;
  if (source.syncSource) compact.syncSource = source.syncSource;
  if (source.imageFallback && typeof source.imageFallback === "object") {
    compact.imageFallback = source.imageFallback;
  }

  return compact;
};

const extractProductVideoUrl = (rawPayload: Record<string, unknown> | null | undefined) => {
  if (!rawPayload || typeof rawPayload !== "object") return null;

  const media =
    rawPayload.media && typeof rawPayload.media === "object"
      ? (rawPayload.media as Record<string, unknown>)
      : null;
  const mediaVideoUrl = String(media?.videoUrl || "").trim();
  if (mediaVideoUrl) return mediaVideoUrl;

  const directVideoUrl = String(rawPayload.videoUrl || "").trim();
  return directVideoUrl || null;
};

const normalizeCatalogRow = (
  row: Record<string, unknown>,
  imagesByProductId: Map<number, string[]>,
): CatalogProductView => {
  const legacyId = Number(row.legacy_id);
  const rawPayloadSource =
    row.raw_payload && typeof row.raw_payload === "object"
      ? (row.raw_payload as Record<string, unknown>)
      : {};
  const rawPayload = compactRawPayload(rawPayloadSource);
  const categories = parseCategories(rawPayload);
  const landing =
    rawPayload && typeof rawPayload.landing === "object"
      ? (rawPayload.landing as Record<string, unknown>)
      : {};
  const landingPriorityRaw = Number(landing.priority);
  const landingPriority = Number.isFinite(landingPriorityRaw) ? landingPriorityRaw : null;
  const images = imagesByProductId.get(legacyId) || [];
  const coverImage = images[0] || null;

  return {
    legacyId,
    sku: String(row.sku || ""),
    manufCode: row.manuf_code ? String(row.manuf_code) : null,
    ean: row.ean ? String(row.ean) : null,
    name: String(row.name_sr || row.sku || legacyId),
    nameEn: row.name_en ? String(row.name_en) : null,
    description: row.description_sr ? String(row.description_sr) : null,
    descriptionEn: row.description_en ? String(row.description_en) : null,
    specification: row.specification_sr ? String(row.specification_sr) : null,
    specificationEn: row.specification_en ? String(row.specification_en) : null,
    priceGross: Number(row.price_gross || 0),
    priceFinalGross: Number(row.price_final_gross || 0),
    taxPercent: Number(row.tax_percent || 0),
    rebatePercent: Number(row.rebate_percent || 0),
    stockWarehouse1: Number(row.stock_warehouse_1 || 0),
    stockTotal: Number(row.stock_total || 0),
    brand: row.brand ? String(row.brand) : null,
    isActive: Boolean(row.is_active),
    isExported: Boolean(row.is_exported),
    landingFeatured: Boolean(landing.featured),
    landingPriority,
    categories,
    coverImage,
    images,
    hasDirectMedia: images.length > 0,
    videoUrl: extractProductVideoUrl(rawPayload),
    attributes:
      rawPayload && typeof rawPayload.attributes === "object"
        ? (rawPayload.attributes as Record<string, unknown>)
        : {},
    rawPayload,
  };
};

const normalizeLegacyJson = (item: LegacyCatalogProduct): CatalogProductView => ({
  legacyId: Number(item.legacyId),
  sku: item.sku,
  manufCode: item.manufCode || null,
  ean: item.ean,
  name: item.names.sr || item.names.legacy || item.sku,
  nameEn: item.names.en || null,
  description: item.descriptions.sr || null,
  descriptionEn: item.descriptions.en || null,
  specification: item.specification.sr || null,
  specificationEn: item.specification.en || null,
  priceGross: Number(item.price.gross || 0),
  priceFinalGross: Number(item.price.finalGross || 0),
  taxPercent: Number(item.price.taxPercent || 0),
  rebatePercent: Number(item.price.rebatePercent || 0),
  stockWarehouse1: Number(item.stock.warehouse1 || 0),
  stockTotal: Number(item.stock.total || 0),
  brand: item.brand || null,
  isActive: String(item.status.active).toLowerCase() === "y",
  isExported: String(item.status.export).toLowerCase() === "y",
  landingFeatured: Boolean(item.raw?.landing?.featured),
  landingPriority: Number.isFinite(Number(item.raw?.landing?.priority))
    ? Number(item.raw?.landing?.priority)
    : null,
  categories: item.categories.map((cat) => ({
    id: Number(cat.id),
    name: String(cat.name),
    path: Array.isArray(cat.path) ? cat.path.map((v) => String(v)) : [],
  })),
  coverImage: item.coverImage,
  images: Array.isArray(item.images) ? item.images : [],
  hasDirectMedia: Array.isArray(item.images) && item.images.some((img) => String(img || "").trim().length > 0),
  videoUrl: extractProductVideoUrl(item.raw as Record<string, unknown>),
  attributes: item.attributes as unknown as Record<string, unknown>,
  rawPayload: compactRawPayload({
    categories: item.categories,
    attributes: item.attributes,
    landing: item.raw?.landing,
    media:
      item.raw && typeof item.raw.media === "object"
        ? item.raw.media
        : extractProductVideoUrl(item.raw as Record<string, unknown>)
          ? { videoUrl: extractProductVideoUrl(item.raw as Record<string, unknown>) }
          : undefined,
    productType: item.raw?.productType,
  }),
});

const normalizeSizeValue = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");

const applyFilters = (
  items: CatalogProductView[],
  input: Required<Pick<CatalogListInput, "query" | "categoryId" | "inStock" | "onSale" | "activeOnly" | "exportOnly">> & {
    priceMin?: number;
    priceMax?: number;
    sizes?: string[];
  },
) => {
  const query = input.query.trim().toLowerCase();
  let filtered = [...items];
  if (input.activeOnly) filtered = filtered.filter((item) => item.isActive);
  if (input.exportOnly) filtered = filtered.filter((item) => item.isExported);
  if (input.inStock) filtered = filtered.filter((item) => getAvailableStockValue(item) > 0);
  if (input.onSale) filtered = filtered.filter((item) => item.priceGross > item.priceFinalGross || item.rebatePercent > 0);
  if (input.categoryId > 0) {
    filtered = filtered.filter((item) => item.categories.some((cat) => cat.id === input.categoryId));
  }

  if (typeof input.priceMin === "number" && Number.isFinite(input.priceMin) && input.priceMin > 0) {
    const min = input.priceMin;
    filtered = filtered.filter((item) => Number(item.priceFinalGross) >= min);
  }
  if (typeof input.priceMax === "number" && Number.isFinite(input.priceMax) && input.priceMax > 0) {
    const max = input.priceMax;
    filtered = filtered.filter((item) => Number(item.priceFinalGross) <= max);
  }

  if (Array.isArray(input.sizes) && input.sizes.length > 0) {
    const wanted = new Set(input.sizes.map(normalizeSizeValue).filter(Boolean));
    if (wanted.size > 0) {
      filtered = filtered.filter((item) => {
        const raw = (item.attributes as Record<string, unknown> | null | undefined)?.size;
        const values = Array.isArray(raw) ? raw : [];
        return values.some((value) => wanted.has(normalizeSizeValue(value)));
      });
    }
  }

  if (query.length > 0) {
    const normalizedQuery = normalizeDiacritics(query);
    filtered = filtered.filter((item) => {
      const exactOrStartsWithCode =
        item.sku.toLowerCase() === query ||
        (item.manufCode || "").toLowerCase() === query ||
        (item.ean || "").toLowerCase() === query ||
        String(item.legacyId) === query ||
        item.sku.toLowerCase().startsWith(query) ||
        (item.manufCode || "").toLowerCase().startsWith(query) ||
        (item.ean || "").toLowerCase().startsWith(query);

      const haystack = [
        item.sku,
        item.manufCode || "",
        item.ean || "",
        String(item.legacyId),
        item.name,
        item.nameEn || "",
        item.brand || "",
        item.description || "",
      ]
        .join(" ")
        .toLowerCase();

      const normalizedHaystack = normalizeDiacritics(haystack);
      return exactOrStartsWithCode || haystack.includes(query) || normalizedHaystack.includes(normalizedQuery);
    });
  }
  return filtered;
};

const collectCategories = (items: CatalogProductView[]): CatalogCategory[] => {
  const map = new Map<number, CatalogCategory>();
  for (const item of items) {
    for (const cat of item.categories) {
      if (!map.has(cat.id)) map.set(cat.id, cat);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "sr"));
};

const applySkuImageFallbacks = (items: CatalogProductView[]): CatalogProductView[] => {
  const donorBySku = new Map<string, { coverImage: string; images: string[] }>();

  for (const item of items) {
    const skuKey = String(item.sku || "").trim().toLowerCase();
    if (!skuKey || donorBySku.has(skuKey)) continue;
    const imageList = Array.isArray(item.images) ? item.images.filter((img) => String(img || "").trim().length > 0) : [];
    const cover = item.coverImage || imageList[0] || null;
    if (!cover) continue;
    donorBySku.set(skuKey, {
      coverImage: cover,
      images: imageList.length > 0 ? imageList : [cover],
    });
  }

  return items.map((item) => {
    const hasCover = Boolean(item.coverImage && item.coverImage.trim().length > 0);
    const hasImages = Array.isArray(item.images) && item.images.some((img) => String(img || "").trim().length > 0);
    if (hasCover || hasImages) return item;

    const skuKey = String(item.sku || "").trim().toLowerCase();
    if (!skuKey) return item;
    const donor = donorBySku.get(skuKey);
    if (!donor) return item;

    return {
      ...item,
      coverImage: donor.coverImage,
      images: [...donor.images],
      hasDirectMedia: false,
      rawPayload: {
        ...item.rawPayload,
        imageFallback: {
          type: "sku",
          sku: item.sku,
        },
      },
    };
  });
};

const hasCatalogProductMedia = (
  item: Pick<CatalogProductView, "coverImage" | "images"> | null | undefined,
) =>
  Boolean(
    item &&
      ((item.coverImage && item.coverImage.trim().length > 0) ||
        (Array.isArray(item.images) &&
          item.images.some((img) => String(img || "").trim().length > 0))),
  );

const hasCatalogProductDirectMedia = (
  item: Pick<CatalogProductView, "coverImage" | "images" | "hasDirectMedia"> | null | undefined,
) => Boolean(item?.hasDirectMedia && hasCatalogProductMedia(item));

const getCatalogProductSource = (item: Pick<CatalogProductView, "rawPayload">) => {
  const raw = item.rawPayload || {};
  return String(raw.source || raw.syncSource || "").trim().toLowerCase();
};

const mergeCatalogProductMedia = (
  primary: CatalogProductView,
  fallback: CatalogProductView | null,
): CatalogProductView => {
  if (!fallback || hasCatalogProductMedia(primary)) {
    return primary;
  }

  return {
    ...primary,
    coverImage: fallback.coverImage || primary.coverImage,
    images: fallback.images.length > 0 ? [...fallback.images] : primary.images,
    hasDirectMedia: primary.hasDirectMedia || fallback.hasDirectMedia,
    videoUrl: primary.videoUrl || fallback.videoUrl,
    rawPayload: {
      ...primary.rawPayload,
      imageFallback: {
        type: "legacy-file",
        legacyId: primary.legacyId,
      },
    },
  };
};

/** Infer a stable product-type token from raw name + categories.
 *  Used only for the collapse key — must be consistent across all size
 *  variants of the same model regardless of whether cats[] is populated. */
const inferProductTypeToken = (name: string, categories: { name: string }[]): string => {
  const haystack = normalizeDiacritics([name, ...categories.map((c) => c.name)].join(" "))
    .toLowerCase();
  if (/kosulja|kosulj/.test(haystack)) return "kosulja";
  if (/pantalone/.test(haystack)) return "pantalone";
  if (/odelo/.test(haystack)) return "odelo";
  if (/\bsako\b/.test(haystack)) return "sako";
  if (/cipele|cipela|obuca/.test(haystack)) return "cipele";
  if (/kravata/.test(haystack)) return "kravata";
  if (/kais/.test(haystack)) return "kais";
  if (/kaput/.test(haystack)) return "kaput";
  if (/dzemper|dzemp/.test(haystack)) return "dzemper";
  if (/majica/.test(haystack)) return "majica";
  // fallback: use first category name if present
  const firstCat = categories[0]?.name;
  if (firstCat) return normalizeDiacritics(firstCat).toLowerCase().replace(/\s+/g, "_");
  return "collection";
};

const getCatalogProductModelKey = (item: CatalogProductView) => {
  const displayName = getCatalogProductDisplayName({
    name: item.name,
    sku: item.sku,
    manufCode: item.manufCode,
    categories: item.categories,
    brand: item.brand,
  });

  // Always derive type from raw name — never from getCatalogProductCategoryLabel
  // which returns inconsistent strings ("Košulje" vs "Kosulja") depending on
  // whether the cats[] array is populated.
  const typeToken = inferProductTypeToken(item.name || "", item.categories);

  const normalizedName = normalizeDiacritics(displayName)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[mzd]\.\s+/, "")
    .replace(/^(muska|muski|zenska|zenski|decija|deciji)\s+/, "")
    .replace(/^(kosulja|pantalone|odelo|sako|kaput|kais|cipele|kratke|majica|dzemper)\s+/i, "")
    .trim();

  if (!normalizedName) return `legacy:${item.legacyId}`;

  return `${typeToken}:${normalizedName}`;
};

const normalizeCatalogImageKey = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutQuery = raw.split(/[?#]/u)[0] || raw;
  const fileName = withoutQuery.split("/").filter(Boolean).pop() || withoutQuery;
  return fileName.trim().toLowerCase();
};

const getCatalogProductVisualModelKey = (item: CatalogProductView) => {
  const imageKey = normalizeCatalogImageKey(item.coverImage || item.images[0]);
  if (!imageKey) return "";

  const typeToken = inferProductTypeToken(item.name || "", item.categories);
  return `visual:${typeToken}:${imageKey}`;
};

const scoreCollapsedRepresentative = (item: CatalogProductView) => {
  const displayName = getCatalogProductDisplayName({
    name: item.name,
    sku: item.sku,
    manufCode: item.manufCode,
    categories: item.categories,
    brand: item.brand,
  });
  const categoryLabel = getCatalogProductCategoryLabel({
    name: item.name,
    sku: item.sku,
    manufCode: item.manufCode,
    categories: item.categories,
    brand: item.brand,
  });
  const stock = getAvailableStockValue(item);
  const discountPercent = getCatalogDiscountPercent(item);

  let score = 0;
  if (item.manufCode && item.manufCode.trim()) score += 24;
  if (displayName && !isCatalogProductNameSuspicious(displayName)) score += 26;
  if (displayName && displayName !== categoryLabel) score += 24;
  if (item.nameEn && item.nameEn.trim()) score += 8;
  if (item.categories.length > 0) score += 12;
  if (item.coverImage) score += 8;
  if (item.videoUrl) score += 10;
  if (item.brand) score += 4;
  if (stock > 0) score += Math.min(stock, 10);
  if (discountPercent > 0) score += 40 + Math.min(discountPercent, 35);

  return score;
};

const pickCollapsedRepresentative = (left: CatalogProductView, right: CatalogProductView) => {
  const leftScore = scoreCollapsedRepresentative(left);
  const rightScore = scoreCollapsedRepresentative(right);
  if (rightScore !== leftScore) {
    return rightScore > leftScore ? right : left;
  }
  return right.legacyId > left.legacyId ? right : left;
};

const pickCollapsedPricingLeader = (left: CatalogProductView, right: CatalogProductView) => {
  const leftDiscount = getCatalogDiscountPercent(left);
  const rightDiscount = getCatalogDiscountPercent(right);

  if (rightDiscount !== leftDiscount) {
    return rightDiscount > leftDiscount ? right : left;
  }

  if (left.priceFinalGross !== right.priceFinalGross) {
    return right.priceFinalGross < left.priceFinalGross ? right : left;
  }

  if (left.priceGross !== right.priceGross) {
    return right.priceGross > left.priceGross ? right : left;
  }

  if (hasCatalogDiscount(left) !== hasCatalogDiscount(right)) {
    return hasCatalogDiscount(right) ? right : left;
  }

  return pickCollapsedRepresentative(left, right);
};

const collapseCatalogProductsByKey = (
  items: CatalogProductView[],
  getKey: (item: CatalogProductView) => string,
): CatalogProductView[] => {
  const map = new Map<string, CatalogProductView>();

  for (const item of items) {
    const key = getKey(item) || `legacy:${item.legacyId}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        ...item,
        categories: [...item.categories],
        images: [...item.images],
        hasDirectMedia: item.hasDirectMedia,
        attributes: { ...item.attributes },
        rawPayload: { ...item.rawPayload, collapsedVariantIds: [item.legacyId] },
      });
      continue;
    }

    const categoriesById = new Map<number, CatalogCategory>();
    for (const cat of current.categories) categoriesById.set(cat.id, cat);
    for (const cat of item.categories) {
      if (!categoriesById.has(cat.id)) categoriesById.set(cat.id, cat);
    }

    const images = Array.from(new Set([...current.images, ...item.images].filter((img) => img.trim().length > 0)));

    const mergedAttributes: Record<string, unknown> = { ...current.attributes };
    for (const [attrKey, attrValue] of Object.entries(item.attributes || {})) {
      if (!Object.prototype.hasOwnProperty.call(mergedAttributes, attrKey)) {
        mergedAttributes[attrKey] = attrValue;
        continue;
      }
      const existingValue = mergedAttributes[attrKey];
      if (Array.isArray(existingValue) || Array.isArray(attrValue)) {
        const mergedList = Array.from(
          new Set([...(Array.isArray(existingValue) ? existingValue : [existingValue]), ...(Array.isArray(attrValue) ? attrValue : [attrValue])]),
        );
        mergedAttributes[attrKey] = mergedList;
      }
    }

    const collapsedVariantIds = new Set<number>([
      ...((current.rawPayload?.collapsedVariantIds as number[] | undefined) || [current.legacyId]),
      ...((item.rawPayload?.collapsedVariantIds as number[] | undefined) || [item.legacyId]),
    ]);
    const representative = pickCollapsedRepresentative(current, item);
    const pricingLeader = pickCollapsedPricingLeader(current, item);
    const mergedDiscountPercent = Math.max(
      getCatalogDiscountPercent(current),
      getCatalogDiscountPercent(item),
      getCatalogDiscountPercent(pricingLeader),
    );
    // Always display the highest final price across all collapsed variants
    const maxPriceVariant = current.priceFinalGross >= item.priceFinalGross ? current : item;

    map.set(key, {
      ...current,
      legacyId: representative.legacyId,
      ean: representative.ean || current.ean || item.ean,
      name: representative.name || current.name || item.name,
      nameEn: representative.nameEn || current.nameEn || item.nameEn,
      description: representative.description || current.description || item.description,
      descriptionEn: representative.descriptionEn || current.descriptionEn || item.descriptionEn,
      specification: representative.specification || current.specification || item.specification,
      specificationEn: representative.specificationEn || current.specificationEn || item.specificationEn,
      manufCode: representative.manufCode || current.manufCode || item.manufCode,
      brand: representative.brand || current.brand || item.brand,
      priceGross: maxPriceVariant.priceGross,
      priceFinalGross: maxPriceVariant.priceFinalGross,
      rebatePercent: mergedDiscountPercent,
      coverImage: representative.coverImage || current.coverImage || item.coverImage,
      videoUrl: representative.videoUrl || current.videoUrl || item.videoUrl,
      hasDirectMedia: current.hasDirectMedia || item.hasDirectMedia,
      isActive: current.isActive || item.isActive,
      isExported: current.isExported || item.isExported,
      landingFeatured: current.landingFeatured || item.landingFeatured,
      stockWarehouse1: current.stockWarehouse1 + item.stockWarehouse1,
      stockTotal: current.stockTotal + item.stockTotal,
      categories: Array.from(categoriesById.values()),
      images,
      attributes: mergedAttributes,
      rawPayload: {
        ...current.rawPayload,
        collapsedVariantIds: Array.from(collapsedVariantIds).sort((a, b) => a - b),
        collapsedVariantCount: collapsedVariantIds.size,
        collapsedRepresentativeLegacyId: representative.legacyId,
        collapsedPricingSourceLegacyId: pricingLeader.legacyId,
      },
    });
  }

  return Array.from(map.values());
};

const collapseCatalogProductsByModel = (items: CatalogProductView[]): CatalogProductView[] => {
  const modelCollapsed = collapseCatalogProductsByKey(items, getCatalogProductModelKey);
  return collapseCatalogProductsByKey(
    modelCollapsed,
    (item) => getCatalogProductVisualModelKey(item) || getCatalogProductModelKey(item),
  );
};

const applyAdminQualityFilters = (
  items: CatalogProductView[],
  input: Pick<CatalogListInput, "mediaStatus" | "contentStatus" | "visibilityStatus" | "sourceStatus">,
) => {
  let filtered = [...items];
  const mediaStatus = input.mediaStatus || "all";
  const contentStatus = input.contentStatus || "all";
  const visibilityStatus = input.visibilityStatus || "all";
  const sourceStatus = input.sourceStatus || "all";

  if (mediaStatus === "missing") {
    filtered = filtered.filter((item) => !hasCatalogProductDirectMedia(item));
  } else if (mediaStatus === "direct") {
    filtered = filtered.filter((item) => hasCatalogProductDirectMedia(item));
  } else if (mediaStatus === "fallback") {
    filtered = filtered.filter((item) => Boolean(item.rawPayload?.imageFallback));
  } else if (mediaStatus === "video") {
    filtered = filtered.filter((item) => Boolean(item.videoUrl));
  }

  if (contentStatus === "missing_description") {
    filtered = filtered.filter((item) => !item.description?.trim());
  } else if (contentStatus === "missing_price") {
    filtered = filtered.filter((item) => Number(item.priceFinalGross || 0) <= 0);
  } else if (contentStatus === "missing_category") {
    filtered = filtered.filter((item) => item.categories.length === 0);
  }

  if (visibilityStatus === "visible") {
    filtered = filtered.filter((item) => item.isActive && item.isExported);
  } else if (visibilityStatus === "hidden") {
    filtered = filtered.filter((item) => !item.isActive || !item.isExported);
  }

  if (sourceStatus === "moffice") {
    filtered = filtered.filter((item) => getCatalogProductSource(item) === "moffice" || Boolean(item.rawPayload?.moffice));
  } else if (sourceStatus === "manual") {
    filtered = filtered.filter((item) => getCatalogProductSource(item) !== "moffice" && !item.rawPayload?.moffice);
  }

  return filtered;
};

const sortCatalogProducts = (
  items: CatalogProductView[],
  sort: NonNullable<CatalogListInput["sort"]>,
) => {
  const list = [...items];
  if (sort === "name_asc" || sort === "name_desc") {
    return list.sort((a, b) => {
      const diff = a.name.localeCompare(b.name, "sr", { numeric: true, sensitivity: "base" });
      return sort === "name_asc" ? diff : -diff;
    });
  }
  if (sort === "price_asc" || sort === "price_desc") {
    return list.sort((a, b) => {
      const diff = Number(a.priceFinalGross || 0) - Number(b.priceFinalGross || 0);
      return sort === "price_asc" ? diff : -diff;
    });
  }
  if (sort === "stock_asc" || sort === "stock_desc") {
    return list.sort((a, b) => {
      const diff = getAvailableStockValue(a) - getAvailableStockValue(b);
      return sort === "stock_asc" ? diff : -diff;
    });
  }
  if (sort === "newest" || sort === "oldest") {
    return list.sort((a, b) => (sort === "newest" ? b.legacyId - a.legacyId : a.legacyId - b.legacyId));
  }
  return list;
};

async function fetchCatalogSnapshotFromSupabase(filters: {
  activeOnly: boolean;
  exportOnly: boolean;
}): Promise<CatalogProductView[] | null> {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  const pageSize = 1000;
  const products: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase
      .from("catalog_products")
      .select(
        "legacy_id,sku,ean,manuf_code,brand,is_active,is_exported,name_sr,name_en,description_sr,description_en,specification_sr,specification_en,price_gross,price_final_gross,tax_percent,rebate_percent,stock_warehouse_1,stock_total,raw_payload",
      )
      .order("legacy_id", { ascending: true })
      .range(from, to);
    if (filters.activeOnly) query = query.eq("is_active", true);
    if (filters.exportOnly) query = query.eq("is_exported", true);
    const { data, error } = await query;
    if (error) return null;
    const batch = (data || []) as Record<string, unknown>[];
    products.push(...batch);
    if (batch.length < pageSize) break;
  }
  if (!products.length) return [];

  const legacyIds = products
    .map((row: Record<string, unknown>) => Number(row.legacy_id))
    .filter((id: number) => Number.isFinite(id));

  const imagesByProductId = new Map<number, string[]>();
  if (legacyIds.length > 0) {
    const idChunkSize = 500;
    for (let i = 0; i < legacyIds.length; i += idChunkSize) {
      const idChunk = legacyIds.slice(i, i + idChunkSize);
      const { data: media } = await supabase
        .from("catalog_product_media")
        .select("legacy_product_id,url,sort")
        .in("legacy_product_id", idChunk)
        .order("sort", { ascending: true });

      for (const row of media || []) {
        const productId = Number((row as Record<string, unknown>).legacy_product_id);
        const url = String((row as Record<string, unknown>).url || "");
        if (!productId || !url) continue;
        const list = imagesByProductId.get(productId) || [];
        list.push(url);
        imagesByProductId.set(productId, list);
      }
    }
  }

  const normalized = products.map((row: Record<string, unknown>) => normalizeCatalogRow(row, imagesByProductId));
  return applySkuImageFallbacks(normalized);
}

async function loadFromSupabase(filters: {
  activeOnly: boolean;
  exportOnly: boolean;
}): Promise<CatalogProductView[] | null> {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  const cacheKey = `${filters.activeOnly ? "1" : "0"}:${filters.exportOnly ? "1" : "0"}`;
  const cache = getCatalogSnapshotCache();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  try {
    const shouldBypassPersistentCache = getCatalogCacheBypassUntil() > Date.now();
    let items: CatalogProductView[] | null = null;

    // Next.js unstable_cache has a hard per-item size limit (~2MB). Our admin snapshots
    // can exceed that significantly, which may trigger unhandled rejections in dev/prod.
    // Use direct Supabase fetch + in-memory TTL cache for reliability.
    if (shouldBypassPersistentCache) {
      items = await fetchCatalogSnapshotFromSupabase(filters);
    } else {
      items = await fetchCatalogSnapshotFromSupabase(filters);
    }

    if (!items) return null;
    cache.set(cacheKey, {
      items,
      expiresAt: Date.now() + CATALOG_SNAPSHOT_TTL_MS,
    });
    return items;
  } catch {
    return null;
  }
}

async function loadFromFile(): Promise<CatalogProductView[]> {
  const fileItems = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  return applySkuImageFallbacks(fileItems.map(normalizeLegacyJson));
}

async function loadCatalogProductFromFileByLegacyId(
  legacyId: number,
): Promise<CatalogProductView | null> {
  const items = await loadFromFile();
  return items.find((item) => item.legacyId === legacyId) || null;
}

export async function listCatalogProducts(input: CatalogListInput = {}): Promise<CatalogListResult> {
  const startedAt = Date.now();
  const page = Math.max(1, Number(input.page || 1));
  const pageSize = clamp(Number(input.pageSize || 24), 1, 120);
  const query = String(input.query || "");
  const categoryId = Number(input.categoryId || 0);
  const inStock = Boolean(input.inStock);
  const onSale = Boolean(input.onSale);
  const activeOnly = input.activeOnly !== false;
  const exportOnly = input.exportOnly !== false;
  const collapseBySku = Boolean(input.collapseBySku);
  const applyPromotions = input.applyPromotions !== false;
  const priceMin = Number.isFinite(Number(input.priceMin)) ? Math.max(0, Number(input.priceMin)) : 0;
  const priceMax = Number.isFinite(Number(input.priceMax)) ? Math.max(0, Number(input.priceMax)) : 0;
  const requireImages = Boolean(input.requireImages);
  const requireDirectImages = Boolean(input.requireDirectImages);
  const mediaStatus = input.mediaStatus || "all";
  const contentStatus = input.contentStatus || "all";
  const visibilityStatus = input.visibilityStatus || "all";
  const sourceStatus = input.sourceStatus || "all";
  const sort = input.sort || "featured";
  const sizes = Array.isArray(input.sizes)
    ? input.sizes.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  const cacheKey = makeCatalogListCacheKey({
    page,
    pageSize,
    query,
    categoryId,
    inStock,
    onSale,
    activeOnly,
    exportOnly,
    collapseBySku,
    applyPromotions,
    priceMin,
    priceMax,
    sizes,
    requireImages,
    requireDirectImages,
    mediaStatus,
    contentStatus,
    visibilityStatus,
    sourceStatus,
    sort,
  });
  const listCache = getCatalogListCache();
  const cached = listCache.get(cacheKey);
  if (cached && cached.expiresAt > startedAt) {
    const ageMs = Date.now() - startedAt;
    maybeLogCatalogPerformance({
      source: cached.source,
      cache: "hit",
      totalMs: ageMs,
      loadMs: 0,
      promoMs: 0,
      filterMs: 0,
      collapseMs: 0,
      paginateMs: 0,
      totalItems: cached.value.total,
      filteredItems: cached.value.total,
      pageItems: cached.value.items.length,
      page: cached.value.page,
      pageSize: cached.value.pageSize,
      query,
      categoryId,
      inStock,
      onSale,
    });
    return cached.value;
  }

  const loadStart = Date.now();
  const supabaseItems = await loadFromSupabase({ activeOnly, exportOnly });
  const baseItems = supabaseItems || (await loadFromFile());
  const loadMs = Date.now() - loadStart;
  const source: "supabase" | "file" = supabaseItems ? "supabase" : "file";

  const promoStart = Date.now();
  const promotionRules = applyPromotions ? await listPromotionRulesCached() : [];
  const displayItems = promotionRules.length > 0 ? applyPromotionRulesToProducts(baseItems, promotionRules) : baseItems;
  const promoMs = Date.now() - promoStart;

  const filterStart = Date.now();
  const filteredSource = applyFilters(displayItems, {
    query,
    categoryId,
    inStock,
    onSale,
    activeOnly,
    exportOnly,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    sizes,
  });
  const filterMs = Date.now() - filterStart;

  const collapseStart = Date.now();
  const collapsed = collapseBySku ? collapseCatalogProductsByModel(filteredSource) : filteredSource;
  const mediaFiltered = requireDirectImages
    ? collapsed.filter((item) => hasCatalogProductDirectMedia(item))
    : requireImages
      ? collapsed.filter((item) => hasCatalogProductMedia(item))
      : collapsed;
  const qualityFiltered = applyAdminQualityFilters(mediaFiltered, {
    mediaStatus,
    contentStatus,
    visibilityStatus,
    sourceStatus,
  });
  const filtered = sortCatalogProducts(qualityFiltered, sort);
  const collapseMs = Date.now() - collapseStart;

  const paginateStart = Date.now();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const categories = collectCategories(filtered);
  const paginateMs = Date.now() - paginateStart;

  const result: CatalogListResult = {
    items: paged,
    total,
    page: clampedPage,
    pageSize,
    totalPages,
    categories,
  };

  listCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CATALOG_LIST_TTL_MS,
    source,
  });
  while (listCache.size > CATALOG_LIST_CACHE_MAX_ENTRIES) {
    const firstKey = listCache.keys().next().value as string | undefined;
    if (!firstKey) break;
    listCache.delete(firstKey);
  }

  const totalMs = Date.now() - startedAt;
  maybeLogCatalogPerformance({
    source,
    cache: "miss",
    totalMs,
    loadMs,
    promoMs,
    filterMs,
    collapseMs,
    paginateMs,
    totalItems: displayItems.length,
    filteredItems: total,
    pageItems: paged.length,
    page: clampedPage,
    pageSize,
    query,
    categoryId,
    inStock,
    onSale,
  });

  return result;
}

export async function getCatalogProductByLegacyId(
  legacyId: number,
  options?: { applyPromotions?: boolean; allowLegacyMediaFallback?: boolean },
): Promise<CatalogProductView | null> {
  const id = Number(legacyId);
  if (!Number.isFinite(id)) return null;
  const applyPromotions = options?.applyPromotions !== false;
  const allowLegacyMediaFallback = options?.allowLegacyMediaFallback !== false;

  const supabase = getServiceSupabase() || getAnonSupabase();
  if (supabase) {
    const normalized = await getCatalogProductByLegacyIdCached(id);
    if (normalized) {
      const withMedia = hasCatalogProductMedia(normalized) || !allowLegacyMediaFallback
        ? normalized
        : mergeCatalogProductMedia(normalized, await loadCatalogProductFromFileByLegacyId(id));
      if (!applyPromotions) return withMedia;
      const rules = await listPromotionRulesCached();
      return rules.length ? applyPromotionRulesToProduct(withMedia, rules) : withMedia;
    }
  }

  const found = await loadCatalogProductFromFileByLegacyId(id);
  if (!found || !applyPromotions) return found;
  const rules = await listPromotionRulesCached();
  return rules.length ? applyPromotionRulesToProduct(found, rules) : found;
}

export async function getCatalogProductVariantsBySku(
  sku: string,
  options?: {
    applyPromotions?: boolean;
    activeOnly?: boolean;
    exportOnly?: boolean;
  },
): Promise<CatalogProductView[]> {
  const normalizedSku = String(sku || "").trim().toLowerCase();
  if (!normalizedSku) return [];

  const activeOnly = options?.activeOnly !== false;
  const exportOnly = options?.exportOnly !== false;
  const applyPromotions = options?.applyPromotions !== false;

  const supabaseItems = await loadFromSupabase({ activeOnly, exportOnly });
  const baseItems = supabaseItems || (await loadFromFile());
  const promotionRules = applyPromotions ? await listPromotionRulesCached() : [];
  const displayItems =
    promotionRules.length > 0
      ? applyPromotionRulesToProducts(baseItems, promotionRules)
      : baseItems;
  const current = displayItems.find(
    (item) => String(item.sku || "").trim().toLowerCase() === normalizedSku,
  );
  if (!current) return [];
  const modelKey = getCatalogProductModelKey(current);
  const visualModelKey = getCatalogProductVisualModelKey(current);

  return displayItems
    .filter(
      (item) =>
        getCatalogProductModelKey(item) === modelKey ||
        (visualModelKey && getCatalogProductVisualModelKey(item) === visualModelKey),
    )
    .sort((left, right) => left.legacyId - right.legacyId);
}

async function fetchCatalogProductByLegacyIdFromSupabase(
  legacyId: number,
): Promise<CatalogProductView | null> {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("catalog_products")
    .select(
      "legacy_id,sku,ean,manuf_code,brand,is_active,is_exported,name_sr,name_en,description_sr,description_en,specification_sr,specification_en,price_gross,price_final_gross,tax_percent,rebate_percent,stock_warehouse_1,stock_total,raw_payload",
    )
    .eq("legacy_id", legacyId)
    .maybeSingle();

  if (!row) return null;

  const { data: media } = await supabase
    .from("catalog_product_media")
    .select("legacy_product_id,url,sort")
    .eq("legacy_product_id", legacyId)
    .order("sort", { ascending: true });

  const imageUrls = (media || [])
    .map((m) => String((m as Record<string, unknown>).url || ""))
    .filter((value) => value.length > 0);

  const imagesByProductId = new Map<number, string[]>();
  imagesByProductId.set(legacyId, imageUrls);
  const normalized = normalizeCatalogRow(row as Record<string, unknown>, imagesByProductId);
  return applySkuImageFallbacks([normalized])[0] || null;
}

const getCatalogProductByLegacyIdCached = unstable_cache(
  async (legacyId: number) => fetchCatalogProductByLegacyIdFromSupabase(legacyId),
  ["catalog-product-by-id-v1"],
  { revalidate: 180 },
);

export async function getRelatedCatalogProducts(
  item: CatalogProductView,
  limit = 8,
): Promise<CatalogProductView[]> {
  const primaryCategory = item.categories[0]?.id || 0;
  const result = await listCatalogProducts({
    categoryId: primaryCategory || undefined,
    inStock: false,
    page: 1,
    pageSize: Math.max(limit + 8, 24),
    collapseBySku: true,
  });
  return result.items.filter((candidate) => candidate.legacyId !== item.legacyId).slice(0, limit);
}

type CompleteTheLookPattern = {
  // categories or product names considered the "base" product type
  match: RegExp;
  // patterns suggesting a complementary product name/category
  complement: RegExp;
};

const COMPLETE_THE_LOOK_PATTERNS: CompleteTheLookPattern[] = [
  // Suit/Odelo -> shirts, ties, belts, shoes, pocket squares
  { match: /odelo|sako|blazer|suit/u, complement: /kosulj|shirt|kravat|tie|kais|belt|leptir|pocket|cipel|shoe/u },
  // Shirt/Kosulja -> ties, cufflinks, suits, trousers
  { match: /kosulj|shirt/u, complement: /kravat|tie|odelo|sako|suit|pantalon|trouser|leptir/u },
  // Trousers -> shirts, belts, shoes
  { match: /pantalon|trouser/u, complement: /kosulj|shirt|kais|belt|cipel|shoe/u },
  // Tie/Kravata -> shirts, suits
  { match: /kravat|tie|leptir/u, complement: /kosulj|shirt|odelo|sako|suit/u },
  // Shoes -> belts, socks, trousers
  { match: /cipel|shoe/u, complement: /kais|belt|carap|sock|pantalon|trouser/u },
];

const normalizeLower = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export async function getCompleteTheLookProducts(
  item: CatalogProductView,
  limit = 4,
): Promise<CatalogProductView[]> {
  const categoryText = (item.categories || [])
    .flatMap((category) => [category?.name || "", ...(category?.path || [])])
    .join(" ");
  const haystack = normalizeLower(`${item.name || ""} ${categoryText}`);

  const pattern = COMPLETE_THE_LOOK_PATTERNS.find((entry) => entry.match.test(haystack));
  if (!pattern) return [];

  const result = await listCatalogProducts({
    page: 1,
    pageSize: 80,
    collapseBySku: true,
    activeOnly: true,
    exportOnly: true,
  });

  const primaryCategoryId = item.categories[0]?.id || 0;
  const filtered = result.items
    .filter((candidate) => candidate.legacyId !== item.legacyId)
    .filter((candidate) => {
      if (primaryCategoryId && (candidate.categories || []).some((c) => c.id === primaryCategoryId)) {
        return false;
      }
      const text = normalizeLower(
        `${candidate.name || ""} ${(candidate.categories || []).flatMap((c) => [c?.name || "", ...(c?.path || [])]).join(" ")}`,
      );
      return pattern.complement.test(text);
    });

  return filtered.slice(0, limit);
}
