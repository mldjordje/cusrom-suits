import { permanentRedirect, notFound } from "next/navigation";
import { listCatalogProducts, normalizeCatalogCategoryGroupKey } from "@/lib/catalog/store";
import { LEGAL_PAGE_ALIASES } from "@/lib/storefront/legalPages";
import { categoryPathForGroupKey } from "@/lib/storefront/categoryRoutes";

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

  // Every redirect here is permanent (308). The old site's category URLs
  // (/Odeca/Odelo, /Aksesoari/Kaisevi, /Outlet/*) have years of accumulated
  // links; a temporary redirect tells search engines to keep the old URL and
  // consolidates none of that into the new one.
  const legalAlias = LEGAL_PAGE_ALIASES[singleSegment];
  if (legalAlias) {
    permanentRedirect(`/${legalAlias}${langSuffix}`);
  }

  // Prefer the dedicated category route. `/Odeca/Odelo` and `/Outlet/Odeca/Odela`
  // both normalise to the "odelo" group, so a legacy path lands on the indexable
  // /web-shop/kategorija/odela instead of a query-param view that canonicalises away.
  // Most specific segment first. `/Aksesoari/Kaisevi` resolves "kais" before
  // "aksesoari"; "kais" has no route of its own, so the broader parent wins
  // rather than the path falling through to the query-param branch.
  const legacyCategoryPath = requestedPath
    .slice()
    .reverse()
    .map(normalizeCatalogCategoryGroupKey)
    .filter(Boolean)
    .map(categoryPathForGroupKey)
    .find(Boolean);
  if (legacyCategoryPath) {
    permanentRedirect(`${legacyCategoryPath}${langSuffix}`);
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
    permanentRedirect(`/web-shop?categoryId=${matchedCategory.id}${langSuffix ? "&lang=en" : ""}`);
  }

  notFound();
}
