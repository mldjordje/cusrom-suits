import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { invalidateCatalogCaches, listCatalogProducts } from "@/lib/catalog/store";
import { getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import type { LegacyCatalogProduct, LegacyCategory } from "@/lib/legacy/types";

const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";

type ProductUpdatePayload = {
  legacyId: number;
  sku?: string;
  ean?: string | null;
  brand?: string | null;
  name?: string;
  description?: string | null;
  specification?: string | null;
  priceGross?: number;
  priceFinalGross?: number;
  taxPercent?: number;
  rebatePercent?: number;
  stockWarehouse1?: number;
  stockTotal?: number;
  isActive?: boolean;
  isExported?: boolean;
  landingFeatured?: boolean;
  landingPriority?: number | null;
};

type ProductCreatePayload = {
  sku: string;
  name: string;
  categoryId?: number | null;
  categoryName?: string | null;
  categoryPath?: string[] | null;
  ean?: string | null;
  brand?: string | null;
  description?: string | null;
  specification?: string | null;
  priceGross?: number;
  priceFinalGross?: number;
  taxPercent?: number;
  rebatePercent?: number;
  stockWarehouse1?: number;
  stockTotal?: number;
  isActive?: boolean;
  isExported?: boolean;
  landingFeatured?: boolean;
  landingPriority?: number | null;
  images?: string[];
  coverImage?: string | null;
};

const hasOwn = (obj: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const toNumberOrUndefined = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const toNumberOr = (value: unknown, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseStringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
    : [];

const parseUpdatePayload = (raw: unknown): ProductUpdatePayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const legacyId = Number(row.legacyId);
  if (!Number.isFinite(legacyId)) return null;

  const out: ProductUpdatePayload = { legacyId };
  if (hasOwn(row, "sku")) out.sku = String(row.sku || "").trim();
  if (hasOwn(row, "ean")) out.ean = row.ean == null ? null : String(row.ean);
  if (hasOwn(row, "brand")) out.brand = row.brand == null ? null : String(row.brand);
  if (hasOwn(row, "name")) out.name = String(row.name || "").trim();
  if (hasOwn(row, "description")) out.description = row.description == null ? null : String(row.description);
  if (hasOwn(row, "specification")) out.specification = row.specification == null ? null : String(row.specification);
  if (hasOwn(row, "priceGross")) out.priceGross = toNumberOrUndefined(row.priceGross);
  if (hasOwn(row, "priceFinalGross")) out.priceFinalGross = toNumberOrUndefined(row.priceFinalGross);
  if (hasOwn(row, "taxPercent")) out.taxPercent = toNumberOrUndefined(row.taxPercent);
  if (hasOwn(row, "rebatePercent")) out.rebatePercent = toNumberOrUndefined(row.rebatePercent);
  if (hasOwn(row, "stockWarehouse1")) out.stockWarehouse1 = toNumberOrUndefined(row.stockWarehouse1);
  if (hasOwn(row, "stockTotal")) out.stockTotal = toNumberOrUndefined(row.stockTotal);
  if (hasOwn(row, "isActive")) out.isActive = Boolean(row.isActive);
  if (hasOwn(row, "isExported")) out.isExported = Boolean(row.isExported);
  if (hasOwn(row, "landingFeatured")) out.landingFeatured = Boolean(row.landingFeatured);
  if (hasOwn(row, "landingPriority")) {
    out.landingPriority = row.landingPriority == null ? null : toNumberOrUndefined(row.landingPriority) ?? null;
  }
  return out;
};

const parseCreatePayload = (raw: unknown): ProductCreatePayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const sku = String(row.sku || "").trim();
  const name = String(row.name || "").trim();
  if (!sku || !name) return null;

  return {
    sku,
    name,
    categoryId: row.categoryId == null ? null : Number(row.categoryId),
    categoryName: row.categoryName == null ? null : String(row.categoryName),
    categoryPath: Array.isArray(row.categoryPath) ? parseStringList(row.categoryPath) : null,
    ean: row.ean == null ? null : String(row.ean),
    brand: row.brand == null ? null : String(row.brand),
    description: row.description == null ? null : String(row.description),
    specification: row.specification == null ? null : String(row.specification),
    priceGross: toNumberOr(row.priceGross, 0),
    priceFinalGross: toNumberOr(row.priceFinalGross, 0),
    taxPercent: toNumberOr(row.taxPercent, 20),
    rebatePercent: toNumberOr(row.rebatePercent, 0),
    stockWarehouse1: toNumberOr(row.stockWarehouse1, 0),
    stockTotal: toNumberOr(row.stockTotal, 0),
    isActive: row.isActive == null ? true : Boolean(row.isActive),
    isExported: row.isExported == null ? true : Boolean(row.isExported),
    landingFeatured: row.landingFeatured == null ? false : Boolean(row.landingFeatured),
    landingPriority: row.landingPriority == null ? null : toNumberOrUndefined(row.landingPriority) ?? null,
    images: parseStringList(row.images),
    coverImage: row.coverImage == null ? null : String(row.coverImage),
  };
};

const normalizeLegacyCategory = (input: ProductCreatePayload): LegacyCategory[] => {
  if (!input.categoryId || !Number.isFinite(input.categoryId)) return [];
  const categoryName = (input.categoryName || "").trim();
  const path = input.categoryPath && input.categoryPath.length > 0
    ? input.categoryPath
    : categoryName
      ? [categoryName]
      : [`Category ${input.categoryId}`];
  return [
    {
      id: Number(input.categoryId),
      name: categoryName || `Category ${input.categoryId}`,
      parentId: 0,
      path,
    },
  ];
};

const applyUpdateToLegacyFile = async (patch: ProductUpdatePayload) => {
  const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  const idx = products.findIndex((item) => Number(item.legacyId) === Number(patch.legacyId));
  if (idx === -1) return { success: false, message: "Product not found." };

  const current = products[idx];
  const next: LegacyCatalogProduct = {
    ...current,
    sku: patch.sku ?? current.sku,
    ean: patch.ean !== undefined ? patch.ean : current.ean,
    brand: patch.brand !== undefined ? patch.brand : current.brand,
    names: {
      ...current.names,
      sr: patch.name ?? current.names.sr,
    },
    descriptions: {
      ...current.descriptions,
      sr: patch.description !== undefined ? patch.description : current.descriptions.sr,
    },
    specification: {
      ...current.specification,
      sr: patch.specification !== undefined ? patch.specification : current.specification.sr,
    },
    price: {
      ...current.price,
      gross: patch.priceGross ?? current.price.gross,
      finalGross: patch.priceFinalGross ?? current.price.finalGross,
      taxPercent: patch.taxPercent ?? current.price.taxPercent,
      rebatePercent: patch.rebatePercent ?? current.price.rebatePercent,
    },
    stock: {
      ...current.stock,
      warehouse1: patch.stockWarehouse1 ?? current.stock.warehouse1,
      total: patch.stockTotal ?? current.stock.total,
    },
    status: {
      active: patch.isActive !== undefined ? (patch.isActive ? "y" : "n") : current.status.active,
      export: patch.isExported !== undefined ? (patch.isExported ? "y" : "n") : current.status.export,
    },
    raw: {
      ...current.raw,
      ...(patch.landingFeatured !== undefined || patch.landingPriority !== undefined
        ? {
            landing: {
              ...((current.raw && typeof current.raw.landing === "object" ? current.raw.landing : {}) || {}),
              ...(patch.landingFeatured !== undefined ? { featured: patch.landingFeatured } : {}),
              ...(patch.landingPriority !== undefined ? { priority: patch.landingPriority } : {}),
            },
          }
        : {}),
    },
  };

  products[idx] = next;
  await writeJsonFile(LEGACY_PRODUCTS_PATH, products);
  return { success: true };
};

const applyUpdateToSupabase = async (patch: ProductUpdatePayload) => {
  const supabase = getServiceSupabase();
  if (!supabase) return applyUpdateToLegacyFile(patch);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.sku !== undefined) update.sku = patch.sku;
  if (patch.ean !== undefined) update.ean = patch.ean;
  if (patch.brand !== undefined) update.brand = patch.brand;
  if (patch.name !== undefined) update.name_sr = patch.name;
  if (patch.description !== undefined) update.description_sr = patch.description;
  if (patch.specification !== undefined) update.specification_sr = patch.specification;
  if (patch.priceGross !== undefined) update.price_gross = patch.priceGross;
  if (patch.priceFinalGross !== undefined) update.price_final_gross = patch.priceFinalGross;
  if (patch.taxPercent !== undefined) update.tax_percent = patch.taxPercent;
  if (patch.rebatePercent !== undefined) update.rebate_percent = patch.rebatePercent;
  if (patch.stockWarehouse1 !== undefined) update.stock_warehouse_1 = patch.stockWarehouse1;
  if (patch.stockTotal !== undefined) update.stock_total = patch.stockTotal;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.isExported !== undefined) update.is_exported = patch.isExported;
  if (patch.landingFeatured !== undefined || patch.landingPriority !== undefined) {
    const { data: existing, error: rawError } = await supabase
      .from("catalog_products")
      .select("raw_payload")
      .eq("legacy_id", patch.legacyId)
      .maybeSingle();

    if (rawError) {
      return { success: false, message: rawError.message };
    }

    const currentRawPayload =
      existing && typeof (existing as Record<string, unknown>).raw_payload === "object"
        ? ((existing as Record<string, unknown>).raw_payload as Record<string, unknown>)
        : {};
    const currentLanding =
      currentRawPayload && typeof currentRawPayload.landing === "object"
        ? (currentRawPayload.landing as Record<string, unknown>)
        : {};

    update.raw_payload = {
      ...currentRawPayload,
      landing: {
        ...currentLanding,
        ...(patch.landingFeatured !== undefined ? { featured: patch.landingFeatured } : {}),
        ...(patch.landingPriority !== undefined ? { priority: patch.landingPriority } : {}),
      },
    };
  }

  const { error } = await supabase
    .from("catalog_products")
    .update(update)
    .eq("legacy_id", patch.legacyId);

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true };
};

