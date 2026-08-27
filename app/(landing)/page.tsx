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

const FALLBACK_IMAGE = "/img/odela.jpg";

/** Local editorial frames. Replaced by admin uploads the moment they exist. */
const BESPOKE_SHOTS = ["/img/odela2.webp", "/img/hero2.webp", "/img/odela.jpg", "/img/hero.jpg"];

/**
 * Bundled stand-ins, one per slot, so the page never shows an empty frame
 * while the legacy asset host is unreachable. They rotate rather than repeat
 * so a total outage still reads as a composed page.
 */
const LOCAL_FRAMES = ["/img/odela.jpg", "/img/hero2.webp", "/img/obuca.jpg", "/img/odela2.webp"];

/**
 * Santos' own clips, bundled in public/. Only the small ones are used: the
 * hero autoplays on load and the bands mount their video near the viewport,
 * so the page ships about 2.4 MB of motion in total rather than 40.
 */
const HERO_VIDEO = "/fajlovi/uniforme/Santos uniforma pantalone jakna.mp4";
const BAND_VIDEO_CRAFT = "/fajlovi/uniforme/Santos uniforma kosulja kratak rukav.mp4";
const BAND_VIDEO_ATELIER = "/fajlovi/uniforme/Santos zenska uniforma mantil.mp4";

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

  const metadata = buildSeoMetadata({
    title: isEn
      ? "Santos & Santorini Menswear | Italian Sartoria"
      : "Santos & Santorini | Muška Odela & Šivenje po Meri",
    description: isEn
      ? "Luxury menswear, bespoke tailoring, Italian wool suits and accessories from Santos & Santorini."
      : "Vrhunska muška odela, sakoi, šivenje po meri od italijanskih tkanina i aksesoari brenda Santos & Santorini. Saloni u Nišu i Kruševcu.",
    path: "/",
    lang,
    keywords: ["muska odela", "odela po meri", "odela Nis", "italijanska odela", "bespoke tailoring Serbia"],
  });

  // The root layout appends "| Santos & Santorini" via its title template, and
  // the brand is already the first half of this title.
  return { ...metadata, title: { absolute: title } };
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function toProduct(item: CatalogProductView, lang: "sr" | "en", index: number): LxProduct {
  const sources = getCatalogProductImageSources(item);
  const title = getCatalogProductDisplayName(
    {
      name: item.name,
      sku: item.sku,
      manufCode: item.manufCode,
      categories: item.categories,
      brand: item.brand,
    },
    lang,
  );

  return {
    id: String(item.legacyId),
    title,
    price: formatPrice(item.priceFinalGross || item.priceGross || 0),
    image: sources[0] || item.coverImage || FALLBACK_IMAGE,
    hoverImage: sources[1],
    href: lang === "en" ? `/web-shop/${item.legacyId}?lang=en` : `/web-shop/${item.legacyId}`,
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
  const excludeLegacyIds = brokenProductIds.size ? Array.from(brokenProductIds) : undefined;

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

  const products: LxProduct[] = items.slice(0, 4).map((item, index) => toProduct(item, lang, index));

  const categoryImage = (group: string, fallbackIndex: number) => {
    const found = items.find((item) => productMatchesCategoryGroup(item, group));
    if (found) return getCatalogProductImageSources(found)[0] || found.coverImage || FALLBACK_IMAGE;
    return products[fallbackIndex]?.image || FALLBACK_IMAGE;
  };

  const categories: LxCategory[] = [
    { id: "odela", group: "odela", sr: "Odela", en: "Suits" },
    { id: "kosulje", group: "kosulje", sr: "Košulje", en: "Shirts" },
    { id: "obuca", group: "obuca", sr: "Obuća", en: "Footwear" },
    { id: "aksesoari", group: "aksesoari", sr: "Aksesoari", en: "Accessories" },
  ].map((entry, index) => ({
    id: entry.id,
    label: lang === "en" ? entry.en : entry.sr,
    href: `/web-shop?categoryGroup=${entry.group}${lang === "en" ? "&lang=en" : ""}`,
    image: categoryImage(entry.group, index),
    fallback: LOCAL_FRAMES[index % LOCAL_FRAMES.length],
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

  // An admin upload wins; the component falls back to the bundled clip if the
  // configured one errors or never loads.
  const configuredHeroVideo =
    typeof settings.heroVideoUrl === "string" ? settings.heroVideoUrl.trim() : "";
  const heroVideo = configuredHeroVideo.length > 0 ? configuredHeroVideo : HERO_VIDEO;

  return (
    <LxShell lang={lang}>
      <JsonLd
        data={[buildOrganizationJsonLd(), buildWebSiteJsonLd(), buildLocalBusinessJsonLd()]}
      />

      <LxHero
        lang={lang}
        image="/img/hero.jpg"
        video={heroVideo}
        videoFallback={HERO_VIDEO}
        poster="/img/hero.jpg"
      />
      <LxManifesto lang={lang} />

      <LxVideoBand
        video={BAND_VIDEO_CRAFT}
        poster="/img/odela2.webp"
        eyebrow={isEn ? "(—) — In the atelier" : "(—) — U ateljeu"}
        lines={isEn ? ["Cut once,", "worn for years"] : ["Krojeno jednom,", "nošeno godinama"]}
      />

      <LxCategories lang={lang} categories={categories} allHref={`/web-shop${suffix}`} />
      <LxBespoke lang={lang} shots={BESPOKE_SHOTS} />

      <LxVideoBand
        video={BAND_VIDEO_ATELIER}
        poster="/img/hero2.webp"
        eyebrow={isEn ? "(—) — Made to measure" : "(—) — Po meri"}
        lines={isEn ? ["Sixty measurements.", "One pattern."] : ["Šezdeset mera.", "Jedan kroj."]}
        cta={{
          label: isEn ? "Configure your suit" : "Konfigurišite odelo",
          href: `/custom-suits${suffix}`,
        }}
      />

      <LxEdit lang={lang} products={products} allHref={`/web-shop${suffix}`} />
      <LxAteliers lang={lang} ateliers={ateliers} />
      <LxFooter lang={lang} />
    </LxShell>
  );
}
