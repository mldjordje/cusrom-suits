import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import HomeHeroVideo from "@/app/components/storefront/HomeHeroVideo";
import HomeCategoryTiles from "@/app/components/storefront/HomeCategoryTiles";
import CustomSuitsEditorialBanner from "@/app/components/storefront/CustomSuitsEditorialBanner";
import PremiumProductCard from "@/app/components/storefront/PremiumProductCard";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import Reveal from "@/app/components/motion/Reveal";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import SectionHeadingReveal from "@/app/components/motion/SectionHeadingReveal";
import {
  getCatalogProductByLegacyId,
  getCatalogProductVariantsBySku,
  listCatalogProducts,
  productMatchesCategoryGroup,
  type CatalogProductView,
} from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import {
  applyVariantPriceIndex,
  buildVariantPriceIndexBySku,
  calcDiscountPercent,
  hasUsableDisplayPrice,
  resolveCardPrice,
  resolveDisplayFinalPrice,
  resolveDisplayGrossPrice,
} from "@/lib/catalog/pricing";
import ProductCardPrice from "@/app/components/storefront/ProductCardPrice";
import {
  getCatalogProductCategoryLabel,
  getCatalogProductDisplayName,
  isCatalogProductNameSuspicious,
} from "@/lib/catalog/presentation";
import { listPosts } from "@/lib/blog/store";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import {
  buildLandingProductSectionMap,
  buildLandingProductSectionContentMap,
  normalizeLandingCustomSections,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductSectionKey,
} from "@/lib/catalog/landingSections";
import {
  getOrderedLandingPageEntries,
  normalizeLandingFixedSections,
  type LandingFixedSectionKey,
} from "@/lib/catalog/landingPageSections";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { getCatalogProductImageSources } from "@/lib/storefront/product-details";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildSeoMetadata,
  buildWebSiteJsonLd,
} from "@/lib/seo";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  return buildSeoMetadata({
    title: isEn ? "Santos & Santorini Menswear" : "Santos & Santorini muska moda",
    description: isEn
      ? "Menswear, ready-to-wear collection, custom suits and business uniforms from Santos & Santorini in Nis."
      : "Muska moda, ready-to-wear kolekcija, custom suits i poslovne uniforme brenda Santos & Santorini iz Nisa.",
    path: "/",
    lang,
    keywords: ["ready to wear", "menswear Serbia", "odela Nis", "business uniforms"],
  });
}

const pickProductsForSection = <T extends { legacyId: number }>(
  source: T[],
  preferredIds: number[],
  limit: number,
  fallback: T[],
): T[] => {
  const byId = new Map<number, T>(source.map((item) => [item.legacyId, item]));
  const result: T[] = [];
  const seen = new Set<number>();

  for (const rawId of preferredIds || []) {
    const id = Number(rawId);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const found = byId.get(id);
    if (!found) continue;
    result.push(found);
    seen.add(id);
    if (result.length >= limit) return result;
  }

  for (const item of fallback) {
    if (seen.has(item.legacyId)) continue;
    result.push(item);
    seen.add(item.legacyId);
    if (result.length >= limit) break;
  }

  return result;
};

const dedupeProductsBySku = <T extends { legacyId: number; sku?: string | null }>(items: T[]) => {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = String(item.sku || item.legacyId).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const getSkuKey = (item: { legacyId: number; sku?: string | null }) =>
  String(item.sku || item.legacyId).trim().toLowerCase();

const getProductDisplayName = (item: CatalogProductView, lang: "sr" | "en") =>
  getCatalogProductDisplayName(
    {
      name: item.name,
      sku: item.sku,
      manufCode: item.manufCode,
      categories: item.categories,
      brand: item.brand,
    },
    lang,
  );

const getProductCategoryLabel = (item: CatalogProductView, lang: "sr" | "en") =>
  getCatalogProductCategoryLabel(
    {
      name: item.name,
      sku: item.sku,
      manufCode: item.manufCode,
      categories: item.categories,
      brand: item.brand,
    },
    lang,
  );

const scoreLandingProduct = (item: CatalogProductView, lang: "sr" | "en") => {
  const displayName = getProductDisplayName(item, lang);
  const suspicious = isCatalogProductNameSuspicious(displayName);
  const stock = Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0));

  let score = 0;
  if (item.coverImage) score += 30;
  if (item.categories.length > 0) score += 22;
  if (!suspicious) score += 42;
  if (displayName !== getProductCategoryLabel(item, lang)) score += 12;
  if (stock > 0) score += Math.min(stock, 12);
  if (item.priceFinalGross > 0) score += 6;
  if (item.priceGross > item.priceFinalGross || item.rebatePercent > 0) score += 4;

  return score;
};

const sortLandingProducts = (items: CatalogProductView[], lang: "sr" | "en") =>
  [...items].sort((left, right) => {
    const scoreDiff = scoreLandingProduct(right, lang) - scoreLandingProduct(left, lang);
    if (scoreDiff !== 0) return scoreDiff;
    return right.legacyId - left.legacyId;
  });

const hasVisibleProductImage = (item: CatalogProductView) =>
  Boolean(
    (item.coverImage && item.coverImage.trim().length > 0) ||
      item.images.some((image) => String(image || "").trim().length > 0),
  );

const resolveAnomalousProductPrice = async (item: CatalogProductView): Promise<CatalogProductView> => {
  if (hasUsableDisplayPrice(item)) return item;
  const variants = await getCatalogProductVariantsBySku(item.sku, {
    applyPromotions: true,
    activeOnly: true,
    exportOnly: true,
  });
  if (!variants.length) return item;

  const priceFinalGross = resolveDisplayFinalPrice(item, variants);
  const priceGross = Math.max(resolveDisplayGrossPrice(item, variants), priceFinalGross);
  if (!hasUsableDisplayPrice({ priceGross, priceFinalGross })) return item;

  return {
    ...item,
    priceGross,
    priceFinalGross,
    rebatePercent: calcDiscountPercent(priceGross, priceFinalGross),
  };
};

const preferDirectMediaProducts = (items: CatalogProductView[], minimumCount: number) => {
  const direct = items.filter((item) => item.hasDirectMedia);
  return direct.length >= minimumCount ? direct : items.filter(hasVisibleProductImage);
};

