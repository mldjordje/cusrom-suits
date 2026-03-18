import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog/store";

export async function GET() {
  const result = await listCatalogProducts({
    page: 1,
    pageSize: 1,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
  });

  const categories = result.categories
    .map((category) => ({ id: category.id, name: category.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "sr"));

  return NextResponse.json({ success: true, categories });
}
