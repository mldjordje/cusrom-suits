import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { decodeHtmlEntities, getCatalogProductDisplayName } from "@/lib/catalog/presentation";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import HomeHeroMedia from "@/app/components/storefront/HomeHeroMedia";
import HomeHeroIntroMotion from "@/app/components/storefront/HomeHeroIntroMotion";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";

const HeroParallaxFx = dynamic(() => import("@/app/components/storefront/HeroParallaxFx"));

type HomeCategory = {
  id: number;
  name: string;
  path: string[];
};

type Props = {
  categories: HomeCategory[];
  showProductCards?: boolean;
  featuredProducts: {
    legacyId: number;
    sku: string;
    name: string;
    manufCode?: string | null;
    coverImage: string | null;
    categories: HomeCategory[];
  }[];
  content: {
    heroEyebrow: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroPrimaryCtaLabel: string;
    heroPrimaryCtaHref: string;
    heroSecondaryCtaLabel: string;
    heroSecondaryCtaHref: string;
  };
  lang?: StorefrontLanguage;
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const findCategoryId = (categories: HomeCategory[], terms: string[]) => {
  const normalizedTerms = terms.map(normalize);
  const found = categories.find((category) => {
    const values = [category.name, ...(category.path || [])].map(normalize);
    return values.some((value) => normalizedTerms.some((term) => value.includes(term)));
  });
  return found?.id;
};

const hrefForCategory = (categoryId?: number) => (categoryId ? `/web-shop?categoryId=${categoryId}` : "/web-shop");

export default function HomeHeroVideo({ categories, showProductCards = true, featuredProducts, content, lang = "sr" }: Props) {
  const tx = (value: string, fallbackEn?: string) => localizeDynamicStorefrontText(value, lang, fallbackEn);
  const withLang = (href: string) => {
    if (lang !== "en" || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const suitsCategoryId = findCategoryId(categories, ["odel", "suit"]);
  const shoesCategoryId = findCategoryId(categories, ["obuc", "cipel", "shoe"]);
  const cards =
    featuredProducts.length > 0
      ? featuredProducts.slice(0, 4).map((product) => ({
          id: String(product.legacyId),
          title: getCatalogProductDisplayName(
            {
              name: product.name,
              sku: product.sku,
              manufCode: product.manufCode,
              categories: product.categories,
            },
            lang,
          ),
          image: product.coverImage || "/img/hero.jpg",
          href: withLang(`/web-shop/${product.legacyId}`),
        }))
      : [
          {
            id: "fallback-1",
            title: tx("Kolekcija odela", "Suit Collection"),
            image: "/img/odela2.jpg",
            href: withLang(hrefForCategory(suitsCategoryId)),
          },
          {
            id: "fallback-2",
            title: tx("Premium obuca", "Premium Footwear"),
            image: "/img/obuca.jpg",
            href: withLang(hrefForCategory(shoesCategoryId)),
          },
          {
            id: "fallback-3",
            title: tx("Nova kolekcija", "New Collection"),
            image: "/img/hero.jpg",
            href: withLang("/web-shop"),
          },
          {
            id: "fallback-4",
            title: tx("Aktuelne akcije", "Current Sale"),
            image: "/img/hero2.jpg",
            href: withLang("/akcije"),
          },
        ];

  return (
    <section id="ss-home-hero" className="ss-home18-hero position-relative overflow-hidden">
      <div className="ss-home18-hero__ambient ss-home18-hero__ambient--one" data-hero-glow />
      <div className="ss-home18-hero__ambient ss-home18-hero__ambient--two" data-hero-glow />
      <div className="ss-home18-hero__grid" aria-hidden="true" />
      <HomeHeroMedia
        desktopVideoId="18WbTwdI0Vs"
        mobileVideoId="U8g-651j3yo"
        desktopPosterSrc="/img/hero2.jpg"
        mobilePosterSrc="/img/hero.jpg"
      />
      <div className="ss-home18-hero__overlay position-absolute top-0 start-0 w-100 h-100" />

      <div className="container position-relative ss-home18-hero__content">
        <HomeHeroIntroMotion
          eyebrow={decodeHtmlEntities(content.heroEyebrow)}
          titleLine1={decodeHtmlEntities(content.heroTitleLine1)}
          titleLine2={decodeHtmlEntities(content.heroTitleLine2)}
          primaryLabel={decodeHtmlEntities(content.heroPrimaryCtaLabel)}
          primaryHref={withLang(content.heroPrimaryCtaHref)}
          secondaryLabel={decodeHtmlEntities(content.heroSecondaryCtaLabel)}
          secondaryHref={withLang(content.heroSecondaryCtaHref)}
        />

        {showProductCards ? (
          <div className="ss-home18-hero__cards">
            {cards.map((card) => (
              <article key={card.id} className="ss-home18-hero__card-item" data-hero-card>
                <Link href={card.href} className="d-block ss-home18-hero__card-link">
                  <StorefrontSmartImage
                  sources={[card.image]}
                  fallbackSrc="/img/hero.jpg"
                  width={330}
                  height={400}
                  alt={card.title}
                  className="w-100 h-auto d-block ss-home18-hero__card-image"
                  sizes="(max-width: 767px) 46vw, (max-width: 1199px) 19vw, 330px"
                />
                  <span className="menu-link menu-link_us-s fw-semi-bold fs-18 text-white text-uppercase d-block mt-2 ss-home18-hero__card-title">
                    {card.title}
                  </span>
                  <span className="ss-home18-hero__card-meta">
                    {decodeHtmlEntities(content.heroPrimaryCtaLabel)}
                  </span>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </div>
      <HeroParallaxFx targetId="ss-home-hero" />
    </section>
  );
}
