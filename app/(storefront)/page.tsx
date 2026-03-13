import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import HomeHeroVideo from "@/app/components/storefront/HomeHeroVideo";
import Reveal from "@/app/components/motion/Reveal";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import { listCatalogProducts } from "@/lib/catalog/store";
import { formatCatalogProductName } from "@/lib/catalog/presentation";
import { listPosts } from "@/lib/blog/store";
import { getLandingSettings } from "@/lib/catalog/landingSettings";

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

const legacyCampaignBlocks = [
  {
    id: "legacy-black-friday",
    badge: "Aktuelne akcije",
    title: "Do 30% popusta na izdvojene modele.",
    copy: "Izdvojili smo modele iz aktuelne kolekcije sa snizenim cenama i dostupnim velicinama.",
    image: "/img/hero.jpg",
    ctaLabel: "Pogledaj akcije",
    ctaHref: "/akcije",
  },
  {
    id: "legacy-holiday-capsule",
    badge: "Nova kolekcija",
    title: "Ready-to-wear komadi za svaku priliku",
    copy: "Od odela i sakoa do kosulja i aksesoara, webshop donosi izbor modela spremnih za porudzbinu.",
    image: "/img/hero2.jpg",
    ctaLabel: "Otvori web shop",
    ctaHref: "/web-shop",
  },
  {
    id: "legacy-gift-edit",
    badge: "Gift Edit",
    title: "Poklon koji traje",
    copy: "Kravate od svile, kozna galanterija i pazljivo birani detalji kao premium poklon izbor.",
    image: "/img/obuca.jpg",
    ctaLabel: "Pogledaj poklone",
    ctaHref: "/web-shop",
  },
];

const atelierStoryParagraphs = [
  "Sa idejom da muskarac treba da uziva u garderobi koju nosi, Santos & Santorini nastaje 2007. u Nisu.",
  "Od 2013. brend postaje prepoznatljiv po modernim krojevima, biranim tkaninama i detaljima koji se doradjuju rucno.",
  "Nasi modeli spajaju tradiciju krojenja i savremeni dizajn, od prvog sava do finalne siluete.",
];

