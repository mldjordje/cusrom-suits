import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontTrustStrip from "@/app/components/storefront/StorefrontTrustStrip";
import WebShopFilters from "@/app/components/storefront/WebShopFilters";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { listCatalogProducts, type CatalogCategoryGroup, type CatalogProductView } from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { getCatalogProductCategoryLabel } from "@/lib/catalog/presentation";
import { isBusinessUniformProduct } from "@/lib/catalog/productTypes";
import { localizeDynamicCategoryLabel, localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
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

const getDiscountPercent = (priceGross: number, priceFinalGross: number) => {
  const gross = Number(priceGross || 0);
  const finalGross = Number(priceFinalGross || 0);
  if (gross <= 0 || gross <= finalGross) return 0;
  return Math.round(((gross - finalGross) / gross) * 100);
};

const toStringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const landingForOg = await getLandingSettings();
  const ogHeroImage =
    landingForOg.shopHeroSections[0]?.image || landingForOg.shopHeroImage || "/img/hero2.jpg";

  return buildSeoMetadata({
    title: "Web Shop",
    description: isEn
      ? "Browse ready-to-wear menswear, selected offers and available sizes in the Santos & Santorini web shop."
      : "Pregledajte ready-to-wear musku kolekciju, aktuelne akcije i dostupne velicine u Santos & Santorini web shopu.",
    path: "/web-shop",
    lang,
    image: ogHeroImage,
    keywords: ["web shop odela", "muski sakoi", "muske kosulje", "ready to wear"],
  });
}

const CATEGORY_PRIORITY: Record<string, number> = {
  odelo: 1, odela: 1,
  sako: 2, sakoi: 2,
  pantalone: 3,
  kosulja: 4, kosulje: 4,
  cipele: 5,
  kravata: 6, kravate: 6,
  kais: 7, kaisevi: 7,
  kaput: 8, kaputi: 8,
  dzemper: 9,
  majica: 10,
  kratke: 11,
};

const getCategoryPriority = (item: CatalogProductView): number => {
  const name = (item.name || "").toLowerCase();
  const cats = item.categories.map((c) => c.name.toLowerCase());
  const combined = [...cats, name].join(" ");
  for (const [key, priority] of Object.entries(CATEGORY_PRIORITY)) {
    if (combined.includes(key)) return priority;
  }
  return 99;
};

const getCategorySortPriority = (name: string) => {
  const normalized = name.toLowerCase();
  for (const [key, priority] of Object.entries(CATEGORY_PRIORITY)) {
    if (normalized.includes(key)) return priority;
  }
  if (normalized.includes("nova kolekcija")) return 98;
  return 99;
};

const sortCategoriesForShop = <T extends { name: string }>(categories: T[]) =>
  [...categories].sort((a, b) => {
    const priorityDiff = getCategorySortPriority(a.name) - getCategorySortPriority(b.name);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, "sr", { numeric: true, sensitivity: "base" });
  });

