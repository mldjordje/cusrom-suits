import { NextRequest, NextResponse } from "next/server";
import { readJsonFile } from "@/lib/storage/jsonStore";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";
import { applyPublicCache } from "@/lib/http/cache";

const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";
const MAX_PAGE_SIZE = 200;
export const revalidate = 300;

const normalize = (value: string | null) => (value || "").trim().toLowerCase();

const parseIntParam = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export async function GET(req: NextRequest) {
  const allProducts = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
  const params = req.nextUrl.searchParams;

  const q = normalize(params.get("q"));
  const categoryId = parseIntParam(params.get("categoryId"), 0);
  const inStock = params.get("inStock") === "1";
  const activeOnly = params.get("activeOnly") !== "0";
  const exportOnly = params.get("exportOnly") !== "0";
  const page = parseIntParam(params.get("page"), 1);
  const pageSize = Math.min(parseIntParam(params.get("pageSize"), 20), MAX_PAGE_SIZE);

  let filtered = Array.isArray(allProducts) ? [...allProducts] : [];

  if (activeOnly) {
    filtered = filtered.filter((item) => String(item?.status?.active || "").toLowerCase() === "y");
  }

  if (exportOnly) {
    filtered = filtered.filter((item) => String(item?.status?.export || "").toLowerCase() === "y");
  }

  if (inStock) {
    filtered = filtered.filter((item) => Number(item?.stock?.warehouse1 || 0) > 0);
  }

  if (categoryId > 0) {
    filtered = filtered.filter((item) => item.categories.some((cat) => Number(cat.id) === categoryId));
  }

  if (q.length > 0) {
    filtered = filtered.filter((item) => {
      const haystack = [
        item.sku,
        item.ean,
        item.manufCode,
        item.names?.sr,
        item.names?.en,
        item.names?.legacy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const data = filtered.slice(offset, offset + pageSize);

  return applyPublicCache(
    NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      source: LEGACY_PRODUCTS_PATH,
    }),
    {
      maxAge: 120,
      sMaxAge: 600,
      staleWhileRevalidate: 3600,
    },
  );
}
