import { readJsonFile } from "@/lib/storage/jsonStore";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";
import { applyPromotionRulesToProduct, applyPromotionRulesToProducts, listPromotionRules } from "@/lib/catalog/promotions";
import { unstable_cache } from "next/cache";

const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";

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

type CatalogListInput = {
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
const CATALOG_LIST_CACHE_VERSION = "v1";
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
  { revalidate: 60 },
);

const getAvailableStockValue = (item: Pick<CatalogProductView, "stockWarehouse1" | "stockTotal">) => {
  const total = Number(item.stockTotal || 0);
  const warehouse1 = Number(item.stockWarehouse1 || 0);
  return total > 0 ? total : warehouse1;
};

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
  if (source.imageFallback && typeof source.imageFallback === "object") {
    compact.imageFallback = source.imageFallback;
  }

  return compact;
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
  attributes: item.attributes as unknown as Record<string, unknown>,
  rawPayload: compactRawPayload({
    categories: item.categories,
    attributes: item.attributes,
    landing: item.raw?.landing,
  }),
});

const applyFilters = (
  items: CatalogProductView[],
  input: Required<Pick<CatalogListInput, "query" | "categoryId" | "inStock" | "onSale" | "activeOnly" | "exportOnly">>,
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
  if (query.length > 0) {
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
      return exactOrStartsWithCode || haystack.includes(query);
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

const collapseCatalogProductsBySku = (items: CatalogProductView[]): CatalogProductView[] => {
  const map = new Map<string, CatalogProductView>();

  for (const item of items) {
    const skuKey = String(item.sku || "").trim().toLowerCase();
    const key = skuKey.length > 0 ? `sku:${skuKey}` : `legacy:${item.legacyId}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        ...item,
        categories: [...item.categories],
        images: [...item.images],
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

    map.set(key, {
      ...current,
      isActive: current.isActive || item.isActive,
      isExported: current.isExported || item.isExported,
      landingFeatured: current.landingFeatured || item.landingFeatured,
      stockWarehouse1: current.stockWarehouse1 + item.stockWarehouse1,
      stockTotal: current.stockTotal + item.stockTotal,
      categories: Array.from(categoriesById.values()),
      coverImage: current.coverImage || item.coverImage,
      images,
      attributes: mergedAttributes,
      rawPayload: {
        ...current.rawPayload,
        collapsedVariantIds: Array.from(collapsedVariantIds).sort((a, b) => a - b),
        collapsedVariantCount: collapsedVariantIds.size,
      },
    });
  }

  return Array.from(map.values());
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

const loadCatalogSnapshotCached = unstable_cache(
  async (activeOnly: boolean, exportOnly: boolean) => {
    const snapshot = await fetchCatalogSnapshotFromSupabase({ activeOnly, exportOnly });
    if (!snapshot) {
      throw new Error("Catalog snapshot unavailable");
    }
    return snapshot;
  },
  ["catalog-snapshot-v2"],
  { revalidate: 300 },
);

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
    const items = await loadCatalogSnapshotCached(filters.activeOnly, filters.exportOnly);
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
  const filteredSource = applyFilters(displayItems, { query, categoryId, inStock, onSale, activeOnly, exportOnly });
  const filterMs = Date.now() - filterStart;

  const collapseStart = Date.now();
  const filtered = collapseBySku ? collapseCatalogProductsBySku(filteredSource) : filteredSource;
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
  options?: { applyPromotions?: boolean },
): Promise<CatalogProductView | null> {
  const id = Number(legacyId);
  if (!Number.isFinite(id)) return null;
  const applyPromotions = options?.applyPromotions !== false;

  const supabase = getServiceSupabase() || getAnonSupabase();
  if (supabase) {
    const normalized = await getCatalogProductByLegacyIdCached(id);
    if (normalized) {
      if (!applyPromotions) return normalized;
      const rules = await listPromotionRulesCached();
      return rules.length ? applyPromotionRulesToProduct(normalized, rules) : normalized;
    }
  }

  const items = await loadFromFile();
  const found = items.find((item) => item.legacyId === id) || null;
  if (!found || !applyPromotions) return found;
  const rules = await listPromotionRulesCached();
  return rules.length ? applyPromotionRulesToProduct(found, rules) : found;
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

  const imagesByProductId = new Map<number, string[]>();
  imagesByProductId.set(
    legacyId,
    (media || [])
      .map((m) => String((m as Record<string, unknown>).url || ""))
      .filter((value) => value.length > 0),
  );
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