function sortItems(items: CatalogProductView[], sort: string): CatalogProductView[] {
  const next = [...items];
  const stockRank = (item: CatalogProductView) =>
    Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0));

  if (sort === "price_asc") return next.sort((a, b) => a.priceFinalGross - b.priceFinalGross);
  if (sort === "price_desc") return next.sort((a, b) => b.priceFinalGross - a.priceFinalGross);
  if (sort === "name_asc") return next.sort((a, b) => a.name.localeCompare(b.name, "sr"));
  if (sort === "stock_desc") return next.sort((a, b) => stockRank(b) - stockRank(a));
  if (sort === "newest") return next.sort((a, b) => b.legacyId - a.legacyId);

  return next.sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));
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
  const categoryGroup = toStringParam(params.categoryGroup);
  const selectedCategoryValue = rawCategoryId === "sale" ? "sale" : rawCategoryId;
  const categoryId = Number.parseInt(rawCategoryId, 10) || 0;
  const inStock = toStringParam(params.inStock) === "1";
  const onSale = toStringParam(params.onSale) === "1" || rawCategoryId === "sale";
  const sort = toStringParam(params.sort) || "featured";
  const priceMin = Math.max(0, Number.parseInt(toStringParam(params.priceMin), 10) || 0);
  const priceMax = Math.max(0, Number.parseInt(toStringParam(params.priceMax), 10) || 0);
  const rawSizes = (() => {
    const value = params.size;
    if (Array.isArray(value)) return value.map((v) => String(v || ""));
    return String(value || "")
      .split(",")
      .map((v) => v.trim());
  })()
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedSizes = Array.from(new Set(rawSizes.map((v) => v.toUpperCase().replace(/\s+/g, ""))));

  const brokenProductIds = await getBrokenProductIdSet();
  const [result, landingSettings] = await Promise.all([
    listCatalogProducts({
      page,
      pageSize: 24,
      query: q,
      categoryId: categoryId || undefined,
      categoryGroup: categoryGroup || undefined,
      inStock,
      onSale,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      priceMin: priceMin > 0 ? priceMin : 2000, // never show items under 2 000 RSD (data errors)
      priceMax: priceMax || undefined,
      sizes: selectedSizes.length ? selectedSizes : undefined,
      // Hide products with no own image (borrowed/fallback) and products flagged by the
      // media-health scan as having all images unreachable. Filtering happens before
      // pagination so counts/pages stay correct.
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds: brokenProductIds.size ? Array.from(brokenProductIds) : undefined,
      sort: sort as "featured" | "name_asc" | "price_asc" | "price_desc" | "stock_desc" | "newest",
    }),
    getLandingSettings(),
  ]);

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
  const tx = (value: string, fallbackEn?: string) =>
    localizeDynamicStorefrontText(value, isEn ? "en" : "sr", fallbackEn);
  const localizeCategory = (value: string) => localizeDynamicCategoryLabel(value, isEn ? "en" : "sr");

  const items = sortItems(result.items, sort);
  const sortedCategoryGroups = sortCategoriesForShop(result.categoryGroups);
  const topCategories = sortedCategoryGroups.slice(0, 7);

  const DEFAULT_SIZES = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "4XL",
    "5XL",
    "6XL",
    "44",
    "46",
    "48",
    "50",
    "52",
    "54",
    "56",
    "58",
  ];
  const sizeOccurrences = new Map<string, number>();
  for (const item of result.items) {
    const attrSizes = (item.attributes as Record<string, unknown> | null | undefined)?.size;
    if (!Array.isArray(attrSizes)) continue;
    for (const raw of attrSizes) {
      const value = String(raw || "").trim().toUpperCase();
      if (!value) continue;
      sizeOccurrences.set(value, (sizeOccurrences.get(value) || 0) + 1);
    }
  }
  const orderIndex = (value: string) => {
    const i = DEFAULT_SIZES.indexOf(value);
    return i === -1 ? DEFAULT_SIZES.length + 1 : i;
  };
  const availableSizes = Array.from(sizeOccurrences.keys()).sort((a, b) => orderIndex(a) - orderIndex(b));

  const priceValues = result.items
    .map((item) => Number(item.priceFinalGross || 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const priceFloor = priceValues.length ? Math.floor(Math.min(...priceValues)) : 0;
  const priceCeiling = priceValues.length ? Math.ceil(Math.max(...priceValues)) : 0;
  const heroEyebrow = tx(landingSettings.shopHeroEyebrow?.trim() || "Santos & Santorini", "Santos & Santorini");
  const heroTitle =
    tx(landingSettings.shopHeroTitle?.trim() || (isEn ? "Menswear collection" : "Muska kolekcija"), "Menswear Collection");
  const heroLead = tx(
    landingSettings.shopHeroLead?.trim() ||
      (isEn
        ? "Browse the current Santos & Santorini offer and filter the collection by category, availability, or sale."
        : "Pregledajte aktuelnu Santos & Santorini ponudu i filtrirajte kolekciju po kategoriji, dostupnosti ili akciji."),
    "Browse the current Santos & Santorini offer and filter the collection by category, availability, or sale.",
  );
  const sortLabelMap: Record<string, string> = {
    featured: isEn ? "Featured" : "Izdvojeno",
    newest: isEn ? "Newest" : "Najnovije",
    price_asc: isEn ? "Price: Low to High" : "Cena: od nize ka visoj",
    price_desc: isEn ? "Price: High to Low" : "Cena: od vise ka nizoj",
    name_asc: isEn ? "Name: A-Z" : "Naziv: A-Z",
    stock_desc: isEn ? "Stock: High to Low" : "Stanje: od veceg ka manjem",
  };
  const sortOptions = [
    { value: "featured", label: sortLabelMap.featured },
    { value: "newest", label: sortLabelMap.newest },
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
      categoryGroup,
      inStock: inStock ? "1" : "",
      page: String(result.page),
      sort: sort !== "featured" ? sort : "",
      onSale: onSale ? "1" : "",
      priceMin: priceMin > 0 ? String(priceMin) : "",
      priceMax: priceMax > 0 ? String(priceMax) : "",
      size: selectedSizes.length ? selectedSizes.join(",") : "",
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
  const categoryNameByGroup = new Map(result.categoryGroups.map((category) => [category.key, category.name]));
  const selectedCategoryName = categoryId > 0 ? localizeCategory(categoryNameById.get(categoryId) || `Category ${categoryId}`) : "";
  const selectedCategoryGroupName = categoryGroup ? localizeCategory(categoryNameByGroup.get(categoryGroup) || categoryGroup) : "";
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

  if (categoryGroup) {
    activeFilterChips.push({
      key: "categoryGroup",
      label: `${isEn ? "Category" : "Kategorija"}: ${selectedCategoryGroupName}`,
      href: makeHref({ categoryGroup: null, page: 1 }),
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

  if (priceMin > 0 || priceMax > 0) {
    const priceChipLabel = (() => {
      if (priceMin > 0 && priceMax > 0) return `${priceMin} - ${priceMax} RSD`;
      if (priceMin > 0) return `${isEn ? "From" : "Od"} ${priceMin} RSD`;
      return `${isEn ? "Up to" : "Do"} ${priceMax} RSD`;
    })();
    activeFilterChips.push({
      key: "price",
      label: `${isEn ? "Price" : "Cena"}: ${priceChipLabel}`,
      href: makeHref({ priceMin: null, priceMax: null, page: 1 }),
    });
  }

  if (selectedSizes.length) {
    activeFilterChips.push({
      key: "size",
      label: `${isEn ? "Size" : "Velicina"}: ${selectedSizes.join(", ")}`,
      href: makeHref({ size: null, page: 1 }),
    });
  }

  const heroCategoryLinks = [
    {
      label: isEn ? "All products" : "Svi proizvodi",
      href: makeHref({ categoryId: null, categoryGroup: null, onSale: null, page: 1, q: null }),
      active: categoryId <= 0 && !categoryGroup && !onSale,
    },
    {
      label: isEn ? "Sale" : "Akcija",
      href: makeHref({ categoryId: null, categoryGroup: null, onSale: 1, page: 1, q: null }),
      active: onSale && categoryId <= 0 && !categoryGroup,
    },
    ...topCategories.slice(0, 5).map((category: CatalogCategoryGroup) => ({
      label: localizeCategory(category.name),
      href: makeHref({ categoryGroup: category.key, categoryId: null, onSale: null, page: 1, q: null }),
      active: categoryGroup === category.key,
    })),
  ];

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
    const discountPercent = getDiscountPercent(item.priceGross, item.priceFinalGross);
    const businessUniform = isBusinessUniformProduct(item);
    const imageSizes =
      imageWidth >= 600
        ? "(max-width: 991px) 100vw, (max-width: 1399px) 50vw, 42vw"
        : "(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw";
    const stockValue = !businessUniform
      ? Math.max(0, Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0))
      : 0;
    const isLowStock = stockValue > 0 && stockValue <= 5;

    return (
      <ProductItemMotion key={key} className={wrapperClassName} index={motionIndex}>
        <div className={cardClassName}>
          <div className={imageWrapperClassName}>
            <Link href={detailHref} prefetch={false}>
              <StorefrontImage
                sources={imageSources}
                width={imageWidth}
                height={imageHeight}
                alt={displayName}
                className="pc__img object-position-top"
                sizes={imageSizes}
                quality={68}
              />
            </Link>
            {imageSources.length > 1 ? (
              <StorefrontImage
                sources={[imageSources[1]]}
                width={imageWidth}
                height={imageHeight}
                alt=""
                aria-hidden="true"
                className="pc__img pc__img-second object-position-top"
                sizes={imageSizes}
                quality={68}
              />
            ) : null}
            {discountPercent > 0 && item.priceFinalGross > 0 ? (
              <span className="ss-product-card__badge">
                -{discountPercent}% {isEn ? "off" : "popust"}
              </span>
            ) : isLowStock ? (
              <span className="ss-product-card__badge ss-product-card__badge--stock">
                {isEn ? "Last items" : "Poslednji komad"}
              </span>
            ) : null}
              <div className="pc__info hover__content position-absolute text-center top-0 left-0 w-100 d-none d-md-flex flex-column justify-content-center align-items-center">
                <p className="pc__category">{getCategoryLabel(item)}</p>
                <h6 className="pc__title">
                  <Link href={detailHref} prefetch={false}>
                    {displayName}
                  </Link>
                </h6>
              {businessUniform || !item.priceFinalGross ? (
                <div className="product-card__price d-flex justify-content-center">
                  <span className="money price">{isEn ? "Inquiry only" : "Na upit"}</span>
                </div>
              ) : (
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
              )}
              {discountPercent > 0 && !businessUniform ? (
                <p className="ss-product-card__discount mb-0">
                  {isEn ? "Save" : "Ušteda"} {discountPercent}%
                </p>
              ) : null}
              <Link href={detailHref} prefetch={false} className="pc__atc anim_appear-bottom btn mt-3 border-0 text-uppercase fw-medium">
                {businessUniform ? (isEn ? "Send inquiry" : "Posalji upit") : isEn ? "View product" : "Pogledaj proizvod"}
              </Link>
            </div>
          </div>
          <div className="pc__info ss-card-mobile-info d-md-none">
            <p className="pc__category">{getCategoryLabel(item)}</p>
            <h6 className="pc__title mb-1">
              <Link href={detailHref} prefetch={false}>
                {displayName}
              </Link>
            </h6>
            {businessUniform || !item.priceFinalGross ? (
              <div className="product-card__price d-flex">
                <span className="money price">{isEn ? "Inquiry only" : "Na upit"}</span>
              </div>
            ) : (
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
            )}
            {discountPercent > 0 && !businessUniform ? (
              <p className="ss-product-card__discount mb-0">
                {isEn ? "Save" : "Ušteda"} {discountPercent}%
              </p>
            ) : isLowStock ? (
              <p className="ss-shop-card-stock-note">
                {isEn ? `Only ${stockValue} left` : `Samo ${stockValue} komada`}
              </p>
            ) : null}
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
    description: heroLead,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(12, items.length),
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

  const getPaginationPages = (current: number, total: number): (number | "...")[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={collectionJsonLd} />
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-shop-page">
        <Reveal as="section" className="ss-shop-hero-section" delay={0} amount={0.05} y={12}>
          <div className="container ss-shop-hero">
            <div className="ss-shop-hero-stack">
              {landingSettings.shopHeroSections.map((section, heroIndex) => (
                <div key={section.id} className="ss-shop-hero__media">
                  <div className="background-img" style={{ backgroundColor: "#eeeeee" }}>
                    <Image
                      src={section.image || "/img/hero2.jpg"}
                      width={1759}
                      height={620}
                      alt={heroIndex === 0 ? "Santos web shop hero" : `Santos web shop hero ${heroIndex + 1}`}
                      className="slideshow-bg__img object-fit-cover"
                      priority={heroIndex === 0}
                      sizes="100vw"
                    />
                  </div>
                  <div className="ss-shop-hero__overlay" />
                  {heroIndex === 0 ? (
                    <div className="ss-shop-hero__ui">
                      <span className="ss-shop-hero__brand">Santos &amp; Santorini</span>
                      <div className="ss-shop-hero__inline-actions">
                        <Link href="#shop-products" className="ss-hero-pill">
                          {isEn ? "Collection" : "Kolekcija"}
                        </Link>
                        <Link href={makeHref({ categoryId: null, onSale: 1, page: 1 })} className="ss-hero-pill ss-hero-pill--sale">
                          {isEn ? "Sale" : "Akcija"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {section.showPromo && section.promoLabel ? (
                    <Link
                      href={section.promoHref || makeHref({ categoryId: null, onSale: 1, page: 1 })}
                      className="ss-shop-hero__promo-badge"
                    >
                      <span className="ss-shop-hero__promo-dot" aria-hidden="true" />
                      {section.promoLabel}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="ss-shop-hero__categories">
              {heroCategoryLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`ss-shop-hero__category ${link.active ? "is-active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        <section className="shop-main container ss-shop-main-section" id="shop-products">
          <Reveal as="div" className="ss-shop-main-reveal" delay={0.06} amount={0.08} y={20}>
          <WebShopFilters
            lang={lang}
            query={q}
            categoryId={categoryId}
            categoryGroup={categoryGroup}
            selectedCategoryValue={categoryGroup || selectedCategoryValue || ""}
            inStock={inStock}
            onSale={onSale}
            sort={sort}
            categories={sortedCategoryGroups}
            featuredCategories={topCategories.slice(0, 6)}
            activeFilterChips={activeFilterChips}
            showingCount={items.length}
            totalCount={result.total}
            sortOptions={sortOptions}
            availableSizes={availableSizes}
            selectedSizes={selectedSizes}
            priceMin={priceMin}
            priceMax={priceMax}
            priceFloor={priceFloor}
            priceCeiling={priceCeiling}
          >
            <div className="ss-shop-gallery">
              <div className="ss-shop-gallery__header">
                <div>
                  <p className="ss-shop-gallery__eyebrow">{isEn ? "Collection" : "Kolekcija"}</p>
                  <h2 className="ss-shop-gallery__title">
                    {items.length === 0
                      ? isEn ? "No products found" : "Nema pronadjenih proizvoda"
                      : q.trim()
                        ? `"${q.trim()}"`
                        : onSale && categoryId <= 0
                          ? isEn ? "Sale items" : "Akcija"
                          : selectedCategoryGroupName || selectedCategoryName
                            ? selectedCategoryGroupName || selectedCategoryName
                            : isEn ? "All products" : "Svi proizvodi"}
                  </h2>
                </div>
                <p className="ss-shop-gallery__meta">
                  {items.length} / {result.total} {isEn ? "products" : "proizvoda"}
                </p>
              </div>

              {items.length === 0 ? (
                <div className="ss-shop-empty-state">
                  <div className="ss-shop-empty-state__card">
                    <p className="ss-shop-empty-state__eyebrow">{isEn ? "No results" : "Nema rezultata"}</p>
                    <h3>{isEn ? "No products match the selected filters." : "Nijedan proizvod ne odgovara izabranim filterima."}</h3>
                    <p>
                      {isEn
                        ? "Clear one or more filters and try another combination."
                        : "Uklonite jedan ili vise filtera i pokusajte drugu kombinaciju."}
                    </p>
                    <Link href={makeHref({ q: null, categoryId: null, categoryGroup: null, inStock: null, onSale: null, sort: null, page: 1 })} className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? "Reset filters" : "Resetuj filtere"}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="products-grid row row-cols-2 row-cols-md-3 row-cols-xl-4 g-2 g-md-3">
                  {items.map((item, index) =>
                    renderOverlayCard(item, `grid-${item.legacyId}`, {
                      cardClassName: "product-card ss-card-hover ss-product-card ss-shop-grid-card mb-0",
                      imageWrapperClassName: "pc__img-wrapper hover-container",
                      imageWidth: 330,
                      imageHeight: 400,
                      motionIndex: index,
                    }),
                  )}
                </div>
              )}
            </div>
          </WebShopFilters>

          {result.totalPages > 1 ? (
          <div className="ss-shop-pagination">
            <p className="ss-shop-pagination__summary">
              {isEn ? "Page" : "Stranica"} {result.page} {isEn ? "of" : "od"} {result.totalPages}
            </p>
            <nav className="ss-shop-pagination__nav" aria-label={isEn ? "Pagination" : "Stranice"}>
              <Link
                href={makeHref({ page: Math.max(1, result.page - 1) })}
                className={`ss-shop-pagination__arrow ${result.page <= 1 ? "is-disabled" : ""}`}
                aria-disabled={result.page <= 1}
                aria-label={isEn ? "Previous page" : "Prethodna strana"}
              >
                ←
              </Link>
              <div className="ss-shop-pagination__pages">
                {getPaginationPages(result.page, result.totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`ell-${i}`} className="ss-shop-pagination__ellipsis">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={makeHref({ page: p })}
                      className={`ss-shop-pagination__page ${result.page === p ? "is-active" : ""}`}
                      aria-current={result.page === p ? "page" : undefined}
                    >
                      {p}
                    </Link>
                  )
                )}
              </div>
              <Link
                href={makeHref({ page: Math.min(result.totalPages, result.page + 1) })}
                className={`ss-shop-pagination__arrow ${result.page >= result.totalPages ? "is-disabled" : ""}`}
                aria-disabled={result.page >= result.totalPages}
                aria-label={isEn ? "Next page" : "Sledeca strana"}
              >
                →
              </Link>
            </nav>
          </div>
          ) : null}
          </Reveal>
        </section>

        <Reveal as="div" delay={0.1} amount={0.15} y={12}>
          <StorefrontTrustStrip lang={lang} compact />
        </Reveal>

        <div className="mb-5 pb-xl-5" />
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
