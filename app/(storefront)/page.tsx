import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import HomeHeroVideo from "@/app/components/storefront/HomeHeroVideo";
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
  description: "Home 18 storefront layout mapped to Santos catalog and blog.",
};

const legacyCampaignBlocks = [
  {
    id: "legacy-black-friday",
    badge: "Black Friday Event",
    title: "Do 30% popusta na bespoke.",
    copy: "Limitirane cene na premium vunu i lan. Izaberi fit, tkaninu i akcente, a tim finalizuje kroj po meri.",
    image: "/img/hero.jpg",
    ctaLabel: "Muskarci i zene",
    ctaHref: "/web-shop",
  },
  {
    id: "legacy-holiday-capsule",
    badge: "Holiday Capsule",
    title: "Praznicni tailor-made",
    copy: "Jednoredni, dvoredni ili tux. Dizajniraj izgled i nastavi merenje online ili u showroom-u.",
    image: "/img/hero2.jpg",
    ctaLabel: "Otvori custom suits",
    ctaHref: "/custom-suits",
  },
  {
    id: "legacy-gift-edit",
    badge: "Gift Edit",
    title: "Poklon koji traje",
    copy: "Kravate od svile, kozne galanterije i poklon vaucer za odelo po meri kao premium poklon set.",
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
  { label: "Telefon", value: "+381 18 250 250" },
  { label: "Email", value: "atelier@santos.rs" },
  { label: "Adresa", value: "Obrenoviceva 10, Nis" },
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

export default async function HomePage() {
  const [catalog, posts, landingSettings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 16,
      activeOnly: true,
      exportOnly: true,
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

  const salePool = landingPool
    .filter((item) => item.priceGross > item.priceFinalGross || item.rebatePercent > 0)
    .slice(0, 32);

  const heroProducts = pickProductsForSection(landingPool, landingSettings.highlightedProductIds, 8, landingPool.slice(0, 8));
  const heroStripProducts = pickProductsForSection(landingPool, landingSettings.heroStripProductIds, 4, landingPool.slice(0, 4));
  const featured = pickProductsForSection(landingPool, landingSettings.popularProductIds, 4, landingPool.slice(0, 4));
  const arrivals = pickProductsForSection(landingPool, landingSettings.arrivalsProductIds, 4, landingPool.slice(4, 8));
  const trending = pickProductsForSection(landingPool, landingSettings.trendingProductIds, 4, landingPool.slice(8, 12));
  const saleItems = pickProductsForSection(salePool, landingSettings.saleProductIds, 4, salePool.slice(0, 4));

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper theme-18">
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

        <section className="container pb-5">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              Brend <strong>Story</strong>
            </h2>
            <Link href="/custom-suits" className="btn-link default-underline text-uppercase fw-medium">
              Otvori konfigurator
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
        </section>

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
            {heroProducts.map((item) => (
              <div key={item.legacyId}>
                <Link href={`/web-shop/${item.legacyId}`} className="d-block">
                  <Image
                    src={item.coverImage || "/assets/images/home/demo19/product-1.jpg"}
                    width={330}
                    height={400}
                    alt={formatCatalogProductName(item.name, item.sku)}
                    className="w-100 h-auto mb-2"
                  />
                  <span className="menu-link menu-link_us-s fw-semi-bold fs-16 text-uppercase">{formatCatalogProductName(item.name, item.sku)}</span>
                </Link>
              </div>
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
            {featured.map((item) => (
              <div key={item.legacyId} className="product-card-wrapper">
                <div className="product-card mb-3 mb-md-4">
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
              </div>
            ))}
          </div>
        </section>

        <div className="mb-3 mb-xl-4 pt-xl-1 pb-4" />

        <section className="banner-grid container">
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
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <section className="products-grid container">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-md-2">
            <h2 className="section-title text-uppercase">
              New <strong>Arrivals</strong>
            </h2>
          </div>
          <div className="row row-cols-2 row-cols-lg-4">
            {arrivals.map((item) => (
              <div key={item.legacyId} className="product-card-wrapper">
                <div className="product-card mb-3 mb-md-4">
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
              </div>
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
                {saleItems.map((item) => (
                  <div key={`sale-${item.legacyId}`} className="product-card-wrapper">
                    <div className="product-card mb-3 mb-md-4">
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
                  </div>
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
            {trending.map((item) => (
              <div key={item.legacyId} className="product-card-wrapper">
                <div className="product-card mb-3 mb-md-4">
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
              </div>
            ))}
          </div>
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <section id="o-nama" className="container pb-5">
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
                  <Link href="/custom-suits" className="btn btn-dark btn-sm text-uppercase fw-medium">
                    Dizajniraj odelo
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
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />

        <section className="blog-grid container">
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
        </section>

        <div className="mb-4 mb-xl-5 pt-xl-1 pb-4" />

        <BrandStrip />
        <div className="mb-4 mb-xl-5 pt-xl-1 pb-5" />
      </main>
      <StorefrontFooter />
    </>
  );
}
