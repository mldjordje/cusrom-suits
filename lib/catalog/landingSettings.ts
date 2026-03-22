import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import { revalidateTag, unstable_cache } from "next/cache";

const LANDING_SETTINGS_PATH = "data/landing-settings.json";
const LANDING_SETTINGS_CACHE_TAG = "landing-settings";

export type LandingProductSectionKey =
  | "heroStripProductIds"
  | "highlightedProductIds"
  | "popularProductIds"
  | "arrivalsProductIds"
  | "saleProductIds"
  | "trendingProductIds";

export type LandingDocument = {
  title: string;
  description: string;
  url: string;
};

export type LandingUniformImage = {
  title: string;
  image: string;
  alt: string;
};

export type LandingSettings = {
  showSaleSection: boolean;
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
  shopHeroEyebrow: string;
  shopHeroTitle: string;
  shopHeroLead: string;
  shopHeroImage: string;
  heroStripProductIds: number[];
  highlightedProductIds: number[];
  popularProductIds: number[];
  arrivalsProductIds: number[];
  saleProductIds: number[];
  trendingProductIds: number[];
};

const DEFAULT_SETTINGS: LandingSettings = {
  showSaleSection: true,
  saleSectionTitle: "Aktuelne Akcije",
  saleSectionSubtitle: "Sekcija i proizvodi se kontrolisu kroz admin.",
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
    "Santos & Santorini priprema poslovne uniforme prilagodjene identitetu brenda, delatnosti i potrebama tima. U ponudi su muske i zenske kombinacije, radne kecelje, mantili, kosulje i kompletne capsule kolekcije za kompanije.",
  uniformsCtaLabel: "Pogledaj uniforme",
  uniformsCtaHref: "/poslovne-uniforme",
  uniformsImages: [
    {
      title: "Hospitality kolekcija",
      image: "https://santos.rs/fajlovi/uniforme/BRI04849.jpg",
      alt: "Santos poslovna uniforma za hospitality tim",
    },
    {
      title: "Recepcija i menadzment",
      image: "https://santos.rs/fajlovi/uniforme/BRI04875.jpg",
      alt: "Santos poslovna uniforma za recepciju",
    },
    {
      title: "Timski setovi",
      image: "https://santos.rs/fajlovi/uniforme/BRI04963.jpg",
      alt: "Santos poslovne uniforme za kompanijske timove",
    },
  ],
  shopHeroEyebrow: "Kurirani izbor krojeva",
  shopHeroTitle: "Web shop kolekcija spremna za porucivanje",
  shopHeroLead:
    "Pregledaj kolekciju uz citljiviju navigaciju, pretragu po proizvodu i filtere koji sada rade pregledno i na desktopu i na telefonu.",
  shopHeroImage: "/img/hero2.jpg",
  heroStripProductIds: [],
  highlightedProductIds: [],
  popularProductIds: [],
  arrivalsProductIds: [],
  saleProductIds: [],
  trendingProductIds: [],
};

const normalizeLandingDocument = (value: unknown): LandingDocument | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = String(row.title || "").trim();
  const description = String(row.description || "").trim();
  const url = String(row.url || "").trim();
  if (!title && !description && !url) return null;
  return { title, description, url };
};

const normalizeLandingDocuments = (value: unknown, max = 24) => {
  if (!Array.isArray(value)) return [] as LandingDocument[];
  return value.map(normalizeLandingDocument).filter((item): item is LandingDocument => Boolean(item)).slice(0, max);
};

const normalizeLandingUniformImage = (value: unknown): LandingUniformImage | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = String(row.title || "").trim();
  const image = String(row.image || "").trim();
  const alt = String(row.alt || "").trim();
  if (!title && !image && !alt) return null;
  return { title, image, alt };
};

const normalizeLandingUniformImages = (value: unknown, max = 24) => {
  if (!Array.isArray(value)) return [] as LandingUniformImage[];
  return value
    .map(normalizeLandingUniformImage)
    .filter((item): item is LandingUniformImage => Boolean(item))
    .slice(0, max);
};

const normalizeLegacyIdList = (value: unknown, max = 24): number[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

  const unique = new Set<number>();
  for (const item of source) {
    const n = Number(item);
    if (!Number.isFinite(n) || n <= 0) continue;
    unique.add(Math.floor(n));
    if (unique.size >= max) break;
  }
  return Array.from(unique);
};

const decodeLandingText = (value: unknown, fallback: string) =>
  decodeHtmlEntities(String(value || fallback || ""));

