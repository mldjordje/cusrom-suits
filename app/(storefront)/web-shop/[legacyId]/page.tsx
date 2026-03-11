import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import ProductDetailTabs from "@/app/components/storefront/ProductDetailTabs";
import { getCatalogProductByLegacyId, getRelatedCatalogProducts } from "@/lib/catalog/store";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const stripHtml = (value: string | null) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: { params: Promise<{ legacyId: string }> }) {
  const { legacyId } = await params;
  const id = Number.parseInt(legacyId, 10);
  if (!Number.isFinite(id)) {
    return { title: "Product | Santos & Santorini" };
  }
  const product = await getCatalogProductByLegacyId(id);
  if (!product) {
    return { title: "Product not found | Santos & Santorini" };
  }
  return {
    title: `${product.name} | Santos & Santorini`,
    description: product.description || `Product details for ${product.sku}`,
  };
}

export default async function WebShopProductPage({
  params,
}: {
  params: Promise<{ legacyId: string }>;
}) {
  const { legacyId } = await params;
  const id = Number.parseInt(legacyId, 10);
  if (!Number.isFinite(id)) notFound();

  const product = await getCatalogProductByLegacyId(id);
  if (!product) notFound();
  const related = await getRelatedCatalogProducts(product, 4);

  const discountAmount = Math.max(0, product.priceGross - product.priceFinalGross);
  const stockValue = Math.max(0, Math.floor(product.stockWarehouse1));
  const gallery = product.images.length > 0 ? product.images : [product.coverImage || "/assets/images/search-result-3.jpg"];
  const categoryLabel = product.categories[0]?.path.join(" / ") || "Santos Selection";
  const shortDescription = stripHtml(product.description).slice(0, 280);
  const attributeItems = Object.entries(product.attributes || {}).slice(0, 6);

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <div className="mb-md-1 pb-md-3" />
        <section className="product-single container">
          <div className="row">
            <div className="col-lg-7">
              <div className="product-single__media" data-media-type="scroll-snap">
                <div className="product-single__image">
                  {gallery.map((image, index) => (
                    <div key={`${image}-${index}`} className="product-single__image-item">
                      <Image
                        src={image}
                        width={798}
                        height={845}
                        alt={`${product.name} ${index + 1}`}
                        priority={index === 0}
                        className="h-auto w-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="d-flex justify-content-between mb-4 pb-md-2">
                <div className="breadcrumb mb-0 d-none d-md-block flex-grow-1">
                  <Link href="/" className="menu-link menu-link_us-s text-uppercase fw-medium">
                    Home
                  </Link>
                  <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
                  <Link href="/web-shop" className="menu-link menu-link_us-s text-uppercase fw-medium">
                    The Shop
                  </Link>
                </div>

                <div className="product-single__prev-next d-flex align-items-center justify-content-between justify-content-md-end flex-grow-1">
                  <Link href="/web-shop" className="text-uppercase fw-medium">
                    <svg className="mb-1px" width="10" height="10" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                      <use href="#icon_prev_md" />
                    </svg>
                    <span className="menu-link menu-link_us-s">Shop</span>
                  </Link>
                  <Link href="/custom-suits" className="text-uppercase fw-medium">
                    <span className="menu-link menu-link_us-s">Custom Suit</span>
                    <svg className="mb-1px" width="10" height="10" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                      <use href="#icon_next_md" />
                    </svg>
                  </Link>
                </div>
              </div>

              <h1 className="product-single__name">{product.name}</h1>
              <div className="product-single__rating">
                <div className="reviews-group d-flex text-warning" aria-hidden="true">
                  <span>*****</span>
                </div>
                <span className="reviews-note text-lowercase text-secondary ms-1">{stockValue} in stock</span>
              </div>
              <div className="product-single__price">
                <span className="current-price">{formatRsd(product.priceFinalGross)}</span>
                {discountAmount > 0 ? <span className="old-price ms-2">{formatRsd(product.priceGross)}</span> : null}
              </div>
              <div className="product-single__short-desc">
                <p>{shortDescription || "Premium tailoring selection with refined materials and fit."}</p>
              </div>

              <div className="product-single__swatches">
                <div className="product-swatch text-swatches">
                  <label>Category</label>
                  <div className="swatch-list">
                    {product.categories.slice(0, 2).map((category) => (
                      <span key={category.id} className="swatch text-uppercase">
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="product-swatch color-swatches">
                  <label>Status</label>
                  <div className="swatch-list">
                    <span className={`swatch ${stockValue > 0 ? "bg-success" : "bg-secondary"} text-white`}>
                      {stockValue > 0 ? "Available" : "On Request"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="product-single__addtocart">
                <div className="qty-control position-relative">
                  <input type="number" name="quantity" value={1} min={1} readOnly className="qty-control__number text-center" />
                  <div className="qty-control__reduce">-</div>
                  <div className="qty-control__increase">+</div>
                </div>
                <Link href="/kontakt" className="btn btn-primary btn-addtocart">
                  Contact For Order
                </Link>
              </div>

              <div className="product-single__addtolinks">
                <Link href="/web-shop" className="menu-link menu-link_us-s add-to-wishlist">
                  <span>Back to Shop</span>
                </Link>
                <Link href="/blog" className="menu-link menu-link_us-s add-to-wishlist">
                  <span>Read Journal</span>
                </Link>
              </div>

              <div className="product-single__meta-info">
                <div className="meta-item">
                  <label>SKU:</label>
                  <span>{product.sku}</span>
                </div>
                <div className="meta-item">
                  <label>Categories:</label>
                  <span>{categoryLabel}</span>
                </div>
                <div className="meta-item">
                  <label>Brand:</label>
                  <span>{product.brand || "Santos"}</span>
                </div>
                <div className="meta-item">
                  <label>EAN:</label>
                  <span>{product.ean || "N/A"}</span>
                </div>
                <div className="meta-item">
                  <label>VAT:</label>
                  <span>{product.taxPercent}% included</span>
                </div>
              </div>
            </div>
          </div>

          <ProductDetailTabs
            description={product.description}
            specification={product.specification}
            attributes={attributeItems}
          />
        </section>

        {related.length > 0 ? (
          <section className="products-carousel container mt-5 pt-4">
            <h2 className="h3 text-uppercase mb-4 pb-xl-2 mb-xl-4">
              Related <strong>Products</strong>
            </h2>
            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4">
              {related.map((item) => {
                const coverImage = item.coverImage || "/assets/images/search-result-4.jpg";
                const secondImage = item.images[1] || coverImage;
                return (
                  <div key={item.legacyId} className="product-card-wrapper">
                    <div className="product-card mb-3 mb-md-4">
                      <div className="pc__img-wrapper hover-container">
                        <Link href={`/web-shop/${item.legacyId}`}>
                          <Image src={coverImage} width={330} height={400} alt={item.name} className="pc__img" />
                          <Image src={secondImage} width={330} height={400} alt={`${item.name} preview`} className="pc__img pc__img-second" />
                        </Link>
                        <Link href={`/web-shop/${item.legacyId}`} className="pc__atc btn anim_appear-bottom btn position-absolute border-0 text-uppercase fw-medium">
                          View Product
                        </Link>
                      </div>
                      <div className="pc__info position-relative">
                        <p className="pc__category">{item.categories[0]?.name || item.sku}</p>
                        <h6 className="pc__title">
                          <Link href={`/web-shop/${item.legacyId}`}>{item.name}</Link>
                        </h6>
                        <div className="product-card__price d-flex">
                          <span className="money price">{formatRsd(item.priceFinalGross)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter />
    </>
  );
}
