import { NextRequest, NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { applyPublicCache } from "@/lib/http/cache";

export const revalidate = 60;

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 6;

export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ success: true, results: [], total: 0 });
  }

  const brokenProductIds = await getBrokenProductIdSet();
  const result = await listCatalogProducts({
    page: 1,
    pageSize: RESULT_LIMIT,
    query: q,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireDirectImages: true,
    // No live reachability HEAD probe here — it added latency to every keystroke and
    // dropped valid results on transient timeouts. Rely on the persisted media-health
    // scan instead (same as the web-shop catalog).
    excludeLegacyIds: brokenProductIds.size ? Array.from(brokenProductIds) : undefined,
  });

  const results = result.items.map((item) => ({
    legacyId: item.legacyId,
    sku: item.sku,
    name: item.name,
    nameEn: item.nameEn,
    image: item.coverImage || item.images[0] || null,
    priceGross: item.priceGross,
    priceFinalGross: item.priceFinalGross,
    stock: Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0)),
    categoryName: item.categories[0]?.name || null,
  }));

  return applyPublicCache(
    NextResponse.json({
      success: true,
      results,
      total: result.total,
    }),
    {
      maxAge: 30,
      sMaxAge: 120,
      staleWhileRevalidate: 600,
    },
  );
}
