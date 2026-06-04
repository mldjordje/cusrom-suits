"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  normalizeLandingCustomSections,
  normalizeLandingProductSectionContent,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductLayout,
  type LandingProductSectionContent,
  type LandingProductSectionKey,
  type LandingProductSectionState,
} from "@/lib/catalog/landingSections";
import {
  applyGridOrderToSections,
  getOrderedGridEntries,
  type LandingGridOrderRef,
} from "@/lib/catalog/landingSectionOrder";
import { isBusinessUniformProduct } from "@/lib/catalog/productTypes";
import AdminLandingProductPickGrid from "@/app/admin/components/AdminLandingProductPickGrid";

type TabKey = "products" | "landing" | "akcije";
type CatalogCategory = { id: number; name: string; path: string[] };
type CatalogProduct = {
  legacyId: number;
  sku: string;
  name: string;
  description?: string | null;
  specification?: string | null;
  priceGross: number;
  priceFinalGross: number;
  rebatePercent: number;
  stockWarehouse1: number;
  stockTotal: number;
  brand: string | null;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: number | null;
  categories: CatalogCategory[];
  coverImage?: string | null;
  images?: string[];
  hasDirectMedia?: boolean;
  videoUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
};
type ProductDraft = {
  name: string;
  brand: string;
  description: string;
  specification: string;
  priceGross: string;
  priceFinalGross: string;
  rebatePercent: string;
  stockWarehouse1: string;
  stockTotal: string;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: string;
  videoUrl: string;
  images: string[];
  coverImage: string;
  businessUniform: boolean;
  priceOverride: boolean;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type CreateDraft = {
  sku: string;
  name: string;
  categoryId: string;
  brand: string;
  description: string;
  specification: string;
  priceGross: string;
  priceFinalGross: string;
  rebatePercent: string;
  taxPercent: string;
  stockWarehouse1: string;
  stockTotal: string;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: string;
  videoUrl: string;
  businessUniform: boolean;
};
type LandingDocument = {
  title: string;
  description: string;
  url: string;
};
type LandingUniformImage = {
  title: string;
  image: string;
  alt: string;
};
type LandingUniformVideo = {
  title: string;
  video: string;
  poster: string;
  alt: string;
};
type LandingStoryCard = {
  id: string;
  badge: string;
  title: string;
  copy: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};
type LandingContactPoint = {
  label: string;
  value: string;
};
type LandingSettings = {
  showSaleSection: boolean;
  productSections: LandingProductSectionState[];
  customSections: LandingCustomSection[];
  productSectionContent: LandingProductSectionContent[];
  saleSectionTitle: string;
  saleSectionSubtitle: string;
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
  bannerLeftTitle: string;
  bannerLeftButtonLabel: string;
  bannerLeftHref: string;
  bannerLeftImage: string;
  bannerRightTitle: string;
  bannerRightButtonLabel: string;
  bannerRightHref: string;
  bannerRightImage: string;
  companyMb: string;
  companyPib: string;
  customerRightsTitle: string;
  customerRightsText: string;
  purchaseGuideTitle: string;
  purchaseGuideText: string;
  documentsTitle: string;
  documentsSubtitle: string;
  documents: LandingDocument[];
  uniformsEyebrow: string;
  uniformsTitle: string;
  uniformsText: string;
  uniformsCtaLabel: string;
  uniformsCtaHref: string;
  uniformsImages: LandingUniformImage[];
  uniformsVideos: LandingUniformVideo[];
  shopHeroEyebrow: string;
  shopHeroTitle: string;
  shopHeroLead: string;
  shopHeroImage: string;
  storySectionTitle: string;
  storySectionCtaLabel: string;
  storySectionCtaHref: string;
  storyCards: LandingStoryCard[];
  aboutEyebrow: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  aboutPrimaryCtaLabel: string;
  aboutPrimaryCtaHref: string;
  aboutSecondaryCtaLabel: string;
  aboutSecondaryCtaHref: string;
  contactEyebrow: string;
  contactTitle: string;
  contactText: string;
  contactPoints: LandingContactPoint[];
  contactPrimaryCtaLabel: string;
  contactPrimaryCtaHref: string;
  contactSecondaryCtaLabel: string;
  contactSecondaryCtaHref: string;
  customerInfoEyebrow: string;
  customerInfoTitle: string;
  customerInfoPrimaryCtaLabel: string;
  customerInfoPrimaryCtaHref: string;
  customerInfoSecondaryCtaLabel: string;
  customerInfoSecondaryCtaHref: string;
  companyDetailsEyebrow: string;
  companyPibLabel: string;
  companyMbLabel: string;
  documentsEmptyText: string;
  blogSectionTitle: string;
  blogSectionCtaLabel: string;
  blogSectionCtaHref: string;
  heroStripProductIds: number[];
  highlightedProductIds: number[];
  popularProductIds: number[];
  arrivalsProductIds: number[];
  saleProductIds: number[];
  trendingProductIds: number[];
  heroVideoUrl: string;
  heroVideoPosterUrl: string;
};
type PromotionScopeType = "all" | "category" | "brand" | "product";
type PromotionDiscountType = "percent" | "fixed";
type PromotionRule = {
  id: string;
  name: string;
  isActive: boolean;
  scopeType: PromotionScopeType;
  scopeValues: Array<number | string>;
  discountType: PromotionDiscountType;
  discountValue: number;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type PromotionDraft = {
  name: string;
  isActive: boolean;
  scopeType: PromotionScopeType;
  scopeValuesText: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  priority: string;
  startAt: string;
  endAt: string;
};

const tabs: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: "products", label: "1. Proizvodi i lager", desc: "Dodavanje, izmene, kategorije i dostupnost" },
  { key: "landing", label: "2. Pocetna i sekcije", desc: "Jedino mesto za raspored proizvoda na home" },
  { key: "akcije", label: "3. Akcije i snizenja", desc: "Rucne akcije i automatska promo pravila" },
];

const workflowCards = [
  {
    title: "Proizvod i lager",
    desc: "Dodaj ili izmeni proizvod, cenu i lager. Pocetna se vise ne bira ovde.",
    tab: "products" as TabKey,
  },
  {
    title: "Pocetna strana",
    desc: "Sve sekcije pocetne strane biras samo u delu `Pocetna i sekcije`.",
    tab: "landing" as TabKey,
  },
  {
    title: "Akcije",
    desc: "Za snizenje idi u `Akcije i snizenja` i menjaj akcijsku cenu ili promo pravilo.",
    tab: "akcije" as TabKey,
  },
];

const landingSectionConfig: Array<{
  key: LandingProductSectionKey;
  label: string;
  description: string;
  limit: number;
}> = [
  { key: "heroStripProductIds", label: "Hero traka", description: "Proizvodi ispod hero videa.", limit: 4 },
  { key: "highlightedProductIds", label: "Izdvojeni modeli", description: "Prva velika produkt sekcija.", limit: 8 },
  { key: "popularProductIds", label: "Popularni proizvodi", description: "Sekcija popularnih proizvoda.", limit: 4 },
  { key: "arrivalsProductIds", label: "Nova kolekcija", description: "Sekcija novih modela.", limit: 4 },
  { key: "saleProductIds", label: "Akcije na pocetnoj", description: "Ako je prazno, home sam povlaci proizvode sa akcijskom cenom. Uneti ID-jevi imaju prioritet.", limit: 6 },
  { key: "trendingProductIds", label: "Trendinzi", description: "Sekcija trendova i preporuka.", limit: 4 },
];

const defaultLandingPickerValue: Record<LandingProductSectionKey, string> = {
  heroStripProductIds: "",
  highlightedProductIds: "",
  popularProductIds: "",
  arrivalsProductIds: "",
  saleProductIds: "",
  trendingProductIds: "",
};

const defaultCreateDraft: CreateDraft = {
  sku: "",
  name: "",
  categoryId: "",
  brand: "",
  description: "",
  specification: "",
  priceGross: "",
  priceFinalGross: "",
  rebatePercent: "",
  taxPercent: "",
  stockWarehouse1: "",
  stockTotal: "",
  isActive: true,
  isExported: true,
  landingFeatured: false,
  landingPriority: "",
  videoUrl: "",
  businessUniform: false,
};

const defaultLandingSettings: LandingSettings = {
  showSaleSection: true,
  productSections: normalizeLandingProductSections([]),
  customSections: normalizeLandingCustomSections([]),
  productSectionContent: normalizeLandingProductSectionContent([]),
  saleSectionTitle: "Aktuelne Akcije",
  saleSectionSubtitle: "",
  heroEyebrow: "Santos & Santorini",
  heroTitleLine1: "Nova kolekcija",
  heroTitleLine2: "2026",
  heroPrimaryCtaLabel: "Web shop",
  heroPrimaryCtaHref: "/web-shop",
  heroSecondaryCtaLabel: "Kontakt",
  heroSecondaryCtaHref: "/kontakt",
  bannerLeftTitle: "Ready to Wear",
  bannerLeftButtonLabel: "Kupi odmah",
  bannerLeftHref: "/web-shop",
  bannerLeftImage: "/img/hero2.jpg",
  bannerRightTitle: "Aktuelne akcije",
  bannerRightButtonLabel: "Pogledaj akcije",
  bannerRightHref: "/akcije",
  bannerRightImage: "/img/hero.jpg",
  companyMb: "20967021",
  companyPib: "108278726",
  customerRightsTitle: "Prava potrosaca",
  customerRightsText:
    "Kupac ima pravo na jasne informacije o proizvodu, ceni, nacinu porucivanja, isporuci i reklamaciji. Santos & Santorini postupa po vazecim propisima i reklamacije resava kroz direktnu komunikaciju sa kupcem.",
  purchaseGuideTitle: "Uputstvo za kupovinu",
  purchaseGuideText:
    "Izaberite proizvod i velicinu, dodajte artikal u korpu, zatim na checkout strani unesite kontakt podatke i posaljite porudzbinu kao upit. Nas tim potom potvrdjuje dostupnost, rok i sve detalje isporuke.",
  documentsTitle: "Dokumenta za preuzimanje",
  documentsSubtitle: "Ovde mozete dodati obrasce i dokumenta koja kupci mogu odmah da preuzmu.",
  documents: [],
  uniformsEyebrow: "Poslovne uniforme",
  uniformsTitle: "Uniforme za timove, hotele, restorane i klinike",
  uniformsText:
    "Santos & Santorini priprema poslovne uniforme prilagodjene identitetu brenda, delatnosti i potrebama tima.",
  uniformsCtaLabel: "Pogledaj uniforme",
  uniformsCtaHref: "/poslovne-uniforme",
  uniformsImages: [],
  uniformsVideos: [],
  shopHeroEyebrow: "Kurirani izbor krojeva",
  shopHeroTitle: "Web shop kolekcija spremna za porucivanje",
  shopHeroLead:
    "Pregledaj kolekciju uz citljiviju navigaciju, pretragu po proizvodu i filtere koji sada rade pregledno i na desktopu i na telefonu.",
  shopHeroImage: "/img/hero2.jpg",
  storySectionTitle: "Brend Prica",
  storySectionCtaLabel: "Pogledaj kolekciju",
  storySectionCtaHref: "/web-shop",
  storyCards: [
    {
      id: "story-1",
      badge: "Aktuelne akcije",
      title: "Do 30% popusta na izdvojene modele.",
      copy: "Izdvojili smo modele iz aktuelne kolekcije sa snizenim cenama i dostupnim velicinama.",
      image: "/img/hero.jpg",
      ctaLabel: "Pogledaj akcije",
      ctaHref: "/akcije",
    },
    {
      id: "story-2",
      badge: "Nova kolekcija",
      title: "Ready-to-wear komadi za svaku priliku",
      copy: "Od odela i sakoa do kosulja i aksesoara, webshop donosi izbor modela spremnih za porudzbinu.",
      image: "/img/hero2.jpg",
      ctaLabel: "Otvori web shop",
      ctaHref: "/web-shop",
    },
    {
      id: "story-3",
      badge: "Gift Edit",
      title: "Poklon koji traje",
      copy: "Kravate od svile, kozna galanterija i pazljivo birani detalji kao premium poklon izbor.",
      image: "/img/obuca.jpg",
      ctaLabel: "Pogledaj poklone",
      ctaHref: "/web-shop",
    },
  ],
  aboutEyebrow: "O nama",
  aboutTitle: "Brend nastao iz porodicne radionice",
  aboutParagraphs: [
    "Sa idejom da muskarac treba da uziva u garderobi koju nosi, Santos & Santorini nastaje 2007. u Nisu.",
    "Od 2013. brend postaje prepoznatljiv po modernim krojevima, biranim tkaninama i detaljima koji se doradjuju rucno.",
    "Nasi modeli spajaju tradiciju krojenja i savremeni dizajn, od prvog sava do finalne siluete.",
  ],
  aboutPrimaryCtaLabel: "Kontaktirajte nas",
  aboutPrimaryCtaHref: "/kontakt",
  aboutSecondaryCtaLabel: "Poseti web shop",
  aboutSecondaryCtaHref: "/web-shop",
  contactEyebrow: "Kontakt",
  contactTitle: "Podrska i licne preporuke",
  contactText: "Tim vas vodi kroz izbor tkanina, krojeva i detalja u showroom-u ili online. Odgovaramo u roku od jednog radnog dana.",
  contactPoints: [
    { label: "Telefon", value: "+381 69 445 5106" },
    { label: "Email", value: "prodaja@santos.rs" },
    { label: "Adresa", value: "Obrenoviceva 9, Nis" },
  ],
  contactPrimaryCtaLabel: "Kontakt forma",
  contactPrimaryCtaHref: "/kontakt",
  contactSecondaryCtaLabel: "Posalji email",
  contactSecondaryCtaHref: "mailto:atelier@santos.rs",
  customerInfoEyebrow: "Informacije za kupce",
  customerInfoTitle: "Prava potrosaca i uputstvo za kupovinu",
  customerInfoPrimaryCtaLabel: "Otvori checkout",
  customerInfoPrimaryCtaHref: "/checkout",
  customerInfoSecondaryCtaLabel: "Dokumenta",
  customerInfoSecondaryCtaHref: "/dokumenta",
  companyDetailsEyebrow: "Podaci o firmi",
  companyPibLabel: "PIB",
  companyMbLabel: "MB",
  documentsEmptyText: "Dokumenta ce ovde biti dostupna cim budu dodata.",
  blogSectionTitle: "Najnoviji Blog",
  blogSectionCtaLabel: "Pogledaj sve",
  blogSectionCtaHref: "/blog",
  heroStripProductIds: [],
  highlightedProductIds: [],
  popularProductIds: [],
  arrivalsProductIds: [],
  saleProductIds: [],
  trendingProductIds: [],
  heroVideoUrl: "",
  heroVideoPosterUrl: "",
};

