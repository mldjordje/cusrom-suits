import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";

// GSAP ScrollTrigger Powered Editorial Suite
import GsapHeroCinematic from "@/app/components/landing/GsapHeroCinematic";
import GsapCategoryRunway from "@/app/components/landing/GsapCategoryRunway";
import GsapParallaxProducts from "@/app/components/landing/GsapParallaxProducts";
import GsapBespokeScrubStage from "@/app/components/landing/GsapBespokeScrubStage";
import GsapHorizontalLookbook from "@/app/components/landing/GsapHorizontalLookbook";
import GsapHeritageCounter from "@/app/components/landing/GsapHeritageCounter";
import LandingTrustPillars from "@/app/components/landing/LandingTrustPillars";
import type { ProductItem } from "@/app/components/landing/LandingFeaturedProducts";

import "@/app/components/landing/LandingEditorialStyles.scss";

import {
  listCatalogProducts,
  productMatchesCategoryGroup,
  type CatalogProductView,
} from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import {
  getCatalogProductCategoryLabel,
  getCatalogProductDisplayName,
} from "@/lib/catalog/presentation";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { getCatalogProductImageSources } from "@/lib/storefront/product-details";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildSeoMetadata,
  buildWebSiteJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  return buildSeoMetadata({
    title: isEn ? "Santos & Santorini Menswear | Italian Sartoria" : "Santos & Santorini | Muška Odela & Šivenje po Meri",
    description: isEn
      ? "Luxury menswear, bespoke tailoring, Italian wool suits and accessories from Santos & Santorini."
      : "Vrhunska muška odela, sakoi, šivenje po meri od italijanskih tkanina i aksesoari brenda Santos & Santorini. Saloni u Nišu i Kruševcu.",
    path: "/",
    lang,
    keywords: ["muska odela", "odela po meri", "odela Nis", "italijanska odela", "bespoke tailoring Serbia"],
  });
}

