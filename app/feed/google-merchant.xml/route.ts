import { NextResponse } from "next/server";
import { buildGoogleMerchantXml, loadFeedProducts } from "@/lib/catalog/productFeed";
import { SITE_NAME } from "@/lib/seo";

// Merchant Center fetches this once a day; an hour of cache is plenty and keeps
// the catalog scan off the request path for normal traffic.
export const revalidate = 3600;

export async function GET() {
  const products = await loadFeedProducts();
  const xml = buildGoogleMerchantXml(products, SITE_NAME);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
      "X-Feed-Item-Count": String(products.length),
    },
  });
}