const createInLegacyFile = async (payload: ProductCreatePayload) => {
  const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  const legacyId = products.reduce((acc, item) => Math.max(acc, Number(item.legacyId) || 0), 0) + 1;
  const categories = normalizeLegacyCategory(payload);
  const images = payload.images || [];
  const coverImage = payload.coverImage || images[0] || null;

  const created: LegacyCatalogProduct = {
    legacyId,
    sku: payload.sku,
    ean: payload.ean || null,
    manufCode: null,
    brand: payload.brand || null,
    status: {
      active: payload.isActive === false ? "n" : "y",
      export: payload.isExported === false ? "n" : "y",
    },
    names: {
      sr: payload.name,
      en: null,
      legacy: payload.name,
    },
    descriptions: {
      sr: payload.description || null,
      en: null,
    },
    specification: {
      sr: payload.specification || null,
      en: null,
    },
    price: {
      net: Number((payload.priceFinalGross || 0) / (1 + (payload.taxPercent || 20) / 100)),
      gross: payload.priceGross || 0,
      finalGross: payload.priceFinalGross || 0,
      taxPercent: payload.taxPercent || 20,
      rebatePercent: payload.rebatePercent || 0,
    },
    stock: {
      warehouse1: payload.stockWarehouse1 || 0,
      total: payload.stockTotal || 0,
      warehouses: [],
    },
    categories,
    images,
    coverImage,
    attributes: {
      size: [],
    },
    raw: {
      taxId: 0,
      oldProductId: legacyId,
      erpId: legacyId,
      ts: new Date().toISOString(),
      landing: {
        featured: payload.landingFeatured === true,
        priority: payload.landingPriority ?? null,
      },
    },
  };

  products.unshift(created);
  await writeJsonFile(LEGACY_PRODUCTS_PATH, products);
  return { success: true, legacyId };
};

