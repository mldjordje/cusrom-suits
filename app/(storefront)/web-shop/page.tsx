import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import WebShopFilters from "@/app/components/storefront/WebShopFilters";
import Reveal from "@/app/components/motion/Reveal";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import { getCatalogProductCategoryLabel } from "@/lib/catalog/presentation";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { getCatalogProductImageSources, getLocalizedCatalogProductName } from "@/lib/storefront/product-details";
import { absoluteUrl, buildBreadcrumbJsonLd, buildSeoMetadata } from "@/lib/seo";

type SearchParams = Record<string, string | string[] | undefined>;
type ActiveFilterChip = { key: string; label: string; href: string };

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toStringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  return buildSeoMetadata({
    title: "Web Shop",
    description: isEn
      ? "Browse ready-to-wear menswear, selected offers and available sizes in the Santos & Santorini web shop."
      : "Pregledajte ready-to-wear musku kolekciju, aktuelne akcije i dostupne velicine u Santos & Santorini web shopu.",
    path: "/web-shop",
    lang,
    image: "/img/hero2.jpg",
    keywords: ["web shop odela", "muski sakoi", "muske kosulje", "ready to wear"],
  });
}

function sortItems(items: CatalogProductView[], sort: string): CatalogProductView[] {
  const next = [...items];
  const stockRank = (item: CatalogProductView) =>
    Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0));

  if (sort === "price_asc") return next.sort((a, b) => a.priceFinalGross - b.priceFinalGross);
  if (sort === "price_desc") return next.sort((a, b) => b.priceFinalGross - a.priceFinalGross);
  if (sort === "name_asc") return next.sort((a, b) => a.name.localeCompare(b.name, "sr"));
  if (sort === "stock_desc") return next.sort((a, b) => stockRank(b) - stockRank(a));

  return next;
}

