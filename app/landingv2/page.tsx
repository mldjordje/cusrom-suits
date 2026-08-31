import JsonLd from "@/app/components/seo/JsonLd";
import {
  listCatalogProducts,
  productMatchesCategoryGroup,
  type CatalogProductView,
} from "@/lib/catalog/store";
import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { getCatalogProductDisplayName } from "@/lib/catalog/presentation";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { getCatalogProductImageSources } from "@/lib/storefront/product-details";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildSeoMetadata,
  buildWebSiteJsonLd,
} from "@/lib/seo";

import LxShell from "./_components/LxShell";
import LxHero from "./_components/LxHero";
import LxManifesto from "./_components/LxManifesto";
import LxCategories, { type LxCategory } from "./_components/LxCategories";
import LxBespoke from "./_components/LxBespoke";
import LxEdit, { type LxProduct } from "./_components/LxEdit";
import LxVideoBand from "./_components/LxVideoBand";
import LxAteliers from "./_components/LxAteliers";
import LxFooter from "./_components/LxFooter";

const FALLBACK_IMAGE = "/img/odela-luxury.jpg";

/** High-resolution tailoring shots for Bespoke section */
const BESPOKE_SHOTS = [
  "/img/odela-luxury.jpg",
  "/img/aksesoari-luxury.jpg",
  "/img/odela2.webp",
  "/img/hero2.webp",
];

/** Curated local editorial fallback frames */
const LOCAL_FRAMES = [
  "/img/odela-luxury.jpg",
  "/img/hero2.webp",
  "/img/obuca-luxury.jpg",
  "/img/aksesoari-luxury.jpg",
];

/**
 * Premium Santos video assets from production and campaigns.
 * High-definition, properly graded, professional tailoring and runway footage.
 */
const HERO_VIDEO =
  "/fajlovi/site-assets/2026-08-21/1787302307595-39dcdc2a-6f15-4a07-9b7b-ade379a2cd80-proizvodnja-santos-video-hero.mp4";
const HERO_VIDEO_FALLBACK =
  "/fajlovi/site-assets/2026-08-20/1787230374343-6944820d-de7e-47ce-896b-fb0755d3463c-kompresovanmp4-final_pj2zx3qu.mp4";
const BAND_VIDEO_CRAFT =
  "/fajlovi/site-assets/2026-08-20/1787230677551-680a41ea-75c9-4843-b64c-9c8f4a867eb5-proizvodnja-santos-video.mp4";
const BAND_VIDEO_CAMPAIGN =
  "/fajlovi/video/Santos%20Santorini%20FUL%20HD%20v2.mp4";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  const title = isEn
    ? "Santos & Santorini Menswear | Italian Sartoria"
    : "Santos & Santorini | Muška Odela & Šivenje po Meri";

  const description = isEn
    ? "Bespoke Italian tailoring, hand-crafted suits, pure wool fabrics from Loro Piana and Cerruti. Ateliers in Niš and Kruševac."
    : "Krojenje po meri, ručno rađena muška odela od italijanskih štofova Loro Piana i Cerruti. Saloni u Nišu i Kruševcu.";

  return buildSeoMetadata({
    title,
    description,
    path: "/landingv2",
    lang,
    image: "/img/og-default.jpg",
  });
}

function formatPrice(amount: number): string {
  if (!amount || amount <= 0) return "";
  const integer = Math.round(amount);
  return `${integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} RSD`;
}

