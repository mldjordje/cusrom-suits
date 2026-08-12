import { notFound } from "next/navigation";
import WebShopView from "../../WebShopView";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { categoryRoutePath, getCategoryRoute } from "@/lib/storefront/categoryRoutes";
import { buildSeoMetadata } from "@/lib/seo";

type SearchParams = Record<string, string | string[] | undefined>;

const toStringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

/**
 * Filter/sort/pagination permutations of a category are the same products in a
 * different order — they must not compete with the clean category URL. They stay
 * `follow` so the product links on them are still crawled.
 */
const isFilteredView = (params: SearchParams) => {
  const page = Number.parseInt(toStringParam(params.page), 10) || 1;
  if (page > 1) return true;
  return ["sort", "size", "priceMin", "priceMax", "inStock", "onSale", "q"].some((key) =>
    Boolean(toStringParam(params[key])),
  );
};

// The page reads searchParams (filters, sort, lang), so the route renders
// dynamically and generateStaticParams would not apply. Unknown slugs are
// rejected by notFound() in the component below.

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const route = getCategoryRoute(slug);
  if (!route) {
    return buildSeoMetadata({
      title: "Kategorija nije pronadjena",
      description: "Trazena kategorija ne postoji u Santos & Santorini web shopu.",
      path: "/web-shop",
      noIndex: true,
    });
  }

  const lang = await resolveStorefrontLanguage(query);
  const isEn = lang === "en";
  const landing = await getLandingSettings();
  const ogImage = landing.shopHeroSections[0]?.image || landing.shopHeroImage || "/img/hero2.jpg";

  const metadata = buildSeoMetadata({
    title: isEn ? route.metaTitleEn : route.metaTitle,
    description: isEn ? route.metaDescriptionEn : route.metaDescription,
    // Always the clean category path, so filtered variants consolidate here.
    path: categoryRoutePath(route.slug),
    lang,
    image: ogImage,
    keywords: route.keywords,
  });

  if (isFilteredView(query)) {
    metadata.robots = {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    };
  }

  return metadata;
}

export default async function WebShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const route = getCategoryRoute(slug);
  if (!route) notFound();

  return <WebShopView searchParams={searchParams} categoryLock={route} />;
}
