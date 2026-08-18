/**
 * Catalog → Ananas import payload.
 *
 * Three things make this non-trivial:
 *  1. Ananas matches products on EAN only. Our mOffice `ean` column holds a
 *     9-digit internal code, not a GTIN, so every row is validated and rejected
 *     rows are reported instead of silently sent with a bogus EAN.
 *  2. Images must be absolute, publicly reachable URLs. Storefront paths are
 *     relative (`/fajlovi/...`) and get rewritten to the legacy asset origin.
 *  3. Ananas requires SKU to be unique per variant, but mOffice's `sku` column
 *     is a *style* code shared by every size in that style (confirmed against
 *     the catalog: SKU "133342" has 7 rows, one per size). We suffix with the
 *     legacy row id to make it unique while keeping the style code readable.
 */
import { getCatalogProductModelKey, type CatalogProductView } from "@/lib/catalog/store";
import { isValidEan } from "@/lib/integrations/ananas/rules";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";
import type { AnanasImportProduct } from "@/lib/legacy/types";

const DEFAULT_BRAND = "Santos&Santorini";
const DEFAULT_CATEGORY = "Ostalo";

/**
 * Ananas categories are a full taxonomy path plus numeric id (e.g.
 * "/Kategorije/Odeća/Muška garderoba/Muška odela|1766"), not a free-text name.
 * We only have their "Fashion" example sheet (51 categories, not our full
 * catalog), so this is a manual, pilot-only mapping for the two SKUs in the
 * first API test (133342, 133856) — extend it as more categories are confirmed,
 * or replace with a real lookup once Ananas sends the complete taxonomy.
 */
const ANANAS_CATEGORY_PATH_BY_SKU: Record<string, string> = {
  "133342": "/Kategorije/Odeća/Muška garderoba/Muška odela|1766",
  "133856": "/Kategorije/Modni dodaci/Aksesoari/Novčanici i cardholderi|675",
};

const assetOrigin = () =>
  (process.env.LEGACY_ASSET_ORIGIN?.trim() || "https://assets.santos.rs").replace(/\/+$/, "");

