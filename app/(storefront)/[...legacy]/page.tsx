import { redirect, notFound } from "next/navigation";
import { listCatalogProducts } from "@/lib/catalog/store";
import { LEGAL_PAGE_ALIASES } from "@/lib/storefront/legalPages";

const normalizeLegacyToken = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildLangSuffix = (lang: string | string[] | undefined) => {
  const current = Array.isArray(lang) ? lang[0] : lang;
  return current === "en" ? "?lang=en" : "";
};

export default async function LegacyStorefrontCatchAll({
  params,
  searchParams,
}: {
  params: Promise<{ legacy: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ legacy }, query] = await Promise.all([params, searchParams]);
  const requestedPath = legacy.map((segment) => decodeURIComponent(segment));
  const singleSegment = requestedPath.length === 1 ? normalizeLegacyToken(requestedPath[0] || "") : "";
  const langSuffix = buildLangSuffix(query.lang);

  const legalAlias = LEGAL_PAGE_ALIASES[singleSegment];
  if (legalAlias) {
    redirect(`/${legalAlias}${langSuffix}`);
  }

  const catalog = await listCatalogProducts({
    page: 1,
    pageSize: 1,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireImages: true,
  });

  const requestedKey = requestedPath.map(normalizeLegacyToken).join("/");
  const matchedCategory = catalog.categories.find((category) => {
    const categoryPath = (category.path.length > 0 ? category.path : [category.name]).map(normalizeLegacyToken).join("/");
    return categoryPath === requestedKey;
  });

  if (matchedCategory) {
    redirect(`/web-shop?categoryId=${matchedCategory.id}${langSuffix ? "&lang=en" : ""}`);
  }

  notFound();
}
