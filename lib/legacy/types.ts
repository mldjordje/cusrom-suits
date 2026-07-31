export type LegacyLanguage = "sr" | "en";

export type LegacyCategory = {
  id: number;
  name: string;
  parentId: number;
  path: string[];
};

export type LegacyWarehouseStock = {
  warehouseId: number;
  amount: number;
  reservedAmount: number;
  orderedAmount: number;
  priceNet: number;
};

export type LegacyCatalogProduct = {
  legacyId: number;
  sku: string;
  ean: string | null;
  manufCode: string | null;
  brand: string | null;
  status: {
    active: "y" | "n" | string;
    export: "y" | "n" | string;
  };
  names: {
    sr: string;
    en: string | null;
    legacy: string;
  };
  descriptions: {
    sr: string | null;
    en: string | null;
  };
  specification: {
    sr: string | null;
    en: string | null;
  };
  price: {
    net: number;
    gross: number;
    finalGross: number;
    taxPercent: number;
    rebatePercent: number;
  };
  stock: {
    warehouse1: number;
    total: number;
    warehouses: LegacyWarehouseStock[];
  };
  categories: LegacyCategory[];
  images: string[];
  coverImage: string | null;
  attributes: {
    size: string[];
  };
  raw: {
    taxId: number;
    oldProductId: number;
    erpId: number;
    ts: string | null;
    landing?: {
      featured?: boolean;
      priority?: number | null;
    };
    [key: string]: unknown;
  };
};

export type CatalogProductRow = {
  legacy_id: number;
  sku: string;
  ean: string | null;
  manuf_code: string | null;
  brand: string | null;
  is_active: boolean;
  is_exported: boolean;
  name_sr: string;
  name_en: string | null;
  description_sr: string | null;
  description_en: string | null;
  specification_sr: string | null;
  specification_en: string | null;
  price_net: number;
  price_gross: number;
  price_final_gross: number;
  tax_percent: number;
  rebate_percent: number;
  stock_warehouse_1: number;
  stock_total: number;
  raw_payload: Record<string, unknown>;
  updated_at: string;
};

export type CatalogProductMediaRow = {
  legacy_product_id: number;
  url: string;
  is_cover: boolean;
  sort: number;
};

/** Payload row for POST /product/api/v1/merchant-integration/import. */
export type AnanasImportProduct = {
  name: string;
  description: string;
  coverImage: string;
  ean: string;
  brand: string;
  gallery: string[];
  parentEan: string;
  packageWeightValue: number;
  packageWeightUnit: string;
  basePrice: number;
  vat: number;
  stockLevel: number;
  sku: string;
  /** Our legacy product id, echoed back by get-all-products for mapping. */
  externalId: string;
  productType: string;
  category: string;
  attributes: Record<string, string[]>;
  packageHeightValue?: number;
  packageWidthValue?: number;
  packageLengthValue?: number;
  productWeightValue?: number;
  productHeightValue?: number;
  productWidthValue?: number;
  productLengthValue?: number;
};
