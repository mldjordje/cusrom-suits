import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog/store";
import { applyPublicCache } from "@/lib/http/cache";

export const revalidate = 600;

export async function GET() {
  const result = await listCatalogProducts({
    page: 1,
    pageSize: 1,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireImages: true,
  });

  const categories = result.categoryGroups.map((category) => ({
    id: category.key,
    name: category.name,
  }));

  return applyPublicCache(NextResponse.json({ success: true, categories }), {
    maxAge: 300,
    sMaxAge: 3600,
    staleWhileRevalidate: 86400,
  });
}