const createInSupabase = async (payload: ProductCreatePayload) => {
  const supabase = getServiceSupabase();
  if (!supabase) return createInLegacyFile(payload);

  const { data: maxRow } = await supabase
    .from("catalog_products")
    .select("legacy_id")
    .order("legacy_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const legacyId = Number((maxRow as any)?.legacy_id || 0) + 1;
  const categories = normalizeLegacyCategory(payload);
  const images = payload.images || [];
  const coverImage = payload.coverImage || images[0] || null;
  const now = new Date().toISOString();

  const { error } = await supabase.from("catalog_products").insert({
    legacy_id: legacyId,
    sku: payload.sku,
    ean: payload.ean || null,
    manuf_code: null,
    brand: payload.brand || null,
    is_active: payload.isActive !== false,
    is_exported: payload.isExported !== false,
    name_sr: payload.name,
    name_en: null,
    description_sr: payload.description || null,
    description_en: null,
    specification_sr: payload.specification || null,
    specification_en: null,
    price_net: Number((payload.priceFinalGross || 0) / (1 + (payload.taxPercent || 20) / 100)),
    price_gross: payload.priceGross || 0,
    price_final_gross: payload.priceFinalGross || 0,
    tax_percent: payload.taxPercent || 20,
    rebate_percent: payload.rebatePercent || 0,
    stock_warehouse_1: payload.stockWarehouse1 || 0,
    stock_total: payload.stockTotal || 0,
    raw_payload: {
      categories,
      landing: {
        featured: payload.landingFeatured === true,
        priority: payload.landingPriority ?? null,
      },
      attributes: {},
      stockWarehouses: [],
      legacyRaw: {
        ts: now,
      },
    },
    updated_at: now,
  });
  if (error) return { success: false, message: error.message };

  const mediaRows = images.map((url, index) => ({
    legacy_product_id: legacyId,
    url,
    is_cover: coverImage ? coverImage === url : index === 0,
    sort: index,
    updated_at: now,
  }));
  if (coverImage && !images.includes(coverImage)) {
    mediaRows.unshift({
      legacy_product_id: legacyId,
      url: coverImage,
      is_cover: true,
      sort: 0,
      updated_at: now,
    });
  }
  if (mediaRows.length > 0) {
    const { error: mediaError } = await supabase
      .from("catalog_product_media")
      .upsert(mediaRows, { onConflict: "legacy_product_id,url" });
    if (mediaError) return { success: false, message: mediaError.message };
  }

  return { success: true, legacyId };
};

const deleteInLegacyFile = async (legacyId: number) => {
  const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  const before = products.length;
  const next = products.filter((item) => Number(item.legacyId) !== legacyId);
  if (next.length === before) return { success: false, message: "Product not found." };
  await writeJsonFile(LEGACY_PRODUCTS_PATH, next);
  return { success: true };
};

const deleteInSupabase = async (legacyId: number) => {
  const supabase = getServiceSupabase();
  if (!supabase) return deleteInLegacyFile(legacyId);
  const { error } = await supabase
    .from("catalog_products")
    .delete()
    .eq("legacy_id", legacyId);
  if (error) return { success: false, message: error.message };
  return { success: true };
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(120, Number.parseInt(params.get("pageSize") || "50", 10) || 50));
  const query = params.get("q") || "";
  const categoryId = Number.parseInt(params.get("categoryId") || "0", 10) || 0;
  const inStock = params.get("inStock") === "1";
  const activeOnly = params.get("activeOnly") === "1";
  const exportOnly = params.get("exportOnly") === "1";
  const onSaleOnly = params.get("onSaleOnly") === "1";

  const result = await listCatalogProducts({
    page,
    pageSize,
    query,
    categoryId: categoryId || undefined,
    inStock,
    onSale: onSaleOnly,
    activeOnly,
    exportOnly,
    applyPromotions: onSaleOnly,
  });

  return NextResponse.json({
    success: true,
    data: result.items,
    categories: result.categories,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const patch = parseUpdatePayload(payload);
  if (!patch) {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }

  const result = await applyUpdateToSupabase(patch);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message || "Update failed." }, { status: 500 });
  }
  invalidateCatalogCaches();
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const mode = payload && typeof payload === "object" ? String((payload as Record<string, unknown>).mode || "bulk") : "bulk";

  if (mode === "create") {
    const createPayload = parseCreatePayload(payload && typeof payload === "object" ? (payload as Record<string, unknown>).product : null);
    if (!createPayload) {
      return NextResponse.json({ success: false, message: "Invalid create payload." }, { status: 400 });
    }
    const result = await createInSupabase(createPayload);
    if (!result.success) {
      const message = "message" in result ? result.message : "Create failed.";
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
    invalidateCatalogCaches();
    const legacyId = "legacyId" in result ? result.legacyId : null;
    return NextResponse.json({ success: true, legacyId });
  }

  const updatesRaw = payload && typeof payload === "object" ? (payload as Record<string, unknown>).updates : null;
  const updates = Array.isArray(updatesRaw)
    ? updatesRaw.map(parseUpdatePayload).filter((item): item is ProductUpdatePayload => Boolean(item))
    : [];

  if (!updates.length) {
    return NextResponse.json({ success: false, message: "No valid updates provided." }, { status: 400 });
  }

  const results: Array<{ legacyId: number; success: boolean; message?: string }> = [];
  for (const patch of updates) {
    const result = await applyUpdateToSupabase(patch);
    results.push({
      legacyId: patch.legacyId,
      success: result.success,
      message: result.message,
    });
  }

  const failed = results.filter((item) => !item.success).length;
  if (results.some((item) => item.success)) {
    invalidateCatalogCaches();
  }
  return NextResponse.json({
    success: failed === 0,
    partial: failed > 0,
    results,
  });
}

export async function DELETE(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const legacyId = Number.parseInt(req.nextUrl.searchParams.get("legacyId") || "", 10);
  if (!Number.isFinite(legacyId)) {
    return NextResponse.json({ success: false, message: "Missing legacyId." }, { status: 400 });
  }

  const result = await deleteInSupabase(legacyId);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message || "Delete failed." }, { status: 500 });
  }
  invalidateCatalogCaches();
  return NextResponse.json({ success: true });
}