const defaultPromotionDraft: PromotionDraft = {
  name: "",
  isActive: true,
  scopeType: "all",
  scopeValuesText: "",
  discountType: "percent",
  discountValue: "10",
  priority: "0",
  startAt: "",
  endAt: "",
};

const parseNumericInput = (value: string) => Number(String(value).replace(",", ".").trim());

const normalizeLegacyIdList = (value: unknown, max = 24): number[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

  const unique = new Set<number>();
  for (const raw of source) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    unique.add(Math.floor(id));
    if (unique.size >= max) break;
  }
  return Array.from(unique);
};

const parseLegacyIdCsv = (value: string, max: number) => normalizeLegacyIdList(value, max);

const normalizeLandingDocuments = (value: unknown, max = 24): LandingDocument[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const title = String(entry.title || "").trim();
      const description = String(entry.description || "").trim();
      const url = String(entry.url || "").trim();
      if (!title && !description && !url) return null;
      return { title, description, url };
    })
    .filter((item): item is LandingDocument => Boolean(item))
    .slice(0, max);
};

const normalizeLandingUniformImages = (value: unknown, max = 24): LandingUniformImage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const title = String(entry.title || "").trim();
      const image = String(entry.image || "").trim();
      const alt = String(entry.alt || "").trim();
      if (!title && !image && !alt) return null;
      return { title, image, alt };
    })
    .filter((item): item is LandingUniformImage => Boolean(item))
    .slice(0, max);
};

const normalizeLandingUniformVideos = (value: unknown, max = 24): LandingUniformVideo[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const title = String(entry.title || "").trim();
      const video = String(entry.video || "").trim();
      const poster = String(entry.poster || "").trim();
      const alt = String(entry.alt || "").trim();
      if (!title && !video && !poster && !alt) return null;
      return { title, video, poster, alt };
    })
    .filter((item): item is LandingUniformVideo => Boolean(item))
    .slice(0, max);
};

const normalizeStringList = (value: unknown, fallback: string[], max = 12) => {
  if (!Array.isArray(value)) {
    return fallback.slice(0, max);
  }
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
};

const normalizeLandingStoryCards = (value: unknown, max = 6): LandingStoryCard[] => {
  if (!Array.isArray(value)) return defaultLandingSettings.storyCards.slice(0, max);
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fallback = defaultLandingSettings.storyCards[index] || defaultLandingSettings.storyCards[0];
      return {
        id: String(row.id || fallback.id || `story-${index + 1}`).trim() || `story-${index + 1}`,
        badge: String(row.badge ?? fallback.badge ?? "").trim(),
        title: String(row.title ?? fallback.title ?? "").trim(),
        copy: String(row.copy ?? fallback.copy ?? "").trim(),
        image: String(row.image ?? fallback.image ?? "").trim() || fallback.image,
        ctaLabel: String(row.ctaLabel ?? fallback.ctaLabel ?? "").trim(),
        ctaHref: String(row.ctaHref ?? fallback.ctaHref ?? "").trim() || fallback.ctaHref,
      };
    })
    .filter((item): item is LandingStoryCard => Boolean(item))
    .slice(0, max);
};

const normalizeLandingContactPoints = (value: unknown, max = 12): LandingContactPoint[] => {
  if (!Array.isArray(value)) return defaultLandingSettings.contactPoints.slice(0, max);
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fallback = defaultLandingSettings.contactPoints[index] || defaultLandingSettings.contactPoints[0];
      const label = String(row.label ?? fallback.label ?? "").trim();
      const valueText = String(row.value ?? fallback.value ?? "").trim();
      if (!label && !valueText) return null;
      return { label, value: valueText };
    })
    .filter((item): item is LandingContactPoint => Boolean(item))
    .slice(0, max);
};

