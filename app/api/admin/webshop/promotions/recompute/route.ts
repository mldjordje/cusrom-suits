import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { countPromotionImpactedProducts, listPromotionRules } from "@/lib/catalog/promotions";
import { listCatalogProducts } from "@/lib/catalog/store";

const loadAllCatalogItems = async () => {
  const pageSize = 120;
  let page = 1;
  let totalPages = 1;
  const allItems: Awaited<ReturnType<typeof listCatalogProducts>>["items"] = [];

  while (page <= totalPages) {
    const result = await listCatalogProducts({
      page,
      pageSize,
      activeOnly: false,
      exportOnly: false,
      applyPromotions: false,
    });
    allItems.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  }

  return allItems;
};

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const rules = await listPromotionRules();
  const products = await loadAllCatalogItems();
  const impacted = countPromotionImpactedProducts(products, rules);

  return NextResponse.json({
    success: true,
    computedAt: new Date().toISOString(),
    activeRules: rules.length,
    impactedProducts: impacted,
  });
}
