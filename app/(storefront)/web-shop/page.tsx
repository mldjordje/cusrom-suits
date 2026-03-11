import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import { listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";

type SearchParams = Record<string, string | string[] | undefined>;

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toStringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const metadata = {
  title: "Web Shop | Santos & Santorini",
  description: "Legacy catalog migrated to the new Santos and Santorini web shop.",
};

function sortItems(items: CatalogProductView[], sort: string): CatalogProductView[] {
  const next = [...items];
  if (sort === "price_asc") return next.sort((a, b) => a.priceFinalGross - b.priceFinalGross);
  if (sort === "price_desc") return next.sort((a, b) => b.priceFinalGross - a.priceFinalGross);
  if (sort === "name_asc") return next.sort((a, b) => a.name.localeCompare(b.name, "sr"));
  if (sort === "stock_desc") return next.sort((a, b) => b.stockWarehouse1 - a.stockWarehouse1);
  return next;
}

export default async function WebShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(toStringParam(params.page), 10) || 1;
  const q = toStringParam(params.q);
  const categoryId = Number.parseInt(toStringParam(params.categoryId), 10) || 0;
  const inStock = toStringParam(params.inStock) === "1";
  const onSale = toStringParam(params.onSale) === "1";
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
  });

  const items = sortItems(result.items, sort);
  const topCategories = result.categories.slice(0, 7);
  const masonryA = items.slice(0, 4);
  const masonryB = items.slice(4, 8);
  const gridItems = items.slice(8);

  const makeHref = (patch: Record<string, string | number | null>) => {
    const url = new URLSearchParams();
    const current: Record<string, string> = {
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
    },
  ) => {
    const wrapperClassName = options?.wrapperClassName || "product-card-wrapper";
    const cardClassName = options?.cardClassName || "product-card h-100 mb-2 pb-1 pb-md-0";
    const imageWrapperClassName = options?.imageWrapperClassName || "pc__img-wrapper hover-container p-lg-0";
    const imageWidth = options?.imageWidth || 690;
    const imageHeight = options?.imageHeight || 714;
    const fallbackImage = options?.fallbackImage || "/assets/images/search-result-2.jpg";
    const coverImage = item.coverImage || fallbackImage;
    const secondImage = item.images[1] || coverImage;

    return (
      <div key={key} className={wrapperClassName}>
        <div className={cardClassName}>
          <div className={imageWrapperClassName}>
            <Link href={`/web-shop/${item.legacyId}`}>
              <Image
                src={coverImage}
                width={imageWidth}
                height={imageHeight}
                alt={item.name}
                className="pc__img object-position-top"
              />
              <Image
                src={secondImage}
                width={imageWidth}
                height={imageHeight}
                alt={`${item.name} preview`}
                className="pc__img pc__img-second object-position-top"
              />
            </Link>
            <div className="pc__info hover__content text-center top-0 left-0 w-100 d-flex flex-column justify-content-center align-items-center">
              <p className="pc__category">{item.categories[0]?.name || item.sku}</p>
              <h6 className="pc__title">
                <Link href={`/web-shop/${item.legacyId}`}>{item.name}</Link>
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
              <Link href={`/web-shop/${item.legacyId}`} className="pc__atc anim_appear-bottom btn mt-3 border-0 text-uppercase fw-medium">
                View Product
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <section className="full-width_padding">
          <div className="full-width_border border-2" style={{ borderColor: "#eeeeee" }}>
            <div className="shop-banner position-relative">
              <div className="background-img" style={{ backgroundColor: "#eeeeee" }}>
                <Image
                  src="/assets/images/shop/shop_banner_character1.png"
                  width={1759}
                  height={420}
                  alt="Shop Banner"
                  className="slideshow-bg__img object-fit-cover"
                  priority
                />
              </div>
              <div className="shop-banner__content container position-absolute start-50 top-50 translate-middle">
                <h2 className="stroke-text h1 smooth-16 text-uppercase fw-bold mb-3 mb-xl-4 mb-xl-5">Web Shop</h2>
                <ul className="d-flex flex-wrap list-unstyled text-uppercase h6">
                  <li className="me-3 me-xl-4 pe-1">
                    <Link href={makeHref({ categoryId: null, page: 1 })} className={`menu-link menu-link_us-s ${categoryId <= 0 ? "menu-link_active" : ""}`}>
                      All
                    </Link>
                  </li>
                  {topCategories.map((category) => (
                    <li key={category.id} className="me-3 me-xl-4 pe-1">
                      <Link
                        href={makeHref({ categoryId: category.id, page: 1 })}
                        className={`menu-link menu-link_us-s ${categoryId === category.id ? "menu-link_active" : ""}`}
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 pb-lg-3" />

        <section className="shop-main container">
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3 pb-md-2">
            <span className="text-uppercase fw-medium me-1 d-none d-lg-inline">Filter</span>
            {topCategories.slice(0, 5).map((category, index) => (
              <div key={category.id} className="d-flex align-items-center">
                <Link
                  href={makeHref({ categoryId: category.id, page: 1 })}
                  className={`menu-link menu-link_us-s text-uppercase ${categoryId === category.id ? "menu-link_active" : ""}`}
                >
                  {category.name}
                </Link>
                {index < Math.min(topCategories.length, 5) - 1 ? (
                  <div className="shop-asc__seprator ms-2 me-3 bg-light d-none d-lg-block" />
                ) : null}
              </div>
            ))}
          </div>

          <form action="/web-shop" method="get" id="shop-filters" className="ss-shop9-filters mb-4 pb-md-2">
            <input type="hidden" name="page" value="1" />
            <div className="row g-2 align-items-end">
              <div className="col-12 col-lg-5">
                <label className="form-label text-uppercase fw-medium fs-13 mb-1">Search</label>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  className="form-control"
                  placeholder="Search by code, name, SKU, EAN..."
                />
              </div>

              <div className="col-6 col-md-4 col-lg-2">
                <label className="form-label text-uppercase fw-medium fs-13 mb-1">Sort</label>
                <select className="form-select fw-medium" aria-label="Sort Items" name="sort" defaultValue={sort}>
                  <option value="featured">Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A-Z</option>
                  <option value="stock_desc">Stock: High to Low</option>
                </select>
              </div>

              <div className="col-6 col-md-4 col-lg-2">
                <label className="form-label text-uppercase fw-medium fs-13 mb-1">Category</label>
                <select
                  className="form-select fw-medium"
                  aria-label="Category"
                  name="categoryId"
                  defaultValue={categoryId > 0 ? String(categoryId) : ""}
                >
                  <option value="">All</option>
                  {result.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2 col-lg-1">
                <label className="form-label text-uppercase fw-medium fs-13 mb-1">Stock</label>
                <label className="d-flex align-items-center gap-2 border rounded px-2 py-2">
                  <input type="checkbox" name="inStock" value="1" defaultChecked={inStock} />
                  <span className="fs-13">In</span>
                </label>
              </div>

              <div className="col-6 col-md-2 col-lg-1">
                <label className="form-label text-uppercase fw-medium fs-13 mb-1">Sale</label>
                <label className="d-flex align-items-center gap-2 border rounded px-2 py-2">
                  <input type="checkbox" name="onSale" value="1" defaultChecked={onSale} />
                  <span className="fs-13">On</span>
                </label>
              </div>

              <div className="col-12 col-lg-1 d-grid d-lg-block">
                <button type="submit" className="btn btn-primary text-uppercase fw-medium w-100">
                  Apply
                </button>
              </div>

              {(q || inStock || onSale || categoryId > 0 || sort !== "featured") ? (
                <div className="col-12">
                  <Link href="/web-shop" className="btn btn-link text-uppercase fw-medium p-0">
                    Reset filters
                  </Link>
                </div>
              ) : null}
            </div>
          </form>

          <div className="products-grid" id="products-grid">
            {masonryA.length > 0 ? (
              <div className="products-masonry row row-cols-md-2 mb-2 mb-md-3 pb-1 pb-md-3">
                {masonryA[0] ? renderOverlayCard(masonryA[0], `masonry-a-${masonryA[0].legacyId}`) : null}

                <div className="d-flex flex-column">
                  <div className="row row-cols-2 flex-grow-1 mb-lg-4">
                    {masonryA.slice(1, 3).map((item) =>
                      renderOverlayCard(item, `masonry-a-side-${item.legacyId}`, {
                        cardClassName: "product-card h-100 mb-2",
                      }),
                    )}
                  </div>
                  {masonryA[3]
                    ? renderOverlayCard(masonryA[3], `masonry-a-wide-${masonryA[3].legacyId}`, {
                        wrapperClassName: "product-card-wrapper flex-grow-1 pt-1",
                        imageWrapperClassName: "pc__img-wrapper pc-wide__img-wrapper hover-container p-lg-0",
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
                      {masonryB.slice(0, 2).map((item) =>
                        renderOverlayCard(item, `masonry-b-left-${item.legacyId}`, {
                          wrapperClassName: "product-card-wrapper flex-grow-1 mb-md-4",
                        }),
                      )}
                    </div>
                    {masonryB[2]
                      ? renderOverlayCard(masonryB[2], `masonry-b-mid-${masonryB[2].legacyId}`, {
                          wrapperClassName: "product-card-wrapper flex-grow-1 mb-md-4",
                        })
                      : null}
                  </div>
                </div>
                {masonryB[3] ? renderOverlayCard(masonryB[3], `masonry-b-right-${masonryB[3].legacyId}`) : null}
              </div>
            ) : null}

            <div className="products-grid row row-cols-2 row-cols-md-3 row-cols-lg-4">
              {gridItems.map((item) =>
                renderOverlayCard(item, `grid-${item.legacyId}`, {
                  cardClassName: "product-card mb-3 mb-md-4 mb-xxl-5",
                  imageWrapperClassName: "pc__img-wrapper hover-container",
                  imageWidth: 330,
                  imageHeight: 400,
                }),
              )}
            </div>
          </div>

          <p className="mb-5 text-center fw-medium">
            SHOWING {items.length} of {result.total} products
            <span className="ms-2 text-secondary">
              ({result.page}/{result.totalPages})
            </span>
          </p>

          <div className="text-center">
            <Link
              href={makeHref({ page: Math.min(result.totalPages, result.page + 1) })}
              className={`btn btn-primary text-uppercase fw-medium fs-base ${result.page >= result.totalPages ? "disabled pe-none opacity-50" : ""}`}
            >
              Show More
            </Link>
          </div>

        </section>

        <div className="mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter />
    </>
  );
}
