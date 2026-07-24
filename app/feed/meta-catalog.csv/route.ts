import { NextResponse } from "next/server";
import { buildMetaCatalogCsv, loadFeedProducts } from "@/lib/catalog/productFeed";

export const revalidate = 3600;

export async function GET() {
  const products = await loadFeedProducts();
  const csv = buildMetaCatalogCsv(products);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="meta-catalog.csv"',
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
      "X-Feed-Item-Count": String(products.length),
    },
  });
}
