import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/app/components/seo/JsonLd";
import Reveal from "@/app/components/motion/Reveal";
import ProductItemMotion from "@/app/components/motion/ProductItemMotion";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import WebShopFilters from "@/app/components/storefront/WebShopFilters";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { getCatalogProductCategoryLabel } from "@/lib/catalog/presentation";
import { listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import { absoluteUrl, buildBreadcrumbJsonLd, buildSeoMetadata } from "@/lib/seo";
import { getCatalogProductImageSources, getLocalizedCatalogProductName } from "@/lib/storefront/product-details";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

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

  const heroEyebrow = landingSettings.shopHeroEyebrow?.trim() || (isEn ? "Curated ready-to-wear" : "Kurirana ready-to-wear kolekcija");
  const heroTitle = isEn
    ? "Ready-to-wear tailored for a sharper first impression."
    : "Ready-to-wear kolekcija za elegantniji prvi utisak.";
  const heroLead = isEn
    ? "Selected models, cleaner navigation and a faster path to the right piece on both desktop and mobile."
    : "Odabrani modeli, čistija navigacija i brži put do pravog komada na desktopu i telefonu.";
  const heroStats = [
    {
      value: `${result.total}`,
      label: isEn ? "available models" : "dostupnih modela",
    },
    {
      value: `${Math.max(topCategories.length, 1)}`,
      label: isEn ? "top categories" : "glavnih kategorija",
    },
    {
      value: sortLabelMap[sort],
      label: isEn ? "current sort" : "trenutni sort",
    },
  ];
  const serviceCards = [
    {
      title: isEn ? "Cleaner first view" : "Čistiji prvi utisak",
      text: isEn
        ? "Shorter copy, stronger hierarchy and less noise before the catalog starts."
        : "Kraći tekst, jača hijerarhija i manje šuma pre početka kataloga.",
    },
    {
      title: isEn ? "Faster product discovery" : "Brži dolazak do proizvoda",
      text: isEn
        ? "Key categories, sale entry points and filters stay closer to the buying decision."
        : "Glavne kategorije, akcije i filteri su bliže kupovnoj odluci.",
    },
    {
      title: isEn ? "Better mobile rhythm" : "Bolji mobile ritam",
      text: isEn
        ? "The page now scans faster on the phone, with cleaner sections and a calmer grid."
        : "Stranica se sada lakše skenira na telefonu, sa čistijim sekcijama i mirnijim gridom.",
    },
  ];
  const categoryCardNotes = isEn
    ? [
        "See the full ready-to-wear collection.",
        "Start from current offers and discounts.",
        "A tighter edit with clean silhouettes.",
        "A strong place to compare styles quickly.",
      ]
    : [
        "Pogledaj kompletnu ready-to-wear kolekciju.",
        "Kreni od aktuelnih ponuda i sniženja.",
        "Uži izbor sa čistim siluetama i lakšim poređenjem.",
        "Dobra polazna tačka za brzo poređenje modela.",
      ];
  const categoryCards = [
    {
      label: isEn ? "All products" : "Svi proizvodi",
      href: makeHref({ categoryId: null, onSale: null, page: 1 }),
      note: categoryCardNotes[0],
    },
    {
      label: isEn ? "Sale selection" : "Akcijska selekcija",
      href: makeHref({ categoryId: null, onSale: 1, page: 1 }),
      note: categoryCardNotes[1],
    },
    ...topCategories.slice(0, 2).map((category, index) => ({
      label: category.name,
      href: makeHref({ categoryId: category.id, onSale: null, page: 1 }),
      note: categoryCardNotes[index + 2],
    })),
  ];
  const showCuratedIntro = activeFilterChips.length === 0 && page === 1 && items.length > 0;
  const spotlightItems = showCuratedIntro ? items.slice(0, Math.min(2, items.length)) : [];

  const productDetailHref = (item: CatalogProductView) =>
    isEn ? `/web-shop/${item.legacyId}?lang=en` : `/web-shop/${item.legacyId}`;

  const renderPrice = (item: CatalogProductView, className = "") => (
    <div className={`ss-shop-price ${className}`.trim()}>
      {item.priceGross > item.priceFinalGross ? (
        <>
          <span className="money price price-old">{formatRsd(item.priceGross)}</span>
          <span className="money price price-sale">{formatRsd(item.priceFinalGross)}</span>
        </>
      ) : (
        <span className="money price">{formatRsd(item.priceFinalGross)}</span>
      )}
    </div>
  );

  const renderProductCard = (item: CatalogProductView, key: string, index: number) => {
    const imageSources = getCatalogProductImageSources(item, [], ["/img/odela2.jpg"]);
    const displayName = getLocalizedCatalogProductName(item, lang);
    const detailHref = productDetailHref(item);
    const isDiscounted = item.priceGross > item.priceFinalGross;

    return (
      <ProductItemMotion key={key} className="product-card-wrapper" index={index}>
        <article className="ss-shop-product-card h-100">
          <Link href={detailHref} className="ss-shop-product-card__media">
            <StorefrontSmartImage
              sources={imageSources}
              width={520}
              height={650}
              alt={displayName}
              className="pc__img object-position-top"
              sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 28vw"
              quality={70}
            />
            {isDiscounted ? (
              <span className="ss-shop-product-card__badge">{isEn ? "Sale" : "Akcija"}</span>
            ) : null}
          </Link>

          <div className="ss-shop-product-card__body">
            <p className="ss-shop-product-card__category">{getCategoryLabel(item)}</p>
            <h3 className="ss-shop-product-card__title">
              <Link href={detailHref}>{displayName}</Link>
            </h3>
            {renderPrice(item)}
            <div className="ss-shop-product-card__footer">
              <span>
                {Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0)) > 0
                  ? isEn
                    ? "Available to order"
                    : "Dostupno za poručivanje"
                  : isEn
                    ? "Check availability"
                    : "Proveri dostupnost"}
              </span>
              <Link href={detailHref} className="ss-shop-inline-link">
                {isEn ? "View product" : "Pogledaj proizvod"}
              </Link>
            </div>
          </div>
        </article>
      </ProductItemMotion>
    );
  };

  const renderSpotlightCard = (item: CatalogProductView, key: string, index: number) => {
    const imageSources = getCatalogProductImageSources(item, [], ["/img/odela2.jpg"]);
    const displayName = getLocalizedCatalogProductName(item, lang);
    const detailHref = productDetailHref(item);

    return (
      <ProductItemMotion key={key} className="ss-shop-spotlight-card-wrap" index={index}>
        <article className="ss-shop-spotlight-card">
          <Link href={detailHref} className="ss-shop-spotlight-card__media">
            <StorefrontSmartImage
              sources={imageSources}
              width={780}
              height={860}
              alt={displayName}
              className="pc__img object-position-top"
              sizes="(max-width: 991px) 100vw, 42vw"
              quality={72}
            />
          </Link>
          <div className="ss-shop-spotlight-card__body">
            <p className="ss-shop-spotlight-card__eyebrow">{getCategoryLabel(item)}</p>
            <h3>
              <Link href={detailHref}>{displayName}</Link>
            </h3>
            <p>
              {isEn
                ? "A polished entry point into the collection, ideal for a quicker premium browsing flow."
                : "Uredan ulaz u kolekciju, idealan za brži i premium početak shop iskustva."}
            </p>
            {renderPrice(item, "justify-content-start")}
            <div className="ss-shop-spotlight-card__footer">
              <span>{isEn ? "Selected highlight" : "Izdvojeni model"}</span>
              <Link href={detailHref} className="btn btn-link p-0 text-uppercase fw-medium">
                {isEn ? "Explore model" : "Pogledaj model"}
              </Link>
            </div>
          </div>
        </article>
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
    name: "Santos & Santorini Web Shop",
    url: absoluteUrl(isEn ? "/web-shop?lang=en" : "/web-shop"),
    description: heroLead,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 12).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(productDetailHref(item)),
        name: getLocalizedCatalogProductName(item, lang),
      })),
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={collectionJsonLd} />
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-shop-page">
        <Reveal as="section" className="ss-shop-premium-hero position-relative">
          <div className="ss-shop-premium-hero__media">
            <Image
              src={landingSettings.shopHeroImage || "/img/hero2.jpg"}
              width={1759}
              height={940}
              alt="Santos web shop hero"
              className="ss-shop-premium-hero__image"
              priority
            />
            <div className="ss-shop-premium-hero__overlay" />
          </div>

          <div className="container position-relative">
            <div className="ss-shop-premium-hero__grid">
              <div className="ss-shop-premium-hero__content">
                <p className="ss-shop-premium-hero__eyebrow">{heroEyebrow}</p>
                <h1>{heroTitle}</h1>
                <p className="ss-shop-premium-hero__lead">{heroLead}</p>

                <div className="ss-shop-premium-hero__actions">
                  <Link href="#shop-products" className="btn btn-light text-uppercase fw-medium">
                    {isEn ? "Browse collection" : "Pogledaj kolekciju"}
                  </Link>
                  <Link href={makeHref({ categoryId: null, onSale: 1, page: 1 })} className="btn btn-outline-light text-uppercase fw-medium">
                    {isEn ? "View sale" : "Pogledaj akcije"}
                  </Link>
                </div>

                <div className="ss-shop-premium-hero__chips">
                  {serviceCards.map((card) => (
                    <div key={card.title} className="ss-shop-premium-hero__chip">
                      <strong>{card.title}</strong>
                      <span>{card.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ss-shop-premium-hero__aside">
                <div className="ss-shop-premium-hero__panel">
                  <p className="ss-shop-premium-hero__panel-eyebrow">
                    {isEn ? "Collection snapshot" : "Brzi pregled kolekcije"}
                  </p>
                  <div className="ss-shop-premium-hero__stats">
                    {heroStats.map((stat) => (
                      <div key={stat.label} className="ss-shop-premium-hero__stat">
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="ss-shop-premium-hero__panel-links">
                    {categoryCards.slice(0, 3).map((card) => (
                      <Link key={card.label} href={card.href} className="ss-shop-premium-hero__panel-link">
                        <span>{card.label}</span>
                        <small>{card.note}</small>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {showCuratedIntro ? (
          <section className="container ss-shop-editorial-flow">
            <Reveal as="div" className="ss-shop-category-rail">
              <div className="ss-shop-section-heading">
                <div>
                  <p className="ss-shop-section-heading__eyebrow">
                    {isEn ? "Start clean" : "Čist početak"}
                  </p>
                  <h2>{isEn ? "Choose the shopping path before the full catalog." : "Izaberi pravac kupovine pre punog kataloga."}</h2>
                </div>
                <p>
                  {isEn
                    ? "This intro mirrors the premium template rhythm: less text, faster orientation and cleaner jumps into the collection."
                    : "Ovaj uvod prati premium template ritam: manje teksta, brža orijentacija i čistiji ulaz u kolekciju."}
                </p>
              </div>

              <div className="ss-shop-category-rail__grid">
                {categoryCards.map((card, index) => (
                  <Link key={`${card.label}-${index}`} href={card.href} className="ss-shop-category-card">
                    <span className="ss-shop-category-card__index">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{card.label}</strong>
                    <p>{card.note}</p>
                  </Link>
                ))}
              </div>
            </Reveal>

            {spotlightItems.length > 0 ? (
              <Reveal as="div" className="ss-shop-spotlight">
                <div className="ss-shop-section-heading ss-shop-section-heading--compact">
                  <div>
                    <p className="ss-shop-section-heading__eyebrow">
                      {isEn ? "Spotlight" : "Izdvojeni modeli"}
                    </p>
                    <h2>{isEn ? "A calmer premium bridge into the catalog." : "Mirniji premium prelaz ka katalogu."}</h2>
                  </div>
                  <p>
                    {isEn
                      ? "Instead of a noisy block between hero and products, the page now introduces just a few strong models."
                      : "Umesto bučne sekcije između hero-a i proizvoda, stranica sada uvodi samo nekoliko jakih modela."}
                  </p>
                </div>

                <div className="ss-shop-spotlight__grid">
                  {spotlightItems.map((item, index) =>
                    renderSpotlightCard(item, `spotlight-${item.legacyId}`, index),
                  )}
                </div>
              </Reveal>
            ) : null}
          </section>
        ) : null}

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
                  <p className="ss-shop-gallery__eyebrow">{isEn ? "Catalog" : "Katalog"}</p>
                  <h2 className="ss-shop-gallery__title">
                    {items.length > 0
                      ? isEn
                        ? "Selected models ready to browse and order"
                        : "Odabrani modeli spremni za pregled i poručivanje"
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
                    <h3>
                      {isEn
                        ? "Adjust filters for a wider premium selection."
                        : "Prilagodi filtere za siri premium izbor."}
                    </h3>
                    <p>
                      {isEn
                        ? "Start with a product name or category, then narrow the view with stock or sale only when needed."
                        : "Kreni od naziva proizvoda ili kategorije, pa suzi prikaz stanjem ili akcijom samo kada je potrebno."}
                    </p>
                    <Link
                      href={makeHref({ q: null, categoryId: null, inStock: null, onSale: null, sort: null, page: 1 })}
                      className="btn btn-primary text-uppercase fw-medium"
                    >
                      {isEn ? "Reset filters" : "Resetuj filtere"}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="row row-cols-2 row-cols-xl-3 g-3 g-xl-4">
                  {items.map((item, index) =>
                    renderProductCard(item, `grid-${item.legacyId}`, index),
                  )}
                </div>
              )}
            </div>
          </WebShopFilters>

          <div className="ss-shop-pagination">
            <p className="ss-shop-pagination__summary">
              {isEn ? "SHOWING" : "PRIKAZANO"} {items.length} {isEn ? "OF" : "OD"} {result.total}{" "}
              {isEn ? "PRODUCTS" : "PROIZVODA"}
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
