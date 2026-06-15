import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontTestimonials from "@/app/components/storefront/StorefrontTestimonials";
import StorefrontTrustStrip from "@/app/components/storefront/StorefrontTrustStrip";
import ProductDetailTabs from "@/app/components/storefront/ProductDetailTabs";
import ProductImageGallery from "@/app/components/storefront/ProductImageGallery";
import ProductSizePicker from "@/app/components/storefront/ProductSizePicker";
import ProductSizeGuideButton from "@/app/components/storefront/ProductSizeGuideButton";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import Reveal from "@/app/components/motion/Reveal";
import {
  getCatalogProductByLegacyId,
  getCatalogProductVariantsBySku,
  getCompleteTheLookProducts,
  getRelatedCatalogProducts,
  getCatalogProductModelKey,
  filterReachableCatalogImages,
  listCatalogProducts,
} from "@/lib/catalog/store";
import CompleteTheLook from "@/app/components/storefront/CompleteTheLook";
import AddToCartButton from "@/app/components/storefront/cart/AddToCartButton";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import { isBusinessUniformProduct } from "@/lib/catalog/productTypes";
import { BUNDLED_UNIFORM_IMAGES } from "@/lib/storefront/uniforms";
import { resolveDisplayFinalPrice, resolveDisplayGrossPrice, calcDiscountPercent } from "@/lib/catalog/pricing";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { getSiteContent } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import {
  getCatalogProductImageSources,
  getPreferredCatalogProductForDisplay,
  getLocalizedCatalogDescription,
  getLocalizedCatalogProductName,
  getLocalizedCatalogSpecification,
  getProductSeoFields,
  getProductDeclaration,
  getProductMaterial,
  getProductSizeGuide,
  getProductSizeOptions,
  getProductWashCare,
  getSelectedProductSize,
  productSupportsSizeGuide,
} from "@/lib/storefront/product-details";
import {
  ORGANIZATION_JSONLD_ID,
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildProductVideoObjectJsonLd,
  buildSeoMetadata,
  truncateText,
} from "@/lib/seo";

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getDiscountPercent = (priceGross: number, priceFinalGross: number) => {
  const gross = Number(priceGross || 0);
  const finalGross = Number(priceFinalGross || 0);
  if (gross <= 0 || gross <= finalGross) return 0;
  return Math.round(((gross - finalGross) / gross) * 100);
};