const humanizeAssetName = (value: string) =>
  String(value || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toNumberOrNull = (value: string) => {
  const n = parseNumericInput(value);
  return Number.isFinite(n) ? n : null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const toInputNumber = (value: number) => String(Number(value.toFixed(2)));

const computeSalePriceFromRebate = (priceGross: number, rebatePercent: number) =>
  Math.max(0, Number((priceGross * (1 - clampPercent(rebatePercent) / 100)).toFixed(2)));

const computeRebateFromSalePrice = (priceGross: number, priceFinalGross: number) => {
  if (!Number.isFinite(priceGross) || priceGross <= 0) return 0;
  return clampPercent(Number((((priceGross - priceFinalGross) / priceGross) * 100).toFixed(2)));
};

const toIsoFromLocal = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const parseScopeValuesText = (scopeType: PromotionScopeType, text: string): Array<number | string> => {
  if (scopeType === "all") return [];
  const tokens = String(text || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (scopeType === "category" || scopeType === "product") {
    return tokens
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Number(value));
  }
  return tokens.map((token) => token.toLowerCase());
};

const scopeValuesLabel = (rule: PromotionRule) => {
  if (rule.scopeType === "all") return "Sve";
  if (!rule.scopeValues.length) return "-";
  return rule.scopeValues.join(", ");
};

const toDraft = (item: CatalogProduct): ProductDraft => ({
  name: item.name,
  brand: item.brand || "",
  description: item.description || "",
  specification: item.specification || "",
  priceGross: String(item.priceGross),
  priceFinalGross: String(item.priceFinalGross),
  rebatePercent: String(item.rebatePercent || 0),
  stockWarehouse1: String(item.stockWarehouse1),
  stockTotal: String(item.stockTotal),
  isActive: item.isActive,
  isExported: item.isExported,
  landingFeatured: Boolean(item.landingFeatured),
  landingPriority: item.landingPriority == null ? "" : String(item.landingPriority),
  videoUrl: item.videoUrl || "",
  images: item.rawPayload?.imageFallback ? [] : Array.isArray(item.images) ? item.images.filter(Boolean) : [],
  coverImage: item.rawPayload?.imageFallback ? "" : item.coverImage || item.images?.[0] || "",
  businessUniform: isBusinessUniformProduct(item),
  priceOverride: Boolean((item.rawPayload?.commerceOverrides as Record<string, unknown> | undefined)?.price),
});

const normalizeTab = (value: string | null | undefined): TabKey => {
  if (value === "landing") return "landing";
  if (value === "akcije") return "akcije";
  return "products";
};

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const cardImage = (item: CatalogProduct) => item.coverImage || item.images?.[0] || "/img/odela2.jpg";

const isMofficeProduct = (item: CatalogProduct) =>
  Boolean(item.rawPayload?.moffice) || item.rawPayload?.source === "moffice";

const hasManualPriceOverride = (item: CatalogProduct) =>
  Boolean((item.rawPayload?.commerceOverrides as Record<string, unknown> | undefined)?.price);

const productQualityFlags = (item: CatalogProduct) => {
  const flags: Array<{ label: string; tone: "rose" | "amber" | "emerald" | "slate" }> = [];
  const hasOnlyFallbackImage = Boolean(item.rawPayload?.imageFallback);
  const images = hasOnlyFallbackImage ? [] : Array.isArray(item.images) ? item.images.filter(Boolean) : [];
  if (!images.length) flags.push({ label: "Nema sliku", tone: "rose" });
  if (hasOnlyFallbackImage) flags.push({ label: "Pozajmljena slika", tone: "amber" });
  else if (!item.coverImage) flags.push({ label: "Nema cover", tone: "amber" });
  if (!item.description?.trim()) flags.push({ label: "Nema opis", tone: "amber" });
  if (!item.priceFinalGross && !isBusinessUniformProduct(item)) flags.push({ label: "Nema cenu", tone: "rose" });
  if (!item.categories?.length) flags.push({ label: "Bez kategorije", tone: "amber" });
  if (item.videoUrl) flags.push({ label: "Ima video", tone: "emerald" });
  if (isMofficeProduct(item)) flags.push({ label: "mOffice", tone: "slate" });
  if (hasManualPriceOverride(item)) flags.push({ label: "Rucna cena", tone: "amber" });
  if (!item.isActive || !item.isExported) flags.push({ label: "Sakriven", tone: "slate" });
  if (!flags.length) flags.push({ label: "Spremno", tone: "emerald" });
  return flags;
};

const flagClass = (tone: "rose" | "amber" | "emerald" | "slate") => {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export default function AdminWebshopPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("products");
  /** Na telefonu: uputstvo je skriveno dok korisnik ne otvori (manje skrola) */
  const [hubIntroOpen, setHubIntroOpen] = useState(false);

  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [saleItems, setSaleItems] = useState<CatalogProduct[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [categoryRegistry, setCategoryRegistry] = useState<CatalogCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ProductDraft>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [createDraft, setCreateDraft] = useState<CreateDraft>(defaultCreateDraft);
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingEditorImages, setUploadingEditorImages] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [inStock, setInStock] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [exportOnly, setExportOnly] = useState(true);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [mediaStatus, setMediaStatus] = useState("all");
  const [contentStatus, setContentStatus] = useState("all");
  const [visibilityStatus, setVisibilityStatus] = useState("all");
  const [sourceStatus, setSourceStatus] = useState("all");
  const [sort, setSort] = useState("featured");
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [saleQ, setSaleQ] = useState("");
  const [saleOnSaleOnly, setSaleOnSaleOnly] = useState(true);
  const [promotionRules, setPromotionRules] = useState<PromotionRule[]>([]);
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>(defaultPromotionDraft);
  const [loadingPromotionRules, setLoadingPromotionRules] = useState(false);
  const [savingPromotionRule, setSavingPromotionRule] = useState(false);
  const [recomputingPromotions, setRecomputingPromotions] = useState(false);

  const [bulkRebate, setBulkRebate] = useState("");
  const [bulkPriceDelta, setBulkPriceDelta] = useState("");
  const [bulkStockDelta, setBulkStockDelta] = useState("");
  const [bulkActive, setBulkActive] = useState<"" | "1" | "0">("");
  const [bulkExported, setBulkExported] = useState<"" | "1" | "0">("");

  const [editorId, setEditorId] = useState<number | null>(null);
  const [saleEditorId, setSaleEditorId] = useState<number | null>(null);

  const [landingSettings, setLandingSettings] = useState<LandingSettings>(defaultLandingSettings);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState<"left" | "right" | null>(null);
  const [uploadingAssetKind, setUploadingAssetKind] =
    useState<"shopHero" | "documents" | "uniforms" | "storyCard" | "productVideo" | null>(null);
  const [landingProductQuery, setLandingProductQuery] = useState("");
  const [landingProductResults, setLandingProductResults] = useState<CatalogProduct[]>([]);
  const [landingProductsLoading, setLandingProductsLoading] = useState(false);
  const [landingPickerValues, setLandingPickerValues] =
    useState<Record<LandingProductSectionKey, string>>(defaultLandingPickerValue);

  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Desktop catalog: mreža sa slikama ili klasična tabela */
  const [productsCatalogView, setProductsCatalogView] = useState<"grid" | "table">("grid");

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[Number(id)]).map(Number), [selected]);
  const categories = useMemo(() => {
    const merged = new Map<number, CatalogCategory>();
    for (const category of [...catalogCategories, ...categoryRegistry]) {
      merged.set(category.id, {
        id: category.id,
        name: category.name,
        path: category.path || [category.name],
      });
    }
    return Array.from(merged.values()).sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / "), "sr"));
  }, [catalogCategories, categoryRegistry]);
  const landingProductMap = useMemo(() => {
    const map = new Map<number, CatalogProduct>();
    for (const item of [...landingProductResults, ...items]) {
      if (!map.has(item.legacyId)) map.set(item.legacyId, item);
    }
    return map;
  }, [items, landingProductResults]);
  const landingSectionSummaries = useMemo(
    () =>
      landingSectionConfig.map((section) => ({
        ...section,
        ids: landingSettings[section.key],
        names: landingSettings[section.key]
          .map((id) => landingProductMap.get(id)?.name || `#${id}`)
          .slice(0, 3),
      })),
    [landingProductMap, landingSettings],
  );

  const landingGridOrderEntries = useMemo(
    () => getOrderedGridEntries(landingSettings.productSections, landingSettings.customSections),
    [landingSettings.customSections, landingSettings.productSections],
  );

  const gridPositionByBuiltInKey = useMemo(() => {
    const map = new Map<LandingProductSectionKey, number>();
    landingGridOrderEntries.forEach((entry, index) => {
      if (entry.kind === "builtin") map.set(entry.key, index + 1);
    });
    return map;
  }, [landingGridOrderEntries]);

  const productSectionByKey = useMemo(() => {
    const map = new Map<LandingProductSectionKey, LandingProductSectionState>();
    for (const row of normalizeLandingProductSections(landingSettings.productSections)) {
      map.set(row.key, row);
    }
    return map;
  }, [landingSettings.productSections]);
  const productPageStats = useMemo(() => {
    const needsImage = items.filter((item) => !item.images?.length || item.rawPayload?.imageFallback).length;
    const directMedia = items.filter((item) => item.hasDirectMedia).length;
    const needsDescription = items.filter((item) => !item.description?.trim()).length;
    const hidden = items.filter((item) => !item.isActive || !item.isExported).length;
    const withVideo = items.filter((item) => Boolean(item.videoUrl)).length;
    const moffice = items.filter(isMofficeProduct).length;
    const mofficeHidden = items.filter((item) => isMofficeProduct(item) && (!item.isActive || !item.isExported)).length;
    const manualPrice = items.filter(hasManualPriceOverride).length;
    const readyToPublish = items.filter(
      (item) =>
        isMofficeProduct(item) &&
        item.images?.length &&
        !item.rawPayload?.imageFallback &&
        item.description?.trim() &&
        item.categories?.length &&
        item.priceFinalGross > 0 &&
        (!item.isActive || !item.isExported),
    ).length;
    return { needsImage, directMedia, needsDescription, hidden, withVideo, moffice, mofficeHidden, manualPrice, readyToPublish };
  }, [items]);

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(normalizeTab(params.get("tab")));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (tab === "products") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const updateDraft = (legacyId: number, patch: Partial<ProductDraft>) => {
    setDrafts((prev) => {
      const current = prev[legacyId];
      if (!current) return prev;
      return { ...prev, [legacyId]: { ...current, ...patch } };
    });
  };

  const updateSalePricingDraft = (item: CatalogProduct, field: "priceFinalGross" | "rebatePercent", value: string) => {
    if (field === "rebatePercent") {
      const rebate = toNumberOrNull(value);
      if (rebate == null) {
        updateDraft(item.legacyId, { rebatePercent: value });
        return;
      }
      const nextFinal = computeSalePriceFromRebate(item.priceGross, rebate);
      updateDraft(item.legacyId, {
        rebatePercent: toInputNumber(clampPercent(rebate)),
        priceFinalGross: toInputNumber(nextFinal),
      });
      return;
    }

    const finalPrice = toNumberOrNull(value);
    if (finalPrice == null) {
      updateDraft(item.legacyId, { priceFinalGross: value });
      return;
    }
    const safeFinal = Math.max(0, finalPrice);
    const nextRebate = computeRebateFromSalePrice(item.priceGross, safeFinal);
    updateDraft(item.legacyId, {
      priceFinalGross: toInputNumber(safeFinal),
      rebatePercent: toInputNumber(nextRebate),
    });
  };

  const loadProducts = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (inStock) params.set("inStock", "1");
      if (activeOnly) params.set("activeOnly", "1");
      if (exportOnly) params.set("exportOnly", "1");
      if (onSaleOnly) params.set("onSaleOnly", "1");
      if (mediaStatus !== "all") params.set("mediaStatus", mediaStatus);
      if (contentStatus !== "all") params.set("contentStatus", contentStatus);
      if (visibilityStatus !== "all") params.set("visibilityStatus", visibilityStatus);
      if (sourceStatus !== "all") params.set("sourceStatus", sourceStatus);
      if (sort !== "featured") params.set("sort", sort);

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load failed");
        return;
      }

      const nextItems = (json.data || []) as CatalogProduct[];
      setItems(nextItems);
      setCatalogCategories((json.categories || []) as CatalogCategory[]);
      setPagination((json.pagination || pagination) as Pagination);
      setSelected({});
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of nextItems) next[item.legacyId] = toDraft(item);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryRegistry = async () => {
    try {
      const res = await fetch("/api/admin/webshop/categories");
      const json = await res.json();
      if (!json?.success) return;
      setCategoryRegistry(
        ((json.data || []) as Array<{ id: number; name: string; path: string[] }>).map((item) => ({
          id: item.id,
          name: item.name,
          path: item.path || [item.name],
        })),
      );
    } catch {
      // Best-effort helper data for category dropdowns.
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "120");
      if (saleQ.trim()) params.set("q", saleQ.trim());
      if (saleOnSaleOnly) params.set("onSaleOnly", "1");

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load failed");
        return;
      }

      const rows = (json.data || []) as CatalogProduct[];
      setSaleItems(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of rows) next[item.legacyId] = toDraft(item);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoadingSales(false);
    }
  };

  const loadPromotionRules = async () => {
    setLoadingPromotionRules(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/rules");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load promotion rules failed");
        return;
      }
      setPromotionRules((json.data || []) as PromotionRule[]);
    } catch (e: any) {
      setError(e?.message || "Load promotion rules failed");
    } finally {
      setLoadingPromotionRules(false);
    }
  };

  const createPromotion = async () => {
    const name = promotionDraft.name.trim();
    const discountValue = toNumberOrNull(promotionDraft.discountValue);
    if (!name || discountValue == null) {
      setError("Unesi naziv pravila i vrednost popusta.");
      return;
    }

    const payload = {
      name,
      isActive: promotionDraft.isActive,
      scopeType: promotionDraft.scopeType,
      scopeValues: parseScopeValuesText(promotionDraft.scopeType, promotionDraft.scopeValuesText),
      discountType: promotionDraft.discountType,
      discountValue,
      priority: toNumberOrNull(promotionDraft.priority) ?? 0,
      startAt: toIsoFromLocal(promotionDraft.startAt),
      endAt: toIsoFromLocal(promotionDraft.endAt),
    };

    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Create promotion rule failed");
        return;
      }
      setPromotionDraft(defaultPromotionDraft);
      setNotice("Promo pravilo je kreirano.");
      await loadPromotionRules();
    } catch (e: any) {
      setError(e?.message || "Create promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const patchPromotionRule = async (ruleId: string, patch: Record<string, unknown>, successMessage: string) => {
    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/webshop/promotions/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Patch promotion rule failed");
        return;
      }
      setNotice(successMessage);
      await loadPromotionRules();
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Patch promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const removePromotionRule = async (ruleId: string) => {
    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/webshop/promotions/rules/${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Delete promotion rule failed");
        return;
      }
      setNotice("Promo pravilo je obrisano.");
      await loadPromotionRules();
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Delete promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const recomputePromotions = async () => {
    setRecomputingPromotions(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/recompute", {
        method: "POST",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Recompute failed");
        return;
      }
      setNotice(`Primena izracunata. Aktivnih pravila: ${json.activeRules || 0}, pogodjeno proizvoda: ${json.impactedProducts || 0}.`);
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Recompute failed");
    } finally {
      setRecomputingPromotions(false);
    }
  };

  const loadLanding = async () => {
    setLoadingLanding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings");
      const json = await res.json();
      if (!json?.success || !json?.settings) {
        setError(json?.message || "Load failed");
        return;
      }
      const loaded = { ...defaultLandingSettings, ...(json.settings as LandingSettings) };
      setLandingSettings({
        ...loaded,
        productSections: normalizeLandingProductSections(loaded.productSections),
        customSections: normalizeLandingCustomSections(loaded.customSections),
        productSectionContent: normalizeLandingProductSectionContent(loaded.productSectionContent),
        documents: normalizeLandingDocuments(loaded.documents),
        uniformsImages: normalizeLandingUniformImages(loaded.uniformsImages),
        uniformsVideos: normalizeLandingUniformVideos(loaded.uniformsVideos),
        storyCards: normalizeLandingStoryCards(loaded.storyCards),
        aboutParagraphs: normalizeStringList(loaded.aboutParagraphs, defaultLandingSettings.aboutParagraphs, 6),
        contactPoints: normalizeLandingContactPoints(loaded.contactPoints, 8),
        heroStripProductIds: normalizeLegacyIdList(loaded.heroStripProductIds, limitForLandingSection("heroStripProductIds")),
        highlightedProductIds: normalizeLegacyIdList(loaded.highlightedProductIds, limitForLandingSection("highlightedProductIds")),
        popularProductIds: normalizeLegacyIdList(loaded.popularProductIds, limitForLandingSection("popularProductIds")),
        arrivalsProductIds: normalizeLegacyIdList(loaded.arrivalsProductIds, limitForLandingSection("arrivalsProductIds")),
        saleProductIds: normalizeLegacyIdList(loaded.saleProductIds, limitForLandingSection("saleProductIds")),
        trendingProductIds: normalizeLegacyIdList(loaded.trendingProductIds, limitForLandingSection("trendingProductIds")),
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoadingLanding(false);
    }
  };

  const loadLandingProducts = async (queryValue = landingProductQuery) => {
    setLandingProductsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "60");
      params.set("activeOnly", "1");
      params.set("exportOnly", "1");
      params.set("requireDirectImages", "1");
      params.set("requireReachableImages", "1");
      const qValue = queryValue.trim();
      if (qValue) params.set("q", qValue);

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) return;
      setLandingProductResults((json.data || []) as CatalogProduct[]);
    } catch {
      // Intentionally silent to avoid blocking landing form edits.
    } finally {
      setLandingProductsLoading(false);
    }
  };

  const limitForLandingSection = (key: LandingProductSectionKey) =>
    landingSectionConfig.find((section) => section.key === key)?.limit ?? 24;

  const moveLandingGridSection = (entry: LandingGridOrderRef, direction: -1 | 1) => {
    setLandingSettings((prev) => {
      const ordered = getOrderedGridEntries(prev.productSections, prev.customSections);
      const currentIndex = ordered.findIndex((candidate) =>
        entry.kind === "builtin" && candidate.kind === "builtin"
          ? candidate.key === entry.key
          : entry.kind === "custom" && candidate.kind === "custom"
            ? candidate.id === entry.id
            : false,
      );
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return prev;
      const reordered = [...ordered];
      const [picked] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, picked);
      return {
        ...prev,
        ...applyGridOrderToSections(prev.productSections, prev.customSections, reordered),
      };
    });
  };

  const setWebshopSectionLayout = (key: LandingProductSectionKey, layout: LandingProductLayout) => {
    setLandingSettings((prev) => ({
      ...prev,
      productSections: normalizeLandingProductSections(
        prev.productSections.map((section) => (section.key === key ? { ...section, layout } : section)),
      ),
    }));
  };

  const replaceLandingSectionIds = (key: LandingProductSectionKey, nextIds: unknown) => {
    const limit = limitForLandingSection(key);
    const normalized = normalizeLegacyIdList(nextIds, limit);
    setLandingSettings((prev) => ({ ...prev, [key]: normalized }));
  };

  const moveLandingSectionId = (key: LandingProductSectionKey, from: number, to: number) => {
    if (from < 0 || to < 0) return;
    setLandingSettings((prev) => {
      const current = [...prev[key]];
      if (from >= current.length || to >= current.length) return prev;
      const [picked] = current.splice(from, 1);
      current.splice(to, 0, picked);
      return { ...prev, [key]: current };
    });
  };

  const removeLandingSectionId = (key: LandingProductSectionKey, id: number) => {
    setLandingSettings((prev) => ({ ...prev, [key]: prev[key].filter((value) => value !== id) }));
  };

  const addLandingSectionId = (key: LandingProductSectionKey, idValue: string) => {
    const id = Number(idValue);
    if (!Number.isFinite(id) || id <= 0) return;
    const limit = limitForLandingSection(key);
    setLandingSettings((prev) => {
      const current = prev[key];
      if (current.includes(id) || current.length >= limit) return prev;
      return { ...prev, [key]: [...current, id] };
    });
    setLandingPickerValues((prev) => ({ ...prev, [key]: "" }));
  };

  const updateLandingDocument = (index: number, patch: Partial<LandingDocument>) => {
    setLandingSettings((prev) => ({
      ...prev,
      documents: prev.documents.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addLandingDocument = () => {
    setLandingSettings((prev) => ({
      ...prev,
      documents: [...prev.documents, { title: "", description: "", url: "" }],
    }));
  };

  const removeLandingDocument = (index: number) => {
    setLandingSettings((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateLandingUniformImage = (index: number, patch: Partial<LandingUniformImage>) => {
    setLandingSettings((prev) => ({
      ...prev,
      uniformsImages: prev.uniformsImages.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeLandingUniformImage = (index: number) => {
    setLandingSettings((prev) => ({
      ...prev,
      uniformsImages: prev.uniformsImages.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateLandingUniformVideo = (index: number, patch: Partial<LandingUniformVideo>) => {
    setLandingSettings((prev) => ({
      ...prev,
      uniformsVideos: prev.uniformsVideos.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeLandingUniformVideo = (index: number) => {
    setLandingSettings((prev) => ({
      ...prev,
      uniformsVideos: prev.uniformsVideos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateStoryCard = (index: number, patch: Partial<LandingStoryCard>) => {
    setLandingSettings((prev) => ({
      ...prev,
      storyCards: prev.storyCards.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addStoryCard = () => {
    setLandingSettings((prev) => ({
      ...prev,
      storyCards: [
        ...prev.storyCards,
        {
          id: `story-${Date.now()}`,
          badge: "",
          title: "",
          copy: "",
          image: "/img/hero.jpg",
          ctaLabel: "",
          ctaHref: "/web-shop",
        },
      ],
    }));
  };

  const removeStoryCard = (index: number) => {
    setLandingSettings((prev) => ({
      ...prev,
      storyCards: prev.storyCards.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateProductSectionContent = (key: LandingProductSectionKey, patch: Partial<LandingProductSectionContent>) => {
    setLandingSettings((prev) => ({
      ...prev,
      productSectionContent: normalizeLandingProductSectionContent(
        prev.productSectionContent.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      ),
    }));
  };

  const uploadSiteAssets = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (!list.length) return [] as string[];

    const fd = new FormData();
    for (const file of list) fd.append("files", file);

    const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: fd });
    const json = await res.json();
    if (!json?.success) {
      throw new Error(json?.message || "Upload failed");
    }

    return Array.isArray(json.urls) ? (json.urls as string[]) : [];
  };

  const uploadShopHeroImage = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("shopHero");
    setError(null);
    setNotice(null);
    try {
      const [url] = await uploadSiteAssets(files);
      if (!url) throw new Error("Upload nije vratio URL.");
      const patch: Partial<LandingSettings> = { shopHeroImage: url };
      setLandingSettings((prev) => ({ ...prev, ...patch }));
      await saveLanding(patch, "Web shop hero slika sacuvana.");
    } catch (e: any) {
      setError(e?.message || "Upload hero slike nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadLandingDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("documents");
    setError(null);
    setNotice(null);
    try {
      const urls = await uploadSiteAssets(files);
      if (!urls.length) throw new Error("Upload nije vratio URL.");
      const nextDocs = urls.map((url, index) => ({
        title: humanizeAssetName(files[index]?.name || `Dokument ${index + 1}`),
        description: "",
        url,
      }));
      setLandingSettings((prev) => ({ ...prev, documents: [...prev.documents, ...nextDocs] }));
      setNotice(`${urls.length} dokument(a) uploadovano. Sacuvaj landing da ostanu na sajtu.`);
    } catch (e: any) {
      setError(e?.message || "Upload dokumenata nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadUniformImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("uniforms");
    setError(null);
    setNotice(null);
    try {
      const urls = await uploadSiteAssets(files);
      if (!urls.length) throw new Error("Upload nije vratio URL.");
      const nextItems = urls.map((url, index) => ({
        title: humanizeAssetName(files[index]?.name || `Uniforma ${index + 1}`),
        image: url,
        alt: humanizeAssetName(files[index]?.name || `Uniforma ${index + 1}`),
      }));
      setLandingSettings((prev) => ({ ...prev, uniformsImages: [...prev.uniformsImages, ...nextItems] }));
      setNotice(`${urls.length} fotografija uniformi uploadovano. Sacuvaj landing da ostanu na sajtu.`);
    } catch (e: any) {
      setError(e?.message || "Upload fotografija uniformi nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadUniformVideos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("uniforms");
    setError(null);
    setNotice(null);
    try {
      const urls = await uploadSiteAssets(files);
      if (!urls.length) throw new Error("Upload nije vratio URL.");
      const nextItems = urls.map((url, index) => ({
        title: humanizeAssetName(files[index]?.name || `Uniform video ${index + 1}`),
        video: url,
        poster: "",
        alt: humanizeAssetName(files[index]?.name || `Uniform video ${index + 1}`),
      }));
      setLandingSettings((prev) => ({ ...prev, uniformsVideos: [...prev.uniformsVideos, ...nextItems] }));
      setNotice(`${urls.length} video klip(a) uniformi uploadovano. Sacuvaj landing da ostanu na sajtu.`);
    } catch (e: any) {
      setError(e?.message || "Upload video klipova uniformi nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadCreateVideo = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("productVideo");
    setError(null);
    setNotice(null);
    try {
      const [url] = await uploadSiteAssets(files);
      if (!url) throw new Error("Upload nije vratio URL.");
      setCreateDraft((prev) => ({ ...prev, videoUrl: url }));
      setNotice("Video za proizvod je uploadovan.");
    } catch (e: any) {
      setError(e?.message || "Upload product videa nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadEditorVideo = async (legacyId: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("productVideo");
    setError(null);
    setNotice(null);
    try {
      const [url] = await uploadSiteAssets(files);
      if (!url) throw new Error("Upload nije vratio URL.");
      updateDraft(legacyId, { videoUrl: url });
      setNotice(`Video za artikal #${legacyId} je uploadovan. Klikni Sacuvaj.`);
    } catch (e: any) {
      setError(e?.message || "Upload product videa nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  const uploadStoryCardImage = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingAssetKind("storyCard");
    setError(null);
    setNotice(null);
    try {
      const [url] = await uploadSiteAssets(files);
      if (!url) throw new Error("Upload nije vratio URL.");
      setLandingSettings((prev) => ({
        ...prev,
        storyCards: prev.storyCards.map((item, itemIndex) => (itemIndex === index ? { ...item, image: url } : item)),
      }));
      setNotice("Story slika uploadovana. Sacuvaj landing da ostane na sajtu.");
    } catch (e: any) {
      setError(e?.message || "Upload story slike nije uspeo.");
    } finally {
      setUploadingAssetKind(null);
    }
  };

  useEffect(() => {
    void loadProducts(1);
    void loadCategoryRegistry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "landing") {
      void loadLanding();
    }
    if (activeTab === "akcije") {
      void loadSales();
      void loadPromotionRules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "landing") return;
    const handle = window.setTimeout(() => {
      void loadLandingProducts(landingProductQuery);
    }, 380);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, landingProductQuery]);

  const saveProduct = async (legacyId: number) => {
    const draft = drafts[legacyId];
    if (!draft) return;

    setSavingId(legacyId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legacyId,
          name: draft.name,
          brand: draft.brand || null,
          description: draft.description.trim() || null,
          specification: draft.specification.trim() || null,
          priceGross: toNumberOrNull(draft.priceGross),
          priceFinalGross: toNumberOrNull(draft.priceFinalGross),
          rebatePercent: toNumberOrNull(draft.rebatePercent),
          stockWarehouse1: toNumberOrNull(draft.stockWarehouse1),
          stockTotal: toNumberOrNull(draft.stockTotal),
          isActive: draft.isActive,
          isExported: draft.isExported,
          landingFeatured: draft.landingFeatured,
          landingPriority: draft.landingPriority.trim() ? toNumberOrNull(draft.landingPriority) : null,
          videoUrl: draft.videoUrl.trim() || null,
          images: draft.images,
          coverImage: draft.coverImage || draft.images[0] || null,
          businessUniform: draft.businessUniform,
          priceOverride: draft.priceOverride,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Save failed");
        return;
      }
      setNotice(`Sacuvano #${legacyId}`);
      if (activeTab === "akcije") await loadSales();
      else await loadProducts(pagination.page);
    } finally {
      setSavingId(null);
    }
  };

  const createProduct = async () => {
    if (!createDraft.sku.trim() || !createDraft.name.trim()) {
      setError("SKU i naziv su obavezni.");
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const category = categories.find((c) => String(c.id) === createDraft.categoryId);
      const res = await fetch("/api/admin/webshop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          product: {
            sku: createDraft.sku,
            name: createDraft.name,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            categoryPath: category?.path ?? null,
            brand: createDraft.brand || null,
            description: createDraft.description.trim() || null,
            specification: createDraft.specification.trim() || null,
            priceGross: toNumberOrNull(createDraft.priceGross) ?? 0,
            priceFinalGross: toNumberOrNull(createDraft.priceFinalGross) ?? 0,
            rebatePercent: toNumberOrNull(createDraft.rebatePercent) ?? 0,
            taxPercent: toNumberOrNull(createDraft.taxPercent) ?? 20,
            stockWarehouse1: toNumberOrNull(createDraft.stockWarehouse1) ?? 0,
            stockTotal: toNumberOrNull(createDraft.stockTotal) ?? 0,
            coverImage: createImages[0] || null,
            images: createImages,
            videoUrl: createDraft.videoUrl.trim() || null,
            businessUniform: createDraft.businessUniform,
            isActive: createDraft.isActive,
            isExported: createDraft.isExported,
            landingFeatured: createDraft.landingFeatured,
            landingPriority: createDraft.landingPriority.trim() ? toNumberOrNull(createDraft.landingPriority) : null,
          },
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Create failed");
        return;
      }
      setNotice(`Kreiran #${json.legacyId}`);
      setCreateDraft(defaultCreateDraft);
      setCreateImages([]);
      await loadProducts(1);
    } finally {
      setCreating(false);
    }
  };

  const uploadCreateImages = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    setUploadingImages(true);
    setError(null);
    setNotice(null);

    try {
      const fd = new FormData();
      for (const file of list) fd.append("files", file);
      const res = await fetch("/api/admin/webshop/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Image upload failed");
        return;
      }
      const urls = Array.isArray(json.urls) ? (json.urls as string[]) : [];
      if (!urls.length) {
        setError("Upload nije vratio URL.");
        return;
      }
      setCreateImages((prev) => [...prev, ...urls.filter((url) => !prev.includes(url))]);
      setNotice(`${urls.length} slika uploadovano.`);
    } catch (e: any) {
      setError(e?.message || "Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadEditorImages = async (legacyId: number, files: FileList | null) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    setUploadingEditorImages(legacyId);
    setError(null);
    setNotice(null);

    try {
      const fd = new FormData();
      for (const file of list) fd.append("files", file);
      const res = await fetch("/api/admin/webshop/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Image upload failed");
        return;
      }
      const urls = Array.isArray(json.urls) ? (json.urls as string[]) : [];
      if (!urls.length) {
        setError("Upload nije vratio URL.");
        return;
      }
      setDrafts((prev) => {
        const current = prev[legacyId];
        if (!current) return prev;
        const images = Array.from(new Set([...current.images, ...urls].filter(Boolean)));
        return {
          ...prev,
          [legacyId]: {
            ...current,
            images,
            coverImage: current.coverImage || images[0] || "",
          },
        };
      });
      setNotice(`${urls.length} slika uploadovano za artikal #${legacyId}. Klikni Sacuvaj.`);
    } catch (e: any) {
      setError(e?.message || "Image upload failed");
    } finally {
      setUploadingEditorImages(null);
    }
  };

  const setEditorCoverImage = (legacyId: number, url: string) => {
    updateDraft(legacyId, { coverImage: url });
  };

  const removeEditorImage = (legacyId: number, url: string) => {
    setDrafts((prev) => {
      const current = prev[legacyId];
      if (!current) return prev;
      const images = current.images.filter((imageUrl) => imageUrl !== url);
      const coverImage = current.coverImage === url ? images[0] || "" : current.coverImage;
      return { ...prev, [legacyId]: { ...current, images, coverImage } };
    });
  };

  const applyBulk = async () => {
    if (!selectedIds.length) {
      setError("Selektuj proizvode.");
      return;
    }

    const priceDelta = toNumberOrNull(bulkPriceDelta);
    const stockDelta = toNumberOrNull(bulkStockDelta);
    const rebate = toNumberOrNull(bulkRebate);

    const updates = selectedIds.map((legacyId) => {
      const row = items.find((item) => item.legacyId === legacyId);
      if (!row) return { legacyId };
      const update: Record<string, unknown> = { legacyId };
      if (bulkActive !== "") update.isActive = bulkActive === "1";
      if (bulkExported !== "") update.isExported = bulkExported === "1";
      if (priceDelta != null) update.priceFinalGross = Math.max(0, Number((row.priceFinalGross * (1 + priceDelta / 100)).toFixed(2)));
      if (rebate != null) {
        const safeRebate = Math.max(0, Math.min(100, rebate));
        update.rebatePercent = safeRebate;
        update.priceFinalGross = Math.max(0, Number((row.priceGross * (1 - safeRebate / 100)).toFixed(2)));
      }
      if (stockDelta != null) {
        update.stockWarehouse1 = Math.max(0, Number((row.stockWarehouse1 + stockDelta).toFixed(3)));
        update.stockTotal = Math.max(0, Number((row.stockTotal + stockDelta).toFixed(3)));
      }
      return update;
    });

    setBulkSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk", updates }),
      });
      const json = await res.json();
      if (!json?.success && !json?.partial) {
        setError(json?.message || "Bulk failed");
        return;
      }
      setNotice("Bulk izmena sacuvana.");
      setBulkRebate("");
      setBulkPriceDelta("");
      setBulkStockDelta("");
      setBulkActive("");
      setBulkExported("");
      await loadProducts(pagination.page);
    } finally {
      setBulkSaving(false);
    }
  };

  const saveLanding = async (patch?: Partial<LandingSettings>, successMessage = "Landing settings sacuvan.") => {
    const payload = patch ? { ...landingSettings, ...patch } : landingSettings;
    setSavingLanding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Save failed");
        return;
      }
      const nextSettings = { ...(json.settings || payload) } as LandingSettings;
      setLandingSettings((prev) => ({
        ...prev,
        ...nextSettings,
        productSections: normalizeLandingProductSections(nextSettings.productSections ?? prev.productSections),
        customSections: normalizeLandingCustomSections(nextSettings.customSections ?? prev.customSections),
        productSectionContent: normalizeLandingProductSectionContent(nextSettings.productSectionContent ?? prev.productSectionContent),
        documents: normalizeLandingDocuments(nextSettings.documents ?? prev.documents),
        uniformsImages: normalizeLandingUniformImages(nextSettings.uniformsImages ?? prev.uniformsImages),
        uniformsVideos: normalizeLandingUniformVideos(nextSettings.uniformsVideos ?? prev.uniformsVideos),
        storyCards: normalizeLandingStoryCards(nextSettings.storyCards ?? prev.storyCards),
        aboutParagraphs: normalizeStringList(nextSettings.aboutParagraphs ?? prev.aboutParagraphs, prev.aboutParagraphs, 6),
        contactPoints: normalizeLandingContactPoints(nextSettings.contactPoints ?? prev.contactPoints, 8),
      }));
      setNotice(successMessage);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSavingLanding(false);
    }
  };

  const uploadBannerImage = async (side: "left" | "right", files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploadingBanner(side);
    setError(null);
    setNotice(null);

    try {
      const fd = new FormData();
      fd.append("files", file);
      const uploadRes = await fetch("/api/admin/webshop/media", {
        method: "POST",
        body: fd,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson?.success) {
        setError(uploadJson?.message || "Upload failed");
        return;
      }
      const url = Array.isArray(uploadJson.urls) ? String(uploadJson.urls[0] || "") : "";
      if (!url) {
        setError("Upload nije vratio URL.");
        return;
      }

      const patch: Partial<LandingSettings> = side === "left" ? { bannerLeftImage: url } : { bannerRightImage: url };

      setLandingSettings((prev) => ({ ...prev, ...patch }));
      await saveLanding(patch, side === "left" ? "Levi banner sacuvan." : "Desni banner sacuvan.");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploadingBanner(null);
    }
  };

  const currentEditorItem = items.find((item) => item.legacyId === editorId) || null;
  const currentSaleEditorItem = saleItems.find((item) => item.legacyId === saleEditorId) || null;

  const renderProductCatalogCard = (item: CatalogProduct) => {
    const draft = drafts[item.legacyId];
    return (
      <article key={item.legacyId} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-3">
          <Image src={cardImage(item)} alt={item.name} width={96} height={96} className="h-24 w-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              #{item.legacyId} / {item.sku}
            </p>
            <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</h3>
            <p className="mt-1 text-xs text-slate-600">{item.categories[0]?.path.join(" / ") || "Bez kategorije"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-slate-200 px-2 py-1">{formatRsd(item.priceFinalGross)}</span>
              <span className="rounded-full border border-slate-200 px-2 py-1">Lager {item.stockWarehouse1}</span>
              <span className={`rounded-full border px-2 py-1 ${isMofficeProduct(item) ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                {isMofficeProduct(item) ? "mOffice sync" : "Rucni unos"}
              </span>
              {hasManualPriceOverride(item) ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">Rucna cena</span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {productQualityFlags(item).slice(0, 4).map((flag) => (
                <span key={`${item.legacyId}-${flag.label}`} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${flagClass(flag.tone)}`}>
                  {flag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setEditorId(item.legacyId)}
            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700"
          >
            Izmeni
          </button>
          <label className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                void uploadEditorImages(item.legacyId, e.target.files);
                e.currentTarget.value = "";
              }}
            />
            {uploadingEditorImages === item.legacyId ? "Upload..." : "Slike"}
          </label>
          <button
            type="button"
            onClick={() => saveProduct(item.legacyId)}
            disabled={savingId === item.legacyId || !draft}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700"
          >
            {savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}
          </button>
          <Link
            href={`/web-shop/${item.legacyId}`}
            target="_blank"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700"
          >
            Pregled
          </Link>
        </div>
        {isMofficeProduct(item) ? (
          <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={Boolean(draft?.priceOverride)}
              onChange={(e) => updateDraft(item.legacyId, { priceOverride: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <strong>Pregazi mOffice cenu.</strong> Sync i dalje menja lager, ali cena ostaje rucno uneta.
            </span>
          </label>
        ) : null}
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left md:hidden"
          onClick={() => setHubIntroOpen((v) => !v)}
          aria-expanded={hubIntroOpen}
        >
          <span className="text-sm font-semibold text-slate-900">Web Shop Hub — uputstvo</span>
          <span className="text-slate-500" aria-hidden>
            {hubIntroOpen ? "▲" : "▼"}
          </span>
        </button>
        <div className={hubIntroOpen ? "mt-3 block" : "hidden md:block"}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Web Shop Hub</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">Jasan tok za proizvode, akcije i pocetnu</h1>
          <p className="mt-1 text-sm text-slate-600">
            Proizvod se uredjuje u `Proizvodi i lager`, akcija u `Akcije i snizenja`, a pocetna strana samo u `Pocetna i sekcije`.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr,1fr]">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 md:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Brzi vodic</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {workflowCards.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => changeTab(card.tab)}
                    className="rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-left md:px-4 md:py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pomoc i dokumentacija</p>
              <p className="mt-1 text-sm text-slate-700">
                Ako timu nesto nije jasno oko lagera, Ananas toka, sekcija na pocetnoj ili akcija, otvorite tutorial stranu.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/admin/tutorial" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Otvori tutorial
                </Link>
                <Link href="/admin/integrations" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Integracije / Ananas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => changeTab(tab.key)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.12em]">{tab.label}</p>
                <p className="mt-1 text-xs text-slate-500">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {activeTab === "products" ? (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Kako koristiti - Proizvodi</p>
            <p className="mt-1">
              `Regularna cena` je puna cena proizvoda. `Prodajna cena` je trenutna cena koju kupac vidi.
              `Popust %` je informativni procenat akcije. `Lager magacin 1` i `Ukupan lager` su kolicine.
              Pocetna strana se vise ne podesava ovde, vec samo u tabu `Pocetna i sekcije`.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Treba slika", value: productPageStats.needsImage, tone: "rose" as const },
              { label: "Direktne slike", value: productPageStats.directMedia, tone: "emerald" as const },
              { label: "Treba opis", value: productPageStats.needsDescription, tone: "amber" as const },
              { label: "Sakriveno", value: productPageStats.hidden, tone: "slate" as const },
              { label: "mOffice", value: productPageStats.moffice, tone: "slate" as const },
              { label: "mOffice skriveno", value: productPageStats.mofficeHidden, tone: "amber" as const },
              { label: "Spremno za objavu", value: productPageStats.readyToPublish, tone: "emerald" as const },
              { label: "Rucna cena", value: productPageStats.manualPrice, tone: "amber" as const },
              { label: "Ima video", value: productPageStats.withVideo, tone: "emerald" as const },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl border p-4 ${flagClass(stat.tone)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-xs opacity-75">Na trenutno ucitanoj strani</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Red rada za katalog</p>
                <p className="mt-1 max-w-4xl text-sm">
                  Prvo sredi artikle koji imaju mOffice lager ali nisu spremni za web-shop. Klikni red, zatim `Primeni filtere`.
                </p>
              </div>
              <Link href="/admin/tutorial" className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-800">
                Tutorial za strica
              </Link>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              {[
                {
                  title: "1. Dodaj slike",
                  desc: "mOffice artikli bez svoje slike.",
                  apply: () => {
                    setSourceStatus("moffice");
                    setMediaStatus("broken");
                    setContentStatus("all");
                    setVisibilityStatus("all");
                  },
                },
                {
                  title: "2. Dodaj opis",
                  desc: "Artikli spremni za opis i detalje.",
                  apply: () => {
                    setSourceStatus("moffice");
                    setMediaStatus("all");
                    setContentStatus("missing_description");
                    setVisibilityStatus("all");
                  },
                },
                {
                  title: "3. Objavi spremno",
                  desc: "Sakriveni mOffice artikli za proveru.",
                  apply: () => {
                    setSourceStatus("moffice");
                    setMediaStatus("direct");
                    setContentStatus("all");
                    setVisibilityStatus("hidden");
                  },
                },
                {
                  title: "4. Proveri rucne cene",
                  desc: "Cena ostaje rucna, lager dolazi iz mOffice.",
                  apply: () => {
                    setSourceStatus("moffice");
                    setMediaStatus("all");
                    setContentStatus("all");
                    setVisibilityStatus("all");
                  },
                },
              ].map((step) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={step.apply}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-left transition hover:border-blue-300"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-900">{step.title}</p>
                  <p className="mt-1 text-xs text-blue-900/75">{step.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="mb-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dodavanje proizvoda</p>
                <p className="mt-1 text-xs text-slate-500">Za rucne artikle i nove slike/video. Pregled lagera ostaje ispod u listi proizvoda.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin/categories" className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Upravljaj kategorijama
                </Link>
                <button
                  type="button"
                  onClick={() => setCreatePanelOpen((open) => !open)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  {createPanelOpen ? "Sakrij unos" : "Dodaj proizvod"}
                </button>
              </div>
            </div>
            {createPanelOpen ? (
              <>
                <div className="grid gap-3 md:grid-cols-6">
              <input value={createDraft.sku} onChange={(e) => setCreateDraft((p) => ({ ...p, sku: e.target.value }))} placeholder="SKU*" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.name} onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Naziv proizvoda*" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <textarea value={createDraft.description} onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Opis proizvoda za web shop" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <textarea value={createDraft.specification} onChange={(e) => setCreateDraft((p) => ({ ...p, specification: e.target.value }))} rows={3} placeholder="Specifikacija, materijal, dimenzije..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <select value={createDraft.categoryId} onChange={(e) => setCreateDraft((p) => ({ ...p, categoryId: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Bez kategorije</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.path.join(" / ")}</option>
                ))}
              </select>
              <input value={createDraft.brand} onChange={(e) => setCreateDraft((p) => ({ ...p, brand: e.target.value }))} placeholder="Brend (opciono)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <label className="text-xs font-medium text-slate-600">
                Regularna cena (RSD)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={createDraft.priceGross}
                  disabled={createDraft.businessUniform}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, priceGross: e.target.value }))}
                  placeholder="npr 12990"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Prodajna cena (RSD)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={createDraft.priceFinalGross}
                  disabled={createDraft.businessUniform}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, priceFinalGross: e.target.value }))}
                  placeholder="npr 10990"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Popust % (0-100)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={createDraft.rebatePercent}
                  disabled={createDraft.businessUniform}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, rebatePercent: e.target.value }))}
                  placeholder="npr 15"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                PDV % (npr 20)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={createDraft.taxPercent}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, taxPercent: e.target.value }))}
                  placeholder="20"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Lager magacin 1
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={createDraft.stockWarehouse1}
                  disabled={createDraft.businessUniform}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, stockWarehouse1: e.target.value }))}
                  placeholder="npr 3"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Ukupan lager
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={createDraft.stockTotal}
                  disabled={createDraft.businessUniform}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, stockTotal: e.target.value }))}
                  placeholder="npr 8"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <div className="rounded-xl border border-slate-200 p-3 md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Slike proizvoda</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    void uploadCreateImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  className="mt-2 block w-full text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-500">Telefon podrzan: galerija i direktno slikanje.</p>
                {uploadingImages ? <p className="mt-2 text-xs text-slate-500">Upload u toku...</p> : null}
                {createImages.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {createImages.map((url, idx) => (
                      <div key={url} className="rounded border border-slate-200 p-1">
                        <Image src={url} alt={`Upload ${idx + 1}`} width={180} height={80} className="h-20 w-full rounded object-cover" />
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCreateImages((prev) => {
                                if (idx === 0) return prev;
                                const next = [...prev];
                                const [picked] = next.splice(idx, 1);
                                next.unshift(picked);
                                return next;
                              })
                            }
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                              idx === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                            }`}
                          >
                            {idx === 0 ? "Cover slika" : "Postavi cover"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateImages((prev) => prev.filter((item) => item !== url))}
                            className="rounded border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            Ukloni
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Video proizvoda (opciono)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={createDraft.videoUrl}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, videoUrl: e.target.value }))}
                    placeholder="URL video klipa ili upload ispod"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <label className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        void uploadCreateVideo(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingAssetKind === "productVideo" ? "Uploading..." : "Upload video"}
                  </label>
                </div>
                {createDraft.videoUrl ? (
                  <div className="mt-3 rounded-xl border border-slate-200 p-2">
                    <video
                      src={createDraft.videoUrl}
                      controls
                      preload="metadata"
                      className="max-h-64 w-full rounded-lg bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateDraft((prev) => ({ ...prev, videoUrl: "" }))}
                      className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                    >
                      Ukloni video
                    </button>
                  </div>
                ) : null}
              </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createDraft.businessUniform}
                  onChange={(e) =>
                    setCreateDraft((p) => ({
                      ...p,
                      businessUniform: e.target.checked,
                      ...(e.target.checked
                        ? {
                            priceGross: "0",
                            priceFinalGross: "0",
                            rebatePercent: "0",
                            stockWarehouse1: "0",
                            stockTotal: "0",
                          }
                        : {}),
                    }))
                  }
                />
                Poslovna uniforma (bez cene i lagera)
              </label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createDraft.isActive} onChange={(e) => setCreateDraft((p) => ({ ...p, isActive: e.target.checked }))} />Aktivan (vidljiv na sajtu)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createDraft.isExported} onChange={(e) => setCreateDraft((p) => ({ ...p, isExported: e.target.checked }))} />Export (sinhronizacija)</label>
              <button onClick={createProduct} disabled={creating} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{creating ? "Kreiranje..." : "Kreiraj proizvod"}</button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                Panel je sklopljen da bi pretraga, filteri i izmene lager artikala bili dostupni odmah na desktopu i telefonu.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pretraga i filteri</p>
                <p className="mt-1 text-xs text-slate-500">Search radi po SKU, EAN, ID, nazivu, brendu i opisu. Enter odmah primenjuje filter.</p>
              </div>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value || 30) }))}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value={24}>24 po strani</option>
                <option value={30}>30 po strani</option>
                <option value={60}>60 po strani</option>
                <option value={120}>120 po strani</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadProducts(1);
                }}
                placeholder="SKU, EAN, ID, naziv, brend..."
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
              />
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Sve kategorije</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.path.join(" / ")}</option>
                ))}
              </select>
              <select value={mediaStatus} onChange={(e) => setMediaStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="all">Sve slike</option>
                <option value="missing">Bez direktne slike</option>
                <option value="direct">Ima direktnu sliku</option>
                <option value="fallback">Pozajmljena/fallback slika</option>
                <option value="broken">Nema validne svoje slike</option>
                <option value="video">Ima video</option>
              </select>
              <select value={contentStatus} onChange={(e) => setContentStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="all">Sav sadrzaj</option>
                <option value="missing_description">Nema opis</option>
                <option value="missing_price">Nema cenu</option>
                <option value="missing_category">Bez kategorije</option>
              </select>
              <select value={visibilityStatus} onChange={(e) => setVisibilityStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="all">Sva vidljivost</option>
                <option value="visible">Vidljivo na sajtu</option>
                <option value="hidden">Sakriveno</option>
              </select>
              <select value={sourceStatus} onChange={(e) => setSourceStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="all">Svi izvori</option>
                <option value="moffice">Moffice/lager</option>
                <option value="manual">Rucni/stari unos</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="featured">Podrazumevano</option>
                <option value="stock_desc">Lager najveci</option>
                <option value="stock_asc">Lager najmanji</option>
                <option value="price_desc">Cena najveca</option>
                <option value="price_asc">Cena najmanja</option>
                <option value="name_asc">Naziv A-Z</option>
                <option value="name_desc">Naziv Z-A</option>
                <option value="newest">Najnoviji ID</option>
                <option value="oldest">Najstariji ID</option>
              </select>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />Na stanju</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />Samo aktivni</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={exportOnly} onChange={(e) => setExportOnly(e.target.checked)} />Samo export</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />Samo akcija</label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => loadProducts(1)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Primeni filtere</button>
              <button onClick={() => loadProducts(pagination.page)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Osvezi</button>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCategoryId("");
                  setInStock(false);
                  setActiveOnly(true);
                  setExportOnly(true);
                  setOnSaleOnly(false);
                  setMediaStatus("all");
                  setContentStatus("all");
                  setVisibilityStatus("all");
                  setSourceStatus("all");
                  setSort("featured");
                }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                Reset filtera
              </button>
              <div className="ml-auto hidden flex-wrap items-center gap-1 lg:flex">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Desktop</span>
                <button
                  type="button"
                  onClick={() => setProductsCatalogView("grid")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                    productsCatalogView === "grid"
                      ? "border border-blue-200 bg-blue-50 text-blue-800"
                      : "border border-slate-200 text-slate-600"
                  }`}
                >
                  Mreža
                </button>
                <button
                  type="button"
                  onClick={() => setProductsCatalogView("table")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                    productsCatalogView === "table"
                      ? "border border-blue-200 bg-blue-50 text-blue-800"
                      : "border border-slate-200 text-slate-600"
                  }`}
                >
                  Tabela
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bulk akcije ({selectedIds.length} selektovano)</p>
            <p className="mb-3 text-xs text-slate-500">`Promena cene %` menja prodajnu cenu za procenat. `Popust %` postavlja akciju. `Promena lagera` dodaje/oduzima kolicinu.</p>
            <div className="grid gap-3 md:grid-cols-6">
              <select value={bulkActive} onChange={(e) => setBulkActive(e.target.value as "" | "1" | "0")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Aktivnost bez promene</option><option value="1">Postavi aktivno</option><option value="0">Postavi neaktivno</option></select>
              <select value={bulkExported} onChange={(e) => setBulkExported(e.target.value as "" | "1" | "0")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Export bez promene</option><option value="1">Ukljuci export</option><option value="0">Iskljuci export</option></select>
              <input value={bulkPriceDelta} onChange={(e) => setBulkPriceDelta(e.target.value)} placeholder="Promena cene %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={bulkRebate} onChange={(e) => setBulkRebate(e.target.value)} placeholder="Akcija %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={bulkStockDelta} onChange={(e) => setBulkStockDelta(e.target.value)} placeholder="Promena lagera" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={applyBulk} disabled={bulkSaving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{bulkSaving ? "Cuvanje..." : "Primeni bulk izmene"}</button>
            </div>
          </div>

          {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}

          <div className="grid gap-3 lg:hidden">{items.map(renderProductCatalogCard)}</div>

          {productsCatalogView === "grid" ? (
            <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">{items.map(renderProductCatalogCard)}</div>
          ) : null}

          <div
            className={`hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block ${productsCatalogView === "table" ? "" : "lg:hidden"}`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-2"><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={(e) => {
                      if (!e.target.checked) return setSelected({});
                      const map: Record<number, boolean> = {};
                      for (const i of items) map[i.legacyId] = true;
                      setSelected(map);
                    }} /></th>
                    <th className="px-2 py-2">Slika</th>
                    <th className="px-2 py-2">ID / SKU</th>
                    <th className="px-2 py-2">Naziv</th>
                    <th className="px-2 py-2">Kategorija</th>
                    <th className="px-2 py-2">Prodajna / Regularna</th>
                    <th className="px-2 py-2">Lager</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const draft = drafts[item.legacyId];
                    return (
                      <tr key={item.legacyId} className="border-b border-slate-100 align-top">
                        <td className="px-2 py-2"><input type="checkbox" checked={Boolean(selected[item.legacyId])} onChange={(e) => setSelected((prev) => ({ ...prev, [item.legacyId]: e.target.checked }))} /></td>
                        <td className="px-2 py-2">
                          <Image
                            src={cardImage(item)}
                            alt={item.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-lg object-cover"
                            unoptimized
                          />
                        </td>
                        <td className="px-2 py-2 text-xs font-mono">#{item.legacyId}<br />{item.sku}</td>
                        <td className="px-2 py-2"><input value={draft?.name || ""} onChange={(e) => updateDraft(item.legacyId, { name: e.target.value })} className="w-64 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2 text-xs">{item.categories[0]?.path.join(" / ") || "-"}</td>
                        <td className="px-2 py-2"><input value={draft?.priceFinalGross || ""} onChange={(e) => updateDraft(item.legacyId, { priceFinalGross: e.target.value })} className="mb-1 w-28 rounded border border-slate-200 px-2 py-1 text-xs" /><input value={draft?.priceGross || ""} onChange={(e) => updateDraft(item.legacyId, { priceGross: e.target.value })} className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><input value={draft?.stockWarehouse1 || ""} onChange={(e) => updateDraft(item.legacyId, { stockWarehouse1: e.target.value })} className="mb-1 w-24 rounded border border-slate-200 px-2 py-1 text-xs" /><input value={draft?.stockTotal || ""} onChange={(e) => updateDraft(item.legacyId, { stockTotal: e.target.value })} className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2 text-xs">
                          <label className="mb-1 flex items-center gap-2"><input type="checkbox" checked={Boolean(draft?.isActive)} onChange={(e) => updateDraft(item.legacyId, { isActive: e.target.checked })} />Aktivan</label>
                          <label className="mb-1 flex items-center gap-2"><input type="checkbox" checked={Boolean(draft?.isExported)} onChange={(e) => updateDraft(item.legacyId, { isExported: e.target.checked })} />Export</label>
                          {isMofficeProduct(item) ? (
                            <label className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                              <input type="checkbox" checked={Boolean(draft?.priceOverride)} onChange={(e) => updateDraft(item.legacyId, { priceOverride: e.target.checked })} />
                              Rucna cena
                            </label>
                          ) : (
                            <span className="mt-2 inline-flex rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-500">Rucni unos</span>
                          )}
                        </td>
                        <td className="px-2 py-2"><div className="flex flex-col gap-1"><button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button><button onClick={() => setEditorId(item.legacyId)} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Otvori editor</button><Link href={`/web-shop/${item.legacyId}`} target="_blank" className="rounded border border-slate-200 px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">Pregled</Link></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs text-slate-500">
              Strana {pagination.page} / {pagination.totalPages} ({pagination.total} ukupno)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadProducts(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1 || loading}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 disabled:opacity-50"
              >
                Prethodna
              </button>
              <button
                type="button"
                onClick={() => loadProducts(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 disabled:opacity-50"
              >
                Sledeca
              </button>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "landing" ? (
        <>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Kako koristiti - Pocetna i sekcije</p>
            <p className="mt-1">
              Ovo je jedino mesto gde se bira koji proizvod ide na pocetnu i u koju sekciju. Proizvode prvo pripremis u
              `Proizvodi i lager`, a zatim ih ovde rasporedis po sekcijama i kliknes `Sacuvaj landing`.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {landingSectionSummaries.map((section) => (
              <a
                key={`summary-${section.key}`}
                href={`#section-${section.key}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{section.description}</p>
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                    {section.ids.length}/{section.limit}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  {section.names.length ? section.names.join(", ") : "Jos nema rucno dodatih proizvoda."}
                </p>
              </a>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900">Redosled grid sekcija (pocetna)</p>
            <p className="mt-1 text-xs text-emerald-900/80">
              Pomeri npr. akcije na vrh. Hero traka (ispod videa) nije u ovoj listi — ona je uvek prva ispod hero bloka. Isti redosled kao na{" "}
              <Link href="/admin/landing" className="font-semibold underline">
                /admin/landing
              </Link>
              .
            </p>
            <ul className="mt-3 space-y-2">
              {landingGridOrderEntries.map((entry, idx) => (
                <li
                  key={entry.kind === "builtin" ? entry.key : entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">
                    {entry.kind === "builtin"
                      ? landingSectionConfig.find((s) => s.key === entry.key)?.label || entry.key
                      : landingSettings.customSections.find((c) => c.id === entry.id)?.title?.trim() || "Custom sekcija"}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => moveLandingGridSection(entry, -1)}
                      disabled={idx === 0}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 disabled:opacity-40"
                    >
                      Gore
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLandingGridSection(entry, 1)}
                      disabled={idx === landingGridOrderEntries.length - 1}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 disabled:opacity-40"
                    >
                      Dole
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {landingGridOrderEntries.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Nema aktivnih grid sekcija za redosled.</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hero</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={landingSettings.heroEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, heroEyebrow: e.target.value }))} placeholder="Eyebrow" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroTitleLine1} onChange={(e) => setLandingSettings((p) => ({ ...p, heroTitleLine1: e.target.value }))} placeholder="Hero line 1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroTitleLine2} onChange={(e) => setLandingSettings((p) => ({ ...p, heroTitleLine2: e.target.value }))} placeholder="Hero line 2" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroPrimaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, heroPrimaryCtaLabel: e.target.value }))} placeholder="Primary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroPrimaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, heroPrimaryCtaHref: e.target.value }))} placeholder="Primary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroSecondaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, heroSecondaryCtaLabel: e.target.value }))} placeholder="Secondary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroSecondaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, heroSecondaryCtaHref: e.target.value }))} placeholder="Secondary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hero video pozadina (upload)</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex gap-2">
                  <input
                    value={landingSettings.heroVideoUrl || ""}
                    onChange={(e) => setLandingSettings((p) => ({ ...p, heroVideoUrl: e.target.value }))}
                    placeholder="URL videa ili upload desno"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 whitespace-nowrap">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        setUploadingAssetKind("productVideo");
                        try {
                          const [url] = await uploadSiteAssets(e.target.files);
                          if (url) setLandingSettings((p) => ({ ...p, heroVideoUrl: url }));
                          e.currentTarget.value = "";
                        } finally {
                          setUploadingAssetKind(null);
                        }
                      }}
                    />
                    {uploadingAssetKind === "productVideo" ? "Uploading..." : "Upload video"}
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    value={landingSettings.heroVideoPosterUrl || ""}
                    onChange={(e) => setLandingSettings((p) => ({ ...p, heroVideoPosterUrl: e.target.value }))}
                    placeholder="Poster slika (thumbnail) - opciono"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <label className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 whitespace-nowrap">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        setUploadingAssetKind("shopHero");
                        try {
                          const [url] = await uploadSiteAssets(e.target.files);
                          if (url) setLandingSettings((p) => ({ ...p, heroVideoPosterUrl: url }));
                          e.currentTarget.value = "";
                        } finally {
                          setUploadingAssetKind(null);
                        }
                      }}
                    />
                    Upload poster
                  </label>
                </div>
              </div>
              {landingSettings.heroVideoUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <video src={landingSettings.heroVideoUrl} controls preload="metadata" className="max-h-36 rounded-xl bg-slate-950" />
                  <button type="button" onClick={() => setLandingSettings((p) => ({ ...p, heroVideoUrl: "" }))} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">Ukloni video</button>
                </div>
              ) : <p className="mt-2 text-xs text-slate-500">Bez custom videa — koristi se YouTube embed.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Naslovi i CTA produkt sekcija</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {landingSettings.productSectionContent
                .filter((section) => section.key !== "heroStripProductIds" && section.key !== "saleProductIds")
                .map((section) => {
                  const meta = landingSectionConfig.find((item) => item.key === section.key);
                  return (
                    <div key={`content-${section.key}`} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{meta?.label || section.key}</p>
                      <div className="mt-3 grid gap-2">
                        <input value={section.title} onChange={(e) => updateProductSectionContent(section.key, { title: e.target.value })} placeholder="Naslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input value={section.subtitle} onChange={(e) => updateProductSectionContent(section.key, { subtitle: e.target.value })} placeholder="Podnaslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input value={section.ctaLabel} onChange={(e) => updateProductSectionContent(section.key, { ctaLabel: e.target.value })} placeholder="CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        <input value={section.ctaHref} onChange={(e) => updateProductSectionContent(section.key, { ctaHref: e.target.value })} placeholder="CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brand story kartice</p>
              <button onClick={addStoryCard} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Dodaj karticu</button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input value={landingSettings.storySectionTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, storySectionTitle: e.target.value }))} placeholder="Naslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.storySectionCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, storySectionCtaLabel: e.target.value }))} placeholder="CTA label sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.storySectionCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, storySectionCtaHref: e.target.value }))} placeholder="CTA href sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 grid gap-4">
              {landingSettings.storyCards.map((card, index) => (
                <div key={card.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div>
                      <Image src={card.image || "/img/hero.jpg"} alt={card.title || `Story ${index + 1}`} width={420} height={320} className="h-40 w-full rounded-lg object-cover" />
                      <label className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            void uploadStoryCardImage(index, e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                        {uploadingAssetKind === "storyCard" ? "Uploading..." : "Upload slike"}
                      </label>
                    </div>
                    <div className="grid gap-2">
                      <input value={card.badge} onChange={(e) => updateStoryCard(index, { badge: e.target.value })} placeholder="Badge" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input value={card.title} onChange={(e) => updateStoryCard(index, { title: e.target.value })} placeholder="Naslov kartice" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <textarea value={card.copy} onChange={(e) => updateStoryCard(index, { copy: e.target.value })} rows={3} placeholder="Tekst kartice" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input value={card.image} onChange={(e) => updateStoryCard(index, { image: e.target.value })} placeholder="URL slike" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input value={card.ctaLabel} onChange={(e) => updateStoryCard(index, { ctaLabel: e.target.value })} placeholder="CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input value={card.ctaHref} onChange={(e) => updateStoryCard(index, { ctaHref: e.target.value })} placeholder="CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <button onClick={() => removeStoryCard(index)} className="justify-self-start rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Ukloni</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Banneri (upload only)</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Levi banner</p>
                <Image src={landingSettings.bannerLeftImage} alt="Levi banner" width={690} height={330} className="mt-2 h-36 w-full rounded-lg object-cover" />
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.bannerLeftTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftTitle: e.target.value }))} placeholder="Title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerLeftButtonLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftButtonLabel: e.target.value }))} placeholder="Button label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerLeftHref} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftHref: e.target.value }))} placeholder="Href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadBannerImage("left", e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingBanner === "left" ? "Uploading..." : "Upload / replace"}
                  </label>
                  <button onClick={() => setLandingSettings((p) => ({ ...p, bannerLeftImage: defaultLandingSettings.bannerLeftImage }))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Reset default</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Desni banner</p>
                <Image src={landingSettings.bannerRightImage} alt="Desni banner" width={690} height={330} className="mt-2 h-36 w-full rounded-lg object-cover" />
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.bannerRightTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightTitle: e.target.value }))} placeholder="Title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerRightButtonLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightButtonLabel: e.target.value }))} placeholder="Button label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerRightHref} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightHref: e.target.value }))} placeholder="Href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadBannerImage("right", e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingBanner === "right" ? "Uploading..." : "Upload / replace"}
                  </label>
                  <button onClick={() => setLandingSettings((p) => ({ ...p, bannerRightImage: defaultLandingSettings.bannerRightImage }))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Reset default</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Web shop hero</p>
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-xl border border-slate-200 p-3">
                <Image src={landingSettings.shopHeroImage} alt="Web shop hero" width={1200} height={420} className="h-40 w-full rounded-lg object-cover" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadShopHeroImage(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingAssetKind === "shopHero" ? "Uploading..." : "Upload / replace"}
                  </label>
                  <button
                    onClick={() => setLandingSettings((p) => ({ ...p, shopHeroImage: defaultLandingSettings.shopHeroImage }))}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
                  >
                    Reset default
                  </button>
                </div>
              </div>
              <div className="grid gap-3">
                <input value={landingSettings.shopHeroEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, shopHeroEyebrow: e.target.value }))} placeholder="Eyebrow" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={landingSettings.shopHeroTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, shopHeroTitle: e.target.value }))} placeholder="Naslov hero sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <textarea value={landingSettings.shopHeroLead} onChange={(e) => setLandingSettings((p) => ({ ...p, shopHeroLead: e.target.value }))} rows={5} placeholder="Lead tekst za web shop stranu" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">About i kontakt sekcija</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">About card</p>
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.aboutEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutEyebrow: e.target.value }))} placeholder="Eyebrow" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.aboutTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutTitle: e.target.value }))} placeholder="Naslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <textarea value={landingSettings.aboutParagraphs.join("\n")} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutParagraphs: normalizeStringList(e.target.value.split("\n"), p.aboutParagraphs, 6) }))} rows={6} placeholder="Jedan pasus po redu" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.aboutPrimaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutPrimaryCtaLabel: e.target.value }))} placeholder="Primary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.aboutPrimaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutPrimaryCtaHref: e.target.value }))} placeholder="Primary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.aboutSecondaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutSecondaryCtaLabel: e.target.value }))} placeholder="Secondary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.aboutSecondaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, aboutSecondaryCtaHref: e.target.value }))} placeholder="Secondary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Kontakt card</p>
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.contactEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, contactEyebrow: e.target.value }))} placeholder="Eyebrow" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.contactTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, contactTitle: e.target.value }))} placeholder="Naslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <textarea value={landingSettings.contactText} onChange={(e) => setLandingSettings((p) => ({ ...p, contactText: e.target.value }))} rows={4} placeholder="Opis kontakta" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <textarea value={landingSettings.contactPoints.map((item) => `${item.label} | ${item.value}`).join("\n")} onChange={(e) => setLandingSettings((p) => ({ ...p, contactPoints: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [label, ...rest] = line.split("|"); return { label: label?.trim() || "", value: rest.join("|").trim() }; }).filter((item) => item.label || item.value).slice(0, 8) }))} rows={5} placeholder="Telefon | +381 ...&#10;Email | prodaja@santos.rs" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.contactPrimaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, contactPrimaryCtaLabel: e.target.value }))} placeholder="Primary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.contactPrimaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, contactPrimaryCtaHref: e.target.value }))} placeholder="Primary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.contactSecondaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, contactSecondaryCtaLabel: e.target.value }))} placeholder="Secondary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.contactSecondaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, contactSecondaryCtaHref: e.target.value }))} placeholder="Secondary CTA href / mailto" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Prava potrosaca i kupovina na pocetnoj</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={landingSettings.customerInfoEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoEyebrow: e.target.value }))} placeholder="Eyebrow sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerInfoTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoTitle: e.target.value }))} placeholder="Naslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.companyPib} onChange={(e) => setLandingSettings((p) => ({ ...p, companyPib: e.target.value }))} placeholder="PIB" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.companyMb} onChange={(e) => setLandingSettings((p) => ({ ...p, companyMb: e.target.value }))} placeholder="MB" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.companyPibLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, companyPibLabel: e.target.value }))} placeholder="Label za PIB" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.companyMbLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, companyMbLabel: e.target.value }))} placeholder="Label za MB" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.companyDetailsEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, companyDetailsEyebrow: e.target.value }))} placeholder="Eyebrow company details" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerRightsTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, customerRightsTitle: e.target.value }))} placeholder="Naslov prava potrosaca" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.purchaseGuideTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, purchaseGuideTitle: e.target.value }))} placeholder="Naslov uputstva za kupovinu" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={landingSettings.customerRightsText} onChange={(e) => setLandingSettings((p) => ({ ...p, customerRightsText: e.target.value }))} rows={6} placeholder="Tekst prava potrosaca" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={landingSettings.purchaseGuideText} onChange={(e) => setLandingSettings((p) => ({ ...p, purchaseGuideText: e.target.value }))} rows={6} placeholder="Tekst uputstva za kupovinu" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerInfoPrimaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoPrimaryCtaLabel: e.target.value }))} placeholder="Primary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerInfoPrimaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoPrimaryCtaHref: e.target.value }))} placeholder="Primary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerInfoSecondaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoSecondaryCtaLabel: e.target.value }))} placeholder="Secondary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.customerInfoSecondaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, customerInfoSecondaryCtaHref: e.target.value }))} placeholder="Secondary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.documentsEmptyText} onChange={(e) => setLandingSettings((p) => ({ ...p, documentsEmptyText: e.target.value }))} placeholder="Tekst kada nema dokumenata" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Blog sekcija</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input value={landingSettings.blogSectionTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, blogSectionTitle: e.target.value }))} placeholder="Naslov blog sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.blogSectionCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, blogSectionCtaLabel: e.target.value }))} placeholder="CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.blogSectionCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, blogSectionCtaHref: e.target.value }))} placeholder="CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dokumenta za preuzimanje</p>
              <div className="flex flex-wrap gap-2">
                <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void uploadLandingDocuments(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploadingAssetKind === "documents" ? "Uploading..." : "Upload dokumenta"}
                </label>
                <button onClick={addLandingDocument} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Dodaj rucno</button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={landingSettings.documentsTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, documentsTitle: e.target.value }))} placeholder="Naslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.documentsSubtitle} onChange={(e) => setLandingSettings((p) => ({ ...p, documentsSubtitle: e.target.value }))} placeholder="Podnaslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 grid gap-3">
              {landingSettings.documents.length === 0 ? <p className="text-xs text-slate-500">Jos nema dodatih dokumenata.</p> : null}
              {landingSettings.documents.map((document, index) => (
                <div key={`document-${index}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input value={document.title} onChange={(e) => updateLandingDocument(index, { title: e.target.value })} placeholder="Naziv dokumenta" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={document.url} onChange={(e) => updateLandingDocument(index, { url: e.target.value })} placeholder="URL dokumenta" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button onClick={() => removeLandingDocument(index)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Ukloni</button>
                  </div>
                  <textarea value={document.description} onChange={(e) => updateLandingDocument(index, { description: e.target.value })} rows={3} placeholder="Opis dokumenta" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Poslovne uniforme</p>
              <div className="flex flex-wrap gap-2">
                <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void uploadUniformImages(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploadingAssetKind === "uniforms" ? "Uploading..." : "Upload fotografije"}
                </label>
                <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void uploadUniformVideos(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploadingAssetKind === "uniforms" ? "Uploading..." : "Upload video"}
                </label>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={landingSettings.uniformsEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, uniformsEyebrow: e.target.value }))} placeholder="Eyebrow sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.uniformsTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, uniformsTitle: e.target.value }))} placeholder="Naslov sekcije" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.uniformsCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, uniformsCtaLabel: e.target.value }))} placeholder="CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.uniformsCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, uniformsCtaHref: e.target.value }))} placeholder="CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={landingSettings.uniformsText} onChange={(e) => setLandingSettings((p) => ({ ...p, uniformsText: e.target.value }))} rows={5} placeholder="Opis poslovnih uniformi" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {landingSettings.uniformsImages.length === 0 ? <p className="text-xs text-slate-500">Jos nema dodatih fotografija uniformi.</p> : null}
              {landingSettings.uniformsImages.map((item, index) => (
                <div key={`uniform-${index}`} className="rounded-xl border border-slate-200 p-3">
                  <Image src={item.image} alt={item.alt || item.title || `Uniforma ${index + 1}`} width={420} height={320} className="h-44 w-full rounded-lg object-cover" />
                  <div className="mt-3 grid gap-2">
                    <input value={item.title} onChange={(e) => updateLandingUniformImage(index, { title: e.target.value })} placeholder="Naziv kartice" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={item.image} onChange={(e) => updateLandingUniformImage(index, { image: e.target.value })} placeholder="URL slike" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={item.alt} onChange={(e) => updateLandingUniformImage(index, { alt: e.target.value })} placeholder="Alt tekst" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button onClick={() => removeLandingUniformImage(index)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Ukloni</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {landingSettings.uniformsVideos.length === 0 ? <p className="text-xs text-slate-500">Jos nema dodatih video klipova uniformi.</p> : null}
              {landingSettings.uniformsVideos.map((item, index) => (
                <div key={`uniform-video-${index}`} className="rounded-xl border border-slate-200 p-3">
                  {item.video ? (
                    <video
                      src={item.video}
                      poster={item.poster || undefined}
                      controls
                      preload="metadata"
                      className="h-44 w-full rounded-lg bg-slate-950 object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                      Video jos nije dodat
                    </div>
                  )}
                  <div className="mt-3 grid gap-2">
                    <input value={item.title} onChange={(e) => updateLandingUniformVideo(index, { title: e.target.value })} placeholder="Naziv video kartice" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={item.video} onChange={(e) => updateLandingUniformVideo(index, { video: e.target.value })} placeholder="URL video klipa" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={item.poster} onChange={(e) => updateLandingUniformVideo(index, { poster: e.target.value })} placeholder="Poster slika (opciono)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input value={item.alt} onChange={(e) => updateLandingUniformVideo(index, { alt: e.target.value })} placeholder="Alt / opis videa" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button onClick={() => removeLandingUniformVideo(index)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Ukloni video</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sale sekcija</p>
            <div className="grid gap-3 md:grid-cols-6">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2">
                <input type="checkbox" checked={landingSettings.showSaleSection} onChange={(e) => setLandingSettings((p) => ({ ...p, showSaleSection: e.target.checked }))} />
                Prikazi akcije sekciju
              </label>
              <input value={landingSettings.saleSectionTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, saleSectionTitle: e.target.value }))} placeholder="Naslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <input value={landingSettings.saleSectionSubtitle} onChange={(e) => setLandingSettings((p) => ({ ...p, saleSectionSubtitle: e.target.value }))} placeholder="Podnaslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            </div>
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Ako je lista `Akcije na pocetnoj` ispod prazna, landing automatski prikazuje prve proizvode koji imaju akcijsku cenu ili popust.
              Ako dodas konkretne ID-jeve u toj listi, oni imaju prioritet i mogu da se prikazu i kada je isti proizvod vec koriscen u drugoj home sekciji.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Raspored proizvoda po sekcijama</p>
              <p className="text-xs text-slate-500">Ako sekcija ostane prazna, home koristi automatski fallback prikaz.</p>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <input
                value={landingProductQuery}
                onChange={(e) => setLandingProductQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void loadLandingProducts(landingProductQuery);
                  }
                }}
                placeholder="Pretraga po SKU / nazivu / ID"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-4"
              />
              <button
                onClick={() => void loadLandingProducts(landingProductQuery)}
                disabled={landingProductsLoading}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                {landingProductsLoading ? "Ucitavanje..." : "Pronadji proizvode"}
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              {landingSectionConfig.map((section) => {
                const sectionIds = landingSettings[section.key];
                const csvValue = sectionIds.join(",");
                const candidates = landingProductResults.filter((item) => !sectionIds.includes(item.legacyId));
                const gridPos = gridPositionByBuiltInKey.get(section.key);
                const layout = productSectionByKey.get(section.key)?.layout ?? "grid";
                return (
                  <div id={`section-${section.key}`} key={section.key} className="rounded-xl border border-slate-200 p-3 scroll-mt-24">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                        <p className="text-xs text-slate-500">{section.description}</p>
                        {gridPos != null ? (
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Grid pozicija: {gridPos} / {landingGridOrderEntries.length}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {sectionIds.length}/{section.limit}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveLandingGridSection({ kind: "builtin", key: section.key }, -1)}
                            disabled={gridPos == null || gridPos <= 1}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700 disabled:opacity-40"
                          >
                            Gore
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLandingGridSection({ kind: "builtin", key: section.key }, 1)}
                            disabled={gridPos == null || gridPos >= landingGridOrderEntries.length}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700 disabled:opacity-40"
                          >
                            Dole
                          </button>
                        </div>
                        <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Prikaz
                          <select
                            value={layout}
                            onChange={(e) => setWebshopSectionLayout(section.key, e.target.value as LandingProductLayout)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold normal-case text-slate-800"
                          >
                            <option value="grid">Mreza</option>
                            <option value="carousel">Karusel</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <input
                        value={csvValue}
                        onChange={(e) => replaceLandingSectionIds(section.key, parseLegacyIdCsv(e.target.value, section.limit))}
                        placeholder="Legacy ID lista: 101,205,333"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                      />
                      <select
                        value={landingPickerValues[section.key]}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLandingPickerValues((prev) => ({ ...prev, [section.key]: value }));
                          if (value) addLandingSectionId(section.key, value);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Dodaj iz pretrage...</option>
                        {candidates.map((item) => (
                          <option key={`${section.key}-${item.legacyId}`} value={item.legacyId}>
                            #{item.legacyId} / {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <AdminLandingProductPickGrid
                      candidates={candidates}
                      onPick={(legacyId) => addLandingSectionId(section.key, String(legacyId))}
                      emptyHint={
                        landingProductsLoading
                          ? undefined
                          : landingProductResults.length === 0
                            ? "Unesi pojam iznad pa sačekaj rezultate."
                            : undefined
                      }
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      {sectionIds.length === 0 ? (
                        <p className="text-xs text-slate-500">Nema manuelno odabranih proizvoda.</p>
                      ) : null}
                      {sectionIds.map((id, index) => {
                        const product = landingProductMap.get(id);
                        return (
                          <div key={`${section.key}-${id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                            <span className="font-semibold text-slate-700">
                              #{id}
                              {product ? ` / ${product.sku}` : ""}
                            </span>
                            <span className="max-w-[220px] truncate text-slate-500">{product?.name || "Nepoznat proizvod"}</span>
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index - 1)}
                              disabled={index === 0}
                              className="rounded border border-slate-200 px-1 text-[10px] text-slate-700 disabled:opacity-40"
                            >
                              UP
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index + 1)}
                              disabled={index === sectionIds.length - 1}
                              className="rounded border border-slate-200 px-1 text-[10px] text-slate-700 disabled:opacity-40"
                            >
                              DOWN
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLandingSectionId(section.key, id)}
                              className="rounded border border-rose-200 px-1 text-[10px] text-rose-700"
                            >
                              x
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">Promene se ne cuvaju automatski. Hero, baneri i sekcije proizvoda ulaze na sajt tek kada kliknes `Sacuvaj landing`.</p>
              <div className="flex gap-2">
                <button onClick={loadLanding} disabled={loadingLanding || savingLanding} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Osvezi</button>
                <button onClick={() => saveLanding()} disabled={savingLanding || loadingLanding} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{savingLanding ? "Cuvanje..." : "Sacuvaj landing"}</button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "akcije" ? (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Kako koristiti - Akcije</p>
            <p className="mt-1">
              `Stara cena` je redovna cena. Unesi ili `Akcijsku cenu` ili `Popust %`, drugo polje se racuna automatski.
              Posle izmene klikni `Sacuvaj` da bi se cena prikazala na webshop-u. Ovaj tab je jedino mesto za snizenja,
              dok se raspored proizvoda na pocetnoj vodi odvojeno u `Pocetna i sekcije`.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brzi nacin</p>
              <p className="mt-1 text-sm text-slate-700">
                Ako hoces samo da jedan proizvod bude na akciji, pronadji ga u tabeli ispod, unesi akcijsku cenu ili
                popust i klikni `Sacuvaj`.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Napredni nacin</p>
              <p className="mt-1 text-sm text-slate-700">
                Ako hoces pravilo za vise proizvoda odjednom, koristi `Smart pravila akcija` po kategoriji, brendu,
                proizvodu ili za ceo shop.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Smart pravila akcija</p>
              <button
                onClick={recomputePromotions}
                disabled={recomputingPromotions}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700"
              >
                {recomputingPromotions ? "Racunanje..." : "Primeni sada"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Pravilo menja cenu na storefront-u po prioritetu. Veci prioritet ima prednost.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <input
                value={promotionDraft.name}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Naziv pravila*"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
              />
              <select
                value={promotionDraft.scopeType}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, scopeType: e.target.value as PromotionScopeType }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Scope: Sve</option>
                <option value="category">Scope: Kategorije</option>
                <option value="brand">Scope: Brendovi</option>
                <option value="product">Scope: Proizvodi</option>
              </select>
              <input
                value={promotionDraft.scopeValuesText}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, scopeValuesText: e.target.value }))}
                placeholder={
                  promotionDraft.scopeType === "all"
                    ? "Nije potrebno"
                    : promotionDraft.scopeType === "category"
                      ? "ID kategorija: 12,45"
                      : promotionDraft.scopeType === "product"
                        ? "Legacy ID proizvoda: 101,205"
                        : "Brendovi: hugo,boss"
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                disabled={promotionDraft.scopeType === "all"}
              />
              <select
                value={promotionDraft.discountType}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, discountType: e.target.value as PromotionDiscountType }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="percent">Popust %</option>
                <option value="fixed">Fiksni iznos (RSD)</option>
              </select>
              <input
                value={promotionDraft.discountValue}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, discountValue: e.target.value }))}
                placeholder={promotionDraft.discountType === "percent" ? "Popust % (0-100)" : "Iznos (RSD)"}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={promotionDraft.priority}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, priority: e.target.value }))}
                placeholder="Prioritet (0+)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={promotionDraft.startAt}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, startAt: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={promotionDraft.endAt}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, endAt: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={promotionDraft.isActive}
                  onChange={(e) => setPromotionDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Aktivno odmah
              </label>
              <button
                onClick={createPromotion}
                disabled={savingPromotionRule}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"
              >
                {savingPromotionRule ? "Cuvanje..." : "Dodaj pravilo"}
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {loadingPromotionRules ? <p className="text-xs text-slate-500">Ucitavanje pravila...</p> : null}
              {!loadingPromotionRules && promotionRules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">Nema pravila. Dodaj prvo smart pravilo.</p>
              ) : null}
              {promotionRules.map((rule) => (
                <article key={rule.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {rule.discountType === "percent" ? `${rule.discountValue}%` : `${rule.discountValue} RSD`} | Scope: {rule.scopeType} ({scopeValuesLabel(rule)}) | Prioritet {rule.priority}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Period: {rule.startAt ? new Date(rule.startAt).toLocaleString("sr-RS") : "odmah"} - {rule.endAt ? new Date(rule.endAt).toLocaleString("sr-RS") : "bez kraja"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        rule.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {rule.isActive ? "Aktivno" : "Pauzirano"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void patchPromotionRule(rule.id, { isActive: !rule.isActive }, rule.isActive ? "Pravilo je pauzirano." : "Pravilo je aktivirano.")}
                      disabled={savingPromotionRule}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700"
                    >
                      {rule.isActive ? "Pauziraj" : "Aktiviraj"}
                    </button>
                    <button
                      onClick={() => void removePromotionRule(rule.id)}
                      disabled={savingPromotionRule}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                    >
                      Obrisi
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-6">
              <input value={saleQ} onChange={(e) => setSaleQ(e.target.value)} placeholder="Pretraga SKU / naziva" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"><input type="checkbox" checked={saleOnSaleOnly} onChange={(e) => setSaleOnSaleOnly(e.target.checked)} />Samo proizvodi na akciji</label>
              <button onClick={loadSales} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Primeni filter</button>
            </div>
          </div>

          {loadingSales ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}

          <div className="grid gap-3 lg:hidden">
            {saleItems.map((item) => {
              const draft = drafts[item.legacyId];
              return (
                <article key={`sale-${item.legacyId}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">#{item.legacyId} / {item.sku}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-500">Stara cena</p><p className="font-semibold">{formatRsd(item.priceGross)}</p></div>
                    <div><p className="text-slate-500">Akcija cena</p><p className="font-semibold">{formatRsd(item.priceFinalGross)}</p></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input value={draft?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(item, "priceFinalGross", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Akcijska cena (RSD)" />
                    <input value={draft?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(item, "rebatePercent", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Popust % (0-100)" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
                    <button onClick={() => setSaleEditorId(item.legacyId)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Detalji akcije</button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-2">ID / SKU</th>
                    <th className="px-2 py-2">Naziv</th>
                    <th className="px-2 py-2">Kategorija</th>
                    <th className="px-2 py-2">Stara cena</th>
                    <th className="px-2 py-2">Akcija cena</th>
                    <th className="px-2 py-2">Popust %</th>
                    <th className="px-2 py-2">Akcija</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => {
                    const draft = drafts[item.legacyId];
                    return (
                      <tr key={`sale-desktop-${item.legacyId}`} className="border-b border-slate-100 align-top">
                        <td className="px-2 py-2 text-xs font-mono">#{item.legacyId}<br />{item.sku}</td>
                        <td className="px-2 py-2">{item.name}</td>
                        <td className="px-2 py-2 text-xs">{item.categories[0]?.path.join(" / ") || "-"}</td>
                        <td className="px-2 py-2">{formatRsd(item.priceGross)}</td>
                        <td className="px-2 py-2"><input value={draft?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(item, "priceFinalGross", e.target.value)} placeholder="RSD" className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><input value={draft?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(item, "rebatePercent", e.target.value)} placeholder="%" className="w-20 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><div className="flex gap-2"><button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button><button onClick={() => setSaleEditorId(item.legacyId)} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Detalji akcije</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {editorId != null && currentEditorItem ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 lg:items-center" onClick={() => setEditorId(null)}>
          <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl lg:mx-auto lg:max-w-2xl lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Editor proizvoda</p>
                <h2 className="text-lg font-semibold text-slate-900">#{currentEditorItem.legacyId} / {currentEditorItem.sku}</h2>
              </div>
              <button onClick={() => setEditorId(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Zatvori</button>
            </div>

            <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              `Regularna cena` je puna cena, `Prodajna cena` je cena na sajtu. Za prikaz na pocetnoj koristi poseban tab
              `Pocetna i sekcije`, kako raspored na home ne bi bio pomesan sa osnovnim uredjivanjem proizvoda.
            </p>

            {isMofficeProduct(currentEditorItem) ? (
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
                <p className="font-semibold uppercase tracking-[0.12em]">mOffice povezan artikal</p>
                <p className="mt-1">
                  Sync osvezava lager i cenu. Ako ukljucis `Pregazi mOffice cenu`, cena ostaje rucna, a lager nastavlja da dolazi iz mOffice.
                </p>
                <label className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                  <input
                    type="checkbox"
                    checked={Boolean(drafts[currentEditorItem.legacyId]?.priceOverride)}
                    onChange={(e) => updateDraft(currentEditorItem.legacyId, { priceOverride: e.target.checked })}
                  />
                  Pregazi mOffice cenu za ovaj artikal
                </label>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Naziv proizvoda</span>
                <input value={drafts[currentEditorItem.legacyId]?.name || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { name: e.target.value })} placeholder="Naziv" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Brend</span>
                <input value={drafts[currentEditorItem.legacyId]?.brand || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { brand: e.target.value })} placeholder="Brend (opciono)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Opis proizvoda</span>
                <textarea value={drafts[currentEditorItem.legacyId]?.description || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { description: e.target.value })} rows={4} placeholder="Opis koji kupac vidi na stranici proizvoda." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Specifikacija / materijal</span>
                <textarea value={drafts[currentEditorItem.legacyId]?.specification || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { specification: e.target.value })} rows={3} placeholder="Materijal, kroj, dimenzije, napomene iz radnje..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Regularna cena (RSD) — puna bez popusta</span>
                <input value={drafts[currentEditorItem.legacyId]?.priceGross || ""} disabled={drafts[currentEditorItem.legacyId]?.businessUniform} onChange={(e) => updateDraft(currentEditorItem.legacyId, { priceGross: e.target.value })} placeholder="npr. 15000" className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Prodajna cena (RSD) — cena na sajtu</span>
                <input value={drafts[currentEditorItem.legacyId]?.priceFinalGross || ""} disabled={drafts[currentEditorItem.legacyId]?.businessUniform} onChange={(e) => updateDraft(currentEditorItem.legacyId, { priceFinalGross: e.target.value })} placeholder="npr. 12000" className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Popust % (0–100) — alternativa za akcijsku cenu</span>
                <input value={drafts[currentEditorItem.legacyId]?.rebatePercent || ""} disabled={drafts[currentEditorItem.legacyId]?.businessUniform} onChange={(e) => updateDraft(currentEditorItem.legacyId, { rebatePercent: e.target.value })} placeholder="npr. 20" className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stanje magacin 1 (kom)</span>
                <input value={drafts[currentEditorItem.legacyId]?.stockWarehouse1 || ""} disabled={drafts[currentEditorItem.legacyId]?.businessUniform} onChange={(e) => updateDraft(currentEditorItem.legacyId, { stockWarehouse1: e.target.value })} placeholder="npr. 5" className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ukupan lager (kom) — zbir svih magacina</span>
                <input value={drafts[currentEditorItem.legacyId]?.stockTotal || ""} disabled={drafts[currentEditorItem.legacyId]?.businessUniform} onChange={(e) => updateDraft(currentEditorItem.legacyId, { stockTotal: e.target.value })} placeholder="npr. 10" className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Video URL — YouTube link ili upload ispod</span>
                <input value={drafts[currentEditorItem.legacyId]?.videoUrl || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { videoUrl: e.target.value })} placeholder="https://youtube.com/... ili /site-assets/..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Slike proizvoda</p>
                  <p className="mt-1 text-xs text-slate-500">Dodaj slike sa telefona, izaberi glavnu sliku i sacuvaj proizvod.</p>
                </div>
                <label className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void uploadEditorImages(currentEditorItem.legacyId, e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploadingEditorImages === currentEditorItem.legacyId ? "Upload..." : "Dodaj slike"}
                </label>
              </div>
              {drafts[currentEditorItem.legacyId]?.images?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {drafts[currentEditorItem.legacyId].images.map((url, index) => {
                    const isCover = (drafts[currentEditorItem.legacyId]?.coverImage || drafts[currentEditorItem.legacyId]?.images?.[0]) === url;
                    return (
                      <div key={`${url}-${index}`} className={`overflow-hidden rounded-xl border bg-white ${isCover ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                        <div className="relative aspect-square bg-slate-100">
                          <Image src={url} alt={`Slika ${index + 1}`} fill sizes="160px" className="object-cover" unoptimized />
                          {isCover ? <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">Cover</span> : null}
                        </div>
                        <div className="grid grid-cols-2 gap-1 p-1.5">
                          <button type="button" onClick={() => setEditorCoverImage(currentEditorItem.legacyId, url)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                            Glavna
                          </button>
                          <button type="button" onClick={() => removeEditorImage(currentEditorItem.legacyId, url)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700">
                            Ukloni
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                  Ovaj artikal nema slike. Dodaj bar jednu fotografiju pre objave.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Video proizvoda</p>
                <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      void uploadEditorVideo(currentEditorItem.legacyId, e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploadingAssetKind === "productVideo" ? "Uploading..." : "Upload video"}
                </label>
              </div>
              {drafts[currentEditorItem.legacyId]?.videoUrl ? (
                <div className="mt-3">
                  <video
                    src={drafts[currentEditorItem.legacyId]?.videoUrl || ""}
                    controls
                    preload="metadata"
                    className="max-h-72 w-full rounded-xl bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => updateDraft(currentEditorItem.legacyId, { videoUrl: "" })}
                    className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                  >
                    Ukloni video
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Za ovaj artikal jos nema dodat video klip.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(drafts[currentEditorItem.legacyId]?.businessUniform)}
                  onChange={(e) =>
                    updateDraft(currentEditorItem.legacyId, {
                      businessUniform: e.target.checked,
                      ...(e.target.checked
                        ? {
                            priceGross: "0",
                            priceFinalGross: "0",
                            rebatePercent: "0",
                            stockWarehouse1: "0",
                            stockTotal: "0",
                          }
                        : {}),
                    })
                  }
                />
                Poslovna uniforma (bez cene i lagera)
              </label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(drafts[currentEditorItem.legacyId]?.isActive)} onChange={(e) => updateDraft(currentEditorItem.legacyId, { isActive: e.target.checked })} />Aktivan (vidljiv na sajtu)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(drafts[currentEditorItem.legacyId]?.isExported)} onChange={(e) => updateDraft(currentEditorItem.legacyId, { isExported: e.target.checked })} />Export (sinhronizacija)</label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link href={`/web-shop/${currentEditorItem.legacyId}`} target="_blank" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Pregled proizvoda</Link>
              <button onClick={() => setEditorId(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Odustani</button>
              <button onClick={() => void saveProduct(currentEditorItem.legacyId)} disabled={savingId === currentEditorItem.legacyId} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === currentEditorItem.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {saleEditorId != null && currentSaleEditorItem ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 lg:items-center" onClick={() => setSaleEditorId(null)}>
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl lg:mx-auto lg:max-w-lg lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Editor akcije</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{currentSaleEditorItem.name}</h2>
            <p className="text-xs text-slate-500">#{currentSaleEditorItem.legacyId} / {currentSaleEditorItem.sku}</p>
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Mozes uneti `Akcijsku cenu` ili `Popust %`. Drugo polje se automatski uskladjuje.
            </p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><p className="text-xs text-slate-500">Stara cena</p><p className="font-semibold">{formatRsd(currentSaleEditorItem.priceGross)}</p></div>
              <input value={drafts[currentSaleEditorItem.legacyId]?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(currentSaleEditorItem, "priceFinalGross", e.target.value)} placeholder="Akcijska cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentSaleEditorItem.legacyId]?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(currentSaleEditorItem, "rebatePercent", e.target.value)} placeholder="Popust % (0-100)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSaleEditorId(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Odustani</button>
              <button onClick={() => void saveProduct(currentSaleEditorItem.legacyId)} disabled={savingId === currentSaleEditorItem.legacyId} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === currentSaleEditorItem.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