const atelierContactPoints = [
  { label: "Telefon", value: "+381 69 445 5106" },
  { label: "Email", value: "prodaja@santos.rs" },
  { label: "Adresa", value: "Obrenoviceva 9, Nis" },
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

export default async function HomePage() {
  const [catalog, posts, landingSettings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 120,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
    }),
    listPosts({
      type: "all",
      page: 1,
      pageSize: 4,
      onlyPublished: true,
    }),
    getLandingSettings(),
  ]);

  const landingFeatured = catalog.items
    .filter((item) => item.landingFeatured)
    .sort((a, b) => {
      const priorityA = Number.isFinite(Number(a.landingPriority)) ? Number(a.landingPriority) : Number.MAX_SAFE_INTEGER;
      const priorityB = Number.isFinite(Number(b.landingPriority)) ? Number(b.landingPriority) : Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.legacyId - a.legacyId;
    });

  const landingPool =
    landingFeatured.length > 0
      ? [...landingFeatured, ...catalog.items.filter((item) => !item.landingFeatured)]
      : catalog.items;
  const landingPoolUnique = dedupeProductsBySku(landingPool);

  const salePool = landingPoolUnique
    .filter((item) => item.priceGross > item.priceFinalGross || item.rebatePercent > 0)
    .slice(0, 32);

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
  const saleItems = pickProductsForSectionDistinct(
    salePool,
    landingSettings.saleProductIds,
    4,
    salePool.slice(0, 16),
    usedSkuKeys,
  );

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper theme-18 ss-home-page">
        <HomeHeroVideo
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

        <Reveal as="section" className="container pb-5" delay={0.02}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Brend <strong>Story</strong>
            </h2>
            <Link href="/web-shop" className="btn-link default-underline text-uppercase fw-medium">
              Pogledaj kolekciju
            </Link>
          </div>
          <div className="row g-4">
            {legacyCampaignBlocks.map((block) => (
              <article key={block.id} className="col-12 col-md-6 col-lg-4">
                <div className="position-relative overflow-hidden h-100" style={{ minHeight: 420, borderRadius: 24 }}>
                  <Image src={block.image} alt={block.title} fill sizes="(max-width: 991px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.78) 100%)" }}
                  />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-4 text-white">
                    <span className="text-uppercase fw-medium" style={{ letterSpacing: "0.14em", fontSize: "0.68rem" }}>
                      {block.badge}
                    </span>
                    <div>
                      <h3 className="h4 text-white text-uppercase mb-2">{block.title}</h3>
                      <p className="mb-3">{block.copy}</p>
                      <Link href={block.ctaHref} className="btn btn-light btn-sm text-uppercase fw-medium">
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

        <section className="container pb-5">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Izdvojeni <strong>Modeli</strong>
            </h2>
            <Link href="/web-shop" className="btn-link default-underline text-uppercase fw-medium">
              View all
            </Link>
          </div>
          <div className="row row-cols-2 row-cols-md-4 g-3">
            {heroProducts.map((item, index) => (
              <ProductItemMotion key={item.legacyId} index={index}>
                <Link href={`/web-shop/${item.legacyId}`} className="d-block">
                  <Image
                    src={item.coverImage || "/assets/images/home/demo19/product-1.jpg"}
                    width={330}
                    height={400}
                    alt={formatCatalogProductName(item.name, item.sku)}
                    className="w-100 mb-2 ss-uniform-tile"
                  />
                  <span className="menu-link menu-link_us-s fw-semi-bold fs-16 text-uppercase">{formatCatalogProductName(item.name, item.sku)}</span>
                </Link>
              </ProductItemMotion>
            ))}
          </div>
        </section>

        <div className="mb-2 mb-xl-3 pt-xl-1 pb-3" />

        <section className="products-grid container">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Popular <strong>Products</strong>
            </h2>
            <Link href="/web-shop" className="btn-link default-underline text-uppercase fw-medium">
              View all
            </Link>
          </div>
          <div className="row row-cols-2 row-cols-lg-4">
            {featured.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={`/web-shop/${item.legacyId}`}>
                      <Image
                        src={item.coverImage || "/assets/images/home/demo19/product-2.jpg"}
                        width={330}
                        height={400}
                        alt={formatCatalogProductName(item.name, item.sku)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <p className="pc__category">{item.categories[0]?.name || "Santos"}</p>
                    <h6 className="pc__title">
                      <Link href={`/web-shop/${item.legacyId}`}>{formatCatalogProductName(item.name, item.sku)}</Link>
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

        <Reveal as="section" className="banner-grid container" delay={0.08}>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="position-relative overflow-hidden">
                <Image src={landingSettings.bannerLeftImage} width={690} height={330} alt={landingSettings.bannerLeftTitle} className="w-100 h-auto" />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{landingSettings.bannerLeftTitle}</h4>
                  <Link href={landingSettings.bannerLeftHref} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {landingSettings.bannerLeftButtonLabel}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="position-relative overflow-hidden">
                <Image src={landingSettings.bannerRightImage} width={690} height={330} alt={landingSettings.bannerRightTitle} className="w-100 h-auto" />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <h4 className="text-uppercase text-white">{landingSettings.bannerRightTitle}</h4>
                  <Link href={landingSettings.bannerRightHref} className="btn btn-light btn-sm text-uppercase fw-medium mt-2">
                    {landingSettings.bannerRightButtonLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <section className="products-grid container">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              New <strong>Arrivals</strong>
            </h2>
          </div>
          <div className="row row-cols-2 row-cols-lg-4">
            {arrivals.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={`/web-shop/${item.legacyId}`}>
                      <Image
                        src={item.coverImage || "/assets/images/home/demo19/product-3.jpg"}
                        width={330}
                        height={400}
                        alt={formatCatalogProductName(item.name, item.sku)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <h6 className="pc__title">
                      <Link href={`/web-shop/${item.legacyId}`}>{formatCatalogProductName(item.name, item.sku)}</Link>
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
            <section className="products-grid container">
              <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
                <h2 className="section-title text-uppercase">{landingSettings.saleSectionTitle}</h2>
                <Link href="/akcije" className="btn-link default-underline text-uppercase fw-medium">
                  View all
                </Link>
              </div>
              {landingSettings.saleSectionSubtitle ? <p className="text-secondary mb-4">{landingSettings.saleSectionSubtitle}</p> : null}
              <div className="row row-cols-2 row-cols-lg-4">
                {saleItems.map((item, index) => (
                  <ProductItemMotion key={`sale-${item.legacyId}`} className="product-card-wrapper" index={index}>
                    <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                      <div className="pc__img-wrapper">
                        <Link href={`/web-shop/${item.legacyId}`}>
                          <Image
                            src={item.coverImage || "/assets/images/home/demo19/product-5.jpg"}
                            width={330}
                            height={400}
                            alt={formatCatalogProductName(item.name, item.sku)}
                            className="pc__img"
                          />
                        </Link>
                      </div>
                      <div className="pc__info position-relative">
                        <h6 className="pc__title">
                          <Link href={`/web-shop/${item.legacyId}`}>{formatCatalogProductName(item.name, item.sku)}</Link>
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

        <section className="products-grid container">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Trending <strong>Now</strong>
            </h2>
          </div>
          <div className="row row-cols-2 row-cols-lg-4">
            {trending.map((item, index) => (
              <ProductItemMotion key={item.legacyId} className="product-card-wrapper" index={index}>
                <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                  <div className="pc__img-wrapper">
                    <Link href={`/web-shop/${item.legacyId}`}>
                      <Image
                        src={item.coverImage || "/assets/images/home/demo19/product-4.jpg"}
                        width={330}
                        height={400}
                        alt={formatCatalogProductName(item.name, item.sku)}
                        className="pc__img"
                      />
                    </Link>
                  </div>
                  <div className="pc__info position-relative">
                    <h6 className="pc__title">
                      <Link href={`/web-shop/${item.legacyId}`}>{formatCatalogProductName(item.name, item.sku)}</Link>
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

        <Reveal as="section" id="o-nama" className="container pb-5" delay={0.16}>
          <div className="row g-4 align-items-stretch">
            <div className="col-12 col-lg-7">
              <div className="h-100 border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#8d6f60" }}>
                  O nama
                </p>
                <h2 className="section-title text-uppercase mb-4">
                  Brend nastao iz <strong>porodicne radionice</strong>
                </h2>
                <div className="row g-3">
                  {atelierStoryParagraphs.map((paragraph) => (
                    <div key={paragraph} className="col-12 col-md-6">
                      <p className="text-secondary mb-0">{paragraph}</p>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href="/kontakt" className="btn btn-dark btn-sm text-uppercase fw-medium">
                    Kontaktirajte nas
                  </Link>
                  <Link href="/web-shop" className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    Poseti web shop
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="h-100 border bg-white p-4 p-md-5 d-flex flex-column" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#8d6f60" }}>
                  Kontakt
                </p>
                <h3 className="h4 text-uppercase mb-3">
                  Podrska i licne <strong>preporuke</strong>
                </h3>
                <p className="text-secondary mb-4">
                  Tim vas vodi kroz izbor tkanina, krojeva i detalja u showroom-u ili online. Odgovaramo u roku od jednog radnog dana.
                </p>
                <div className="d-grid gap-2">
                  {atelierContactPoints.map((point) => (
                    <div key={point.label} className="border px-3 py-2" style={{ borderRadius: 14 }}>
                      <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#8d6f60" }}>
                        {point.label}
                      </div>
                      <div>{point.value}</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href="/kontakt" className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    Kontakt forma
                  </Link>
                  <a href="mailto:atelier@santos.rs" className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    Posalji email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <Reveal as="section" className="blog-grid container" delay={0.18}>
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Latest <strong>Blog</strong>
            </h2>
            <Link href="/blog" className="btn-link default-underline text-uppercase fw-medium">
              View all
            </Link>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4">
            {posts.items.map((post, index) => (
              <article key={post.id} className="mb-4">
                <div className="blog-grid__item">
                  <div className="blog-grid__item-image-wrap">
                    <Link href={`/blog/${post.slug}`}>
                      <Image
                        src={post.coverImage || `/assets/images/home/demo19/blog-${Math.min(index + 1, 4)}.jpg`}
                        width={330}
                        height={230}
                        alt={post.title}
                        className="w-100 h-auto"
                      />
                    </Link>
                  </div>
                  <div className="blog-grid__item-detail">
                    <h6 className="blog-grid__item-title">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h6>
                    <p className="text-secondary">{(post.excerpt || "").slice(0, 85) || "Continue reading."}</p>
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
      <StorefrontFooter />
    </>
  );
}