const stripHtml = (value: string | null) =>
  decodeHtmlEntities((value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const toStringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const hasDirectProductImage = (product: {
  coverImage: string | null;
  images: string[];
  hasDirectMedia: boolean;
}) =>
  product.hasDirectMedia &&
  Boolean(
    (product.coverImage && product.coverImage.trim().length > 0) ||
      product.images.some((image) => String(image || "").trim().length > 0),
  );

async function ProductTestimonialsSection({
  lang,
  productSku,
}: {
  lang: StorefrontLanguage;
  productSku: string;
}) {
  const siteContent = await getSiteContent();
  return (
    <StorefrontTestimonials
      lang={lang}
      content={siteContent.testimonials}
      productSku={productSku}
    />
  );
}

async function ProductRecommendationSections({
  product,
  lang,
  isEn,
}: {
  product: Awaited<ReturnType<typeof getCatalogProductByLegacyId>>;
  lang: StorefrontLanguage;
  isEn: boolean;
}) {
  if (!product) return null;

  const [completeTheLook, related] = await Promise.all([
    getCompleteTheLookProducts(product, 4),
    getRelatedCatalogProducts(product, 4),
  ]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const variantHref = (variantId: number) =>
    isEn ? `/web-shop/${variantId}?lang=en` : `/web-shop/${variantId}`;

  return (
    <>
      <CompleteTheLook lang={lang} products={completeTheLook} />

      {related.length > 0 ? (
        <Reveal as="section" className="products-carousel container mt-5 pt-4 ss-related-products" delay={0.06}>
          <div className="ss-related-products__header">
            <div>
              <p className="ss-related-products__eyebrow">{isEn ? "You may also like" : "Mozda ce vam se dopasti"}</p>
              <h2 className="h3 text-uppercase mb-0">
                {isEn ? "Related " : "Povezani "}
                <strong>{isEn ? "Products" : "Proizvodi"}</strong>
              </h2>
            </div>
            <p className="ss-related-products__copy">
              {isEn
                ? "More models from the current Santos & Santorini offer."
                : "Jos modela iz aktuelne Santos & Santorini ponude."}
            </p>
            <Link href={withLang("/web-shop")} className="btn btn-outline-dark text-uppercase fw-medium ss-related-products__cta">
              {isEn ? "All products" : "Svi proizvodi"}
            </Link>
          </div>
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4">
            {related.map((item) => {
              const relatedImageSources = getCatalogProductImageSources(item, [], []);
              const coverImage = relatedImageSources[0];
              const secondImage = relatedImageSources[1] || coverImage;
              const relatedName = getLocalizedCatalogProductName(item, lang);
              if (!coverImage) return null;

              return (
                <div key={item.legacyId} className="product-card-wrapper">
                  <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                    <div className="pc__img-wrapper hover-container">
                      <Link href={variantHref(item.legacyId)}>
                        <StorefrontSmartImage
                          sources={[coverImage]}
                          width={330}
                          height={400}
                          alt={relatedName}
                          className="pc__img"
                          sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                          quality={70}
                        />
                        <StorefrontSmartImage
                          sources={[secondImage]}
                          width={330}
                          height={400}
                          alt={`${relatedName} preview`}
                          className="pc__img pc__img-second"
                          sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                          quality={60}
                        />
                      </Link>
                      <Link
                        href={variantHref(item.legacyId)}
                        className="pc__atc btn anim_appear-bottom btn position-absolute border-0 text-uppercase fw-medium ss-cta-btn d-none d-md-inline-flex"
                      >
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
    </>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ legacyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { legacyId } = await params;
  const lang = await resolveStorefrontLanguage(await searchParams);
  const id = Number.parseInt(legacyId, 10);
  if (!Number.isFinite(id)) {
    return buildSeoMetadata({
      title: "Product",
      description: "Detalji proizvoda u Santos & Santorini web shopu.",
      path: "/web-shop",
      lang,
    });
  }
  const product = await getCatalogProductByLegacyId(id, { allowLegacyMediaFallback: false });
  if (!product || !product.isActive || !product.isExported || !hasDirectProductImage(product)) {
    return buildSeoMetadata({
      title: "Product not found",
      description: "Trazeni proizvod nije pronadjen u Santos & Santorini web shopu.",
      path: "/web-shop",
      lang,
      noIndex: true,
    });
  }
  const displayName = getLocalizedCatalogProductName(product, lang);
  const productSeo = getProductSeoFields(product);
  const description =
    productSeo.metaDescription ||
    productSeo.aiSummary ||
    stripHtml(getLocalizedCatalogDescription(product, lang)) ||
    (lang === "en"
      ? `Product details, material information and available sizes for ${displayName}.`
      : `Detalji proizvoda, sastav i dostupne velicine za model ${displayName}.`);

  return buildSeoMetadata({
    title: productSeo.seoTitle || displayName,
    description,
    path: `/web-shop/${product.legacyId}`,
    lang,
    image: product.coverImage || product.images[0] || "/img/odela.jpg",
    keywords: [
      product.sku,
      displayName,
      product.categories[0]?.name || "web shop proizvod",
      ...productSeo.occasionTags,
      ...productSeo.styleTags,
      productSeo.fit,
      productSeo.color,
      productSeo.targetUse,
    ].filter(Boolean),
  });
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

  const product = await getCatalogProductByLegacyId(id, { allowLegacyMediaFallback: true });
  if (!product) notFound();

  const requestedSize = toStringParam(pageSearchParams.size).trim();
  const routeSize = getSelectedProductSize(product);
  const canonicalSize = requestedSize || routeSize || "";

  if (!product.isActive || !product.isExported) {
    const visibleVariants = await getCatalogProductVariantsBySku(product.sku, {
      applyPromotions: true,
      activeOnly: true,
      exportOnly: true,
    }, getCatalogProductModelKey(product), product);

    for (const candidate of visibleVariants) {
      if (candidate.legacyId === product.legacyId) continue;
      const candidateGallery = await filterReachableCatalogImages(
        getCatalogProductImageSources(candidate, [], []).slice(0, 8),
      );
      if (candidateGallery.length > 0) {
        const query = new URLSearchParams();
        if (isEn) query.set("lang", "en");
        const queryString = query.toString();
        redirect(`/web-shop/${candidate.legacyId}${queryString ? `?${queryString}` : ""}`);
      }
    }

    const fallbackResult = await listCatalogProducts({
      page: 1,
      pageSize: 12,
      query: product.sku,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireDirectImages: true,
      requireReachableImages: true,
    });
    const fallbackProduct =
      fallbackResult.items.find((candidate) => candidate.legacyId !== product.legacyId) ||
      fallbackResult.items[0];
    if (fallbackProduct) {
      const query = new URLSearchParams();
      if (isEn) query.set("lang", "en");
      const queryString = query.toString();
      redirect(`/web-shop/${fallbackProduct.legacyId}${queryString ? `?${queryString}` : ""}`);
    }

    notFound();
  }

  const [variants, sizeVariants] = await Promise.all([
    getCatalogProductVariantsBySku(product.sku, {
      applyPromotions: true,
      activeOnly: true,
      exportOnly: true,
    }, getCatalogProductModelKey(product), product),
    getCatalogProductVariantsBySku(product.sku, {
      applyPromotions: true,
      activeOnly: false,
      exportOnly: true,
    }, getCatalogProductModelKey(product), product),
  ]);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const displayProduct = getPreferredCatalogProductForDisplay(product, variants, lang);
  // Only redirect to the preferred variant when this product has NO images of its own.
  // If it has images, the user intentionally navigated here (e.g. clicked a listing card)
  // and must NOT be silently swapped to a different product.
  if (displayProduct.legacyId !== product.legacyId && !hasDirectProductImage(product)) {
    const query = new URLSearchParams();
    if (isEn) query.set("lang", "en");
    const queryString = query.toString();
    redirect(`/web-shop/${displayProduct.legacyId}${queryString ? `?${queryString}` : ""}`);
  }

  const displayName = getLocalizedCatalogProductName(displayProduct, lang);
  const displaySeo = getProductSeoFields(displayProduct);
  const fallbackSeo = displayProduct.legacyId === product.legacyId ? displaySeo : getProductSeoFields(product);
  const productSeo = displaySeo.aiSummary || displaySeo.seoTitle || displaySeo.metaDescription ? displaySeo : fallbackSeo;
  const displayDescription = getLocalizedCatalogDescription(displayProduct, lang);
  const displaySpecification = getLocalizedCatalogSpecification(displayProduct, lang);
  const material = productSeo.material || getProductMaterial(displayProduct, lang);
  // Use the requested product's own images so the listing thumbnail matches what's
  // shown on the detail page. displayProduct may be a different size variant.
  const productGalleryCandidates = getCatalogProductImageSources(product, [], []).slice(0, 8);
  const productGallery = await filterReachableCatalogImages(productGalleryCandidates);
  if (!productGallery.length) {
    for (const candidate of [displayProduct, ...variants]) {
      if (candidate.legacyId === product.legacyId || !candidate.isActive || !candidate.isExported) continue;
      const candidateGallery = await filterReachableCatalogImages(
        getCatalogProductImageSources(candidate, [], []).slice(0, 8),
      );
      if (candidateGallery.length > 0) {
        const query = new URLSearchParams();
        if (isEn) query.set("lang", "en");
        const queryString = query.toString();
        redirect(`/web-shop/${candidate.legacyId}${queryString ? `?${queryString}` : ""}`);
      }
    }

    const fallbackResult = await listCatalogProducts({
      page: 1,
      pageSize: 12,
      query: product.sku,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireDirectImages: true,
      requireReachableImages: true,
    });
    const fallbackProduct =
      fallbackResult.items.find((candidate) => candidate.legacyId !== product.legacyId) ||
      fallbackResult.items[0];
    if (fallbackProduct) {
      const query = new URLSearchParams();
      if (isEn) query.set("lang", "en");
      const queryString = query.toString();
      redirect(`/web-shop/${fallbackProduct.legacyId}${queryString ? `?${queryString}` : ""}`);
    }

    notFound();
  }
  let gallery = productGallery.slice(0, 8);
  // For business uniform products, fill the gallery with all bundled uniform images
  // so customers can see the full uniform collection on the detail page.
  if (isBusinessUniformProduct(product) || isBusinessUniformProduct(displayProduct)) {
    const uniformImagePaths = BUNDLED_UNIFORM_IMAGES.map((img) => img.image);
    const gallerySet = new Set(gallery);
    const extra = uniformImagePaths.filter((img) => !gallerySet.has(img));
    gallery = [gallery[0], ...extra, ...gallery.slice(1)].filter(Boolean).slice(0, 8) as string[];
  }
  const productVideoUrl = displayProduct.videoUrl || product.videoUrl || null;
  const sizeOptions = getProductSizeOptions(product, sizeVariants);
  const findRequestedSizeOption = () => {
    if (!requestedSize) return null;
    const matching = sizeOptions.find((option) => option.label.toLowerCase() === requestedSize.toLowerCase());
    return matching?.inStock ? matching : null;
  };
  const selectedSizeOption =
    findRequestedSizeOption() ||
    sizeOptions.find((option) => option.legacyId === product.legacyId && option.inStock) ||
    (routeSize ? sizeOptions.find((option) => option.label.toLowerCase() === routeSize.toLowerCase() && option.inStock) : null) ||
    sizeOptions.find((option) => option.inStock) ||
    null;
  const selectedSize = selectedSizeOption?.label || null;
  const selectedProduct =
    (selectedSizeOption
      ? [product, ...variants, ...sizeVariants].find((variant) => variant.legacyId === selectedSizeOption.legacyId)
      : null) ||
    product;
  const sizeGuide = await getProductSizeGuide(product, lang, sizeOptions);
  const showSizeGuide = productSupportsSizeGuide(product) && Boolean(sizeGuide?.tables.length);
  const declaration = getProductDeclaration(
    displayProduct,
    lang,
    selectedSize,
    material,
    sizeOptions,
  );
  const washCare = getProductWashCare(product, lang);
  const businessUniform = isBusinessUniformProduct(displayProduct) || isBusinessUniformProduct(product);

  const displayPriceFinalGross = resolveDisplayFinalPrice(product, variants);
  const displayPriceGross = resolveDisplayGrossPrice(product, variants);
  const discountAmount = Math.max(0, displayPriceGross - displayPriceFinalGross);
  const discountPercent = calcDiscountPercent(displayPriceGross, displayPriceFinalGross);
  const stockValue = selectedSizeOption
    ? selectedSizeOption.stock
    : Math.max(
        0,
        Math.floor(selectedProduct.stockTotal > 0 ? selectedProduct.stockTotal : selectedProduct.stockWarehouse1),
      );
  const categoryLabel =
    product.categories[0]?.path.join(" / ") ||
    (isEn ? "Santos selection" : "Santos izbor");
  const shortDescription = (productSeo.aiSummary || stripHtml(displayDescription)).slice(0, 320);
  const attributeItems = Object.entries(product.attributes || {})
    .filter(([key]) => key !== "size")
    .slice(0, 6);
  const productSizeHref = (legacyId: number, size?: string | null) => {
    const query = new URLSearchParams();
    if (size) query.set("size", size);
    if (isEn) query.set("lang", "en");
    const queryString = query.toString();
    return `/web-shop/${legacyId}${queryString ? `?${queryString}` : ""}`;
  };
  const canonicalProductHref = (size?: string | null) =>
    productSizeHref(product.legacyId, size);
  const variantHref = (variantId: number) =>
    isEn ? `/web-shop/${variantId}?lang=en` : `/web-shop/${variantId}`;
  const sizePickerOptions = sizeOptions.map((option) => ({
    ...option,
    href: productSizeHref(option.legacyId, option.label),
  }));
  const cartItem = {
    legacyId: selectedProduct.legacyId,
    sku: selectedProduct.sku,
    name: displayName,
    size: selectedSize,
    material,
    price: selectedProduct.priceFinalGross,
    image: gallery[0] || product.coverImage || null,
    maxQuantity: stockValue > 0 ? stockValue : null,
    categoryLabel: displayProduct.categories[0]?.name || product.categories[0]?.name || null,
  };
  const canonicalPath = canonicalProductHref(selectedSize);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: isEn ? "Home" : "Pocetna", path: "/" },
    { name: "Web Shop", path: "/web-shop" },
    { name: displayName, path: canonicalPath },
  ]);
  const productJsonLdId = `${absoluteUrl(canonicalPath)}#product`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productJsonLdId,
    name: displayName,
    url: absoluteUrl(canonicalPath),
    sku: selectedProduct.sku,
    image: gallery.map((image) => absoluteUrl(image)),
    description: truncateText(shortDescription || displayName, 320),
    brand: {
      "@type": "Brand",
      name: product.brand || "Santos & Santorini",
    },
    category: categoryLabel,
    material,
    color: productSeo.color || undefined,
    size: selectedSize || undefined,
    itemCondition: "https://schema.org/NewCondition",
    additionalProperty: [
      productSeo.fit ? { "@type": "PropertyValue", name: "Kroj", value: productSeo.fit } : null,
      productSeo.targetUse ? { "@type": "PropertyValue", name: "Namena", value: productSeo.targetUse } : null,
      productSeo.occasionTags.length ? { "@type": "PropertyValue", name: "Prilike", value: productSeo.occasionTags.join(", ") } : null,
      productSeo.styleTags.length ? { "@type": "PropertyValue", name: "Stil", value: productSeo.styleTags.join(", ") } : null,
    ].filter(Boolean),
    offers: businessUniform
      ? {
          "@type": "Offer",
          url: absoluteUrl(canonicalPath),
          availability: "https://schema.org/PreOrder",
          priceCurrency: "RSD",
          seller: { "@type": "Organization", "@id": ORGANIZATION_JSONLD_ID, name: "Santos & Santorini" },
        }
      : {
          "@type": "Offer",
          url: absoluteUrl(canonicalPath),
          priceCurrency: "RSD",
          price: Number(selectedProduct.priceFinalGross || 0),
          availability:
            stockValue > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          ...(selectedProduct.rebatePercent && Number(selectedProduct.rebatePercent) > 0
            ? { priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
            : {}),
          seller: { "@type": "Organization", "@id": ORGANIZATION_JSONLD_ID, name: "Santos & Santorini" },
        },
  };

  const videoJsonLd =
    productVideoUrl && productVideoUrl.trim().length > 0
      ? buildProductVideoObjectJsonLd({
          name: `${displayName} — video`,
          description: shortDescription || displayName,
          pageUrl: canonicalPath,
          videoUrl: productVideoUrl,
          thumbnailUrl: gallery[0] || null,
        })
      : null;
  const faqJsonLd = productSeo.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: productSeo.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={productJsonLd} />
      {videoJsonLd ? <JsonLd data={videoJsonLd} /> : null}
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-commerce-page ss-product-page">
        <Reveal as="section" className="product-single container">
          <div className="row g-0 g-lg-5 ss-pdp-row">
            <div className="col-lg-8 col-xl-8">
              <div className="product-single__media" data-media-type="scroll-snap">
                <ProductImageGallery images={gallery} name={displayName} videoUrl={productVideoUrl} />
              </div>
              <div className="ss-product-tabs-under-media d-none d-lg-block">
                <ProductDetailTabs
                  lang={lang}
                  description={displayDescription}
                  specification={displaySpecification}
                  attributes={attributeItems}
                  declaration={declaration}
                  sizeGuide={sizeGuide}
                  washCare={washCare}
                />
              </div>
            </div>

            <div className="col-lg-4 col-xl-4 ss-product-single-info">
              <div className="ss-pdp-breadnav mb-3 mb-md-4">
                <ol className="ss-pdp-breadcrumb list-unstyled d-none d-md-flex" aria-label={isEn ? "Breadcrumb" : "Putanja"}>
                  <li className="ss-pdp-breadcrumb__item">
                    <Link href={withLang("/")} className="ss-pdp-breadcrumb__link">
                      {isEn ? "Home" : "Pocetna"}
                    </Link>
                  </li>
                  <li className="ss-pdp-breadcrumb__item">
                    <Link href={withLang("/web-shop")} className="ss-pdp-breadcrumb__link">
                      Web Shop
                    </Link>
                  </li>
                  <li className="ss-pdp-breadcrumb__item ss-pdp-breadcrumb__item--current" aria-current="page">
                    <span className="ss-pdp-breadcrumb__current">{displayName}</span>
                  </li>
                </ol>
                <Link href={withLang("/web-shop")} className="ss-pdp-back d-flex d-md-none">
                  <svg width="14" height="14" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <use href="#icon_prev_md" />
                  </svg>
                  <span>{isEn ? "Back to shop" : "Nazad na shop"}</span>
                </Link>
              </div>

              <div className="ss-product-glass-card ss-product-hero-card">
                <h1 className="product-single__name">{displayName}</h1>
                <div className="product-single__rating">
                  <div className="reviews-group d-flex text-warning" aria-hidden="true">
                    <span>*****</span>
                  </div>
                  <span className="reviews-note text-lowercase text-secondary ms-1">
                    {businessUniform
                      ? (isEn ? "team inquiry" : "upit za timske porudzbine")
                      : `${stockValue} ${isEn ? "in stock" : "na stanju"}`}
                  </span>
                </div>
                <div className="product-single__price">
                  {businessUniform ? (
                    <span className="current-price">{isEn ? "Inquiry only" : "Na upit"}</span>
                  ) : (
                    <>
                      <span className="current-price">{formatRsd(displayPriceFinalGross)}</span>
                      {discountAmount > 0 ? (
                        <span className="old-price ms-2">{formatRsd(displayPriceGross)}</span>
                      ) : null}
                      {discountPercent > 0 && displayPriceFinalGross > 0 ? (
                        <span className="ss-product-price-badge">-{discountPercent}%</span>
                      ) : null}
                    </>
                  )}
                </div>
                {discountPercent > 0 && displayPriceFinalGross > 0 && !businessUniform ? (
                  <p className="ss-product-price-note">
                    {isEn ? "You save" : "Stedite"} {formatRsd(discountAmount)} ({discountPercent}%)
                  </p>
                ) : null}
                {!businessUniform && stockValue > 0 && stockValue <= 5 ? (
                  <p className="ss-stock-badge ss-stock-badge--low mt-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {isEn ? `Only ${stockValue} left in stock` : `Samo ${stockValue} na stanju`}
                  </p>
                ) : !businessUniform && stockValue > 5 ? (
                  <p className="ss-stock-badge ss-stock-badge--ok mt-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {isEn ? "In stock" : "Na stanju"}
                  </p>
                ) : null}
                {!businessUniform && displayPriceFinalGross < 15000 ? (
                  <p className="ss-shipping-nudge">
                    <svg className="ss-shipping-nudge__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <circle cx="5.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="18.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    {isEn
                      ? `Add ${formatRsd(15000 - displayPriceFinalGross)} more for free delivery`
                      : `Dodaj jos ${formatRsd(15000 - displayPriceFinalGross)} za besplatnu dostavu`}
                  </p>
                ) : !businessUniform && displayPriceFinalGross >= 15000 ? (
                  <p className="ss-shipping-nudge">
                    <svg className="ss-shipping-nudge__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {isEn ? "Free delivery included" : "Besplatna dostava ukljucena"}
                  </p>
                ) : null}
                <div className="product-single__short-desc">
                  <p>
                    {shortDescription ||
                      (isEn
                        ? "Product details, material information, and available sizes from the Santos & Santorini collection."
                        : "Detalji proizvoda, sastav i dostupne velicine iz Santos & Santorini kolekcije.")}
                  </p>
                </div>

                {(productSeo.aiSummary || productSeo.targetUse || productSeo.occasionTags.length || productSeo.styleTags.length || productSeo.fit || productSeo.color) ? (
                  <div className="ss-product-seo-summary">
                    {productSeo.aiSummary ? (
                      <p className="ss-product-seo-summary__copy">{productSeo.aiSummary}</p>
                    ) : null}
                    <div className="ss-product-seo-summary__chips">
                      {[productSeo.targetUse, productSeo.fit, productSeo.color, ...productSeo.occasionTags, ...productSeo.styleTags]
                        .filter(Boolean)
                        .slice(0, 8)
                        .map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div className="product-single__swatches">
                  <div className="product-swatch text-swatches">
                    <label>{isEn ? "Material" : "Materijal"}</label>
                    <div className="swatch-list">
                      <span className="swatch">{material}</span>
                    </div>
                  </div>
                  <div className="product-swatch color-swatches">
                    <label>Status</label>
                    <div className="swatch-list">
                      <span className={`swatch ${stockValue > 0 && !businessUniform ? "bg-success" : "bg-secondary"} text-white`}>
                        {businessUniform
                          ? (isEn ? "Inquiry only" : "Na upit")
                          : stockValue > 0
                            ? (isEn ? "In stock" : "Na stanju")
                            : (isEn ? "On request" : "Na upit")}
                      </span>
                    </div>
                  </div>
                </div>

                {sizeOptions.length > 0 ? (
                  <div className="product-single__swatches mt-3">
                    <div className="product-swatch text-swatches">
                      <label>{isEn ? "Choose size" : "Odaberite velicinu"}</label>
                      <ProductSizePicker
                        options={sizePickerOptions}
                        currentLegacyId={selectedSizeOption?.legacyId || product.legacyId}
                      />
                      <p className="small text-secondary mt-2 mb-0">
                        {selectedSize
                          ? `${isEn ? "Selected size" : "Odabrana velicina"}: ${selectedSize}`
                          : isEn
                            ? "Pick the size you want before adding the item to cart."
                            : "Izaberite zeljenu velicinu pre dodavanja artikla u korpu."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="ss-product-size-guide-row">
                  <ProductSizeGuideButton lang={lang} sizeGuide={sizeGuide} />
                  <p className="ss-product-size-guide-row__copy">
                    {businessUniform
                      ? isEn
                        ? "Open the size table and compare measurements before sending an inquiry."
                        : "Otvorite tabelu velicina i uporedite mere pre slanja upita."
                      : isEn
                        ? "Open the size table and compare measurements before adding the item to cart."
                        : "Otvorite tabelu velicina i uporedite mere pre dodavanja artikla u korpu."}
                  </p>
                </div>

                <div className="product-single__addtocart">
                  <div className="d-flex flex-wrap gap-2 ss-product-cta-actions">
                    {businessUniform ? (
                      <Link
                        href={withLang(`/kontakt?product=${product.legacyId}`)}
                        className="btn btn-primary btn-addtocart ss-cta-btn"
                      >
                        {isEn ? "Send inquiry" : "Posalji upit"}
                      </Link>
                    ) : (
                      <AddToCartButton
                        lang={lang}
                        className="btn btn-primary btn-addtocart ss-cta-btn"
                        item={cartItem}
                      />
                    )}
                  </div>
                </div>

                {!businessUniform ? (
                  <div className="ss-pdp-trust-strip">
                    <div className="ss-pdp-trust-strip__item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{isEn ? "14-day returns" : "Povrat 14 dana"}</span>
                    </div>
                    <span className="ss-pdp-trust-strip__sep" aria-hidden>·</span>
                    <div className="ss-pdp-trust-strip__item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{isEn ? "Confirmed within 2h" : "Potvrda za 2h"}</span>
                    </div>
                    <span className="ss-pdp-trust-strip__sep" aria-hidden>·</span>
                    <div className="ss-pdp-trust-strip__item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                      <span>{isEn ? "Pay on delivery" : "Placanje pouzecam"}</span>
                    </div>
                  </div>
                ) : null}

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
                  <label>{isEn ? "Brand" : "Brend"}:</label>
                  <span>{product.brand || "Santos"}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Material" : "Materijal"}:</label>
                  <span>{material}</span>
                </div>
                <div className="meta-item">
                  <label>{isEn ? "Size" : "Velicina"}:</label>
                  <span>
                    {selectedSize ||
                      (businessUniform
                        ? isEn
                          ? "Defined by inquiry"
                          : "Definise se kroz upit"
                        : isEn
                          ? "Check size selector"
                          : "Pogledajte selektor velicina")}
                  </span>
                </div>
                {businessUniform ? (
                  <div className="meta-item">
                    <label>{isEn ? "Type" : "Tip"}:</label>
                    <span>{isEn ? "Business uniforms" : "Poslovne uniforme"}</span>
                  </div>
                ) : (
                  <div className="meta-item">
                    <label>PDV:</label>
                    <span>{product.taxPercent}% {isEn ? "included" : "uracunat"}</span>
                  </div>
                )}
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

              {productSeo.faq.length ? (
                <div className="rounded-4 border p-3 mt-3 bg-white ss-product-glass-card">
                  <p className="text-uppercase fw-medium text-secondary mb-2">
                    {isEn ? "Product questions" : "Pitanja o proizvodu"}
                  </p>
                  <div className="d-grid gap-2">
                    {productSeo.faq.map((item) => (
                      <details key={item.question} className="ss-product-faq-item">
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="ss-product-tabs-mobile d-lg-none">
            <ProductDetailTabs
              lang={lang}
              description={displayDescription}
              specification={displaySpecification}
              attributes={attributeItems}
              declaration={declaration}
              sizeGuide={sizeGuide}
              washCare={washCare}
            />
          </div>

        </Reveal>

        <div className="ss-mobile-product-bar d-lg-none">
          <div className="ss-mobile-product-bar__inner">
            <div className="ss-mobile-product-bar__meta">
              <div>
                <p className="ss-mobile-product-bar__eyebrow">{isEn ? "Santos & Santorini" : "Santos & Santorini"}</p>
                <div className="ss-mobile-product-bar__prices">
                  <strong className="ss-mobile-product-bar__price">
                    {businessUniform ? (isEn ? "Inquiry" : "Na upit") : formatRsd(displayPriceFinalGross)}
                  </strong>
                  {discountPercent > 0 && displayPriceFinalGross > 0 && !businessUniform ? (
                    <>
                      <span className="ss-mobile-product-bar__old-price">{formatRsd(displayPriceGross)}</span>
                      <span className="ss-product-price-badge ss-product-price-badge--mobile">-{discountPercent}%</span>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="ss-mobile-product-bar__note">
                {businessUniform
                  ? (isEn ? "Inquiry for team needs" : "Upit za potrebe tima")
                  : selectedSize
                    ? `${isEn ? "Size" : "Velicina"}: ${selectedSize}`
                    : stockValue > 0
                      ? `${stockValue} ${isEn ? "available now" : "dostupno odmah"}`
                      : isEn
                        ? "Availability confirmed after inquiry"
                        : "Dostupnost se potvrdjuje nakon upita"}
              </p>
            </div>
            <div className="ss-mobile-product-bar__actions">
              {businessUniform ? (
                <Link href={withLang(`/kontakt?product=${product.legacyId}`)} className="btn btn-primary ss-mobile-product-bar__btn">
                  {isEn ? "Inquiry" : "Upit"}
                </Link>
              ) : (
                <AddToCartButton
                  lang={lang}
                  className="btn btn-primary btn-addtocart ss-mobile-product-bar__btn"
                  item={cartItem}
                />
              )}
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <ProductRecommendationSections product={product} lang={lang} isEn={isEn} />
        </Suspense>

        <Suspense fallback={null}>
          <ProductTestimonialsSection lang={lang} productSku={product.sku} />
        </Suspense>

        <StorefrontTrustStrip lang={lang} compact />

        <div className="d-none d-lg-block mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
