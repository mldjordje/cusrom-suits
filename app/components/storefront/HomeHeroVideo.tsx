import Image from "next/image";
import Link from "next/link";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import HomeHeroMedia from "@/app/components/storefront/HomeHeroMedia";
import HomeHeroIntroMotion from "@/app/components/storefront/HomeHeroIntroMotion";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import HeroFx from "@/app/components/storefront/HeroFx";

type HomeCategory = {
  id: number;
  name: string;
  path: string[];
};

type HeroCard = {
  id: string;
  title: string;
  image: string;
  href: string;
};

type Props = {
  categories: HomeCategory[];
  showProductCards?: boolean;
  cards: HeroCard[];
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
  heroVideoUrl?: string;
  heroVideoMobileUrl?: string;
  heroVideoPosterUrl?: string;
  heroTextColor?: string;
};

const hrefForCategoryGroup = (categoryGroup: string) => `/web-shop?categoryGroup=${categoryGroup}`;

export default function HomeHeroVideo({ categories: _categories, showProductCards = true, cards: cardsInput, content, lang = "sr", heroVideoUrl, heroVideoMobileUrl, heroVideoPosterUrl, heroTextColor }: Props) {
  const isEn = lang === "en";
  const tx = (value: string, fallbackEn?: string) => localizeDynamicStorefrontText(value, lang, fallbackEn);
  const withLang = (href: string) => {
    if (lang !== "en" || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const cards =
    cardsInput.length > 0
      ? cardsInput.slice(0, 4)
      : [
          {
            id: "fallback-1",
            title: tx("Kolekcija odela", "Suit Collection"),
            image: "/img/odela2.jpg",
            href: withLang(hrefForCategoryGroup("odelo")),
          },
          {
            id: "fallback-2",
            title: tx("Premium obuca", "Premium Footwear"),
            image: "/img/obuca.jpg",
            href: withLang(hrefForCategoryGroup("obuca")),
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
      {heroTextColor ? (
        <style>{`#ss-home-hero#ss-home-hero .ss-home18-hero__eyebrow, #ss-home-hero#ss-home-hero .hero-display { color: ${heroTextColor} !important; }`}</style>
      ) : null}
      <div className="ss-home18-hero__grid" aria-hidden="true" />
      <HomeHeroMedia
        desktopVideoId="18WbTwdI0Vs"
        mobileVideoId="U8g-651j3yo"
        desktopPosterSrc={heroVideoPosterUrl || "/img/hero2.jpg"}
        mobilePosterSrc={heroVideoPosterUrl || "/img/hero.jpg"}
        heroVideoUrl={heroVideoUrl || undefined}
        heroVideoMobileUrl={heroVideoMobileUrl || undefined}
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
      </div>
      {/* Direction indicator */}
      <span className="ss-hero-cue" data-hero-cue aria-hidden="true">
        <span className="ss-hero-cue__line" />
      </span>
      <HeroFx targetId="ss-home-hero" />
    </section>
  );
}