function toProduct(
  item: CatalogProductView,
  lang: "sr" | "en",
  index: number,
): LxProduct {
  const sources = getCatalogProductImageSources(item);
  const title = getCatalogProductDisplayName(item, lang);

  return {
    id: String(item.legacyId),
    title,
    price: formatPrice(item.priceFinalGross || item.priceGross || 0),
    image: sources[0] || item.coverImage || FALLBACK_IMAGE,
    hoverImage: sources[1] || sources[0],
    href:
      lang === "en"
        ? `/web-shop/${item.legacyId}?lang=en`
        : `/web-shop/${item.legacyId}`,
    fallback: LOCAL_FRAMES[index % LOCAL_FRAMES.length],
  };
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const suffix = isEn ? "?lang=en" : "";

  const brokenProductIds = await getBrokenProductIdSet();
  const excludeLegacyIds = brokenProductIds.size
    ? Array.from(brokenProductIds)
    : undefined;

  const [catalog, settings] = await Promise.all([
    listCatalogProducts({
      page: 1,
      pageSize: 40,
      activeOnly: true,
      exportOnly: true,
      collapseBySku: true,
      requireDirectImages: true,
      requireReachableImages: false,
      excludeLegacyIds,
    }),
    getLandingSettings(),
  ]);

  const items = (catalog.items || []).filter(
    (item) => item.coverImage && item.coverImage.trim().length > 0,
  );

  const products: LxProduct[] = items
    .slice(0, 4)
    .map((item, index) => toProduct(item, lang, index));

  const categoryImage = (group: string, fallbackImage: string) => {
    const found = items.find((item) =>
      productMatchesCategoryGroup(item, group),
    );
    if (found) {
      const src = getCatalogProductImageSources(found)[0];
      if (src && !src.includes("obuca.jpg")) return src;
    }
    return fallbackImage;
  };

  const categories: LxCategory[] = [
    {
      id: "odela",
      group: "odela",
      sr: "Muška Odela",
      en: "Bespoke Suits",
      fallback: "/img/odela-luxury.jpg",
    },
    {
      id: "kosulje",
      group: "kosulje",
      sr: "Sartorial Košulje",
      en: "Fine Shirts",
      fallback: "/img/hero2.webp",
    },
    {
      id: "obuca",
      group: "obuca",
      sr: "Ručno Rađena Obuća",
      en: "Handcrafted Footwear",
      fallback: "/img/obuca-luxury.jpg",
    },
    {
      id: "aksesoari",
      group: "aksesoari",
      sr: "Svileni Aksesoari",
      en: "Silk Accessories",
      fallback: "/img/aksesoari-luxury.jpg",
    },
  ].map((entry) => ({
    id: entry.id,
    label: lang === "en" ? entry.en : entry.sr,
    href: `/web-shop?categoryGroup=${entry.group}${lang === "en" ? "&lang=en" : ""}`,
    image: categoryImage(entry.group, entry.fallback),
    fallback: entry.fallback,
  }));

  const ateliers = [
    {
      city: "Niš",
      lines: ["Obrenovićeva 9", "Pon — Sub, 09—21h", "+381 18 240 240"],
      href: `/prodajna-mesta${suffix}`,
    },
    {
      city: "Kruševac",
      lines: ["Trg fontana bb", "Pon — Sub, 09—21h", "+381 37 420 420"],
      href: `/prodajna-mesta${suffix}`,
    },
  ];

  // Configured hero video wins if provided, otherwise default to high-res production video
  const configuredHeroVideo =
    typeof settings.heroVideoUrl === "string"
      ? settings.heroVideoUrl.trim()
      : "";
  const heroVideo =
    configuredHeroVideo.length > 0 ? configuredHeroVideo : HERO_VIDEO;

  return (
    <LxShell lang={lang}>
      <JsonLd
        data={[
          buildOrganizationJsonLd(),
          buildWebSiteJsonLd(),
          buildLocalBusinessJsonLd(),
        ]}
      />

      {/* 1. Cinematic 100vh Hero with Production Footage */}
      <LxHero
        lang={lang}
        image="/img/odela-luxury.jpg"
        video={heroVideo}
        videoFallback={HERO_VIDEO_FALLBACK}
        poster="/img/hero.jpg"
      />

      {/* 2. Manifesto — Quiet Luxury Philosophy */}
      <LxManifesto lang={lang} />

      {/* 3. Mid-break Cinematic Band — Atelier Craft */}
      <LxVideoBand
        video={BAND_VIDEO_CRAFT}
        poster="/img/odela-luxury.jpg"
        eyebrow={isEn ? "(—) — In the atelier" : "(—) — U ateljeu"}
        lines={
          isEn
            ? ["Master craft,", "worn for generations"]
            : ["Krojeno jednom,", "nošeno godinama"]
        }
      />

      {/* 4. Curated Collections Runway */}
      <LxCategories
        lang={lang}
        categories={categories}
        allHref={`/web-shop${suffix}`}
      />

      {/* 5. Bespoke Craft Anatomy — Central Wow Moment */}
      <LxBespoke lang={lang} shots={BESPOKE_SHOTS} />

      {/* 6. Campaign Video Band — High-fashion Movement */}
      <LxVideoBand
        video={BAND_VIDEO_CAMPAIGN}
        poster="/img/hero2.webp"
        eyebrow={isEn ? "(—) — Made to measure" : "(—) — Po meri"}
        lines={
          isEn
            ? ["Sixty anatomical measures.", "One flawless pattern."]
            : ["Šezdeset mera.", "Jedan besprekoran kroj."]
        }
        cta={{
          label: isEn ? "Configure bespoke suit" : "Konfigurišite odelo po meri",
          href: `/custom-suits${suffix}`,
        }}
      />

      {/* 7. Curated Signature Product Edit */}
      <LxEdit lang={lang} products={products} allHref={`/web-shop${suffix}`} />

      {/* 8. Ateliers Niš & Kruševac with Fitting Bookings */}
      <LxAteliers lang={lang} ateliers={ateliers} />

      {/* 9. Luxury Brand Footer with Logo */}
      <LxFooter lang={lang} />
    </LxShell>
  );
}