export default async function WebShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const lang = await resolveStorefrontLanguage(params);
  const isEn = lang === "en";
  const page = Number.parseInt(toStringParam(params.page), 10) || 1;
  const q = toStringParam(params.q);
  const rawCategoryId = toStringParam(params.categoryId);
  const selectedCategoryValue = rawCategoryId === "sale" ? "sale" : rawCategoryId;
  const categoryId = Number.parseInt(rawCategoryId, 10) || 0;
  const inStock = toStringParam(params.inStock) === "1";
  const onSale = toStringParam(params.onSale) === "1" || rawCategoryId === "sale";
  const sort = toStringParam(params.sort) || "featured";

  const result = await listCatalogProducts({
    page,
    pageSize: 24,
    query: q,
    categoryId: categoryId || undefined,
    inStock,
    onSale,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
  });
  const landingSettings = await getLandingSettings();

  const getCategoryLabel = (item: CatalogProductView) =>
    getCatalogProductCategoryLabel(
      {
        name: item.name,
        sku: item.sku,
        categories: item.categories,
        brand: item.brand,
      },
      lang,
    );

  const items = sortItems(result.items, sort);
  const topCategories = result.categories.slice(0, 7);
  const masonryA = items.slice(0, 4);
  const masonryB = items.slice(4, 8);
  const gridItems = items.slice(8);
  const heroLead = landingSettings.shopHeroLead.trim();
  const conciseHeroLead =
    heroLead.length > 112 ? `${heroLead.slice(0, 109).trimEnd()}...` : heroLead;
  const sortLabelMap: Record<string, string> = {
    featured: isEn ? "Featured" : "Izdvojeno",
    price_asc: isEn ? "Price: Low to High" : "Cena: od nize ka visoj",
    price_desc: isEn ? "Price: High to Low" : "Cena: od vise ka nizoj",
    name_asc: isEn ? "Name: A-Z" : "Naziv: A-Z",
    stock_desc: isEn ? "Stock: High to Low" : "Stanje: od veceg ka manjem",
  };
  const sortOptions = [
    { value: "featured", label: sortLabelMap.featured },
    { value: "price_asc", label: sortLabelMap.price_asc },
    { value: "price_desc", label: sortLabelMap.price_desc },
    { value: "name_asc", label: sortLabelMap.name_asc },
    { value: "stock_desc", label: sortLabelMap.stock_desc },
  ];

  const makeHref = (patch: Record<string, string | number | null>) => {
    const url = new URLSearchParams();
    const current: Record<string, string> = {
      lang: isEn ? "en" : "",
      q,
      categoryId: categoryId > 0 ? String(categoryId) : "",
      inStock: inStock ? "1" : "",
      page: String(result.page),
      sort: sort !== "featured" ? sort : "",
      onSale: onSale ? "1" : "",
    };

    for (const [key, value] of Object.entries(current)) {
      if (value) url.set(key, value);
    }

    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || Number.isNaN(value)) {
        url.delete(key);
      } else {
        url.set(key, String(value));
      }
    }

    const queryString = url.toString();
    return queryString ? `/web-shop?${queryString}` : "/web-shop";
  };

  const categoryNameById = new Map(result.categories.map((category) => [category.id, category.name]));
  const selectedCategoryName = categoryId > 0 ? categoryNameById.get(categoryId) || `Category ${categoryId}` : "";
  const activeFilterChips: ActiveFilterChip[] = [];

  if (q.trim()) {
    activeFilterChips.push({
      key: "q",
      label: `${isEn ? "Search" : "Pretraga"}: ${q.trim()}`,
      href: makeHref({ q: null, page: 1 }),
    });
  }

  if (categoryId > 0) {
    activeFilterChips.push({
      key: "category",
      label: `${isEn ? "Category" : "Kategorija"}: ${selectedCategoryName}`,
      href: makeHref({ categoryId: null, page: 1 }),
    });
  }

  if (sort !== "featured") {
    activeFilterChips.push({
      key: "sort",
      label: `${isEn ? "Sort" : "Sortiranje"}: ${sortLabelMap[sort] || sort}`,
      href: makeHref({ sort: null, page: 1 }),
    });
  }

  if (inStock) {
    activeFilterChips.push({
      key: "stock",
      label: isEn ? "In stock" : "Na stanju",
      href: makeHref({ inStock: null, page: 1 }),
    });
  }

  if (onSale) {
    activeFilterChips.push({
      key: "sale",
      label: isEn ? "On sale" : "Na akciji",
      href: makeHref({ onSale: null, page: 1 }),
    });
  }

  const renderOverlayCard = (
    item: CatalogProductView,
    key: string,
    options?: {
      wrapperClassName?: string;
      cardClassName?: string;
      imageWrapperClassName?: string;
      imageWidth?: number;
      imageHeight?: number;
      fallbackImage?: string;
      motionIndex?: number;
    },
  ) => {
    const wrapperClassName = options?.wrapperClassName || "product-card-wrapper";
    const cardClassName = options?.cardClassName || "product-card ss-card-hover ss-product-card h-100 mb-2 pb-1 pb-md-0";
    const imageWrapperClassName = options?.imageWrapperClassName || "pc__img-wrapper hover-container p-lg-0";
    const imageWidth = options?.imageWidth || 690;
    const imageHeight = options?.imageHeight || 714;
    const fallbackImage = options?.fallbackImage || "/img/odela2.jpg";
    const motionIndex = options?.motionIndex || 0;
    const imageSources = getCatalogProductImageSources(item, [], [fallbackImage]);
    const displayName = getLocalizedCatalogProductName(item, lang);
    const detailHref = isEn ? `/web-shop/${item.legacyId}?lang=en` : `/web-shop/${item.legacyId}`;
    const imageSizes =
      imageWidth >= 600
        ? "(max-width: 991px) 100vw, (max-width: 1399px) 50vw, 42vw"
        : "(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw";

    return (
      <ProductItemMotion key={key} className={wrapperClassName} index={motionIndex}>
        <div className={cardClassName}>
          <div className={imageWrapperClassName}>
            <Link href={detailHref}>
              <StorefrontSmartImage
                sources={imageSources}
                width={imageWidth}
                height={imageHeight}
                alt={displayName}
                className="pc__img object-position-top"
                sizes={imageSizes}
                quality={68}
              />
            </Link>
            <div className="pc__info hover__content text-center top-0 left-0 w-100 d-none d-md-flex flex-column justify-content-center align-items-center">
              <p className="pc__category">{getCategoryLabel(item)}</p>
              <h6 className="pc__title">
                <Link href={detailHref}>{displayName}</Link>
              </h6>
              <div className="product-card__price d-flex justify-content-center">
                {item.priceGross > item.priceFinalGross ? (
                  <>
                    <span className="money price price-old">{formatRsd(item.priceGross)}</span>
                    <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
                  </>
                ) : (
                  <span className="money price">{formatRsd(item.priceFinalGross)}</span>
                )}
              </div>
              <Link href={detailHref} className="pc__atc anim_appear-bottom btn mt-3 border-0 text-uppercase fw-medium">
                {isEn ? "View product" : "Pogledaj proizvod"}
              </Link>
            </div>
          </div>
          <div className="pc__info ss-card-mobile-info d-md-none">
            <p className="pc__category">{getCategoryLabel(item)}</p>
            <h6 className="pc__title mb-1">
              <Link href={detailHref}>{displayName}</Link>
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
    );
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: isEn ? "Home" : "Pocetna", path: "/" },
    { name: "Web Shop", path: "/web-shop" },
  ]);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: isEn ? "Santos & Santorini Web Shop" : "Santos & Santorini Web Shop",
    url: absoluteUrl(isEn ? "/web-shop?lang=en" : "/web-shop"),
    description: landingSettings.shopHeroLead,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 12).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(variantHrefFromId(item.legacyId, isEn)),
        name: getLocalizedCatalogProductName(item, lang),
      })),
    },
  };

  function variantHrefFromId(legacyId: number, english: boolean) {
    return english ? `/web-shop/${legacyId}?lang=en` : `/web-shop/${legacyId}`;
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={collectionJsonLd} />
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-shop-page">
        <Reveal as="section" className="shop-banner position-relative">
          <div className="background-img" style={{ backgroundColor: "#eeeeee" }}>
            <Image
              src={landingSettings.shopHeroImage || "/img/hero2.jpg"}
              width={1759}
              height={420}
              alt="Santos web shop hero"
              className="slideshow-bg__img object-fit-cover"
              priority
            />
          </div>
          <div className="container position-relative py-4 py-lg-5">
            <div className="ss-shop-banner-simple">
              {landingSettings.shopHeroEyebrow ? (
                <p className="ss-shop-banner-simple__eyebrow">{landingSettings.shopHeroEyebrow}</p>
              ) : null}
              <h1>{landingSettings.shopHeroTitle}</h1>
              {conciseHeroLead ? <p>{conciseHeroLead}</p> : null}
            </div>
          </div>
        </Reveal>

        <div className="mb-4 pb-lg-3" />

        <section className="shop-main container" id="shop-products">
          <WebShopFilters
            lang={lang}
            query={q}
            categoryId={categoryId}
            selectedCategoryValue={selectedCategoryValue || (onSale && categoryId <= 0 ? "sale" : "")}
            inStock={inStock}
            onSale={onSale}
            sort={sort}
            categories={result.categories}
            featuredCategories={topCategories.slice(0, 6)}
            activeFilterChips={activeFilterChips}
            showingCount={items.length}
            totalCount={result.total}
            sortOptions={sortOptions}
          >
            <div className="ss-shop-gallery">
              <div className="ss-shop-gallery__header">
                <div>
                  <p className="ss-shop-gallery__eyebrow">{isEn ? "Selected collection" : "Izabrana kolekcija"}</p>
                  <h2 className="ss-shop-gallery__title">
                    {items.length > 0
                      ? isEn
                        ? "Products that match your selection"
                        : "Proizvodi koji odgovaraju tvom izboru"
                      : isEn
                        ? "No products found"
                        : "Nema pronadjenih proizvoda"}
                  </h2>
                </div>
                <p className="ss-shop-gallery__meta">
                  {isEn ? "Showing" : "Prikazano"} <strong>{items.length}</strong> / {result.total}
                </p>
              </div>

              {items.length === 0 ? (
                <div className="ss-shop-empty-state">
                  <div className="ss-shop-empty-state__card">
                    <p className="ss-shop-empty-state__eyebrow">{isEn ? "Try again" : "Pokusi ponovo"}</p>
                    <h3>{isEn ? "Adjust your filters for a broader selection." : "Prilagodi filtere za siri izbor proizvoda."}</h3>
                    <p>
                      {isEn
                        ? "Start with product name or category, then add stock or sale filters only if needed."
                        : "Kreni od naziva proizvoda ili kategorije, pa tek onda dodaj stanje ili akciju ako je potrebno."}
                    </p>
                    <Link href={makeHref({ q: null, categoryId: null, inStock: null, onSale: null, sort: null, page: 1 })} className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? "Reset filters" : "Resetuj filtere"}
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="products-grid d-none d-md-block" id="products-grid-desktop">
                    {masonryA.length > 0 ? (
                      <div className="products-masonry row row-cols-md-2 mb-2 mb-md-3 pb-1 pb-md-3">
                        {masonryA[0] ? renderOverlayCard(masonryA[0], `masonry-a-${masonryA[0].legacyId}`, { motionIndex: 0 }) : null}

                        <div className="d-flex flex-column">
                          <div className="row row-cols-2 flex-grow-1 mb-lg-4">
                            {masonryA.slice(1, 3).map((item, index) =>
                              renderOverlayCard(item, `masonry-a-side-${item.legacyId}`, {
                                cardClassName: "product-card ss-card-hover ss-product-card h-100 mb-2",
                                motionIndex: index + 1,
                              }),
                            )}
                          </div>
                          {masonryA[3]
                            ? renderOverlayCard(masonryA[3], `masonry-a-wide-${masonryA[3].legacyId}`, {
                                wrapperClassName: "product-card-wrapper flex-grow-1 pt-1",
                                imageWrapperClassName: "pc__img-wrapper pc-wide__img-wrapper hover-container p-lg-0",
                                motionIndex: 3,
                              })
                            : null}
                        </div>
                      </div>
                    ) : null}

                    {masonryB.length > 0 ? (
                      <div className="products-masonry row row-cols-md-2 mb-2 mb-md-3 pb-1 pb-md-3">
                        <div className="mb-2 pb-1 mb-md-0 pb-md-0">
                          <div className="row row-cols-2 h-100">
                            <div className="d-flex flex-column">
                              {masonryB.slice(0, 2).map((item, index) =>
                                renderOverlayCard(item, `masonry-b-left-${item.legacyId}`, {
                                  wrapperClassName: "product-card-wrapper flex-grow-1 mb-md-4",
                                  motionIndex: index + 4,
                                }),
                              )}
                            </div>
                            {masonryB[2]
                              ? renderOverlayCard(masonryB[2], `masonry-b-mid-${masonryB[2].legacyId}`, {
                                  wrapperClassName: "product-card-wrapper flex-grow-1 mb-md-4",
                                  motionIndex: 6,
                                })
                              : null}
                          </div>
                        </div>
                        {masonryB[3] ? renderOverlayCard(masonryB[3], `masonry-b-right-${masonryB[3].legacyId}`, { motionIndex: 7 }) : null}
                      </div>
                    ) : null}

                    <div className="products-grid row row-cols-2 row-cols-md-3 row-cols-lg-4">
                      {gridItems.map((item, index) =>
                        renderOverlayCard(item, `grid-${item.legacyId}`, {
                          cardClassName: "product-card ss-card-hover ss-product-card mb-3 mb-md-4 mb-xxl-5",
                          imageWrapperClassName: "pc__img-wrapper hover-container",
                          imageWidth: 330,
                          imageHeight: 400,
                          motionIndex: index + 8,
                        }),
                      )}
                    </div>
                  </div>

                  <div className="products-grid ss-mobile-grid d-md-none" id="products-grid-mobile">
                    <div className="row row-cols-2 g-2">
                      {items.map((item, index) =>
                        renderOverlayCard(item, `mobile-${item.legacyId}`, {
                          wrapperClassName: "product-card-wrapper ss-mobile-grid__item",
                          cardClassName: "product-card ss-card-hover ss-product-card ss-mobile-grid__card",
                          imageWrapperClassName: "pc__img-wrapper ss-mobile-grid__img-wrapper",
                          imageWidth: 330,
                          imageHeight: 400,
                          motionIndex: index,
                        }),
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </WebShopFilters>

          <div className="ss-shop-pagination">
            <p className="ss-shop-pagination__summary">
              {isEn ? "SHOWING" : "PRIKAZANO"} {items.length} {isEn ? "OF" : "OD"} {result.total} {isEn ? "PRODUCTS" : "PROIZVODA"}
              <span className="ms-2 text-secondary">
                ({result.page}/{result.totalPages})
              </span>
            </p>
            <Link
              href={makeHref({ page: Math.min(result.totalPages, result.page + 1) })}
              className={`btn btn-primary text-uppercase fw-medium fs-base ss-shop-pagination__cta ${result.page >= result.totalPages ? "disabled pe-none opacity-50" : ""}`}
            >
              {isEn ? "Show more" : "Prikazi jos"}
            </Link>
          </div>
        </section>

        <div className="mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
