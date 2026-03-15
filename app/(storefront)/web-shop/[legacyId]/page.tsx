import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import ProductDetailTabs from "@/app/components/storefront/ProductDetailTabs";
import ProductImageGallery from "@/app/components/storefront/ProductImageGallery";
import StorefrontOrderSteps from "@/app/components/storefront/StorefrontOrderSteps";
import Reveal from "@/app/components/motion/Reveal";
import {
  getCatalogProductByLegacyId,
  getCatalogProductVariantsBySku,
  getRelatedCatalogProducts,
} from "@/lib/catalog/store";
import AddToCartButton from "@/app/components/storefront/cart/AddToCartButton";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import {
  getLocalizedCatalogDescription,
  getLocalizedCatalogProductName,
  getLocalizedCatalogSpecification,
  getProductDeclaration,
  getProductMaterial,
  getProductSizeGuide,
  getProductSizeOptions,
  getProductWashCare,
  getSelectedProductSize,
  productSupportsSizeGuide,
} from "@/lib/storefront/product-details";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const stripHtml = (value: string | null) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ legacyId: string }>;
}) {
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
  searchParams,
}: {
  params: Promise<{ legacyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { legacyId } = await params;
  const pageSearchParams = await searchParams;
  const lang = await resolveStorefrontLanguage(pageSearchParams);
  const isEn = lang === "en";
  const id = Number.parseInt(legacyId, 10);
  if (!Number.isFinite(id)) notFound();

  const product = await getCatalogProductByLegacyId(id);
  if (!product) notFound();

  const [related, variants] = await Promise.all([
    getRelatedCatalogProducts(product, 4),
    getCatalogProductVariantsBySku(product.sku, {
      applyPromotions: true,
      activeOnly: true,
      exportOnly: true,
    }),
  ]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const displayName = getLocalizedCatalogProductName(product, lang);
  const displayDescription = getLocalizedCatalogDescription(product, lang);
  const displaySpecification = getLocalizedCatalogSpecification(product, lang);
  const material = getProductMaterial(product, lang);
  const sizeOptions = getProductSizeOptions(product, variants);
  const selectedSize = getSelectedProductSize(product);
  const sizeGuide = getProductSizeGuide(product, lang, sizeOptions);
  const showSizeGuide = productSupportsSizeGuide(product) && Boolean(sizeGuide);
  const declaration = getProductDeclaration(
    product,
    lang,
    selectedSize,
    material,
    sizeOptions,
  );
  const washCare = getProductWashCare(product, lang);

  const discountAmount = Math.max(0, product.priceGross - product.priceFinalGross);
  const stockValue = Math.max(
    0,
    Math.floor(product.stockTotal > 0 ? product.stockTotal : product.stockWarehouse1),
  );
  const gallery =
    product.images.length > 0
      ? product.images
      : [product.coverImage || "/img/odela.jpg"];
  const categoryLabel =
    product.categories[0]?.path.join(" / ") ||
    (isEn ? "Santos selection" : "Santos izbor");
  const shortDescription = stripHtml(displayDescription).slice(0, 280);
  const attributeItems = Object.entries(product.attributes || {})
    .filter(([key]) => key !== "size")
    .slice(0, 6);
  const variantHref = (variantId: number) =>
    isEn ? `/web-shop/${variantId}?lang=en` : `/web-shop/${variantId}`;
  const cartItem = {
    legacyId: product.legacyId,
    sku: product.sku,
    name: displayName,
    size: selectedSize,
    material,
    price: product.priceFinalGross,
    image: product.coverImage || gallery[0] || null,
    maxQuantity: stockValue > 0 ? stockValue : null,
    categoryLabel: product.categories[0]?.name || null,
  };

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-commerce-page ss-product-page">
        <section className="container ss-commerce-shell">
          <StorefrontOrderSteps lang={lang} current="product" />
        </section>
        <Reveal as="section" className="product-single container">
          <div className="row">
            <div className="col-lg-7">
              <div className="product-single__media" data-media-type="scroll-snap">
                <ProductImageGallery images={gallery} name={displayName} />
              </div>
            </div>

            <div className="col-lg-5 ss-product-single-info">
              <div className="d-flex justify-content-between mb-4 pb-md-2">
                <div className="breadcrumb mb-0 d-none d-md-block flex-grow-1">
                  <Link href={withLang("/")} className="menu-link menu-link_us-s text-uppercase fw-medium">
                    {isEn ? "Home" : "Pocetna"}
                  </Link>
                  <span className="breadcrumb-separator menu-link fw-medium ps-1 pe-1">/</span>
                  <Link href={withLang("/web-shop")} className="menu-link menu-link_us-s text-uppercase fw-medium">
                    Web shop
                  </Link>
                </div>

                <div className="product-single__prev-next d-flex align-items-center justify-content-between justify-content-md-end flex-grow-1">
                  <Link href={withLang("/web-shop")} className="text-uppercase fw-medium">
                    <svg className="mb-1px" width="10" height="10" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                      <use href="#icon_prev_md" />
                    </svg>
                    <span className="menu-link menu-link_us-s">{isEn ? "Back to shop" : "Nazad na shop"}</span>
                  </Link>
                  <Link href={withLang("/kontakt")} className="text-uppercase fw-medium">
                    <span className="menu-link menu-link_us-s">{isEn ? "Contact" : "Kontakt"}</span>
                    <svg className="mb-1px" width="10" height="10" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                      <use href="#icon_next_md" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="ss-product-glass-card ss-product-hero-card">
                <div className="ss-product-journey mb-3">
                  <span className="ss-product-journey__eyebrow">
                    {isEn ? "Simple order flow" : "Jednostavan tok porucivanja"}
                  </span>
                  <p className="ss-product-journey__text">
                    {isEn
                      ? "Choose your size, add the item to cart, then confirm the order details in checkout."
                      : "Izaberi velicinu, dodaj model u korpu, pa potvrdi podatke u checkout-u."}
                  </p>
                </div>
                <h1 className="product-single__name">{displayName}</h1>
                <div className="product-single__rating">
                  <div className="reviews-group d-flex text-warning" aria-hidden="true">
                    <span>*****</span>
                  </div>
                  <span className="reviews-note text-lowercase text-secondary ms-1">
                    {stockValue} {isEn ? "in stock" : "na stanju"}
                  </span>
                </div>
                <div className="product-single__price">
                  <span className="current-price">{formatRsd(product.priceFinalGross)}</span>
                  {discountAmount > 0 ? (
                    <span className="old-price ms-2">{formatRsd(product.priceGross)}</span>
                  ) : null}
                </div>
                <div className="product-single__short-desc">
                  <p>
                    {shortDescription ||
                      (isEn
                        ? "Selected ready-to-wear piece with refined fit, declaration details and available sizes."
                        : "Izdvojen ready-to-wear model sa preciznim krojem, deklaracijom i dostupnim velicinama.")}
                  </p>
                </div>

                <div className="product-single__swatches">
                  <div className="product-swatch text-swatches">
                    <label>{isEn ? "Category" : "Kategorija"}</label>
                    <div className="swatch-list">
                      {product.categories.slice(0, 2).map((category) => (
                        <span key={category.id} className="swatch text-uppercase">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="product-swatch text-swatches">
                    <label>{isEn ? "Material" : "Materijal"}</label>
                    <div className="swatch-list">
                      <span className="swatch">{material}</span>
                    </div>
                  </div>
                  <div className="product-swatch color-swatches">
                    <label>Status</label>
                    <div className="swatch-list">
                      <span className={`swatch ${stockValue > 0 ? "bg-success" : "bg-secondary"} text-white`}>
                        {stockValue > 0 ? (isEn ? "In stock" : "Na stanju") : (isEn ? "On request" : "Na upit")}
                      </span>
                    </div>
                  </div>
                </div>

                {sizeOptions.length > 0 ? (
                  <div className="product-single__swatches mt-3">
                    <div className="product-swatch text-swatches">
                      <label>{isEn ? "Available sizes" : "Ponudjene velicine"}</label>
                      <div className="swatch-list d-flex flex-wrap gap-2">
                        {sizeOptions.map((option) => {
                          const active = option.legacyId === product.legacyId;
                          return (
                            <Link
                              key={`${option.label}-${option.legacyId}`}
                              href={variantHref(option.legacyId)}
                              className={`swatch text-uppercase ${active ? "bg-dark text-white" : ""} ${!option.inStock ? "opacity-50" : ""}`}
                              aria-current={active ? "page" : undefined}
                            >
                              {option.label}
                            </Link>
                          );
                        })}
                      </div>
                      <p className="small text-secondary mt-2 mb-0">
                        {selectedSize
                          ? `${isEn ? "Selected size" : "Odabrana velicina"}: ${selectedSize}`
                          : isEn
                            ? "Choose your preferred available size."
                            : "Odaberite zeljenu dostupnu velicinu."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="product-single__addtocart">
                  <div className="d-flex flex-wrap gap-2">
                    <AddToCartButton
                      lang={lang}
                      className="btn btn-primary btn-addtocart ss-cta-btn"
                      item={cartItem}
                    />
                    <Link href={withLang("/cart")} className="btn btn-outline-dark btn-addtocart ss-cta-btn ss-cta-btn--ghost">
                      {isEn ? "View cart" : "Idi na korpu"}
                    </Link>
                  </div>
                  <p className="ss-product-cta-note mb-0">
                    {isEn
                      ? "The order is sent as a direct inquiry without online payment, and our team confirms availability afterward."
                      : "Porudzbina se salje kao direktan upit bez online placanja, a nas tim potom potvrdjuje dostupnost."}
                  </p>
                </div>

                <div className="product-single__addtolinks">
                  <Link href={withLang("/web-shop")} className="menu-link menu-link_us-s add-to-wishlist">
                    <span>{isEn ? "Back to shop" : "Nazad na shop"}</span>
                  </Link>
                  <Link href={withLang(`/kontakt?product=${product.legacyId}`)} className="menu-link menu-link_us-s add-to-wishlist">
                    <span>{isEn ? "Ask about this item" : "Pitajte za ovaj model"}</span>
                  </Link>
                </div>
              </div>

              <div className="product-single__meta-info ss-product-glass-card mt-3">
                <div className="meta-item">
                  <label>SKU:</label>
                  <span>{product.sku}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Categories" : "Kategorije"}:</label>
                  <span>{categoryLabel}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Brand" : "Brend"}:</label>
                  <span>{product.brand || "Santos"}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Material" : "Materijal"}:</label>
                  <span>{material}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Size" : "Velicina"}:</label>
                  <span>{selectedSize || (isEn ? "Check size selector" : "Pogledajte selektor velicina")}</span>
                </div>
                <div className="meta-item">
                  <label>PDV:</label>
                  <span>{product.taxPercent}% {isEn ? "included" : "uracunat"}</span>
                </div>
              </div>

              {showSizeGuide && sizeGuide ? (
                <div className="rounded-4 border p-3 mt-3 bg-white ss-product-glass-card">
                  <p className="text-uppercase fw-medium text-secondary mb-2">
                    {sizeGuide.title}
                  </p>
                  <ul className="mb-0 ps-3">
                    {sizeGuide.bullets.slice(0, 2).map((bullet) => (
                      <li key={bullet} className="mb-1">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <ProductDetailTabs
            lang={lang}
            description={displayDescription}
            specification={displaySpecification}
            attributes={attributeItems}
            declaration={declaration}
            sizeGuide={sizeGuide}
            washCare={washCare}
          />
        </Reveal>

        <div className="ss-mobile-product-bar d-lg-none">
          <div className="ss-mobile-product-bar__inner">
            <div className="ss-mobile-product-bar__meta">
              <div>
                <p className="ss-mobile-product-bar__eyebrow">{isEn ? "Ready to order" : "Spremno za porucivanje"}</p>
                <strong className="ss-mobile-product-bar__price">{formatRsd(product.priceFinalGross)}</strong>
              </div>
              <p className="ss-mobile-product-bar__note">
                {selectedSize
                  ? `${isEn ? "Size" : "Velicina"}: ${selectedSize}`
                  : stockValue > 0
                    ? `${stockValue} ${isEn ? "available now" : "dostupno odmah"}`
                    : isEn
                      ? "Availability confirmed after inquiry"
                      : "Dostupnost se potvrdjuje nakon upita"}
              </p>
            </div>
            <div className="ss-mobile-product-bar__actions">
              <AddToCartButton
                lang={lang}
                className="btn btn-primary btn-addtocart ss-mobile-product-bar__btn"
                item={cartItem}
              />
              <Link href={withLang("/cart")} className="btn btn-outline-dark ss-mobile-product-bar__btn">
                {isEn ? "Cart" : "Korpa"}
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <Reveal as="section" className="products-carousel container mt-5 pt-4 ss-related-products" delay={0.06}>
            <div className="ss-related-products__header">
              <div>
                <p className="ss-related-products__eyebrow">{isEn ? "Continue browsing" : "Nastavi pregled"}</p>
                <h2 className="h3 text-uppercase mb-0">
                  {isEn ? "Related " : "Povezani "}
                  <strong>{isEn ? "Products" : "Proizvodi"}</strong>
                </h2>
              </div>
              <p className="ss-related-products__copy">
                {isEn
                  ? "If this fit or category is close to what you want, these are the next products worth checking."
                  : "Ako ti ovaj kroj ili kategorija odgovara, ovo su sledeci proizvodi koje vredi pogledati."}
              </p>
              <Link href={withLang("/web-shop")} className="btn btn-outline-dark text-uppercase fw-medium ss-related-products__cta">
                {isEn ? "All products" : "Svi proizvodi"}
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4">
              {related.map((item) => {
                const coverImage = item.coverImage || "/img/odela2.jpg";
                const secondImage = item.images[1] || coverImage;
                const relatedName = getLocalizedCatalogProductName(item, lang);
                return (
                  <div key={item.legacyId} className="product-card-wrapper">
                    <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                      <div className="pc__img-wrapper hover-container">
                        <Link href={variantHref(item.legacyId)}>
                          <Image
                            src={coverImage}
                            width={330}
                            height={400}
                            alt={relatedName}
                            className="pc__img"
                            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                            quality={70}
                          />
                          <Image
                            src={secondImage}
                            width={330}
                            height={400}
                            alt={`${relatedName} preview`}
                            className="pc__img pc__img-second"
                            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                            quality={60}
                          />
                        </Link>
                        <Link href={variantHref(item.legacyId)} className="pc__atc btn anim_appear-bottom btn position-absolute border-0 text-uppercase fw-medium ss-cta-btn">
                          {isEn ? "Open product" : "Otvori proizvod"}
                        </Link>
                      </div>
                      <div className="pc__info position-relative">
                        <p className="pc__category">{item.categories[0]?.name || item.sku}</p>
                        <h6 className="pc__title">
                          <Link href={variantHref(item.legacyId)}>{relatedName}</Link>
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
      <StorefrontFooter lang={lang} />
    </>
  );
}
