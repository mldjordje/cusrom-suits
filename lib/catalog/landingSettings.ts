import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import {
  DEFAULT_LANDING_PRODUCT_SECTIONS,
  DEFAULT_LANDING_PRODUCT_SECTION_CONTENT,
  buildLandingProductSectionMap,
  normalizeLandingCustomSections,
  normalizeLandingProductSectionContent,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductSectionContent,
  type LandingProductSectionKey,
  type LandingProductSectionState,
} from "@/lib/catalog/landingSections";
import { revalidateTag, unstable_cache } from "next/cache";

const LANDING_SETTINGS_PATH = "data/landing-settings.json";
const LANDING_SETTINGS_CACHE_TAG = "landing-settings";

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

export type LandingUniformVideo = {
  title: string;
  video: string;
  poster: string;
  alt: string;
};

export type LandingStoryCard = {
  id: string;
  badge: string;
  title: string;
  copy: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

export type LandingContactPoint = {
  label: string;
  value: string;
};

/** Jedan vizuelni hero blok na /web-shop (do 2 komada, jedan ispod drugog). */
export type LandingShopHeroSection = {
  id: string;
  image: string;
  showPromo: boolean;
  promoLabel: string;
  promoHref: string;
};

const SHOP_HERO_MAX_SECTIONS = 2;

function normalizeShopHeroSectionsInput(value: unknown): LandingShopHeroSection[] {
  if (!Array.isArray(value)) return [];
  const out: LandingShopHeroSection[] = [];
  for (let i = 0; i < value.length && out.length < SHOP_HERO_MAX_SECTIONS; i++) {
    const row = value[i];
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const image = String(r.image || "").trim();
    if (!image) continue;
    out.push({
      id: String(r.id || `shop-hero-${out.length + 1}`).trim() || `shop-hero-${out.length + 1}`,
      image,
      showPromo: Boolean(r.showPromo),
      promoLabel: decodeLandingText(r.promoLabel, ""),
      promoHref: String(r.promoHref || "/akcije").trim() || "/akcije",
    });
  }
  return out;
}

export type LandingSettings = {
  showSaleSection: boolean;
  productSections: LandingProductSectionState[];
  productSectionContent: LandingProductSectionContent[];
  customSections: LandingCustomSection[];
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
  shopHeroShowPromo: boolean;
  shopHeroPromoLabel: string;
  shopHeroPromoHref: string;
  shopHeroSections: LandingShopHeroSection[];
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

const DEFAULT_SETTINGS: LandingSettings = {
  showSaleSection: true,
  productSections: DEFAULT_LANDING_PRODUCT_SECTIONS,
  productSectionContent: DEFAULT_LANDING_PRODUCT_SECTION_CONTENT,
  customSections: [],
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
      image: "/fajlovi/uniforme/BRI04849.jpg",
      alt: "Santos poslovna uniforma za hospitality tim",
    },
    {
      title: "Recepcija i menadzment",
      image: "/fajlovi/uniforme/BRI04875.jpg",
      alt: "Santos poslovna uniforma za recepciju",
    },
    {
      title: "Timski setovi",
      image: "/fajlovi/uniforme/BRI04963.jpg",
      alt: "Santos poslovne uniforme za kompanijske timove",
    },
    {
      title: "Zenska uniforma mantil",
      image: "/fajlovi/uniforme/BRI04899.jpg",
      alt: "Santos zenska poslovna uniforma mantil",
    },
    {
      title: "Pantalone i jakna",
      image: "/fajlovi/uniforme/BRI04939.jpg",
      alt: "Santos poslovna uniforma pantalone i jakna",
    },
    {
      title: "Uniforma za timove",
      image: "/fajlovi/uniforme/BRI04988.jpg",
      alt: "Santos komplet poslovne uniforme za timove",
    },
  ],
  uniformsVideos: [
    {
      title: "Zenska uniforma mantil",
      video: "/fajlovi/uniforme/Santos%20zenska%20uniforma%20mantil.mp4",
      poster: "/fajlovi/uniforme/BRI04849.jpg",
      alt: "Santos video prezentacija zenske poslovne uniforme",
    },
    {
      title: "Kosulja kratak rukav",
      video: "/fajlovi/uniforme/Santos%20uniforma%20kosulja%20kratak%20rukav.mp4",
      poster: "/fajlovi/uniforme/BRI04899.jpg",
      alt: "Santos video prezentacija poslovne kosulje kratkog rukava",
    },
    {
      title: "Pantalone i jakna",
      video: "/fajlovi/uniforme/Santos%20uniforma%20pantalone%20jakna.mp4",
      poster: "/fajlovi/uniforme/BRI04939.jpg",
      alt: "Santos video prezentacija kompleta pantalone i jakna",
    },
  ],
  shopHeroEyebrow: "Kurirani izbor krojeva",
  shopHeroTitle: "Web shop kolekcija spremna za porucivanje",
  shopHeroLead:
    "Pregledaj kolekciju uz citljiviju navigaciju, pretragu po proizvodu i filtere koji sada rade pregledno i na desktopu i na telefonu.",
  shopHeroImage: "/img/hero2.jpg",
  shopHeroShowPromo: false,
  shopHeroPromoLabel: "",
  shopHeroPromoHref: "/akcije",
  shopHeroSections: [
    {
      id: "shop-hero-1",
      image: "/img/hero2.jpg",
      showPromo: false,
      promoLabel: "",
      promoHref: "/akcije",
    },
  ],
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
  contactText:
    "Tim vas vodi kroz izbor tkanina, krojeva i detalja u showroom-u ili online. Odgovaramo u roku od jednog radnog dana.",
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

/** Za čuvanje: uvek bar jedna sekcija sa podrazumevanom slikom. */
export function normalizeShopHeroSectionsForSave(value: unknown): LandingShopHeroSection[] {
  const rows = normalizeShopHeroSectionsInput(value);
  if (rows.length >= 1) return rows;
  return [
    {
      id: "shop-hero-1",
      image: DEFAULT_SETTINGS.shopHeroImage,
      showPromo: false,
      promoLabel: "",
      promoHref: "/akcije",
    },
  ];
}

function resolveShopHeroSections(settings: Partial<LandingSettings>): LandingShopHeroSection[] {
  const fromArray = normalizeShopHeroSectionsInput(settings.shopHeroSections);
  if (fromArray.length > 0) return fromArray;
  return [
    {
      id: "shop-hero-1",
      image: String(settings.shopHeroImage || DEFAULT_SETTINGS.shopHeroImage),
      showPromo: Boolean(settings.shopHeroShowPromo ?? DEFAULT_SETTINGS.shopHeroShowPromo),
      promoLabel: decodeLandingText(settings.shopHeroPromoLabel, DEFAULT_SETTINGS.shopHeroPromoLabel),
      promoHref: String(settings.shopHeroPromoHref || DEFAULT_SETTINGS.shopHeroPromoHref),
    },
  ];
}

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

const UNIFORM_MEDIA_REPAIRS: Record<string, string> = {
  "https://santos.rs/fajlovi/uniforme/BRI04849.jpg": "/fajlovi/uniforme/BRI04849.jpg",
  "https://santos.rs/fajlovi/uniforme/BRI04875.jpg": "/fajlovi/uniforme/BRI04875.jpg",
  "https://santos.rs/fajlovi/uniforme/BRI04963.jpg": "/fajlovi/uniforme/BRI04963.jpg",
  "https://santos.rs/fajlovi/uniforme/BRI04899.jpg": "/fajlovi/uniforme/BRI04899.jpg",
  "https://santos.rs/fajlovi/uniforme/BRI04939.jpg": "/fajlovi/uniforme/BRI04939.jpg",
  "https://santos.rs/fajlovi/uniforme/Santos%20zenska%20uniforma%20mantil.mp4":
    "/fajlovi/uniforme/Santos%20zenska%20uniforma%20mantil.mp4",
  "https://santos.rs/fajlovi/uniforme/Santos%20uniforma%20kosulja%20kratak%20rukav.mp4":
    "/fajlovi/uniforme/Santos%20uniforma%20kosulja%20kratak%20rukav.mp4",
  "https://santos.rs/fajlovi/uniforme/Santos%20uniforma%20pantalone%20jakna.mp4":
    "/fajlovi/uniforme/Santos%20uniforma%20pantalone%20jakna.mp4",
};

const repairUniformMediaUrl = (url: string) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  const directRepair = UNIFORM_MEDIA_REPAIRS[trimmed];
  if (directRepair != null) return directRepair;

  try {
    const parsed = new URL(trimmed, "https://santos.rs");
    if (parsed.hostname === "santos.rs" && parsed.pathname.startsWith("/fajlovi/uniforme/")) {
      return parsed.pathname;
    }
  } catch {
    // Keep the original value below.
  }

  return trimmed;
};