function mapCatalogToProductItem(item: CatalogProductView, lang: "sr" | "en"): ProductItem {
  const sources = getCatalogProductImageSources(item);
  const title = getCatalogProductDisplayName(
    {
      name: item.name,
      sku: item.sku,
      manufCode: item.manufCode,
      categories: item.categories,
      brand: item.brand,
    },
    lang,
  );
  const categoryName = getCatalogProductCategoryLabel(
    {
      name: item.name,
      sku: item.sku,
      manufCode: item.manufCode,
      categories: item.categories,
      brand: item.brand,
    },
    lang,
  );

  const price = item.priceFinalGross || item.priceGross || 0;
  const compareAtPrice = item.priceGross && item.priceGross > price ? item.priceGross : null;

  let badge: string | null = null;
  if (compareAtPrice) {
    badge = "AKCIJA";
  } else if (item.landingFeatured) {
    badge = "NOVO";
  }

  const primaryImage = sources[0] || item.coverImage || "/img/hero.jpg";
  const hoverImage = sources.length > 1 ? sources[1] : undefined;
  const href = lang === "en" ? `/web-shop/${item.legacyId}?lang=en` : `/web-shop/${item.legacyId}`;

  return {
    id: item.legacyId,
    title,
    categoryName,
    price,
    compareAtPrice,
    image: primaryImage,
    hoverImage,
    href,
    badge,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  const brokenProductIds = await getBrokenProductIdSet();
  const excludeLegacyIds = brokenProductIds.size ? Array.from(brokenProductIds) : undefined;

  const [catalog, saleCatalog, landingSettings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 40,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds,
    }),
    listCatalogProducts({
      page: 1,
      pageSize: 12,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      onSale: true,
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds,
    }),
    getLandingSettings(),
  ]);

  const featuredItems: ProductItem[] = (catalog.items || [])
    .filter((item) => item.coverImage && item.coverImage.trim().length > 0)
    .slice(0, 8)
    .map((item) => mapCatalogToProductItem(item, lang));

  const saleItems: ProductItem[] = (saleCatalog.items || [])
    .filter((item) => item.coverImage && item.coverImage.trim().length > 0)
    .slice(0, 4)
    .map((item) => mapCatalogToProductItem(item, lang));

  const findCategoryImg = (group: string, fallbackIdx: number) => {
    const found = (catalog.items || []).find(
      (item) => productMatchesCategoryGroup(item, group) && item.coverImage && item.coverImage.trim().length > 0,
    );
    return found
      ? getCatalogProductImageSources(found)[0] || found.coverImage || "/img/hero.jpg"
      : featuredItems[fallbackIdx]?.image || "/img/hero.jpg";
  };

  // Category runway tiles
  const categoryTiles = [
    {
      id: "odela",
      label: "Odela & Sakoi",
      labelEn: "Suits & Blazers",
      href: "/web-shop?categoryGroup=odela",
      image: findCategoryImg("odela", 0),
    },
    {
      id: "kosulje",
      label: "Košulje",
      labelEn: "Shirts",
      href: "/web-shop?categoryGroup=kosulje",
      image: findCategoryImg("kosulje", 1),
    },
    {
      id: "obuca",
      label: "Obuća",
      labelEn: "Footwear",
      href: "/web-shop?categoryGroup=obuca",
      image: findCategoryImg("obuca", 2),
    },
    {
      id: "aksesoari",
      label: "Aksesoari",
      labelEn: "Accessories",
      href: "/web-shop?categoryGroup=aksesoari",
      image: findCategoryImg("aksesoari", 3),
    },
  ];

  return (
    <div className="ss-landing-root">
      <JsonLd
        data={[
          buildOrganizationJsonLd(),
          buildWebSiteJsonLd(),
          buildLocalBusinessJsonLd(),
        ]}
      />

      {/* 1. Clean Storefront Header */}
      <StorefrontHeader lang={lang} />

      {/* 2. GSAP Pinned Hero Cinematic */}
      <GsapHeroCinematic
        heroImage="/img/hero.jpg"
        lang={lang}
      />

      {/* 3. GSAP Staggered Category Runway */}
      <GsapCategoryRunway
        tiles={categoryTiles}
        lang={lang}
      />

      {/* 4. GSAP Parallax Products (Izdvojeni Modeli) */}
      <GsapParallaxProducts
        eyebrow={isEn ? "CURATED EDIT" : "NOVA KOLEKCIJA"}
        title={isEn ? "Featured Models 2026" : "Izdvojeni Modeli"}
        viewAllHref={isEn ? "/web-shop?lang=en" : "/web-shop"}
        viewAllText={isEn ? "View All →" : "Pogledaj Sve →"}
        products={featuredItems}
        theme="light"
      />

      {/* 5. GSAP Pinned Bespoke Anatomy & Tailoring Stage */}
      <GsapBespokeScrubStage lang={lang} />

      {/* 6. Special Sale (if sale items present) */}
      {saleItems.length > 0 && (
        <GsapParallaxProducts
          eyebrow={isEn ? "SEASON SALE" : "POSEBNA PONUDA"}
          title={isEn ? "Limited Offers" : "Aktuelne Akcije"}
          viewAllHref={isEn ? "/web-shop?onSale=1&lang=en" : "/web-shop?onSale=1"}
          viewAllText={isEn ? "All Sale Items →" : "Svi Modeli na Popustu →"}
          products={saleItems}
          theme="light"
        />
      )}

      {/* 7. GSAP Pinned Horizontal Runway Lookbook */}
      <GsapHorizontalLookbook lang={lang} />

      {/* 8. GSAP Heritage ScrollTrigger Counter & Showrooms */}
      <GsapHeritageCounter lang={lang} />

      {/* 9. Luxury Trust Pillars */}
      <LandingTrustPillars lang={lang} />

      {/* 10. Storefront Footer */}
      <StorefrontFooter lang={lang} />
    </div>
  );
}
