import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import ProductDetailTabs from "@/app/components/storefront/ProductDetailTabs";
import ProductImageGallery from "@/app/components/storefront/ProductImageGallery";
import Reveal from "@/app/components/motion/Reveal";
import { getCatalogProductByLegacyId, getRelatedCatalogProducts } from "@/lib/catalog/store";
import AddToCartButton from "@/app/components/storefront/cart/AddToCartButton";

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
  const stockValue = Math.max(
    0,
    Math.floor(product.stockTotal > 0 ? product.stockTotal : product.stockWarehouse1),
  );
  const gallery = product.images.length > 0 ? product.images : [product.coverImage || "/img/odela.jpg"];
  const categoryLabel = product.categories[0]?.path.join(" / ") || "Santos Selection";
  const shortDescription = stripHtml(product.description).slice(0, 280);
  const attributeItems = Object.entries(product.attributes || {}).slice(0, 6);

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <div className="mb-md-1 pb-md-3" />
        <Reveal as="section" className="product-single container">
          <div className="row">
            <div className="col-lg-7">
              <div className="product-single__media" data-media-type="scroll-snap">
                <ProductImageGallery images={gallery} name={product.name} />
              </div>
            </div>

            <div className="col-lg-5 ss-product-single-info">
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
                  <Link href="/kontakt" className="text-uppercase fw-medium">
                    <span className="menu-link menu-link_us-s">Kontakt</span>
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
                  <label>Kategorija</label>
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
                      {stockValue > 0 ? "Na stanju" : "Na upit"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="product-single__addtocart">
                <div className="d-flex flex-wrap gap-2">
                  <AddToCartButton
                    item={{
                      legacyId: product.legacyId,
                      sku: product.sku,
                      name: product.name,
                      price: product.priceFinalGross,
                      image: product.coverImage || gallery[0] || null,
                      maxQuantity: stockValue > 0 ? stockValue : null,
                      categoryLabel: product.categories[0]?.name || null,
                    }}
                  />
                  <Link href="/checkout" className="btn btn-outline-dark btn-addtocart">
                    Checkout
                  </Link>
                </div>
              </div>

              <div className="product-single__addtolinks">
                <Link href="/web-shop" className="menu-link menu-link_us-s add-to-wishlist">
                  <span>Nazad na shop</span>
                </Link>
                <Link href="/blog" className="menu-link menu-link_us-s add-to-wishlist">
                  <span>Procitaj blog</span>
                </Link>
              </div>

              <div className="product-single__meta-info">
                <div className="meta-item">
                  <label>SKU:</label>
                  <span>{product.sku}</span>
                </div>
                <div className="meta-item">
                  <label>Kategorije:</label>
                  <span>{categoryLabel}</span>
                </div>
                <div className="meta-item">
                  <label>Brend:</label>
                  <span>{product.brand || "Santos"}</span>
                </div>
                <div className="meta-item">
                  <label>EAN:</label>
                  <span>{product.ean || "N/A"}</span>
                </div>
                <div className="meta-item">
                  <label>PDV:</label>
                  <span>{product.taxPercent}% uracunat</span>
                </div>
              </div>
            </div>
          </div>

          <ProductDetailTabs
            description={product.description}
            specification={product.specification}
            attributes={attributeItems}
          />
        </Reveal>

        {related.length > 0 ? (
          <Reveal as="section" className="products-carousel container mt-5 pt-4" delay={0.06}>
            <h2 className="h3 text-uppercase mb-4 pb-xl-2 mb-xl-4">
              Povezani <strong>Proizvodi</strong>
            </h2>
            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4">
              {related.map((item) => {
                const coverImage = item.coverImage || "/img/odela2.jpg";
                const secondImage = item.images[1] || coverImage;
                return (
                  <div key={item.legacyId} className="product-card-wrapper">
                    <div className="product-card ss-card-hover mb-3 mb-md-4">
                      <div className="pc__img-wrapper hover-container">
                        <Link href={`/web-shop/${item.legacyId}`}>
                          <Image
                            src={coverImage}
                            width={330}
                            height={400}
                            alt={item.name}
                            className="pc__img"
                            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                            quality={70}
                          />
                          <Image
                            src={secondImage}
                            width={330}
                            height={400}
                            alt={`${item.name} preview`}
                            className="pc__img pc__img-second"
                            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                            quality={60}
                          />
                        </Link>
                        <Link href={`/web-shop/${item.legacyId}`} className="pc__atc btn anim_appear-bottom btn position-absolute border-0 text-uppercase fw-medium">
                          Detaljnije
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
          </Reveal>
        ) : null}

        <div className="mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter />
    </>
  );
}