const normalizeLandingUniformImage = (value: unknown): LandingUniformImage | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = String(row.title || "").trim();
  const image = repairUniformMediaUrl(String(row.image || "").trim());
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

const normalizeLandingUniformVideo = (value: unknown): LandingUniformVideo | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = String(row.title || "").trim();
  const video = repairUniformMediaUrl(String(row.video || "").trim());
  const poster = repairUniformMediaUrl(String(row.poster || "").trim());
  const alt = String(row.alt || "").trim();
  if (!title && !video && !poster && !alt) return null;
  return { title, video, poster, alt };
};

const normalizeLandingUniformVideos = (value: unknown, max = 24) => {
  if (!Array.isArray(value)) return [] as LandingUniformVideo[];
  return value
    .map(normalizeLandingUniformVideo)
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

const normalizeLandingStoryCard = (value: unknown, index: number): LandingStoryCard | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const fallback = DEFAULT_SETTINGS.storyCards[index] || DEFAULT_SETTINGS.storyCards[0];
  const id = String(row.id || fallback?.id || `story-${index + 1}`).trim() || `story-${index + 1}`;
  const badge = String(row.badge ?? fallback?.badge ?? "").trim();
  const title = String(row.title ?? fallback?.title ?? "").trim();
  const copy = String(row.copy ?? fallback?.copy ?? "").trim();
  const image = String(row.image ?? fallback?.image ?? "").trim() || fallback?.image || "";
  const ctaLabel = String(row.ctaLabel ?? fallback?.ctaLabel ?? "").trim();
  const ctaHref = String(row.ctaHref ?? fallback?.ctaHref ?? "").trim() || fallback?.ctaHref || "/web-shop";
  return { id, badge, title, copy, image, ctaLabel, ctaHref };
};

