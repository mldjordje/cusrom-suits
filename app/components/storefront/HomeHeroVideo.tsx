import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { decodeHtmlEntities, getCatalogProductDisplayName } from "@/lib/catalog/presentation";
import type { StorefrontLanguage } from "@/lib/storefront/language";
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

const buildEmbed = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0`;

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
            title: "Kolekcija odela",
            image: "/img/odela2.jpg",
            href: withLang(hrefForCategory(suitsCategoryId)),
          },
          {
            id: "fallback-2",
            title: "Premium obuca",
            image: "/img/obuca.jpg",
            href: withLang(hrefForCategory(shoesCategoryId)),
          },
          {
            id: "fallback-3",
            title: "Nova kolekcija",
            image: "/img/hero.jpg",
            href: withLang("/web-shop"),
          },
          {
            id: "fallback-4",
            title: "Aktuelne akcije",
            image: "/img/hero2.jpg",
            href: withLang("/akcije"),
          },
        ];

  return (
    <section id="ss-home-hero" className="ss-home18-hero position-relative overflow-hidden">
      <div className="ss-home18-hero__ambient ss-home18-hero__ambient--one" data-hero-glow />
      <div className="ss-home18-hero__ambient ss-home18-hero__ambient--two" data-hero-glow />
      <div className="ss-home18-hero__grid" aria-hidden="true" />
      <div className="ss-home18-hero__media position-absolute top-0 start-0 w-100 h-100">
        <iframe
          title="Santos and Santorini hero desktop video"
          src={buildEmbed("18WbTwdI0Vs")}
          className="ss-home18-hero__iframe ss-home18-hero__iframe--desktop d-none d-md-block"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
        />
        <iframe
          title="Santos and Santorini hero mobile video"
          src={buildEmbed("U8g-651j3yo")}
          className="ss-home18-hero__iframe ss-home18-hero__iframe--mobile d-md-none"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <div className="ss-home18-hero__overlay position-absolute top-0 start-0 w-100 h-100" />

      <div className="container position-relative ss-home18-hero__content">
        <div className="ss-home18-hero__intro text-center text-white" data-hero-intro>
          <p className="text-uppercase fs-13 fw-normal mb-2 text-white ss-home18-hero__eyebrow">{decodeHtmlEntities(content.heroEyebrow)}</p>
          <h2 className="text-uppercase h1 fw-semi-bold lh-1 mb-4 text-white">
            {decodeHtmlEntities(content.heroTitleLine1)}
            <br />
            {decodeHtmlEntities(content.heroTitleLine2)}
          </h2>
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap ss-home18-hero__cta">
            <Link href={withLang(content.heroPrimaryCtaHref)} className="btn btn-light border-0 fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn">
              {decodeHtmlEntities(content.heroPrimaryCtaLabel)}
            </Link>
            <Link href={withLang(content.heroSecondaryCtaHref)} className="btn btn-outline-light fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn ss-cta-btn--ghost-light">
              {decodeHtmlEntities(content.heroSecondaryCtaLabel)}
            </Link>
          </div>
        </div>

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