async function readLandingSettingsUncached(): Promise<LandingSettings> {
  const settings = await readJsonFile<Partial<LandingSettings>>(LANDING_SETTINGS_PATH, {});
  return {
    showSaleSection: settings.showSaleSection !== false,
    saleSectionTitle: decodeLandingText(settings.saleSectionTitle, DEFAULT_SETTINGS.saleSectionTitle),
    saleSectionSubtitle: decodeLandingText(settings.saleSectionSubtitle, DEFAULT_SETTINGS.saleSectionSubtitle),
    heroEyebrow: decodeLandingText(settings.heroEyebrow, DEFAULT_SETTINGS.heroEyebrow),
    heroTitleLine1: decodeLandingText(settings.heroTitleLine1, DEFAULT_SETTINGS.heroTitleLine1),
    heroTitleLine2: decodeLandingText(settings.heroTitleLine2, DEFAULT_SETTINGS.heroTitleLine2),
    heroPrimaryCtaLabel: decodeLandingText(settings.heroPrimaryCtaLabel, DEFAULT_SETTINGS.heroPrimaryCtaLabel),
    heroPrimaryCtaHref: String(settings.heroPrimaryCtaHref || DEFAULT_SETTINGS.heroPrimaryCtaHref),
    heroSecondaryCtaLabel: decodeLandingText(settings.heroSecondaryCtaLabel, DEFAULT_SETTINGS.heroSecondaryCtaLabel),
    heroSecondaryCtaHref: String(settings.heroSecondaryCtaHref || DEFAULT_SETTINGS.heroSecondaryCtaHref),
    bannerLeftTitle: decodeLandingText(settings.bannerLeftTitle, DEFAULT_SETTINGS.bannerLeftTitle),
    bannerLeftButtonLabel: decodeLandingText(settings.bannerLeftButtonLabel, DEFAULT_SETTINGS.bannerLeftButtonLabel),
    bannerLeftHref: String(settings.bannerLeftHref || DEFAULT_SETTINGS.bannerLeftHref),
    bannerLeftImage: String(settings.bannerLeftImage || DEFAULT_SETTINGS.bannerLeftImage),
    bannerRightTitle: decodeLandingText(settings.bannerRightTitle, DEFAULT_SETTINGS.bannerRightTitle),
    bannerRightButtonLabel: decodeLandingText(settings.bannerRightButtonLabel, DEFAULT_SETTINGS.bannerRightButtonLabel),
    bannerRightHref: String(settings.bannerRightHref || DEFAULT_SETTINGS.bannerRightHref),
    bannerRightImage: String(settings.bannerRightImage || DEFAULT_SETTINGS.bannerRightImage),
    companyMb: String(settings.companyMb || DEFAULT_SETTINGS.companyMb),
    companyPib: String(settings.companyPib || DEFAULT_SETTINGS.companyPib),
    customerRightsTitle: decodeLandingText(settings.customerRightsTitle, DEFAULT_SETTINGS.customerRightsTitle),
    customerRightsText: decodeLandingText(settings.customerRightsText, DEFAULT_SETTINGS.customerRightsText),
    purchaseGuideTitle: decodeLandingText(settings.purchaseGuideTitle, DEFAULT_SETTINGS.purchaseGuideTitle),
    purchaseGuideText: decodeLandingText(settings.purchaseGuideText, DEFAULT_SETTINGS.purchaseGuideText),
    documentsTitle: decodeLandingText(settings.documentsTitle, DEFAULT_SETTINGS.documentsTitle),
    documentsSubtitle: decodeLandingText(settings.documentsSubtitle, DEFAULT_SETTINGS.documentsSubtitle),
    documents: normalizeLandingDocuments(settings.documents ?? DEFAULT_SETTINGS.documents),
    uniformsEyebrow: decodeLandingText(settings.uniformsEyebrow, DEFAULT_SETTINGS.uniformsEyebrow),
    uniformsTitle: decodeLandingText(settings.uniformsTitle, DEFAULT_SETTINGS.uniformsTitle),
    uniformsText: decodeLandingText(settings.uniformsText, DEFAULT_SETTINGS.uniformsText),
    uniformsCtaLabel: decodeLandingText(settings.uniformsCtaLabel, DEFAULT_SETTINGS.uniformsCtaLabel),
    uniformsCtaHref: String(settings.uniformsCtaHref || DEFAULT_SETTINGS.uniformsCtaHref),
    uniformsImages: normalizeLandingUniformImages(settings.uniformsImages ?? DEFAULT_SETTINGS.uniformsImages),
    shopHeroEyebrow: decodeLandingText(settings.shopHeroEyebrow, DEFAULT_SETTINGS.shopHeroEyebrow),
    shopHeroTitle: decodeLandingText(settings.shopHeroTitle, DEFAULT_SETTINGS.shopHeroTitle),
    shopHeroLead: decodeLandingText(settings.shopHeroLead, DEFAULT_SETTINGS.shopHeroLead),
    shopHeroImage: String(settings.shopHeroImage || DEFAULT_SETTINGS.shopHeroImage),
    heroStripProductIds: normalizeLegacyIdList(settings.heroStripProductIds),
    highlightedProductIds: normalizeLegacyIdList(settings.highlightedProductIds),
    popularProductIds: normalizeLegacyIdList(settings.popularProductIds),
    arrivalsProductIds: normalizeLegacyIdList(settings.arrivalsProductIds),
    saleProductIds: normalizeLegacyIdList(settings.saleProductIds),
    trendingProductIds: normalizeLegacyIdList(settings.trendingProductIds),
  };
}

