import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import HomeHeroVideo from "@/app/components/storefront/HomeHeroVideo";
import Reveal from "@/app/components/motion/Reveal";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import { getCatalogProductByLegacyId, listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import {
  getCatalogProductCategoryLabel,
  getCatalogProductDisplayName,
  isCatalogProductNameSuspicious,
} from "@/lib/catalog/presentation";
import { listPosts } from "@/lib/blog/store";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const metadata = {
  title: "Santos & Santorini",
  description: "Santos & Santorini web shop sa aktuelnom kolekcijom, akcijama i blog sadrzajem.",
};

const getLegacyCampaignBlocks = (isEn: boolean) => [
  {
    id: "legacy-black-friday",
    badge: isEn ? "Current offers" : "Aktuelne akcije",
    title: isEn ? "Up to 30% off selected pieces." : "Do 30% popusta na izdvojene modele.",
    copy: isEn
      ? "We selected pieces from the current collection with reduced prices and available sizes."
      : "Izdvojili smo modele iz aktuelne kolekcije sa snizenim cenama i dostupnim velicinama.",
    image: "/img/hero.jpg",
    ctaLabel: isEn ? "View sale" : "Pogledaj akcije",
    ctaHref: "/akcije",
  },
  {
    id: "legacy-holiday-capsule",
    badge: isEn ? "New collection" : "Nova kolekcija",
    title: isEn ? "Ready-to-wear pieces for every occasion" : "Ready-to-wear komadi za svaku priliku",
    copy: isEn
      ? "From suits and blazers to shirts and accessories, the webshop brings styles ready to order."
      : "Od odela i sakoa do kosulja i aksesoara, webshop donosi izbor modela spremnih za porudzbinu.",
    image: "/img/hero2.jpg",
    ctaLabel: isEn ? "Open web shop" : "Otvori web shop",
    ctaHref: "/web-shop",
  },
  {
    id: "legacy-gift-edit",
    badge: isEn ? "Gift edit" : "Gift Edit",
    title: isEn ? "A gift that lasts" : "Poklon koji traje",
    copy: isEn
      ? "Silk ties, leather goods and carefully selected details for a premium gift choice."
      : "Kravate od svile, kozna galanterija i pazljivo birani detalji kao premium poklon izbor.",
    image: "/img/obuca.jpg",
    ctaLabel: isEn ? "View gifts" : "Pogledaj poklone",
    ctaHref: "/web-shop",
  },
];

const getAtelierStoryParagraphs = (isEn: boolean) =>
  isEn
    ? [
        "Built on the idea that a man should enjoy the wardrobe he wears, Santos & Santorini was founded in Nis in 2007.",
        "Since 2013 the brand has become known for modern cuts, selected fabrics and details finished by hand.",
        "Our pieces connect tailoring tradition with contemporary design, from the first seam to the final silhouette.",
      ]
    : [
        "Sa idejom da muskarac treba da uziva u garderobi koju nosi, Santos & Santorini nastaje 2007. u Nisu.",
        "Od 2013. brend postaje prepoznatljiv po modernim krojevima, biranim tkaninama i detaljima koji se doradjuju rucno.",
        "Nasi modeli spajaju tradiciju krojenja i savremeni dizajn, od prvog sava do finalne siluete.",
      ];

const getAtelierContactPoints = (isEn: boolean) => [
  { label: isEn ? "Phone" : "Telefon", value: "+381 69 445 5106" },
  { label: "Email", value: "prodaja@santos.rs" },
  { label: isEn ? "Address" : "Adresa", value: "Obrenoviceva 9, Nis" },
];

const BrandStrip = () => (
  <section className="brands-carousel container">
    <div className="row row-cols-2 row-cols-md-4 row-cols-xl-7 g-3 align-items-center">
      {["brand1", "brand2", "brand3", "brand4", "brand5", "brand6", "brand7"].map((brand) => (
        <div key={brand} className="text-center opacity-75">
          <Image
            src={`/assets/images/brands/${brand}.png`}
            width={140}
            height={48}
            alt={brand}
            className="h-auto w-auto"
          />
        </div>
      ))}
    </div>
  </section>
);

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

const pickProductsForSectionDistinct = <T extends { legacyId: number; sku?: string | null }>(
  source: T[],
  preferredIds: number[],
  limit: number,
  fallback: T[],
  usedSkuKeys: Set<string>,
) => {
  const primary = pickProductsForSection(source, preferredIds, Math.max(limit * 2, limit), fallback);
  const backup = [...fallback, ...source];
  const out: T[] = [];

  const takeCandidate = (candidate: T) => {
    const key = String(candidate.sku || candidate.legacyId).trim().toLowerCase();
    if (!key || usedSkuKeys.has(key)) return false;
    usedSkuKeys.add(key);
    out.push(candidate);
    return out.length >= limit;
  };

  for (const candidate of primary) {
    if (takeCandidate(candidate)) return out;
  }
  for (const candidate of backup) {
    if (takeCandidate(candidate)) return out;
  }
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

  const [catalog, saleCatalog, posts, landingSettings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 120,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
    }),
    listCatalogProducts({
      page: 1,
      pageSize: 120,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      onSale: true,
    }),
    listPosts({
      type: "all",
      page: 1,
      pageSize: 4,
      onlyPublished: true,
    }),
    getLandingSettings(),
  ]);

  const legacyCampaignBlocks = getLegacyCampaignBlocks(isEn);
  const atelierStoryParagraphs = getAtelierStoryParagraphs(isEn);
  const atelierContactPoints = getAtelierContactPoints(isEn);
  const contentLang: "sr" | "en" = isEn ? "en" : "sr";
  const landingDocuments = landingSettings.documents.filter((item) => item.title && item.url);
  const landingUniformImages = landingSettings.uniformsImages.filter((item) => item.image);
  const pinnedProductIds = Array.from(
    new Set(
      [
        ...landingSettings.heroStripProductIds,
        ...landingSettings.highlightedProductIds,
        ...landingSettings.popularProductIds,
        ...landingSettings.arrivalsProductIds,
        ...landingSettings.saleProductIds,
        ...landingSettings.trendingProductIds,
      ]
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item)),
    ),
  );
  const pinnedProducts = (
    await Promise.all(pinnedProductIds.map((id) => getCatalogProductByLegacyId(id)))
  ).filter((item): item is CatalogProductView => Boolean(item?.isActive && item?.isExported));

  const landingPoolUnique = sortLandingProducts(
    dedupeProductsBySku([...pinnedProducts, ...catalog.items]),
    contentLang,
  );

  const salePool = sortLandingProducts(
    dedupeProductsBySku([...pinnedProducts, ...saleCatalog.items]).filter(
      (item) =>
        landingSettings.saleProductIds.includes(item.legacyId) ||
        item.priceGross > item.priceFinalGross ||
        item.rebatePercent > 0,
    ),
    contentLang,
  );

  const usedSkuKeys = new Set<string>();
  const heroStripProducts = pickProductsForSectionDistinct(
    landingPoolUnique,
    landingSettings.heroStripProductIds,
    4,
    landingPoolUnique.slice(0, 12),
    usedSkuKeys,
  );
  const heroProducts = pickProductsForSectionDistinct(
    landingPoolUnique,
    landingSettings.highlightedProductIds,
    8,
    landingPoolUnique.slice(0, 24),
    usedSkuKeys,
  );
  const featured = pickProductsForSectionDistinct(
    landingPoolUnique,
    landingSettings.popularProductIds,
    4,
    landingPoolUnique.slice(0, 24),
    usedSkuKeys,
  );
  const arrivals = pickProductsForSectionDistinct(
    landingPoolUnique,
    landingSettings.arrivalsProductIds,
    4,
    landingPoolUnique.slice(8, 32),
    usedSkuKeys,
  );
  const trending = pickProductsForSectionDistinct(
    landingPoolUnique,
    landingSettings.trendingProductIds,
    4,
    landingPoolUnique.slice(16, 40),
    usedSkuKeys,
  );
  const saleItems = pickProductsForSection(
    salePool,
    landingSettings.saleProductIds,
    4,
    salePool.slice(0, 16),
  );

  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper theme-18 ss-home-page ss-home-page--cinematic">
        <HomeHeroVideo
          lang={lang}
          categories={catalog.categories}
          featuredProducts={heroStripProducts}
          content={{
            heroEyebrow: landingSettings.heroEyebrow,
            heroTitleLine1: landingSettings.heroTitleLine1,
            heroTitleLine2: landingSettings.heroTitleLine2,
            heroPrimaryCtaLabel: landingSettings.heroPrimaryCtaLabel,
            heroPrimaryCtaHref: landingSettings.heroPrimaryCtaHref,
            heroSecondaryCtaLabel: landingSettings.heroSecondaryCtaLabel,
            heroSecondaryCtaHref: landingSettings.heroSecondaryCtaHref,
          }}
        />

        <Reveal as="section" className="container pb-5 ss-editorial-section ss-editorial-section--story" delay={0.02}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "Brand " : "Brend "}<strong>{isEn ? "Story" : "Prica"}</strong>
            </h2>
            <Link href={withLang("/web-shop")} className="btn-link default-underline text-uppercase fw-medium">
              {isEn ? "View collection" : "Pogledaj kolekciju"}
            </Link>
          </div>
          <div className="row g-4">
            {legacyCampaignBlocks.map((block) => (
              <article key={block.id} className="col-12 col-md-6 col-lg-4">
                <div className="position-relative overflow-hidden h-100 ss-story-card" style={{ minHeight: 420, borderRadius: 24 }}>
                  <Image src={block.image} alt={block.title} fill sizes="(max-width: 991px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.78) 100%)" }}
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-4 text-white ss-story-card__body">
                    <span className="text-uppercase fw-medium" style={{ letterSpacing: "0.14em", fontSize: "0.68rem" }}>
                      {block.badge}
                    </span>
                    <div>
                      <h3 className="h4 text-white text-uppercase mb-2">{block.title}</h3>
                      <p className="mb-3">{block.copy}</p>
                      <Link href={withLang(block.ctaHref)} className="btn btn-light btn-sm text-uppercase fw-medium">
                        {block.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <div className="mb-2 mb-xl-3 pt-xl-1 pb-3" />

        <section className="container pb-5 ss-editorial-section ss-editorial-section--featured">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "Featured " : "Izdvojeni "}<strong>{isEn ? "Pieces" : "Modeli"}</strong>
            </h2>
            <Link href={withLang("/web-shop")} className="btn-link default-underline text-uppercase fw-medium">
              {isEn ? "View all" : "Pogledaj sve"}
            </Link>
          </div>
          <div className="row row-cols-2 row-cols-md-4 g-2 g-md-3 ss-feature-strip">
            {heroProducts.map((item, index) => (
              <ProductItemMotion key={item.legacyId} index={index}>
                <Link href={withLang(`/web-shop/${item.legacyId}`)} className="d-block ss-featured-tile">
                  <Image
                    src={item.coverImage || "/img/odela.jpg"}
                    width={330}
                    height={400}
                    alt={getProductDisplayName(item, contentLang)}
                    className="w-100 mb-2 ss-uniform-tile"
                  />
                  <span className="menu-link menu-link_us-s fw-semi-bold fs-16 text-uppercase">
                    {getProductDisplayName(item, contentLang)}
                  </span>
                </Link>
              </ProductItemMotion>
            ))}
          </div>
        </section>

        <div className="mb-2 mb-xl-3 pt-xl-1 pb-3" />

        <section className="products-grid container ss-editorial-section ss-editorial-section--products">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "Popular " : "Popularni "}<strong>{isEn ? "Products" : "Proizvodi"}</strong>
            </h2>
            <Link href={withLang("/web-shop")} className="btn-link default-underline text-uppercase fw-medium">
              {isEn ? "View all" : "Pogledaj sve"}
            </Link>
          </div>
          <div className="row row-cols-2 row-cols-lg-4 g-2 g-md-3">
            {featured.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={withLang(`/web-shop/${item.legacyId}`)}>
                      <Image
                        src={item.coverImage || "/img/odela2.jpg"}
                        width={330}
                        height={400}
                        alt={getProductDisplayName(item, contentLang)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <p className="pc__category">{getProductCategoryLabel(item, contentLang)}</p>
                    <h6 className="pc__title">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)}>{getProductDisplayName(item, contentLang)}</Link>
                    </h6>
                    <div className="product-card__price d-flex">
                      {item.priceGross > item.priceFinalGross ? (
                        <>
                          <span className="money price price-old">{formatRsd(item.priceGross)}</span>
                          <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </>
                      ) : (
                        <span className="money price">{formatRsd(item.priceFinalGross)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </ProductItemMotion>
            ))}
          </div>
        </section>

        <div className="mb-3 mb-xl-4 pt-xl-1 pb-4" />

        <Reveal as="section" className="banner-grid container ss-editorial-banners" delay={0.08}>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="position-relative overflow-hidden ss-banner-panel">
                <Image src={landingSettings.bannerLeftImage} width={690} height={330} alt={landingSettings.bannerLeftTitle} className="w-100 h-auto" />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{landingSettings.bannerLeftTitle}</h4>
                  <Link href={withLang(landingSettings.bannerLeftHref)} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {landingSettings.bannerLeftButtonLabel}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="position-relative overflow-hidden ss-banner-panel">
                <Image src={landingSettings.bannerRightImage} width={690} height={330} alt={landingSettings.bannerRightTitle} className="w-100 h-auto" />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{landingSettings.bannerRightTitle}</h4>
                  <Link href={withLang(landingSettings.bannerRightHref)} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {landingSettings.bannerRightButtonLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <section className="products-grid container ss-editorial-section ss-editorial-section--arrivals">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "New " : "Novi "}<strong>{isEn ? "Arrivals" : "Modeli"}</strong>
            </h2>
          </div>
          <div className="row row-cols-2 row-cols-lg-4 g-2 g-md-3">
            {arrivals.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={withLang(`/web-shop/${item.legacyId}`)}>
                      <Image
                        src={item.coverImage || "/img/hero2.jpg"}
                        width={330}
                        height={400}
                        alt={getProductDisplayName(item, contentLang)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <h6 className="pc__title">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)}>{getProductDisplayName(item, contentLang)}</Link>
                    </h6>
                    <div className="product-card__price d-flex">
                      {item.priceGross > item.priceFinalGross ? (
                        <>
                          <span className="money price price-old">{formatRsd(item.priceGross)}</span>
                          <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </>
                      ) : (
                        <span className="money price">{formatRsd(item.priceFinalGross)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </ProductItemMotion>
            ))}
          </div>
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        {landingSettings.showSaleSection && saleItems.length > 0 ? (
          <>
            <section className="products-grid container ss-editorial-section ss-editorial-section--sale">
              <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
                <h2 className="section-title text-uppercase">{landingSettings.saleSectionTitle}</h2>
                <Link href={withLang("/akcije")} className="btn-link default-underline text-uppercase fw-medium">
                  {isEn ? "View all" : "Pogledaj sve"}
                </Link>
              </div>
              {landingSettings.saleSectionSubtitle ? <p className="text-secondary mb-4">{landingSettings.saleSectionSubtitle}</p> : null}
              <div className="row row-cols-2 row-cols-lg-4 g-2 g-md-3">
                {saleItems.map((item, index) => (
                  <ProductItemMotion key={`sale-${item.legacyId}`} className="product-card-wrapper" index={index}>
                    <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                      <div className="pc__img-wrapper">
                        <Link href={withLang(`/web-shop/${item.legacyId}`)}>
                          <Image
                            src={item.coverImage || "/img/odela.jpg"}
                            width={330}
                            height={400}
                            alt={getProductDisplayName(item, contentLang)}
                            className="pc__img"
                          />
                        </Link>
                      </div>
                      <div className="pc__info position-relative">
                        <h6 className="pc__title">
                          <Link href={withLang(`/web-shop/${item.legacyId}`)}>{getProductDisplayName(item, contentLang)}</Link>
                        </h6>
                        <div className="product-card__price d-flex">
                          <span className="money price price-old">{formatRsd(item.priceGross)}</span>
                          <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </div>
                      </div>
                    </div>
                  </ProductItemMotion>
                ))}
              </div>
            </section>
            <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />
          </>
        ) : null}

        <section className="products-grid container ss-editorial-section ss-editorial-section--trending">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "Trending " : "Aktuelno "}<strong>{isEn ? "Now" : "Sada"}</strong>
            </h2>
          </div>
          <div className="row row-cols-2 row-cols-lg-4 g-2 g-md-3">
            {trending.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={withLang(`/web-shop/${item.legacyId}`)}>
                      <Image
                        src={item.coverImage || "/img/hero2.jpg"}
                        width={330}
                        height={400}
                        alt={getProductDisplayName(item, contentLang)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <h6 className="pc__title">
                      <Link href={withLang(`/web-shop/${item.legacyId}`)}>{getProductDisplayName(item, contentLang)}</Link>
                    </h6>
                    <div className="product-card__price d-flex">
                      {item.priceGross > item.priceFinalGross ? (
                        <>
                          <span className="money price price-old">{formatRsd(item.priceGross)}</span>
                          <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
                        </>
                      ) : (
                        <span className="money price">{formatRsd(item.priceFinalGross)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </ProductItemMotion>
            ))}
          </div>
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <Reveal as="section" id="o-nama" className="container pb-5 ss-editorial-section ss-atelier-section" delay={0.16}>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-7">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "About us" : "O nama"}
                </p>
                <h2 className="section-title text-uppercase mb-4">
                  {isEn ? "A brand born from a " : "Brend nastao iz "}<strong>{isEn ? "family workshop" : "porodicne radionice"}</strong>
                </h2>
                <div className="row g-3">
                  {atelierStoryParagraphs.map((paragraph) => (
                    <div key={paragraph} className="col-12 col-md-6">
                      <p className="text-secondary mb-0">{paragraph}</p>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href={withLang("/kontakt")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Contact us" : "Kontaktirajte nas"}
                  </Link>
                  <Link href={withLang("/web-shop")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Visit web shop" : "Poseti web shop"}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "Contact" : "Kontakt"}
                </p>
                <h3 className="h4 text-uppercase mb-3">
                  {isEn ? "Support and personal " : "Podrska i licne "}<strong>{isEn ? "recommendations" : "preporuke"}</strong>
                </h3>
                <p className="text-secondary mb-4">
                  {isEn
                    ? "Our team guides you through fabrics, fits and details in the showroom or online. We reply within one business day."
                    : "Tim vas vodi kroz izbor tkanina, krojeva i detalja u showroom-u ili online. Odgovaramo u roku od jednog radnog dana."}
                </p>
                <div className="d-grid gap-2">
                  {atelierContactPoints.map((point) => (
                    <div key={point.label} className="border px-3 py-2" style={{ borderRadius: 14 }}>
                      <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>
                        {point.label}
                      </div>
                      <div>{point.value}</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href={withLang("/kontakt")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Contact form" : "Kontakt forma"}
                  </Link>
                  <a href="mailto:atelier@santos.rs" className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Send email" : "Posalji email"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.17}>
          <div className="row g-4">
            <div className="col-12 col-lg-7">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "Customer info" : "Informacije za kupce"}
                </p>
                <h2 className="section-title text-uppercase mb-4">
                  {isEn ? "Consumer rights and " : "Prava potrosaca i "}
                  <strong>{isEn ? "shopping guide" : "uputstvo za kupovinu"}</strong>
                </h2>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}>
                      <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>
                        {landingSettings.customerRightsTitle}
                      </p>
                      <p className="text-secondary mb-0">{landingSettings.customerRightsText}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}>
                      <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>
                        {landingSettings.purchaseGuideTitle}
                      </p>
                      <p className="text-secondary mb-0">{landingSettings.purchaseGuideText}</p>
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href={withLang("/checkout")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Open checkout" : "Otvori checkout"}
                  </Link>
                  <Link href={withLang("/dokumenta")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Documents" : "Dokumenta"}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "Company details" : "Podaci o firmi"}
                </p>
                <div className="d-grid gap-2">
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>PIB</div>
                    <div>{landingSettings.companyPib}</div>
                  </div>
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>MB</div>
                    <div>{landingSettings.companyMb}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-uppercase fw-medium mb-2" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>
                    {landingSettings.documentsTitle}
                  </p>
                  <p className="text-secondary mb-3">{landingSettings.documentsSubtitle}</p>
                  <div className="d-grid gap-2">
                    {landingDocuments.length > 0 ? (
                      landingDocuments.slice(0, 3).map((item) => (
                        <a
                          key={`${item.title}-${item.url}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="border px-3 py-2 text-decoration-none text-dark"
                          style={{ borderRadius: 14 }}
                        >
                          <div className="fw-medium">{item.title}</div>
                          {item.description ? <div className="text-secondary small">{item.description}</div> : null}
                        </a>
                      ))
                    ) : (
                      <div className="border px-3 py-3 text-secondary" style={{ borderRadius: 14 }}>
                        {isEn ? "Documents will be available here soon." : "Dokumenta ce ovde biti dostupna cim budu dodata."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <Reveal as="section" className="container pb-5 ss-editorial-section" delay={0.175}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                {landingSettings.uniformsEyebrow}
              </p>
              <h2 className="section-title text-uppercase mb-0">{landingSettings.uniformsTitle}</h2>
            </div>
            <Link href={withOptionalLang(landingSettings.uniformsCtaHref)} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
              {landingSettings.uniformsCtaLabel}
            </Link>
          </div>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 ss-editorial-card" style={{ borderRadius: 24 }}>
                <p className="text-secondary mb-0">{landingSettings.uniformsText}</p>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="row g-3">
                {landingUniformImages.slice(0, 3).map((item) => (
                  <div key={`${item.image}-${item.title}`} className="col-12 col-md-4">
                    <div className="border bg-white h-100 p-2 ss-editorial-card" style={{ borderRadius: 20 }}>
                      <Image
                        src={item.image}
                        alt={item.alt || item.title || landingSettings.uniformsTitle}
                        width={420}
                        height={520}
                        className="w-100 h-auto"
                        style={{ borderRadius: 16, objectFit: "cover" }}
                      />
                      {item.title ? <p className="mt-3 mb-1 fw-medium text-uppercase small">{item.title}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <Reveal as="section" className="blog-grid container ss-editorial-section ss-editorial-section--blog" delay={0.18}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              {isEn ? "Latest " : "Najnoviji "}<strong>Blog</strong>
            </h2>
            <Link href={withLang("/blog")} className="btn-link default-underline text-uppercase fw-medium">
              {isEn ? "View all" : "Pogledaj sve"}
            </Link>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4">
            {posts.items.map((post) => (
              <article key={post.id} className="mb-4">
                <div className="blog-grid__item ss-blog-card">
                  <div className="blog-grid__item-image-wrap">
                    <Link href={withLang(`/blog/${post.slug}`)}>
                      <Image
                        src={post.coverImage || "/img/hero.jpg"}
                        width={330}
                        height={230}
                        alt={post.title}
                        className="w-100 h-auto"
                      />
                    </Link>
                  </div>
                  <div className="blog-grid__item-detail">
                    <h6 className="blog-grid__item-title">
                      <Link href={withLang(`/blog/${post.slug}`)}>{post.title}</Link>
                    </h6>
                    <p className="text-secondary">{(post.excerpt || "").slice(0, 85) || (isEn ? "Continue reading." : "Nastavite sa citanjem.")}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-4" />

        <Reveal as="div" delay={0.2}>
          <BrandStrip />
        </Reveal>
        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
