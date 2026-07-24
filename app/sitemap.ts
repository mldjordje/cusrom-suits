import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/blog/store";
import { listCatalogProducts } from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { absoluteUrl, withStorefrontLanguage } from "@/lib/seo";

const hreflangAlternates = (path: string): MetadataRoute.Sitemap[number]["alternates"] => ({
  languages: {
    "sr-RS": absoluteUrl(path),
    "en-US": absoluteUrl(withStorefrontLanguage(path, "en")),
  },
});

const STATIC_ROUTES = [
  "/",
  "/web-shop",
  "/akcije",
  "/blog",
  "/kontakt",
  "/o-nama",
  "/dokumenta",
  "/polisa_privatnosti",
  "/uslovi_kupovine",
  "/reklamacije",
  "/isporuka",
  "/uslovi_koriscenja_kolacica",
  "/nacinplacanja",
  "/poslovne-uniforme",
  "/prodajna-mesta",
  "/custom-suits",
  "/muska-odela",
  "/odela-nis",
  "/odela-srbija",
];

async function loadAllCatalogProductPaths() {
  // Must match the filters /web-shop uses. The sitemap previously asked only for
  // `requireImages`, so it advertised products the shop itself hides behind
  // `requireDirectImages` + the media-health exclusion list — Google crawled
  // URLs that redirect or render as dead ends.
  const brokenProductIds = await getBrokenProductIdSet();
  const sharedFilters = {
    pageSize: 120,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireDirectImages: true,
    excludeLegacyIds: brokenProductIds.size ? Array.from(brokenProductIds) : undefined,
  } as const;

  const firstPage = await listCatalogProducts({ page: 1, ...sharedFilters });

  const pages = Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) => index + 2);
  const rest = await Promise.all(
    pages.map((page) => listCatalogProducts({ page, ...sharedFilters })),
  );

  return [firstPage, ...rest]
    .flatMap((result) => result.items)
    .map((item) => ({ path: `/web-shop/${item.legacyId}` }));
}

async function loadAllBlogPaths() {
  const result = await listPosts({
    type: "all",
    page: 1,
    pageSize: 100,
    onlyPublished: true,
  });

  return result.items.map((post) => ({
    path: `/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || post.createdAt,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productPaths, blogEntries] = await Promise.all([
    loadAllCatalogProductPaths(),
    loadAllBlogPaths(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    alternates: hreflangAlternates(path),
    changeFrequency: path === "/" ? "weekly" : path === "/akcije" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/web-shop" || path === "/custom-suits" ? 0.9 : path === "/akcije" ? 0.85 : 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = productPaths.map(({ path }) => ({
    url: absoluteUrl(path),
    alternates: hreflangAlternates(path),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogSitemapEntries: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: absoluteUrl(entry.path),
    alternates: hreflangAlternates(entry.path),
    lastModified: entry.lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries, ...blogSitemapEntries];
}
