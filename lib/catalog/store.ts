import { readJsonFile } from "@/lib/storage/jsonStore";
import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";
import { applyPromotionRulesToProduct, applyPromotionRulesToProducts, listPromotionRules } from "@/lib/catalog/promotions";

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
  page?: number;
  pageSize?: number;
  applyPromotions?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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

const normalizeCatalogRow = (
  row: Record<string, unknown>,
  imagesByProductId: Map<number, string[]>,
): CatalogProductView => {
  const legacyId = Number(row.legacy_id);
  const rawPayload =
    row.raw_payload && typeof row.raw_payload === "object"
      ? (row.raw_payload as Record<string, unknown>)
      : {};
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
  rawPayload: {
    raw: item.raw,
    categories: item.categories,
    attributes: item.attributes,
  },
});

const applyFilters = (
  items: CatalogProductView[],
  input: Required<Pick<CatalogListInput, "query" | "categoryId" | "inStock" | "onSale" | "activeOnly" | "exportOnly">>,
) => {
  const query = input.query.trim().toLowerCase();
  let filtered = [...items];
  if (input.activeOnly) filtered = filtered.filter((item) => item.isActive);
  if (input.exportOnly) filtered = filtered.filter((item) => item.isExported);
  if (input.inStock) filtered = filtered.filter((item) => item.stockWarehouse1 > 0);
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

async function loadFromSupabase(): Promise<CatalogProductView[] | null> {
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  const pageSize = 1000;
  const products: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("catalog_products")
      .select("*")
      .order("legacy_id", { ascending: true })
      .range(from, to);
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

async function loadFromFile(): Promise<CatalogProductView[]> {
  const fileItems = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  return applySkuImageFallbacks(fileItems.map(normalizeLegacyJson));
}

export async function listCatalogProducts(input: CatalogListInput = {}): Promise<CatalogListResult> {
  const page = Math.max(1, Number(input.page || 1));
  const pageSize = clamp(Number(input.pageSize || 24), 1, 120);
  const query = String(input.query || "");
  const categoryId = Number(input.categoryId || 0);
  const inStock = Boolean(input.inStock);
  const onSale = Boolean(input.onSale);
  const activeOnly = input.activeOnly !== false;
  const exportOnly = input.exportOnly !== false;
  const applyPromotions = input.applyPromotions !== false;

  const baseItems = (await loadFromSupabase()) || (await loadFromFile());
  const promotionRules = applyPromotions ? await listPromotionRules() : [];
  const displayItems = promotionRules.length > 0 ? applyPromotionRulesToProducts(baseItems, promotionRules) : baseItems;
  const filtered = applyFilters(displayItems, { query, categoryId, inStock, onSale, activeOnly, exportOnly });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    items: paged,
    total,
    page: clampedPage,
    pageSize,
    totalPages,
    categories: collectCategories(filtered),
  };
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
    const { data: row } = await supabase
      .from("catalog_products")
      .select("*")
      .eq("legacy_id", id)
      .maybeSingle();

    if (row) {
      const { data: media } = await supabase
        .from("catalog_product_media")
        .select("legacy_product_id,url,sort")
        .eq("legacy_product_id", id)
        .order("sort", { ascending: true });
      const imagesByProductId = new Map<number, string[]>();
      imagesByProductId.set(
        id,
        (media || [])
          .map((m) => String((m as Record<string, unknown>).url || ""))
          .filter((value) => value.length > 0),
      );
      const normalized = normalizeCatalogRow(row as Record<string, unknown>, imagesByProductId);
      if (!applyPromotions) return normalized;
      const rules = await listPromotionRules();
      return rules.length ? applyPromotionRulesToProduct(normalized, rules) : normalized;
    }
  }

  const items = await loadFromFile();
  const found = items.find((item) => item.legacyId === id) || null;
  if (!found || !applyPromotions) return found;
  const rules = await listPromotionRules();
  return rules.length ? applyPromotionRulesToProduct(found, rules) : found;
}

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
  });
  return result.items.filter((candidate) => candidate.legacyId !== item.legacyId).slice(0, limit);
}
