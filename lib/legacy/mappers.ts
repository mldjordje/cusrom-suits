import type {
  AnanasImportProduct,
  CatalogProductMediaRow,
  CatalogProductRow,
  LegacyCatalogProduct,
} from "@/lib/legacy/types";

const roundTo = (value: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * p) / p;
};

const toFixedString = (value: number, digits = 2) => roundTo(value, digits).toFixed(digits);

export function mapLegacyProductToCatalogRow(product: LegacyCatalogProduct): CatalogProductRow {
  return {
    legacy_id: product.legacyId,
    sku: product.sku,
    ean: product.ean,
    manuf_code: product.manufCode,
    brand: product.brand,
    is_active: String(product.status.active).toLowerCase() === "y",
    is_exported: String(product.status.export).toLowerCase() === "y",
    name_sr: product.names.sr,
    name_en: product.names.en,
    description_sr: product.descriptions.sr,
    description_en: product.descriptions.en,
    specification_sr: product.specification.sr,
    specification_en: product.specification.en,
    price_net: roundTo(product.price.net),
    price_gross: roundTo(product.price.gross),
    price_final_gross: roundTo(product.price.finalGross),
    tax_percent: roundTo(product.price.taxPercent),
    rebate_percent: roundTo(product.price.rebatePercent),
    stock_warehouse_1: roundTo(product.stock.warehouse1, 3),
    stock_total: roundTo(product.stock.total, 3),
    raw_payload: {
      categories: product.categories,
      attributes: product.attributes,
      raw: product.raw,
      stockWarehouses: product.stock.warehouses,
    },
    updated_at: new Date().toISOString(),
  };
}

export function mapLegacyProductToCatalogMediaRows(
  product: LegacyCatalogProduct,
): CatalogProductMediaRow[] {
  return product.images.map((url, idx) => ({
    legacy_product_id: product.legacyId,
    url,
    is_cover: product.coverImage === url || idx === 0,
    sort: idx,
  }));
}

export function mapLegacyProductToAnanasImport(
  product: LegacyCatalogProduct,
  options?: {
    fallbackBrand?: string;
    fallbackCategory?: string;
    packageWeightUnit?: "kg" | "g";
    packageWeightValue?: number;
  },
): AnanasImportProduct | null {
  const ean = product.ean?.trim() || null;
  const coverImage = product.coverImage?.trim() || null;
  const sku = product.sku?.trim() || null;
  if (!ean || !coverImage || !sku) return null;

  const fallbackBrand = options?.fallbackBrand || "Santos&Santorini";
  const fallbackCategory = options?.fallbackCategory || "Ostalo";
  const packageWeightUnit = options?.packageWeightUnit || "kg";
  const packageWeightValue = options?.packageWeightValue ?? 0.52;

  const category = product.categories[0]?.name || fallbackCategory;
  const attributes: Record<string, string[]> = {};
  if (product.attributes.size.length > 0) {
    attributes["Velicina"] = product.attributes.size;
  }

  return {
    name: product.names.sr || product.names.legacy || sku,
    description: product.descriptions.sr || product.names.legacy || sku,
    coverImage,
    ean,
    brand: product.brand || fallbackBrand,
    gallery: product.images.length > 0 ? product.images : [coverImage],
    parentEan: ean,
    packageWeightValue: roundTo(packageWeightValue, 2),
    packageWeightUnit,
    basePrice: roundTo(product.price.gross, 2),
    vat: roundTo(product.price.taxPercent, 2),
    stockLevel: Math.max(0, Math.floor(product.stock.warehouse1)),
    sku,
    externalId: String(product.legacyId),
    productType: category,
    category,
    attributes,
  };
}