const getLandingSettingsCached = unstable_cache(
  async () => readLandingSettingsUncached(),
  ["landing-settings-v1"],
  { revalidate: 300, tags: [LANDING_SETTINGS_CACHE_TAG] },
);

export async function getLandingSettings(): Promise<LandingSettings> {
  return getLandingSettingsCached();
}

export async function updateLandingSettings(patch: Partial<LandingSettings>): Promise<LandingSettings> {
  const current = await getLandingSettings();
  const next: LandingSettings = {
    showSaleSection: patch.showSaleSection == null ? current.showSaleSection : Boolean(patch.showSaleSection),
    saleSectionTitle: (patch.saleSectionTitle || current.saleSectionTitle).trim() || DEFAULT_SETTINGS.saleSectionTitle,
    saleSectionSubtitle: patch.saleSectionSubtitle == null ? current.saleSectionSubtitle : String(patch.saleSectionSubtitle).trim(),
    heroEyebrow: patch.heroEyebrow == null ? current.heroEyebrow : String(patch.heroEyebrow).trim() || DEFAULT_SETTINGS.heroEyebrow,
    heroTitleLine1: patch.heroTitleLine1 == null ? current.heroTitleLine1 : String(patch.heroTitleLine1).trim() || DEFAULT_SETTINGS.heroTitleLine1,
    heroTitleLine2: patch.heroTitleLine2 == null ? current.heroTitleLine2 : String(patch.heroTitleLine2).trim() || DEFAULT_SETTINGS.heroTitleLine2,
    heroPrimaryCtaLabel:
      patch.heroPrimaryCtaLabel == null
        ? current.heroPrimaryCtaLabel
        : String(patch.heroPrimaryCtaLabel).trim() || DEFAULT_SETTINGS.heroPrimaryCtaLabel,
    heroPrimaryCtaHref:
      patch.heroPrimaryCtaHref == null
        ? current.heroPrimaryCtaHref
        : String(patch.heroPrimaryCtaHref).trim() || DEFAULT_SETTINGS.heroPrimaryCtaHref,
    heroSecondaryCtaLabel:
      patch.heroSecondaryCtaLabel == null
        ? current.heroSecondaryCtaLabel
        : String(patch.heroSecondaryCtaLabel).trim() || DEFAULT_SETTINGS.heroSecondaryCtaLabel,
    heroSecondaryCtaHref:
      patch.heroSecondaryCtaHref == null
        ? current.heroSecondaryCtaHref
        : String(patch.heroSecondaryCtaHref).trim() || DEFAULT_SETTINGS.heroSecondaryCtaHref,
    bannerLeftTitle:
      patch.bannerLeftTitle == null
        ? current.bannerLeftTitle
        : String(patch.bannerLeftTitle).trim() || DEFAULT_SETTINGS.bannerLeftTitle,
    bannerLeftButtonLabel:
      patch.bannerLeftButtonLabel == null
        ? current.bannerLeftButtonLabel
        : String(patch.bannerLeftButtonLabel).trim() || DEFAULT_SETTINGS.bannerLeftButtonLabel,
    bannerLeftHref:
      patch.bannerLeftHref == null
        ? current.bannerLeftHref
        : String(patch.bannerLeftHref).trim() || DEFAULT_SETTINGS.bannerLeftHref,
    bannerLeftImage:
      patch.bannerLeftImage == null
        ? current.bannerLeftImage
        : String(patch.bannerLeftImage).trim() || DEFAULT_SETTINGS.bannerLeftImage,
    bannerRightTitle:
      patch.bannerRightTitle == null
        ? current.bannerRightTitle
        : String(patch.bannerRightTitle).trim() || DEFAULT_SETTINGS.bannerRightTitle,
    bannerRightButtonLabel:
      patch.bannerRightButtonLabel == null
        ? current.bannerRightButtonLabel
        : String(patch.bannerRightButtonLabel).trim() || DEFAULT_SETTINGS.bannerRightButtonLabel,
    bannerRightHref:
      patch.bannerRightHref == null
        ? current.bannerRightHref
        : String(patch.bannerRightHref).trim() || DEFAULT_SETTINGS.bannerRightHref,
    bannerRightImage:
      patch.bannerRightImage == null
        ? current.bannerRightImage
        : String(patch.bannerRightImage).trim() || DEFAULT_SETTINGS.bannerRightImage,
    companyMb: patch.companyMb == null ? current.companyMb : String(patch.companyMb).trim() || DEFAULT_SETTINGS.companyMb,
    companyPib: patch.companyPib == null ? current.companyPib : String(patch.companyPib).trim() || DEFAULT_SETTINGS.companyPib,
    customerRightsTitle:
      patch.customerRightsTitle == null
        ? current.customerRightsTitle
        : String(patch.customerRightsTitle).trim() || DEFAULT_SETTINGS.customerRightsTitle,
    customerRightsText:
      patch.customerRightsText == null
        ? current.customerRightsText
        : String(patch.customerRightsText).trim() || DEFAULT_SETTINGS.customerRightsText,
    purchaseGuideTitle:
      patch.purchaseGuideTitle == null
        ? current.purchaseGuideTitle
        : String(patch.purchaseGuideTitle).trim() || DEFAULT_SETTINGS.purchaseGuideTitle,
    purchaseGuideText:
      patch.purchaseGuideText == null
        ? current.purchaseGuideText
        : String(patch.purchaseGuideText).trim() || DEFAULT_SETTINGS.purchaseGuideText,
    documentsTitle:
      patch.documentsTitle == null
        ? current.documentsTitle
        : String(patch.documentsTitle).trim() || DEFAULT_SETTINGS.documentsTitle,
    documentsSubtitle:
      patch.documentsSubtitle == null
        ? current.documentsSubtitle
        : String(patch.documentsSubtitle).trim() || DEFAULT_SETTINGS.documentsSubtitle,
    documents:
      patch.documents == null ? current.documents : normalizeLandingDocuments(patch.documents, 24),
    uniformsEyebrow:
      patch.uniformsEyebrow == null
        ? current.uniformsEyebrow
        : String(patch.uniformsEyebrow).trim() || DEFAULT_SETTINGS.uniformsEyebrow,
    uniformsTitle:
      patch.uniformsTitle == null
        ? current.uniformsTitle
        : String(patch.uniformsTitle).trim() || DEFAULT_SETTINGS.uniformsTitle,
    uniformsText:
      patch.uniformsText == null
        ? current.uniformsText
        : String(patch.uniformsText).trim() || DEFAULT_SETTINGS.uniformsText,
    uniformsCtaLabel:
      patch.uniformsCtaLabel == null
        ? current.uniformsCtaLabel
        : String(patch.uniformsCtaLabel).trim() || DEFAULT_SETTINGS.uniformsCtaLabel,
    uniformsCtaHref:
      patch.uniformsCtaHref == null
        ? current.uniformsCtaHref
        : String(patch.uniformsCtaHref).trim() || DEFAULT_SETTINGS.uniformsCtaHref,
    uniformsImages:
      patch.uniformsImages == null ? current.uniformsImages : normalizeLandingUniformImages(patch.uniformsImages, 24),
    shopHeroEyebrow:
      patch.shopHeroEyebrow == null
        ? current.shopHeroEyebrow
        : String(patch.shopHeroEyebrow).trim() || DEFAULT_SETTINGS.shopHeroEyebrow,
    shopHeroTitle:
      patch.shopHeroTitle == null
        ? current.shopHeroTitle
        : String(patch.shopHeroTitle).trim() || DEFAULT_SETTINGS.shopHeroTitle,
    shopHeroLead:
      patch.shopHeroLead == null
        ? current.shopHeroLead
        : String(patch.shopHeroLead).trim() || DEFAULT_SETTINGS.shopHeroLead,
    shopHeroImage:
      patch.shopHeroImage == null
        ? current.shopHeroImage
        : String(patch.shopHeroImage).trim() || DEFAULT_SETTINGS.shopHeroImage,
    heroStripProductIds:
      patch.heroStripProductIds == null ? current.heroStripProductIds : normalizeLegacyIdList(patch.heroStripProductIds),
    highlightedProductIds:
      patch.highlightedProductIds == null ? current.highlightedProductIds : normalizeLegacyIdList(patch.highlightedProductIds),
    popularProductIds:
      patch.popularProductIds == null ? current.popularProductIds : normalizeLegacyIdList(patch.popularProductIds),
    arrivalsProductIds:
      patch.arrivalsProductIds == null ? current.arrivalsProductIds : normalizeLegacyIdList(patch.arrivalsProductIds),
    saleProductIds: patch.saleProductIds == null ? current.saleProductIds : normalizeLegacyIdList(patch.saleProductIds),
    trendingProductIds:
      patch.trendingProductIds == null ? current.trendingProductIds : normalizeLegacyIdList(patch.trendingProductIds),
  };
  await writeJsonFile(LANDING_SETTINGS_PATH, next);
  revalidateTag(LANDING_SETTINGS_CACHE_TAG);
  return next;
}