const normalizeLandingStoryCards = (value: unknown, max = 6) => {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.storyCards.slice(0, max);
  return value
    .map((item, index) => normalizeLandingStoryCard(item, index))
    .filter((item): item is LandingStoryCard => Boolean(item))
    .slice(0, max);
};

const normalizeLandingContactPoint = (value: unknown, index: number): LandingContactPoint | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const fallback = DEFAULT_SETTINGS.contactPoints[index] || DEFAULT_SETTINGS.contactPoints[0];
  const label = String(row.label ?? fallback?.label ?? "").trim();
  const valueText = String(row.value ?? fallback?.value ?? "").trim();
  if (!label && !valueText) return null;
  return { label, value: valueText };
};

const normalizeLandingContactPoints = (value: unknown, max = 12) => {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.contactPoints.slice(0, max);
  return value
    .map((item, index) => normalizeLandingContactPoint(item, index))
    .filter((item): item is LandingContactPoint => Boolean(item))
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
  const settings = await readPersistentJsonFile<Partial<LandingSettings>>(LANDING_SETTINGS_PATH, {});
  const normalizedProductSections = normalizeLandingProductSections(settings.productSections);
  const productSectionMap = buildLandingProductSectionMap(normalizedProductSections);
  const saleSection = productSectionMap.get("saleProductIds");
  const saleSectionEnabled = settings.productSections == null
    ? settings.showSaleSection !== false
    : Boolean(saleSection?.enabled);
  const syncedProductSections = normalizedProductSections.map((section) =>
    section.key === "saleProductIds" ? { ...section, enabled: saleSectionEnabled } : section,
  );
  let productSectionContent = normalizeLandingProductSectionContent(settings.productSectionContent);
  if (settings.productSectionContent == null) {
    productSectionContent = productSectionContent.map((section) =>
      section.key === "saleProductIds"
        ? {
            ...section,
            title: decodeLandingText(settings.saleSectionTitle, DEFAULT_SETTINGS.saleSectionTitle),
            subtitle: decodeLandingText(settings.saleSectionSubtitle, DEFAULT_SETTINGS.saleSectionSubtitle),
          }
        : section,
    );
  }

  const shopHeroSections = resolveShopHeroSections(settings);
  const shopHeroFirst = shopHeroSections[0]!;

  return {
    showSaleSection: saleSectionEnabled,
    productSections: syncedProductSections,
    productSectionContent,
    customSections: normalizeLandingCustomSections(settings.customSections),
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
    uniformsVideos: normalizeLandingUniformVideos(settings.uniformsVideos ?? DEFAULT_SETTINGS.uniformsVideos),
    shopHeroEyebrow: decodeLandingText(settings.shopHeroEyebrow, DEFAULT_SETTINGS.shopHeroEyebrow),
    shopHeroTitle: decodeLandingText(settings.shopHeroTitle, DEFAULT_SETTINGS.shopHeroTitle),
    shopHeroLead: decodeLandingText(settings.shopHeroLead, DEFAULT_SETTINGS.shopHeroLead),
    shopHeroSections,
    shopHeroImage: shopHeroFirst.image,
    shopHeroShowPromo: shopHeroFirst.showPromo,
    shopHeroPromoLabel: shopHeroFirst.promoLabel,
    shopHeroPromoHref: shopHeroFirst.promoHref,
    storySectionTitle: decodeLandingText(settings.storySectionTitle, DEFAULT_SETTINGS.storySectionTitle),
    storySectionCtaLabel: decodeLandingText(settings.storySectionCtaLabel, DEFAULT_SETTINGS.storySectionCtaLabel),
    storySectionCtaHref: String(settings.storySectionCtaHref || DEFAULT_SETTINGS.storySectionCtaHref),
    storyCards: normalizeLandingStoryCards(settings.storyCards),
    aboutEyebrow: decodeLandingText(settings.aboutEyebrow, DEFAULT_SETTINGS.aboutEyebrow),
    aboutTitle: decodeLandingText(settings.aboutTitle, DEFAULT_SETTINGS.aboutTitle),
    aboutParagraphs: normalizeStringList(settings.aboutParagraphs, DEFAULT_SETTINGS.aboutParagraphs, 6),
    aboutPrimaryCtaLabel: decodeLandingText(settings.aboutPrimaryCtaLabel, DEFAULT_SETTINGS.aboutPrimaryCtaLabel),
    aboutPrimaryCtaHref: String(settings.aboutPrimaryCtaHref || DEFAULT_SETTINGS.aboutPrimaryCtaHref),
    aboutSecondaryCtaLabel: decodeLandingText(settings.aboutSecondaryCtaLabel, DEFAULT_SETTINGS.aboutSecondaryCtaLabel),
    aboutSecondaryCtaHref: String(settings.aboutSecondaryCtaHref || DEFAULT_SETTINGS.aboutSecondaryCtaHref),
    contactEyebrow: decodeLandingText(settings.contactEyebrow, DEFAULT_SETTINGS.contactEyebrow),
    contactTitle: decodeLandingText(settings.contactTitle, DEFAULT_SETTINGS.contactTitle),
    contactText: decodeLandingText(settings.contactText, DEFAULT_SETTINGS.contactText),
    contactPoints: normalizeLandingContactPoints(settings.contactPoints, 8),
    contactPrimaryCtaLabel: decodeLandingText(settings.contactPrimaryCtaLabel, DEFAULT_SETTINGS.contactPrimaryCtaLabel),
    contactPrimaryCtaHref: String(settings.contactPrimaryCtaHref || DEFAULT_SETTINGS.contactPrimaryCtaHref),
    contactSecondaryCtaLabel: decodeLandingText(settings.contactSecondaryCtaLabel, DEFAULT_SETTINGS.contactSecondaryCtaLabel),
    contactSecondaryCtaHref: String(settings.contactSecondaryCtaHref || DEFAULT_SETTINGS.contactSecondaryCtaHref),
    customerInfoEyebrow: decodeLandingText(settings.customerInfoEyebrow, DEFAULT_SETTINGS.customerInfoEyebrow),
    customerInfoTitle: decodeLandingText(settings.customerInfoTitle, DEFAULT_SETTINGS.customerInfoTitle),
    customerInfoPrimaryCtaLabel: decodeLandingText(settings.customerInfoPrimaryCtaLabel, DEFAULT_SETTINGS.customerInfoPrimaryCtaLabel),
    customerInfoPrimaryCtaHref: String(settings.customerInfoPrimaryCtaHref || DEFAULT_SETTINGS.customerInfoPrimaryCtaHref),
    customerInfoSecondaryCtaLabel: decodeLandingText(settings.customerInfoSecondaryCtaLabel, DEFAULT_SETTINGS.customerInfoSecondaryCtaLabel),
    customerInfoSecondaryCtaHref: String(settings.customerInfoSecondaryCtaHref || DEFAULT_SETTINGS.customerInfoSecondaryCtaHref),
    companyDetailsEyebrow: decodeLandingText(settings.companyDetailsEyebrow, DEFAULT_SETTINGS.companyDetailsEyebrow),
    companyPibLabel: decodeLandingText(settings.companyPibLabel, DEFAULT_SETTINGS.companyPibLabel),
    companyMbLabel: decodeLandingText(settings.companyMbLabel, DEFAULT_SETTINGS.companyMbLabel),
    documentsEmptyText: decodeLandingText(settings.documentsEmptyText, DEFAULT_SETTINGS.documentsEmptyText),
    blogSectionTitle: decodeLandingText(settings.blogSectionTitle, DEFAULT_SETTINGS.blogSectionTitle),
    blogSectionCtaLabel: decodeLandingText(settings.blogSectionCtaLabel, DEFAULT_SETTINGS.blogSectionCtaLabel),
    blogSectionCtaHref: String(settings.blogSectionCtaHref || DEFAULT_SETTINGS.blogSectionCtaHref),
    heroStripProductIds: normalizeLegacyIdList(settings.heroStripProductIds),
    highlightedProductIds: normalizeLegacyIdList(settings.highlightedProductIds),
    popularProductIds: normalizeLegacyIdList(settings.popularProductIds),
    arrivalsProductIds: normalizeLegacyIdList(settings.arrivalsProductIds),
    saleProductIds: normalizeLegacyIdList(settings.saleProductIds),
    trendingProductIds: normalizeLegacyIdList(settings.trendingProductIds),
    heroVideoUrl: String(settings.heroVideoUrl || "").trim(),
    heroVideoPosterUrl: String(settings.heroVideoPosterUrl || "").trim(),
  };
}

