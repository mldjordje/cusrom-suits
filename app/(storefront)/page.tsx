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

  const heroProducts = landingPool.slice(0, 8);
  const heroStripProducts = landingPool.slice(0, 4);
  const featured = landingPool.slice(0, 4);
  const arrivals = landingPool.slice(4, 8);
  const trending = landingPool.slice(8, 12);
  const saleItems = landingPool
    .filter((item) => item.priceGross > item.priceFinalGross || item.rebatePercent > 0)
    .slice(0, 4);

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