const pickProductsForSectionManaged = <T extends { legacyId: number; sku?: string | null }>(
  source: T[],
  preferredIds: number[],
  limit: number,
  fallback: T[],
  usedSkuKeys: Set<string>,
) => {
  const primary = pickProductsForSection(source, preferredIds, limit, []);
  const backup = dedupeProductsBySku([...fallback, ...source]);
  const out: T[] = [];
  const sectionSkuKeys = new Set<string>();

  const takePreferredCandidate = (candidate: T) => {
    const key = getSkuKey(candidate);
    if (!key) return false;
    sectionSkuKeys.add(key);
    out.push(candidate);
    return out.length >= limit;
  };

  const takeFallbackCandidate = (candidate: T) => {
    const key = getSkuKey(candidate);
    if (!key || usedSkuKeys.has(key) || sectionSkuKeys.has(key)) return false;
    sectionSkuKeys.add(key);
    out.push(candidate);
    return out.length >= limit;
  };

  for (const candidate of primary) {
    if (takePreferredCandidate(candidate)) {
      sectionSkuKeys.forEach((key) => usedSkuKeys.add(key));
      return out;
    }
  }
  for (const candidate of backup) {
    if (takeFallbackCandidate(candidate)) {
      sectionSkuKeys.forEach((key) => usedSkuKeys.add(key));
      return out;
    }
  }

  sectionSkuKeys.forEach((key) => usedSkuKeys.add(key));
  return out;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const withLang = (href: string) => {
    if (!isEn || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const withOptionalLang = (href: string) => (href.startsWith("/") ? withLang(href) : href);

  const brokenProductIds = await getBrokenProductIdSet();
  const excludeLegacyIds = brokenProductIds.size ? Array.from(brokenProductIds) : undefined;
  const [catalog, saleCatalog, posts, landingSettings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 1000,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds,
    }),
    listCatalogProducts({
      page: 1,
      pageSize: 1000,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      onSale: true,
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds,
    }),
    listPosts({
      type: "all",
      page: 1,
      pageSize: 4,
      onlyPublished: true,
    }),
    getLandingSettings(),
  ]);

  const contentLang: "sr" | "en" = isEn ? "en" : "sr";
  const tx = (value: string, fallbackEn?: string) =>
    localizeDynamicStorefrontText(value, contentLang, fallbackEn);
  const productSectionContentMap = buildLandingProductSectionContentMap(landingSettings.productSectionContent);
  const storyCards = landingSettings.storyCards.filter(
    (item) => item.title || item.copy || item.image || item.ctaLabel,
  );
  const aboutParagraphs = landingSettings.aboutParagraphs.filter(Boolean);
  const contactPoints = landingSettings.contactPoints.filter((item) => item.label || item.value);
  const landingDocuments = landingSettings.documents.filter((item) => item.title && item.url);
  const landingUniformImages = [
    ...landingSettings.uniformsImages.filter((item) => item.image),
    ...landingSettings.uniformsVideos
      .filter((item) => item.poster)
      .map((item, index) => ({
        title: item.title || `uniform-video-${index + 1}`,
        image: item.poster,
        alt: item.alt || item.title,
      })),
  ];
  const pinnedProductIds = Array.from(
    new Set(
      [
        ...landingSettings.heroStripProductIds,
        ...landingSettings.highlightedProductIds,
        ...landingSettings.popularProductIds,
        ...landingSettings.arrivalsProductIds,
        ...landingSettings.saleProductIds,
        ...landingSettings.trendingProductIds,
        ...landingSettings.customSections.flatMap((section) => section.productIds),
      ]
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item)),
    ),
  );
  const pinnedProductsRaw = (
    await Promise.all(pinnedProductIds.map((id) => getCatalogProductByLegacyId(id, { allowLegacyMediaFallback: false })))
  ).filter((item): item is CatalogProductView =>
    Boolean(
      item?.isActive &&
        item?.isExported &&
        hasVisibleProductImage(item) &&
        !brokenProductIds.has(item.legacyId),
    ),
  );

  // Pinned products are fetched by a single legacyId (one size variant), so their
  // price may be lower than the model's. The index carries the variant spread as
  // well, which is what lets these cards render "od X" exactly like the shop grid
  // instead of quoting one size's price for the whole article.
  const variantPriceIndex = buildVariantPriceIndexBySku(catalog.items);
  const pinnedProducts = await Promise.all(
    pinnedProductsRaw.map((item) => resolveAnomalousProductPrice(applyVariantPriceIndex(item, variantPriceIndex))),
  );
  const saleCatalogItems = await Promise.all(
    saleCatalog.items.map((item) => resolveAnomalousProductPrice(applyVariantPriceIndex(item, variantPriceIndex))),
  );

  const pinnedProductsById = new Map(pinnedProducts.map((item) => [item.legacyId, item]));

  const landingPoolUnique = sortLandingProducts(
    dedupeProductsBySku(preferDirectMediaProducts([...pinnedProducts, ...catalog.items], 12)),
    contentLang,
  );

  const saleManualPool = landingSettings.saleProductIds
    .map((id) => pinnedProductsById.get(id))
    .filter((item): item is CatalogProductView => Boolean(item));
  const salePool = sortLandingProducts(
    preferDirectMediaProducts(dedupeProductsBySku([...pinnedProducts, ...saleCatalogItems]), 4).filter(
      (item) =>
        landingSettings.saleProductIds.includes(item.legacyId) ||
        item.priceGross > item.priceFinalGross,
    ),
    contentLang,
  );

  const usedSkuKeys = new Set<string>();
  const heroStripProducts = pickProductsForSectionManaged(
    landingPoolUnique,
    landingSettings.heroStripProductIds,
    8,
    landingPoolUnique.slice(0, 24),
    usedSkuKeys,
  );
  const heroProducts = pickProductsForSectionManaged(
    landingPoolUnique,
    landingSettings.highlightedProductIds,
    8,
    landingPoolUnique.slice(0, 24),
    usedSkuKeys,
  );
  const featured = pickProductsForSectionManaged(
    landingPoolUnique,
    landingSettings.popularProductIds,
    4,
    landingPoolUnique.slice(0, 24),
    usedSkuKeys,
  );
  const arrivals = pickProductsForSectionManaged(
    landingPoolUnique,
    landingSettings.arrivalsProductIds,
    4,
    landingPoolUnique.slice(8, 32),
    usedSkuKeys,
  );
  const trending = pickProductsForSectionManaged(
    landingPoolUnique,
    landingSettings.trendingProductIds,
    4,
    landingPoolUnique.slice(16, 40),
    usedSkuKeys,
  );
  const saleItems = pickProductsForSection(
    [...saleManualPool, ...salePool],
    landingSettings.saleProductIds,
    Math.max(6, landingSettings.saleProductIds.length || 0),
    salePool.slice(0, 16),
  );
  const landingSectionStateMap = buildLandingProductSectionMap(landingSettings.productSections);
  const heroStripEnabled = landingSectionStateMap.get("heroStripProductIds")?.enabled !== false;
  const customGridSections = normalizeLandingCustomSections(landingSettings.customSections)
    .map((section) => ({
      section,
      items: pickProductsForSectionManaged(
        landingPoolUnique,
        section.productIds,
        Math.max(section.productIds.length, 1),
        landingPoolUnique,
        usedSkuKeys,
      ),
    }))
    .filter(({ section, items }) => section.enabled && items.length > 0);

  const orderedGridSections: Array<
    | { kind: "builtin"; key: LandingProductSectionKey; order: number }
    | { kind: "custom"; section: LandingCustomSection; items: CatalogProductView[]; order: number }
  > = [
    ...normalizeLandingProductSections(landingSettings.productSections)
      .filter((section) => section.enabled)
      .map((section) => ({
        kind: "builtin" as const,
        key: section.key,
        order: section.order,
      }))
      .filter((entry) => {
        if (entry.key === "heroStripProductIds") return heroStripProducts.length > 0;
        if (entry.key === "highlightedProductIds") return heroProducts.length > 0;
        if (entry.key === "popularProductIds") return featured.length > 0;
        if (entry.key === "arrivalsProductIds") return arrivals.length > 0;
        if (entry.key === "saleProductIds") return saleItems.length > 0;
        if (entry.key === "trendingProductIds") return trending.length > 0;
        return false;
      }),
    ...customGridSections.map(({ section, items }) => ({
      kind: "custom" as const,
      section,
      items,
      order: section.order,
    })),
  ].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    if (left.kind === "builtin" && right.kind === "builtin") return left.key.localeCompare(right.key);
    if (left.kind === "custom" && right.kind === "custom") return left.section.title.localeCompare(right.section.title);
    return left.kind === "builtin" ? -1 : 1;
  });
  const fixedSectionStateMap = new Map(normalizeLandingFixedSections(landingSettings.fixedSections).map((section) => [section.key, section]));
  const customGridSectionById = new Map(customGridSections.map((entry) => [entry.section.id, entry]));
  const orderedLandingPageEntries = getOrderedLandingPageEntries(
    landingSettings.fixedSections,
    landingSettings.productSections,
    landingSettings.customSections,
  ).filter((entry) => {
    if (entry.kind === "fixed") return fixedSectionStateMap.get(entry.key)?.enabled !== false;
    if (entry.kind === "custom") return customGridSectionById.has(entry.id);
    // Hero strip products now render INSIDE the hero section (HomeHeroVideo
    // showProductCards), so never emit them as a standalone section below it.
    if (entry.key === "heroStripProductIds") return false;
    if (entry.key === "highlightedProductIds") return heroProducts.length > 0;
    if (entry.key === "popularProductIds") return featured.length > 0;
    if (entry.key === "arrivalsProductIds") return arrivals.length > 0;
    if (entry.key === "saleProductIds") return saleItems.length > 0;
    if (entry.key === "trendingProductIds") return trending.length > 0;
    return false;
  });
  const topGridSections: typeof orderedGridSections = [];
  const bottomGridSections: typeof orderedGridSections = [];
  const getSectionContent = (key: LandingProductSectionKey) => productSectionContentMap.get(key);

  const renderGridSection = (key: LandingProductSectionKey) => {
    const carousel = landingSectionStateMap.get(key)?.layout === "carousel";
    const gridProducts = carousel
      ? "ss-landing-product-row ss-landing-product-row--carousel"
      : "row row-cols-2 row-cols-lg-4 g-3 g-md-4";
    const gridFeatured = carousel
      ? "ss-landing-product-row ss-landing-product-row--carousel"
      : "row row-cols-2 row-cols-md-4 g-2 g-md-3 ss-feature-strip";

    if (key === "heroStripProductIds") {
      return (
        <section key={key} className="products-grid container pb-5 ss-editorial-section ss-editorial-section--hero-strip">
          <div className="row row-cols-2 row-cols-md-4 g-2 g-md-3 ss-feature-strip">
            {heroStripProducts.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="col" index={index}>
                <PremiumProductCard
                  href={withLang(`/web-shop/${item.legacyId}`)}
                  primarySrc={getCatalogProductImageSources(item, [], ["/img/odela.jpg"])[0] || "/img/odela.jpg"}
                  hoverSrc={getCatalogProductImageSources(item, [], ["/img/odela.jpg"])[1]}
                  categoryLabel={getProductCategoryLabel(item, contentLang)}
                  title={getProductDisplayName(item, contentLang)}
                  // Keeps this card's own price classes (no "money price" here)
                  // while picking up the shared range/sale decision.
                  price={(() => {
                    const price = resolveCardPrice(item);
                    if (price.kind === "range") return `od ${formatRsd(price.from)}`;
                    if (price.kind === "sale") {
                      return (
                        <>
                          <span className="price-old">{formatRsd(price.gross)}</span>
                          <span className="price-sale">{formatRsd(price.final)}</span>
                        </>
                      );
                    }
                    return formatRsd(price.kind === "single" ? price.final : item.priceFinalGross);
                  })()}
                  isSale={resolveCardPrice(item).kind === "sale"}
                />
              </ProductItemMotion>
            ))}
          </div>
        </section>
      );
    }

    if (key === "highlightedProductIds") {
      const sectionContent = getSectionContent(key);
      return (
        <section key={key} className="container pb-5 ss-editorial-section ss-editorial-section--featured">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title text-uppercase">
              {tx(sectionContent?.title || (isEn ? "Editor's picks" : "Izdvojeni modeli"), "Editor's picks")}
            </SectionHeadingReveal>
            {sectionContent?.ctaLabel ? (
              <Link href={withOptionalLang(sectionContent.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(sectionContent.ctaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          {sectionContent?.subtitle ? <p className="text-secondary mb-4">{tx(sectionContent.subtitle)}</p> : null}
          <div className={gridFeatured}>
            {heroProducts.map((item, index) => (
              <ProductItemMotion key={item.legacyId} index={index}>
                <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false} className="d-block ss-featured-tile">
                  <StorefrontImage
                    sources={getCatalogProductImageSources(item, [], ["/img/odela.jpg"])}
                    width={330}
                    height={400}
                    alt={getProductDisplayName(item, contentLang)}
                    className="w-100 mb-2 ss-uniform-tile"
                  />
                  <span className="menu-link menu-link_us-s fw-semi-bold fs-16 text-uppercase">
                    {getProductDisplayName(item, contentLang)}
                  </span>
                  <span className="ss-featured-tile__meta" aria-hidden="true">
                    <ProductCardPrice item={item} isEn={isEn} as="none" />
                  </span>
                  <span className="ss-featured-tile__overlay" aria-hidden="true">
                    <span className="ss-featured-tile__overlay-inner">
                      <span className="ss-featured-tile__overlay-category">
                        {getProductCategoryLabel(item, contentLang)}
                      </span>
                      <span className="ss-featured-tile__overlay-title">
                        {getProductDisplayName(item, contentLang)}
                      </span>
                      <span className="ss-featured-tile__overlay-price">
                        <ProductCardPrice item={item} isEn={isEn} as="none" />
                      </span>
                      <span className="ss-featured-tile__overlay-cta">
                        {contentLang === "en" ? "View product" : "Pogledaj proizvod"}
                      </span>
                    </span>
                  </span>
                </Link>
              </ProductItemMotion>
            ))}
          </div>
        </section>
      );
    }

    if (key === "popularProductIds") {
      const sectionContent = getSectionContent(key);
      return (
        <section key={key} className="products-grid container ss-editorial-section ss-editorial-section--products">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title">
              {tx(sectionContent?.title || (isEn ? "Popular styles" : "Popularni modeli"), "Popular styles")}
            </SectionHeadingReveal>
            {sectionContent?.ctaLabel ? (
              <Link href={withOptionalLang(sectionContent.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(sectionContent.ctaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          {sectionContent?.subtitle ? <p className="text-secondary mb-4">{tx(sectionContent.subtitle)}</p> : null}
          <div className="row row-cols-2 row-cols-lg-4 g-3 g-md-4">
            {featured.map((item, index) => {
              const srcs = getCatalogProductImageSources(item, [], ["/img/odela2.jpg"]);
              const isSale = item.priceGross > item.priceFinalGross;
              return (
                <ProductItemMotion key={item.legacyId} className="col" index={index}>
                  <PremiumProductCard
                    href={withLang(`/web-shop/${item.legacyId}`)}
                    primarySrc={srcs[0] ?? "/img/odela2.jpg"}
                    hoverSrc={srcs[1]}
                    title={getProductDisplayName(item, contentLang)}
                    categoryLabel={getProductCategoryLabel(item, contentLang)}
                    isSale={isSale}
                    price={
                      isSale ? (
                        <>
                          <span className="price-old">{formatRsd(item.priceGross)}</span>
                          <span className="price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </>
                      ) : (
                        <span>{formatRsd(item.priceFinalGross)}</span>
                      )
                    }
                  />
                </ProductItemMotion>
              );
            })}
          </div>
        </section>
      );
    }

    if (key === "arrivalsProductIds") {
      const sectionContent = getSectionContent(key);
      return (
        <section key={key} className="products-grid container ss-editorial-section ss-editorial-section--arrivals">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title">
              {tx(sectionContent?.title || (isEn ? "New arrivals" : "Nove kolekcije"), "New arrivals")}
            </SectionHeadingReveal>
            {sectionContent?.ctaLabel ? (
              <Link href={withOptionalLang(sectionContent.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(sectionContent.ctaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          {sectionContent?.subtitle ? <p className="text-secondary mb-4">{tx(sectionContent.subtitle)}</p> : null}
          <div className="row row-cols-2 row-cols-lg-4 g-3 g-md-4">
            {arrivals.map((item, index) => {
              const srcs = getCatalogProductImageSources(item, [], ["/img/hero2.jpg"]);
              const isSale = item.priceGross > item.priceFinalGross;
              return (
                <ProductItemMotion key={item.legacyId} className="col" index={index}>
                  <PremiumProductCard
                    href={withLang(`/web-shop/${item.legacyId}`)}
                    primarySrc={srcs[0] ?? "/img/hero2.jpg"}
                    hoverSrc={srcs[1]}
                    title={getProductDisplayName(item, contentLang)}
                    categoryLabel={getProductCategoryLabel(item, contentLang)}
                    isNew={true}
                    isSale={isSale}
                    price={
                      isSale ? (
                        <>
                          <span className="price-old">{formatRsd(item.priceGross)}</span>
                          <span className="price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </>
                      ) : (
                        <span>{formatRsd(item.priceFinalGross)}</span>
                      )
                    }
                  />
                </ProductItemMotion>
              );
            })}
          </div>
        </section>
      );
    }

    if (key === "saleProductIds") {
      const sectionContent = getSectionContent(key);
      return (
        <section key={key} className="products-grid container ss-editorial-section ss-editorial-section--sale">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title text-uppercase">
              {tx(sectionContent?.title || landingSettings.saleSectionTitle, "Current Sale")}
            </SectionHeadingReveal>
            {sectionContent?.ctaLabel ? (
              <Link href={withOptionalLang(sectionContent.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(sectionContent.ctaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          {sectionContent?.subtitle || landingSettings.saleSectionSubtitle ? (
            <p className="text-secondary mb-4">{tx(sectionContent?.subtitle || landingSettings.saleSectionSubtitle)}</p>
          ) : null}
          <div className={gridProducts}>
            {saleItems.map((item, index) => (
              <ProductItemMotion key={`sale-${item.legacyId}`} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                      <StorefrontImage
                        sources={getCatalogProductImageSources(item, [], ["/img/odela.jpg"])}
                        width={330}
                        height={400}
                        alt={getProductDisplayName(item, contentLang)}
                        className="pc__img"
                      />
                      <span className="ss-product-card__quick-link">
                        {contentLang === "en" ? "View product" : "Pogledaj proizvod"}
                      </span>
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <p className="pc__category">{getProductCategoryLabel(item, contentLang)}</p>
                    <h6 className="pc__title">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                        {getProductDisplayName(item, contentLang)}
                      </Link>
                    </h6>
                    <ProductCardPrice item={item} isEn={isEn} />
                  </div>
                </div>
              </ProductItemMotion>
            ))}
          </div>
        </section>
      );
    }

    if (key === "trendingProductIds") {
      const sectionContent = getSectionContent(key);
      return (
        <section key={key} className="products-grid container ss-editorial-section ss-editorial-section--trending">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title text-uppercase">
              {tx(sectionContent?.title || (isEn ? "Trending now" : "Trendovi sezone"), "Trending now")}
            </SectionHeadingReveal>
            {sectionContent?.ctaLabel ? (
              <Link href={withOptionalLang(sectionContent.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(sectionContent.ctaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          {sectionContent?.subtitle ? <p className="text-secondary mb-4">{tx(sectionContent.subtitle)}</p> : null}
          <div className={gridProducts}>
            {trending.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                      <StorefrontImage
                        sources={getCatalogProductImageSources(item, [], ["/img/hero2.jpg"])}
                        width={330}
                        height={400}
                        alt={getProductDisplayName(item, contentLang)}
                        className="pc__img"
                      />
                      <span className="ss-product-card__quick-link">
                        {contentLang === "en" ? "View product" : "Pogledaj proizvod"}
                      </span>
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <p className="pc__category">{getProductCategoryLabel(item, contentLang)}</p>
                    <h6 className="pc__title">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                        {getProductDisplayName(item, contentLang)}
                      </Link>
                    </h6>
                    <ProductCardPrice item={item} isEn={isEn} />
                  </div>
                </div>
              </ProductItemMotion>
            ))}
          </div>
        </section>
      );
    }

    return null;
  };

  const renderCustomGridSection = (section: LandingCustomSection, items: CatalogProductView[]) => {
    const carousel = section.layout === "carousel";
    const gridProducts = carousel
      ? "ss-landing-product-row ss-landing-product-row--carousel"
      : "row row-cols-2 row-cols-lg-4 g-3 g-md-4";
    return (
    <section key={section.id} className="products-grid container ss-editorial-section ss-editorial-section--custom">
      <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
        <SectionHeadingReveal className="section-title text-uppercase">
          {tx(section.title || (isEn ? "Santos selection" : "Santos izbor"), "Santos Selection")}
        </SectionHeadingReveal>
        {section.ctaLabel ? (
          <Link href={withOptionalLang(section.ctaHref)} className="btn-link default-underline text-uppercase fw-medium">
            {tx(section.ctaLabel, "View All")}
          </Link>
        ) : null}
      </div>
        {section.subtitle ? <p className="text-secondary mb-4">{tx(section.subtitle)}</p> : null}
      <div className={gridProducts}>
        {items.map((item, index) => (
          <ProductItemMotion key={`${section.id}-${item.legacyId}`} className="product-card-wrapper" index={index}>
            <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
              <div className="pc__img-wrapper">
                <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                  <StorefrontImage
                    sources={getCatalogProductImageSources(item, [], ["/img/hero2.jpg"])}
                    width={330}
                    height={400}
                    alt={getProductDisplayName(item, contentLang)}
                    className="pc__img"
                  />
                  <span className="ss-product-card__quick-link">
                    {contentLang === "en" ? "View product" : "Pogledaj proizvod"}
                  </span>
                </Link>
              </div>
              <div className="pc__info position-relative">
                <p className="pc__category">{getProductCategoryLabel(item, contentLang)}</p>
                <h6 className="pc__title">
                  <Link href={withLang(`/web-shop/${item.legacyId}`)} prefetch={false}>
                    {getProductDisplayName(item, contentLang)}
                  </Link>
                </h6>
                <ProductCardPrice item={item} isEn={isEn} />
              </div>
            </div>
          </ProductItemMotion>
        ))}
      </div>
    </section>
    );
  };

  const renderOrderedGridSection = (
    entry:
      | { kind: "builtin"; key: LandingProductSectionKey; order: number }
      | { kind: "custom"; section: LandingCustomSection; items: CatalogProductView[]; order: number },
  ) => {
    if (entry.kind === "builtin") return renderGridSection(entry.key);
    return renderCustomGridSection(entry.section, entry.items);
  };

  const renderFixedSection = (key: LandingFixedSectionKey) => {
    if (key === "categoryTiles") {
      // Featured articles render here (swapped with the hero rail, which now
      // shows the category tiles) so visitors can jump straight into a
      // category from the hero, while this strip below showcases products.
      const productTiles = heroStripProducts.slice(0, 8).map((item) => ({
        id: String(item.legacyId),
        label: getProductDisplayName(item, "sr"),
        labelEn: getProductDisplayName(item, "en"),
        href: `/web-shop/${item.legacyId}`,
        image: item.coverImage || "/img/hero.jpg",
      }));
      return (
        <HomeCategoryTiles
          categories={catalog.categories}
          tiles={productTiles}
          lang={lang}
        />
      );
    }

    if (key === "story") {
      return (
        <Reveal as="section" className="container pb-5 ss-editorial-section ss-editorial-section--story" delay={0.02}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title text-uppercase">{tx(landingSettings.storySectionTitle, "Brand Story")}</SectionHeadingReveal>
            {landingSettings.storySectionCtaLabel ? (
              <Link href={withOptionalLang(landingSettings.storySectionCtaHref)} className="btn-link default-underline text-uppercase fw-medium">{tx(landingSettings.storySectionCtaLabel, "View Collection")}</Link>
            ) : null}
          </div>
          <div className="row g-4">
            {storyCards.map((block, storyIndex) => (
              <Reveal key={block.id} as="article" className="col-12 col-md-6 col-lg-4" delay={0.06 * storyIndex} y={26} amount={0.15}>
                <div className="position-relative overflow-hidden h-100 ss-story-card" style={{ minHeight: 480, borderRadius: 2 }}>
                  <Image src={block.image || "/img/hero.jpg"} alt={tx(block.title)} fill sizes="(max-width: 991px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.78) 100%)" }} />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-4 text-white ss-story-card__body">
                    <span className="text-uppercase fw-medium" style={{ letterSpacing: "0.14em", fontSize: "0.68rem" }}>{tx(block.badge)}</span>
                    <div>
                      <h3 className="h4 text-white text-uppercase mb-2">{tx(block.title)}</h3>
                      <p className="mb-3">{block.copy}</p>
                      {block.ctaLabel ? <Link href={withOptionalLang(block.ctaHref)} className="btn btn-light btn-sm text-uppercase fw-medium">{tx(block.ctaLabel, "View More")}</Link> : null}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      );
    }

    if (key === "banners") {
      return (
        <Reveal as="section" className="banner-grid container ss-editorial-banners" delay={0.08}>
          <div className="row g-4">
            {[
              [landingSettings.bannerLeftTitle, landingSettings.bannerLeftButtonLabel, landingSettings.bannerLeftHref, landingSettings.bannerLeftImage, "/img/hero2.jpg", "Ready to Wear", "Shop Now"],
              [landingSettings.bannerRightTitle, landingSettings.bannerRightButtonLabel, landingSettings.bannerRightHref, landingSettings.bannerRightImage, "/img/hero.jpg", "Current Sale", "View Sale"],
            ].map(([title, button, href, image, fallback, fallbackTitle, fallbackButton]) => (
              <div key={String(fallbackTitle)} className="col-md-6">
                <div className="position-relative overflow-hidden ss-banner-panel">
                  <StorefrontImage sources={[String(image)]} fallbackSrc={String(fallback)} width={690} height={330} alt={tx(String(title), String(fallbackTitle))} className="w-100 h-auto" sizes="(max-width: 767px) 100vw, 50vw" />
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <h4 className="text-uppercase text-white">{tx(String(title), String(fallbackTitle))}</h4>
                    <Link href={withLang(String(href))} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">{tx(String(button), String(fallbackButton))}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      );
    }

    if (key === "customSuits") return <CustomSuitsEditorialBanner lang={lang} backgroundImage={landingSettings.heroVideoPosterUrl || undefined} />;

    if (key === "aboutContact") {
      return (
        <Reveal as="section" id="o-nama" className="container pb-5 ss-editorial-section ss-atelier-section" delay={0.16}>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-7"><div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(landingSettings.aboutEyebrow, "About")}</p>
              <div className="row g-3">{aboutParagraphs.map((paragraph) => <div key={paragraph} className="col-12 col-md-6"><p className="text-secondary mb-0">{paragraph}</p></div>)}</div>
            </div></div>
            <div className="col-12 col-lg-5"><div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(landingSettings.contactEyebrow, "Contact")}</p>
              <h3 className="h4 text-uppercase mb-3">{tx(landingSettings.contactTitle, "Support and personal recommendations")}</h3>
              <p className="text-secondary mb-4">{tx(landingSettings.contactText)}</p>
              <div className="d-grid gap-2">{contactPoints.map((point) => <div key={point.label} className="border px-3 py-2" style={{ borderRadius: 14 }}><div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(point.label)}</div><div>{point.value}</div></div>)}</div>
            </div></div>
          </div>
        </Reveal>
      );
    }

    if (key === "customerInfo") {
      return (
        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.17}>
          <div className="row g-4">
            <div className="col-12 col-lg-7"><div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(landingSettings.customerInfoEyebrow, "Customer Information")}</p>
              <SectionHeadingReveal className="section-title text-uppercase mb-4">{tx(landingSettings.customerInfoTitle, "Customer rights and purchase guide")}</SectionHeadingReveal>
              <div className="row g-3">{[[landingSettings.customerRightsTitle, "Customer Rights", landingSettings.customerRightsText], [landingSettings.purchaseGuideTitle, "Purchase Guide", landingSettings.purchaseGuideText]].map(([title, fallback, text]) => <div key={fallback} className="col-12 col-md-6"><div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}><p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(title, fallback)}</p><p className="text-secondary mb-0">{tx(text)}</p></div></div>)}</div>
            </div></div>
            <div className="col-12 col-lg-5"><div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(landingSettings.companyDetailsEyebrow, "Company Details")}</p>
              <div className="d-grid gap-2"><div className="border px-3 py-2" style={{ borderRadius: 14 }}><div className="text-uppercase fw-medium mb-1">{tx(landingSettings.companyPibLabel, "Tax ID")}</div><div>{landingSettings.companyPib}</div></div><div className="border px-3 py-2" style={{ borderRadius: 14 }}><div className="text-uppercase fw-medium mb-1">{tx(landingSettings.companyMbLabel, "Registration No.")}</div><div>{landingSettings.companyMb}</div></div></div>
            </div></div>
          </div>
        </Reveal>
      );
    }

    if (key === "uniforms") {
      return (
        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.175}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>{tx(landingSettings.uniformsEyebrow, "Business Uniforms")}</p><SectionHeadingReveal className="section-title text-uppercase mb-0">{tx(landingSettings.uniformsTitle, "Business Uniforms")}</SectionHeadingReveal></div><Link href={withOptionalLang(landingSettings.uniformsCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">{tx(landingSettings.uniformsCtaLabel, "View Uniforms")}</Link></div>
          <div className="row g-4 align-items-stretch"><div className="col-12 col-lg-5"><div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}><p className="text-secondary mb-0">{tx(landingSettings.uniformsText)}</p></div></div><div className="col-12 col-lg-7"><div className="row g-3">{landingUniformImages.slice(0, 3).map((item) => <div key={`${item.image}-${item.title}`} className="col-12 col-md-4"><div className="border bg-white h-100 p-2 ss-editorial-card" style={{ borderRadius: 20 }}><Image src={item.image} alt={item.alt || tx(item.title || landingSettings.uniformsTitle, "Business Uniforms")} width={420} height={520} className="w-100 h-auto" style={{ borderRadius: 16, objectFit: "cover" }} />{item.title ? <p className="mt-3 mb-1 fw-medium text-uppercase small">{tx(item.title)}</p> : null}</div></div>)}</div></div></div>
        </Reveal>
      );
    }

    if (key === "blog") {
      return (
        <Reveal as="section" className="blog-grid container ss-editorial-section ss-editorial-section--blog" delay={0.18}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2"><SectionHeadingReveal className="section-title">{tx(landingSettings.blogSectionTitle, "Latest Blog")}</SectionHeadingReveal>{landingSettings.blogSectionCtaLabel ? <Link href={withOptionalLang(landingSettings.blogSectionCtaHref)} className="btn-link default-underline text-uppercase fw-medium">{tx(landingSettings.blogSectionCtaLabel, "View All")}</Link> : null}</div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4">{posts.items.map((post) => <article key={post.id} className="mb-4"><div className="blog-grid__item ss-blog-card"><div className="blog-grid__item-image-wrap"><Link href={withLang(`/blog/${post.slug}`)} prefetch={false}><StorefrontImage sources={[post.coverImage || "/img/hero.jpg"]} width={330} height={230} alt={post.title} className="w-100 h-auto" /></Link></div><div className="blog-grid__item-detail"><h6 className="blog-grid__item-title"><Link href={withLang(`/blog/${post.slug}`)} prefetch={false}>{post.title}</Link></h6><p className="text-secondary">{(post.excerpt || "").slice(0, 85) || (isEn ? "Continue reading." : "Nastavite sa citanjem.")}</p></div></div></article>)}</div>
        </Reveal>
      );
    }

    return null;
  };

  const renderLandingPageEntry = (entry: (typeof orderedLandingPageEntries)[number], index: number) => {
    const key = entry.kind === "fixed" ? `fixed-${entry.key}` : entry.kind === "custom" ? `custom-${entry.id}` : `builtin-${entry.key}`;
    const custom = entry.kind === "custom" ? customGridSectionById.get(entry.id) : null;
    const content = entry.kind === "fixed" ? renderFixedSection(entry.key) : entry.kind === "custom" && custom ? renderCustomGridSection(custom.section, custom.items) : entry.kind === "builtin" ? renderGridSection(entry.key) : null;
    if (!content) return null;
    return <Reveal key={key} as="div" delay={Math.min(0.04 * index, 0.24)} y={18} amount={0.08}>{content}{index < orderedLandingPageEntries.length - 1 ? <div className="ss-home-section-gap" /> : null}</Reveal>;
  };

  const websiteJsonLd = buildWebSiteJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();
  const localBusinessJsonLd = buildLocalBusinessJsonLd();

  // Hero rail now shows category tiles (swapped with the product strip below)
  // so visitors can jump straight into a category from the hero.
  const heroCategoryGroupImages = (() => {
    const groups = ["odelo", "sako", "pantalone", "kosulja", "jakna", "obuca", "kaput"];
    const result: Record<string, string> = {};
    for (const group of groups) {
      const match = catalog.items.find((item) => item.coverImage && productMatchesCategoryGroup(item, group));
      if (match?.coverImage) result[group] = String(match?.coverImage);
    }
    return result;
  })();
  const heroCategoryCards = landingSettings.categoryTiles.slice(0, 4).map((tile) => {
    const groupKey = new URLSearchParams(tile.href.split("?")[1] || "").get("categoryGroup") || "";
    const liveImage = groupKey && heroCategoryGroupImages[groupKey];
    return {
      id: tile.id || tile.href,
      title: tx(tile.label, tile.labelEn),
      image: tile.image || liveImage || "/img/hero.jpg",
      href: withLang(tile.href),
    };
  });

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={localBusinessJsonLd} />
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper theme-18 ss-home-page ss-home-page--cinematic">
        <HomeHeroVideo
          lang={lang}
          categories={catalog.categories}
          showProductCards={heroStripEnabled && heroCategoryCards.length > 0}
          cards={heroCategoryCards}
          heroVideoUrl={landingSettings.heroVideoUrl || undefined}
          heroVideoMobileUrl={landingSettings.heroVideoMobileUrl || undefined}
          heroVideoPosterUrl={landingSettings.heroVideoPosterUrl || undefined}
          heroTextColor={landingSettings.heroTextColor || undefined}
          content={{
            heroEyebrow: (isEn && landingSettings.heroEyebrowEn.trim()) || tx(landingSettings.heroEyebrow, "Santos & Santorini"),
            heroTitleLine1: (isEn && landingSettings.heroTitleLine1En.trim()) || tx(landingSettings.heroTitleLine1, "New Collection"),
            heroTitleLine2: (isEn && landingSettings.heroTitleLine2En.trim()) || tx(landingSettings.heroTitleLine2),
            heroPrimaryCtaLabel: (isEn && landingSettings.heroPrimaryCtaLabelEn.trim()) || tx(landingSettings.heroPrimaryCtaLabel, "Web Shop"),
            heroPrimaryCtaHref: landingSettings.heroPrimaryCtaHref,
            heroSecondaryCtaLabel: (isEn && landingSettings.heroSecondaryCtaLabelEn.trim()) || tx(landingSettings.heroSecondaryCtaLabel, "Contact"),
            heroSecondaryCtaHref: landingSettings.heroSecondaryCtaHref,
          }}
        />

        {orderedLandingPageEntries.map(renderLandingPageEntry)}

        {false ? (
          <>
        <HomeCategoryTiles
          categories={catalog.categories}
          tiles={landingSettings.categoryTiles}
          categoryGroupImages={(() => {
            const groups = ["odelo", "sako", "pantalone", "kosulja", "jakna", "obuca", "kaput"];
            const result: Record<string, string> = {};
            for (const group of groups) {
              const match = catalog.items.find(
                (item) => item.coverImage && productMatchesCategoryGroup(item, group),
              );
              if (match?.coverImage) result[group] = String(match?.coverImage);
            }
            return result;
          })()}
          lang={lang}
        />

        <Reveal as="section" className="container pb-5 ss-editorial-section ss-editorial-section--story" delay={0.02}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title text-uppercase">
              {tx(landingSettings.storySectionTitle, "Brand Story")}
            </SectionHeadingReveal>
            {landingSettings.storySectionCtaLabel ? (
              <Link href={withOptionalLang(landingSettings.storySectionCtaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(landingSettings.storySectionCtaLabel, "View Collection")}
              </Link>
            ) : null}
          </div>
          <div className="row g-4">
            {storyCards.map((block, storyIndex) => (
              <Reveal
                key={block.id}
                as="article"
                className="col-12 col-md-6 col-lg-4"
                delay={0.06 * storyIndex}
                y={26}
                amount={0.15}
              >
                <div className="position-relative overflow-hidden h-100 ss-story-card" style={{ minHeight: 480, borderRadius: 2 }}>
                  <Image src={block.image || "/img/hero.jpg"} alt={tx(block.title)} fill sizes="(max-width: 991px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.78) 100%)" }}
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-4 text-white ss-story-card__body">
                    <span className="text-uppercase fw-medium" style={{ letterSpacing: "0.14em", fontSize: "0.68rem" }}>
                      {tx(block.badge)}
                    </span>
                    <div>
                      <h3 className="h4 text-white text-uppercase mb-2">{tx(block.title)}</h3>
                      <p className="mb-3">{block.copy}</p>
                      {block.ctaLabel ? (
                        <Link href={withOptionalLang(block.ctaHref)} className="btn btn-light btn-sm text-uppercase fw-medium">
                          {tx(block.ctaLabel, "View More")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <div className="mb-2 mb-xl-3 pt-xl-1 pb-3" />

        {topGridSections.length > 0
          ? topGridSections.map((entry, index) => (
              <Reveal
                key={entry.kind === "builtin" ? `top-grid-${entry.key}` : `top-grid-${entry.section.id}`}
                as="div"
                delay={Math.min(0.07 * index, 0.35)}
                y={22}
                amount={0.08}
              >
                {renderOrderedGridSection(entry)}
                {index < topGridSections.length - 1 ? <div className="mb-3 mb-xl-4 pt-xl-1 pb-4" /> : null}
              </Reveal>
            ))
          : null}

        {topGridSections.length > 0 ? <div className="mb-3 mb-xl-4 pt-xl-1 pb-4" /> : null}

        <Reveal as="section" className="banner-grid container ss-editorial-banners" delay={0.08}>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="position-relative overflow-hidden ss-banner-panel">
                <StorefrontImage
                  sources={[landingSettings.bannerLeftImage]}
                  fallbackSrc="/img/hero2.jpg"
                  width={690}
                  height={330}
                  alt={tx(landingSettings.bannerLeftTitle, "Ready to Wear")}
                  className="w-100 h-auto"
                  sizes="(max-width: 767px) 100vw, 50vw"
                />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{tx(landingSettings.bannerLeftTitle, "Ready to Wear")}</h4>
                  <Link href={withLang(landingSettings.bannerLeftHref)} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {tx(landingSettings.bannerLeftButtonLabel, "Shop Now")}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="position-relative overflow-hidden ss-banner-panel">
                <StorefrontImage
                  sources={[landingSettings.bannerRightImage]}
                  fallbackSrc="/img/hero.jpg"
                  width={690}
                  height={330}
                  alt={tx(landingSettings.bannerRightTitle, "Current Sale")}
                  className="w-100 h-auto"
                  sizes="(max-width: 767px) 100vw, 50vw"
                />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{tx(landingSettings.bannerRightTitle, "Current Sale")}</h4>
                  <Link href={withLang(landingSettings.bannerRightHref)} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {tx(landingSettings.bannerRightButtonLabel, "View Sale")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Custom Suits Editorial Banner — izmedju product sekcija */}
        <CustomSuitsEditorialBanner
          lang={lang}
          backgroundImage={landingSettings.heroVideoPosterUrl || undefined}
        />

        {bottomGridSections.length > 0 ? <div className="mb-2 pb-3" /> : null}

        {bottomGridSections.length > 0
          ? bottomGridSections.map((entry, index) => (
              <Reveal
                key={entry.kind === "builtin" ? `bottom-grid-${entry.key}` : `bottom-grid-${entry.section.id}`}
                as="div"
                delay={Math.min(0.06 * index, 0.28)}
                y={20}
                amount={0.1}
              >
                {renderOrderedGridSection(entry)}
                {index < bottomGridSections.length - 1 ? <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" /> : null}
              </Reveal>
            ))
          : null}

        {bottomGridSections.length > 0 ? <div className="mb-2 pb-3" /> : null}

        <Reveal as="section" id="o-nama" className="container pb-5 ss-editorial-section ss-atelier-section" delay={0.16}>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-7">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                  {tx(landingSettings.aboutEyebrow, "About")}
                </p>
                <div className="row g-3">
                  {aboutParagraphs.map((paragraph) => (
                    <div key={paragraph} className="col-12 col-md-6">
                      <p className="text-secondary mb-0">{paragraph}</p>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  {landingSettings.aboutPrimaryCtaLabel ? (
                    <Link href={withOptionalLang(landingSettings.aboutPrimaryCtaHref)} className="btn btn-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.aboutPrimaryCtaLabel, "Contact")}
                    </Link>
                  ) : null}
                  {landingSettings.aboutSecondaryCtaLabel ? (
                    <Link href={withOptionalLang(landingSettings.aboutSecondaryCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.aboutSecondaryCtaLabel, "Visit Web Shop")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                  {tx(landingSettings.contactEyebrow, "Contact")}
                </p>
                <h3 className="h4 text-uppercase mb-3">{tx(landingSettings.contactTitle, "Support and personal recommendations")}</h3>
                <p className="text-secondary mb-4">{tx(landingSettings.contactText)}</p>
                <div className="d-grid gap-2">
                  {contactPoints.map((point) => (
                    <div key={point.label} className="border px-3 py-2" style={{ borderRadius: 14 }}>
                      <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                        {tx(point.label)}
                      </div>
                      <div>{point.value}</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  {landingSettings.contactPrimaryCtaLabel ? (
                    <Link href={withOptionalLang(landingSettings.contactPrimaryCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.contactPrimaryCtaLabel, "Contact Form")}
                    </Link>
                  ) : null}
                  {landingSettings.contactSecondaryCtaLabel ? (
                    <a href={landingSettings.contactSecondaryCtaHref} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.contactSecondaryCtaLabel, "Send Email")}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-2 pb-3" />

        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.17}>
          <div className="row g-4">
            <div className="col-12 col-lg-7">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                  {tx(landingSettings.customerInfoEyebrow, "Customer Information")}
                </p>
                <SectionHeadingReveal className="section-title text-uppercase mb-4">
                  {tx(landingSettings.customerInfoTitle, "Customer rights and purchase guide")}
                </SectionHeadingReveal>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}>
                      <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                        {tx(landingSettings.customerRightsTitle, "Customer Rights")}
                      </p>
                      <p className="text-secondary mb-0">{tx(landingSettings.customerRightsText)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}>
                      <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                        {tx(landingSettings.purchaseGuideTitle, "Purchase Guide")}
                      </p>
                      <p className="text-secondary mb-0">{tx(landingSettings.purchaseGuideText)}</p>
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  {landingSettings.customerInfoPrimaryCtaLabel ? (
                    <Link href={withOptionalLang(landingSettings.customerInfoPrimaryCtaHref)} className="btn btn-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.customerInfoPrimaryCtaLabel, "Open Checkout")}
                    </Link>
                  ) : null}
                  {landingSettings.customerInfoSecondaryCtaLabel ? (
                    <Link href={withOptionalLang(landingSettings.customerInfoSecondaryCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {tx(landingSettings.customerInfoSecondaryCtaLabel, "Documents")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                  {tx(landingSettings.companyDetailsEyebrow, "Company Details")}
                </p>
                <div className="d-grid gap-2">
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                      {tx(landingSettings.companyPibLabel, "Tax ID")}
                    </div>
                    <div>{landingSettings.companyPib}</div>
                  </div>
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                      {tx(landingSettings.companyMbLabel, "Registration No.")}
                    </div>
                    <div>{landingSettings.companyMb}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                    {tx(landingSettings.documentsTitle, "Documents")}
                  </p>
                  <p className="text-secondary mb-3">{tx(landingSettings.documentsSubtitle)}</p>
                  <div className="ss-document-download-list">
                    {landingDocuments.length > 0 ? (
                      landingDocuments.slice(0, 3).map((item) => (
                        <a
                          key={`${item.title}-${item.url}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ss-document-download-card"
                        >
                          <span>
                            <span className="ss-document-download-card__title">{tx(item.title)}</span>
                            {item.description ? <span className="ss-document-download-card__description d-block">{tx(item.description)}</span> : null}
                          </span>
                          <span className="ss-document-download-card__action">{isEn ? "Download" : "Preuzmi"}</span>
                        </a>
                      ))
                    ) : (
                      <div className="border px-3 py-3 text-secondary" style={{ borderRadius: 14 }}>
                        {tx(landingSettings.documentsEmptyText, "Documents will appear here as soon as they are added.")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-3 mb-xl-4 pt-xl-1 pb-3" />

        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.175}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "var(--ss-gold-dark, #a07d45)" }}>
                {tx(landingSettings.uniformsEyebrow, "Business Uniforms")}
              </p>
              <SectionHeadingReveal className="section-title text-uppercase mb-0">
                {tx(landingSettings.uniformsTitle, "Business Uniforms")}
              </SectionHeadingReveal>
            </div>
            <Link href={withOptionalLang(landingSettings.uniformsCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
              {tx(landingSettings.uniformsCtaLabel, "View Uniforms")}
            </Link>
          </div>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-secondary mb-0">{tx(landingSettings.uniformsText)}</p>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="row g-3">
                {landingUniformImages.slice(0, 3).map((item) => (
                  <div key={`${item.image}-${item.title}`} className="col-12 col-md-4">
                    <div className="border bg-white h-100 p-2 ss-editorial-card" style={{ borderRadius: 20 }}>
                      <Image
                        src={item.image}
                        alt={item.alt || tx(item.title || landingSettings.uniformsTitle, "Business Uniforms")}
                        width={420}
                        height={520}
                        className="w-100 h-auto"
                        style={{ borderRadius: 16, objectFit: "cover" }}
                      />
                      {item.title ? <p className="mt-3 mb-1 fw-medium text-uppercase small">{tx(item.title)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-2 pb-3" />

        <Reveal as="section" className="blog-grid container ss-editorial-section ss-editorial-section--blog" delay={0.18}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <SectionHeadingReveal className="section-title">
              {tx(landingSettings.blogSectionTitle, "Latest Blog")}
            </SectionHeadingReveal>
            {landingSettings.blogSectionCtaLabel ? (
              <Link href={withOptionalLang(landingSettings.blogSectionCtaHref)} className="btn-link default-underline text-uppercase fw-medium">
                {tx(landingSettings.blogSectionCtaLabel, "View All")}
              </Link>
            ) : null}
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4">
            {posts.items.map((post) => (
              <article key={post.id} className="mb-4">
                <div className="blog-grid__item ss-blog-card">
                  <div className="blog-grid__item-image-wrap">
                    <Link href={withLang(`/blog/${post.slug}`)} prefetch={false}>
                      <StorefrontImage
                        sources={[post.coverImage || "/img/hero.jpg"]}
                        width={330}
                        height={230}
                        alt={post.title}
                        className="w-100 h-auto"
                      />
                    </Link>
                  </div>
                  <div className="blog-grid__item-detail">
                    <h6 className="blog-grid__item-title">
                    <Link href={withLang(`/blog/${post.slug}`)} prefetch={false}>
                      {post.title}
                    </Link>
                    </h6>
                    <p className="text-secondary">{(post.excerpt || "").slice(0, 85) || (isEn ? "Continue reading." : "Nastavite sa citanjem.")}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-4" />
          </>
        ) : null}

      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