const publicOrigin = () =>
  (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.santos.rs").replace(/\/+$/, "");

/** Shipping weight (kg) per product group; used until real weights land in mOffice. */
const WEIGHT_BY_KEYWORD: Array<{ match: RegExp; kg: number }> = [
  { match: /odel|sako|jakn|mantil/i, kg: 1.6 },
  { match: /pantal|farmer/i, kg: 0.8 },
  { match: /kosulj|košulj/i, kg: 0.45 },
  { match: /prsluk/i, kg: 0.5 },
  { match: /kaiš|kais|kravat|leptir|maramic|carap|čarap|manzet|manžet/i, kg: 0.2 },
  { match: /cipel|obuc|obuć/i, kg: 1.2 },
];

export const DEFAULT_PACKAGE_WEIGHT_KG = 0.6;

export const resolvePackageWeightKg = (
  item: Pick<CatalogProductView, "name" | "categories"> & Partial<Pick<CatalogProductView, "rawPayload">>,
): number => {
  /* An admin-entered weight wins over the keyword guess — the guess is only a
     fallback for the thousands of legacy rows nobody has weighed yet. */
  const manual = Number(item.rawPayload?.packageWeightKg);
  if (Number.isFinite(manual) && manual > 0) return manual;
  const haystack = [item.name || "", ...(item.categories || []).map((cat) => cat.name || "")].join(" ");
  for (const rule of WEIGHT_BY_KEYWORD) {
    if (rule.match.test(haystack)) return rule.kg;
  }
  return DEFAULT_PACKAGE_WEIGHT_KG;
};

/** Relative storefront paths are not fetchable by Ananas — make them absolute. */
export const toAbsoluteImageUrl = (value: unknown): string => {
  const sanitized = sanitizeStorefrontImageSrc(value);
  if (!sanitized) return "";
  if (/^https?:\/\//i.test(sanitized)) return sanitized;
  if (sanitized.startsWith("/fajlovi/")) return `${assetOrigin()}${sanitized}`;
  if (sanitized.startsWith("/")) return `${publicOrigin()}${sanitized}`;
  return sanitized;
};

const toNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
};

const stringSizes = (attributes: Record<string, unknown> | null | undefined): string[] => {
  const sizes = attributes?.size;
  if (!Array.isArray(sizes)) return [];
  return sizes.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
};

export type MapperOptions = {
  /**
   * Send the internal 9-digit code in the `ean` field. Only enable once Ananas
   * confirms they accept a merchant pseudo-EAN — otherwise listings are rejected.
   */
  allowInternalEan?: boolean;
};

export type MappedProduct = {
  legacyId: number;
  sku: string;
  payload: AnanasImportProduct;
  /** Style group key (mOffice manuf_code) used only to resolve parentEan; not sent to Ananas. */
  variantGroupKey: string | null;
};

export type MapperRejection = {
  legacyId: number;
  sku: string;
  reason: string;
  ean: string | null;
};

export type MapperResult = {
  products: MappedProduct[];
  rejected: MapperRejection[];
};

/**
 * Ananas confirmed (2026-07-29, reply to our meeting doc) that a real GTIN is
 * not required: they assign their own listing code as long as SKU is unique
 * per variant. Defaults to allowed; set ANANAS_ALLOW_INTERNAL_EAN=false to
 * force rejection of non-GTIN codes again.
 */
export const allowInternalEanFromEnv = () => {
  const raw = process.env.ANANAS_ALLOW_INTERNAL_EAN;
  if (raw == null || raw.trim() === "") return true;
  return raw.trim().toLowerCase() !== "false";
};

/**
 * Maps one catalog row. Returns a rejection reason instead of throwing so the
 * caller can report exactly why a product never reached the marketplace.
 */
export function mapCatalogItemToAnanas(
  item: CatalogProductView,
  options: MapperOptions = {},
): { product: MappedProduct } | { rejection: MapperRejection } {
  const sku = String(item.sku || "").trim();
  const ean = String(item.ean || "").trim();
  const reject = (reason: string): { rejection: MapperRejection } => ({
    rejection: { legacyId: item.legacyId, sku, reason, ean: ean || null },
  });

  if (!sku) return reject("missing SKU");
  if (!ean) return reject("missing EAN");
  if (!isValidEan(ean) && !options.allowInternalEan) {
    return reject(`invalid EAN (${ean}) — internal mOffice code, not a GTIN`);
  }

  const coverImage = toAbsoluteImageUrl(item.coverImage || item.images?.[0]);
  if (!coverImage) return reject("missing cover image");

  const basePrice = toNumber(item.priceGross || item.priceFinalGross, 2);
  if (!(basePrice > 0)) return reject("base price must be greater than 0");

  const gallery = Array.from(
    new Set(
      (item.images || [])
        .map((image) => toAbsoluteImageUrl(image))
        .filter((image) => image.length > 0),
    ),
  );

  const category = ANANAS_CATEGORY_PATH_BY_SKU[sku] || item.categories?.[0]?.name || DEFAULT_CATEGORY;
  const attributes: Record<string, string[]> = {};
  const sizes = stringSizes(item.attributes);
  if (sizes.length) attributes["Veličina"] = sizes;

  // mOffice sku is a style code shared across every size in that style — make
  // it unique per variant (see file header) while keeping it traceable.
  const ananasSku = `${sku}_${item.legacyId}`;

  const payload: AnanasImportProduct = {
    name: item.name || sku,
    description: item.description || item.specification || item.name || sku,
    coverImage,
    ean,
    brand: item.brand || DEFAULT_BRAND,
    gallery: gallery.length ? gallery : [coverImage],
    // Resolved in a second pass (see resolveParentEans) once all variants are known.
    parentEan: "",
    packageWeightValue: resolvePackageWeightKg(item),
    packageWeightUnit: "kg",
    basePrice,
    vat: toNumber(item.taxPercent || 20, 2),
    stockLevel: Math.max(0, Math.floor(item.stockWarehouse1 || 0)),
    sku: ananasSku,
    externalId: String(item.legacyId),
    productType: category,
    category,
    attributes,
  };

  return {
    product: {
      legacyId: item.legacyId,
      sku: ananasSku,
      payload,
      variantGroupKey: resolveVariantGroupKey(item),
    },
  };
}

/**
 * Which variants belong to one product page.
 *
 * manuf_code alone is not enough: only ~45% of active rows carry one, so the
 * rest would each become a standalone listing. The storefront already solves
 * this — its model key is what collapses sizes (and colour codes) into a single
 * card — so reuse it and let Ananas group exactly the way our own shop does.
 */
const resolveVariantGroupKey = (item: CatalogProductView): string | null => {
  const modelKey = getCatalogProductModelKey(item);
  if (modelKey && !modelKey.startsWith("legacy:") && !isGenericModelKey(modelKey)) {
    return `model:${modelKey}`;
  }
  const manufCode = item.manufCode?.trim();
  if (manufCode) return `manuf:${manufCode}`;
  const sku = String(item.sku || "").trim().toLowerCase();
  return sku ? `sku:${sku}` : null;
};

/**
 * Products whose name is a bare code ("24/33/13", "36/195/17") get no usable
 * display name, so the model key degrades to the placeholder "collection:
 * kolekcija" — which lumps unrelated articles into one key. Harmless on the
 * storefront (they still render as separate cards), but on Ananas it would
 * publish nine different products as colour variants of one listing. Fall back
 * to manuf_code/SKU for those.
 */
const GENERIC_MODEL_NAMES = new Set(["kolekcija", "collection", "ostalo", "proizvod"]);

const isGenericModelKey = (modelKey: string): boolean => {
  const namePart = modelKey.split(":").slice(1).join(":").trim();
  return !namePart || GENERIC_MODEL_NAMES.has(namePart);
};

/**
 * Ananas groups size/color variants of one style under a single parentEan:
 * exactly one variant (the parent) has an empty parentEan, every sibling
 * carries the parent's EAN. We just pick a stable parent per group and wire the
 * rest to it.
 */
function resolveParentEans(products: MappedProduct[]): void {
  const byGroup = new Map<string, MappedProduct[]>();
  for (const product of products) {
    if (!product.variantGroupKey) continue;
    const group = byGroup.get(product.variantGroupKey);
    if (group) group.push(product);
    else byGroup.set(product.variantGroupKey, [product]);
  }

  for (const group of byGroup.values()) {
    if (group.length < 2) continue; // lone variant: no grouping needed, parentEan stays empty
    // Sort by legacyId (unique, stable) — sku is no longer a useful tiebreaker
    // now that it's suffixed per-variant with that same legacyId.
    const sorted = [...group].sort((a, b) => a.legacyId - b.legacyId);
    const parent = sorted[0];
    for (const sibling of sorted.slice(1)) {
      sibling.payload.parentEan = parent.payload.ean;
    }
  }
}

export function mapCatalogToAnanas(
  items: CatalogProductView[],
  options: MapperOptions = {},
): MapperResult {
  const products: MappedProduct[] = [];
  const rejected: MapperRejection[] = [];
  for (const item of items) {
    const result = mapCatalogItemToAnanas(item, options);
    if ("product" in result) products.push(result.product);
    else rejected.push(result.rejection);
  }
  resolveParentEans(products);
  return { products, rejected };
}