const getLandingSettingsCached = unstable_cache(
  async () => readLandingSettingsUncached(),
  ["landing-settings-v2"],
  { revalidate: 300, tags: [LANDING_SETTINGS_CACHE_TAG] },
);

export async function getLandingSettings(): Promise<LandingSettings> {
  return getLandingSettingsCached();
}

export async function updateLandingSettings(patch: Partial<LandingSettings>): Promise<LandingSettings> {
  const current = await getLandingSettings();
  let nextProductSections = normalizeLandingProductSections(
    patch.productSections == null ? current.productSections : patch.productSections,
  );

  if (patch.showSaleSection != null) {
    nextProductSections = nextProductSections.map((section) =>
      section.key === "saleProductIds" ? { ...section, enabled: Boolean(patch.showSaleSection) } : section,
    );
  }
  let nextProductSectionContent = normalizeLandingProductSectionContent(
    patch.productSectionContent == null ? current.productSectionContent : patch.productSectionContent,
  );
  if (patch.saleSectionTitle != null || patch.saleSectionSubtitle != null) {
    nextProductSectionContent = nextProductSectionContent.map((section) =>
      section.key === "saleProductIds"
        ? {
            ...section,
            title:
              patch.saleSectionTitle == null
                ? section.title
                : String(patch.saleSectionTitle).trim() || DEFAULT_SETTINGS.saleSectionTitle,
            subtitle:
              patch.saleSectionSubtitle == null ? section.subtitle : String(patch.saleSectionSubtitle).trim(),
          }
        : section,
    );
  }

  const saleSectionEnabled =
    buildLandingProductSectionMap(nextProductSections).get("saleProductIds")?.enabled ?? current.showSaleSection;

  let nextShopHeroSections: LandingShopHeroSection[];
  if (patch.shopHeroSections != null) {
    nextShopHeroSections = normalizeShopHeroSectionsForSave(patch.shopHeroSections);
  } else if (
    patch.shopHeroImage != null ||
    patch.shopHeroShowPromo != null ||
    patch.shopHeroPromoLabel != null ||
    patch.shopHeroPromoHref != null
  ) {
    const base = [...current.shopHeroSections];
    const first = base[0] ?? {
      id: "shop-hero-1",
      image: DEFAULT_SETTINGS.shopHeroImage,
      showPromo: false,
      promoLabel: "",
      promoHref: "/akcije",
    };
    nextShopHeroSections = [
      {
        ...first,
        image:
          patch.shopHeroImage == null
            ? first.image
            : String(patch.shopHeroImage).trim() || first.image,
        showPromo: patch.shopHeroShowPromo == null ? first.showPromo : Boolean(patch.shopHeroShowPromo),
        promoLabel:
          patch.shopHeroPromoLabel == null ? first.promoLabel : String(patch.shopHeroPromoLabel).trim(),
        promoHref:
          patch.shopHeroPromoHref == null
            ? first.promoHref
            : String(patch.shopHeroPromoHref).trim() || first.promoHref,
      },
      ...base.slice(1),
    ];
  } else {
    nextShopHeroSections = current.shopHeroSections;
  }
  const nextShopHeroFirst = nextShopHeroSections[0]!;

  const next: LandingSettings = {
    showSaleSection: saleSectionEnabled,
    productSections: nextProductSections,
    productSectionContent: nextProductSectionContent,
    customSections:
      patch.customSections == null ? current.customSections : normalizeLandingCustomSections(patch.customSections),
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
    uniformsVideos:
      patch.uniformsVideos == null ? current.uniformsVideos : normalizeLandingUniformVideos(patch.uniformsVideos, 24),
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
    shopHeroSections: nextShopHeroSections,
    shopHeroImage: nextShopHeroFirst.image,
    shopHeroShowPromo: nextShopHeroFirst.showPromo,
    shopHeroPromoLabel: nextShopHeroFirst.promoLabel,
    shopHeroPromoHref: nextShopHeroFirst.promoHref,
    storySectionTitle:
      patch.storySectionTitle == null
        ? current.storySectionTitle
        : String(patch.storySectionTitle).trim() || DEFAULT_SETTINGS.storySectionTitle,
    storySectionCtaLabel:
      patch.storySectionCtaLabel == null
        ? current.storySectionCtaLabel
        : String(patch.storySectionCtaLabel).trim() || DEFAULT_SETTINGS.storySectionCtaLabel,
    storySectionCtaHref:
      patch.storySectionCtaHref == null
        ? current.storySectionCtaHref
        : String(patch.storySectionCtaHref).trim() || DEFAULT_SETTINGS.storySectionCtaHref,
    storyCards:
      patch.storyCards == null ? current.storyCards : normalizeLandingStoryCards(patch.storyCards, 6),
    aboutEyebrow:
      patch.aboutEyebrow == null
        ? current.aboutEyebrow
        : String(patch.aboutEyebrow).trim() || DEFAULT_SETTINGS.aboutEyebrow,
    aboutTitle:
      patch.aboutTitle == null
        ? current.aboutTitle
        : String(patch.aboutTitle).trim() || DEFAULT_SETTINGS.aboutTitle,
    aboutParagraphs:
      patch.aboutParagraphs == null
        ? current.aboutParagraphs
        : normalizeStringList(patch.aboutParagraphs, DEFAULT_SETTINGS.aboutParagraphs, 6),
    aboutPrimaryCtaLabel:
      patch.aboutPrimaryCtaLabel == null
        ? current.aboutPrimaryCtaLabel
        : String(patch.aboutPrimaryCtaLabel).trim() || DEFAULT_SETTINGS.aboutPrimaryCtaLabel,
    aboutPrimaryCtaHref:
      patch.aboutPrimaryCtaHref == null
        ? current.aboutPrimaryCtaHref
        : String(patch.aboutPrimaryCtaHref).trim() || DEFAULT_SETTINGS.aboutPrimaryCtaHref,
    aboutSecondaryCtaLabel:
      patch.aboutSecondaryCtaLabel == null
        ? current.aboutSecondaryCtaLabel
        : String(patch.aboutSecondaryCtaLabel).trim() || DEFAULT_SETTINGS.aboutSecondaryCtaLabel,
    aboutSecondaryCtaHref:
      patch.aboutSecondaryCtaHref == null
        ? current.aboutSecondaryCtaHref
        : String(patch.aboutSecondaryCtaHref).trim() || DEFAULT_SETTINGS.aboutSecondaryCtaHref,
    contactEyebrow:
      patch.contactEyebrow == null
        ? current.contactEyebrow
        : String(patch.contactEyebrow).trim() || DEFAULT_SETTINGS.contactEyebrow,
    contactTitle:
      patch.contactTitle == null
        ? current.contactTitle
        : String(patch.contactTitle).trim() || DEFAULT_SETTINGS.contactTitle,
    contactText:
      patch.contactText == null
        ? current.contactText
        : String(patch.contactText).trim() || DEFAULT_SETTINGS.contactText,
    contactPoints:
      patch.contactPoints == null
        ? current.contactPoints
        : normalizeLandingContactPoints(patch.contactPoints, 8),
    contactPrimaryCtaLabel:
      patch.contactPrimaryCtaLabel == null
        ? current.contactPrimaryCtaLabel
        : String(patch.contactPrimaryCtaLabel).trim() || DEFAULT_SETTINGS.contactPrimaryCtaLabel,
    contactPrimaryCtaHref:
      patch.contactPrimaryCtaHref == null
        ? current.contactPrimaryCtaHref
        : String(patch.contactPrimaryCtaHref).trim() || DEFAULT_SETTINGS.contactPrimaryCtaHref,
    contactSecondaryCtaLabel:
      patch.contactSecondaryCtaLabel == null
        ? current.contactSecondaryCtaLabel
        : String(patch.contactSecondaryCtaLabel).trim() || DEFAULT_SETTINGS.contactSecondaryCtaLabel,
    contactSecondaryCtaHref:
      patch.contactSecondaryCtaHref == null
        ? current.contactSecondaryCtaHref
        : String(patch.contactSecondaryCtaHref).trim() || DEFAULT_SETTINGS.contactSecondaryCtaHref,
    customerInfoEyebrow:
      patch.customerInfoEyebrow == null
        ? current.customerInfoEyebrow
        : String(patch.customerInfoEyebrow).trim() || DEFAULT_SETTINGS.customerInfoEyebrow,
    customerInfoTitle:
      patch.customerInfoTitle == null
        ? current.customerInfoTitle
        : String(patch.customerInfoTitle).trim() || DEFAULT_SETTINGS.customerInfoTitle,
    customerInfoPrimaryCtaLabel:
      patch.customerInfoPrimaryCtaLabel == null
        ? current.customerInfoPrimaryCtaLabel
        : String(patch.customerInfoPrimaryCtaLabel).trim() || DEFAULT_SETTINGS.customerInfoPrimaryCtaLabel,
    customerInfoPrimaryCtaHref:
      patch.customerInfoPrimaryCtaHref == null
        ? current.customerInfoPrimaryCtaHref
        : String(patch.customerInfoPrimaryCtaHref).trim() || DEFAULT_SETTINGS.customerInfoPrimaryCtaHref,
    customerInfoSecondaryCtaLabel:
      patch.customerInfoSecondaryCtaLabel == null
        ? current.customerInfoSecondaryCtaLabel
        : String(patch.customerInfoSecondaryCtaLabel).trim() || DEFAULT_SETTINGS.customerInfoSecondaryCtaLabel,
    customerInfoSecondaryCtaHref:
      patch.customerInfoSecondaryCtaHref == null
        ? current.customerInfoSecondaryCtaHref
        : String(patch.customerInfoSecondaryCtaHref).trim() || DEFAULT_SETTINGS.customerInfoSecondaryCtaHref,
    companyDetailsEyebrow:
      patch.companyDetailsEyebrow == null
        ? current.companyDetailsEyebrow
        : String(patch.companyDetailsEyebrow).trim() || DEFAULT_SETTINGS.companyDetailsEyebrow,
    companyPibLabel:
      patch.companyPibLabel == null
        ? current.companyPibLabel
        : String(patch.companyPibLabel).trim() || DEFAULT_SETTINGS.companyPibLabel,
    companyMbLabel:
      patch.companyMbLabel == null
        ? current.companyMbLabel
        : String(patch.companyMbLabel).trim() || DEFAULT_SETTINGS.companyMbLabel,
    documentsEmptyText:
      patch.documentsEmptyText == null
        ? current.documentsEmptyText
        : String(patch.documentsEmptyText).trim() || DEFAULT_SETTINGS.documentsEmptyText,
    blogSectionTitle:
      patch.blogSectionTitle == null
        ? current.blogSectionTitle
        : String(patch.blogSectionTitle).trim() || DEFAULT_SETTINGS.blogSectionTitle,
    blogSectionCtaLabel:
      patch.blogSectionCtaLabel == null
        ? current.blogSectionCtaLabel
        : String(patch.blogSectionCtaLabel).trim() || DEFAULT_SETTINGS.blogSectionCtaLabel,
    blogSectionCtaHref:
      patch.blogSectionCtaHref == null
        ? current.blogSectionCtaHref
        : String(patch.blogSectionCtaHref).trim() || DEFAULT_SETTINGS.blogSectionCtaHref,
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
    heroVideoUrl: patch.heroVideoUrl == null ? current.heroVideoUrl : String(patch.heroVideoUrl || "").trim(),
    heroVideoPosterUrl: patch.heroVideoPosterUrl == null ? current.heroVideoPosterUrl : String(patch.heroVideoPosterUrl || "").trim(),
  };
  await writePersistentJsonFile(LANDING_SETTINGS_PATH, next);
  revalidateTag(LANDING_SETTINGS_CACHE_TAG);
  return next;
}
