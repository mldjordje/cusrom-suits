import { revalidateTag, unstable_cache } from "next/cache";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const SITE_CONTENT_PATH = "data/site-content.json";
const SITE_CONTENT_CACHE_TAG = "site-content";

export type SiteNavItem = { href: string; label: string; labelEn: string };
export type SiteFooterGroup = { title: string; titleEn: string; links: SiteNavItem[] };
export type SiteStoreLocation = {
  slug: string;
  city: string;
  cityEn: string;
  title: string;
  titleEn: string;
  address: string;
  addressEn: string;
  mapLabel: string;
  phone: string;
  landline?: string;
  email: string;
  hours: string[];
  hoursEn: string[];
  mapEmbedUrl: string;
};
export type SiteFooterContent = {
  eyebrow: string;
  eyebrowEn: string;
  brandCopy: string;
  brandCopyEn: string;
  instagramUrl: string;
  bottomTagline: string;
  bottomTaglineEn: string;
  groups: SiteFooterGroup[];
};
export type SiteContactPageContent = {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  detailsTitle: string;
  detailsTitleEn: string;
  formTitle: string;
  formTitleEn: string;
  preferredStorePlaceholder: string;
  preferredStorePlaceholderEn: string;
  onlineOptionLabel: string;
  onlineOptionLabelEn: string;
  submitLabel: string;
  submitLabelEn: string;
};
export type SiteStoresPageContent = {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  callCtaLabel: string;
  callCtaLabelEn: string;
  contactCardTitle: string;
  contactCardTitleEn: string;
  hoursCardTitle: string;
  hoursCardTitleEn: string;
};
export type SiteAboutPageContent = {
  heroImage: string;
  heroAlt: string;
  heroAltEn: string;
  heroTitle: string;
  heroTitleEn: string;
  heroSubtitle: string;
  heroSubtitleEn: string;
  introTitle: string;
  introTitleEn: string;
  paragraphs: string[];
  paragraphsEn: string[];
  primaryCtaLabel: string;
  primaryCtaLabelEn: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaLabelEn: string;
  secondaryCtaHref: string;
  secondaryImage: string;
  secondaryImageAlt: string;
  secondaryImageAltEn: string;
};
export type SiteContent = {
  navigation: { items: SiteNavItem[] };
  footer: SiteFooterContent;
  contactPage: SiteContactPageContent;
  storesPage: SiteStoresPageContent;
  aboutPage: SiteAboutPageContent;
  stores: SiteStoreLocation[];
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  navigation: {
    items: [
      { href: "/", label: "Pocetna", labelEn: "Home" },
      { href: "/web-shop", label: "Web Shop", labelEn: "Web Shop" },
      { href: "/akcije", label: "Akcije", labelEn: "Sale" },
      { href: "/o-nama", label: "O nama", labelEn: "About" },
      { href: "/poslovne-uniforme", label: "Poslovne uniforme", labelEn: "Business uniforms" },
      { href: "/blog", label: "Blog", labelEn: "Blog" },
      { href: "/prodajna-mesta", label: "Prodajna mesta", labelEn: "Stores" },
      { href: "/kontakt", label: "Kontakt", labelEn: "Contact" },
    ],
  },
  footer: {
    eyebrow: "Krojeno u Nisu",
    eyebrowEn: "Crafted in Nis",
    brandCopy: "Modern tailoring, ready-to-wear modeli i modernije mobile iskustvo kupovine.",
    brandCopyEn: "Modern tailoring, ready-to-wear pieces and a cleaner mobile shopping experience.",
    instagramUrl: "https://www.instagram.com/santos.santorini/",
    bottomTagline: "Krojenje, aksesoari i editorial shopping.",
    bottomTaglineEn: "Tailoring, accessories and editorial shopping.",
    groups: [
      {
        title: "Kompanija",
        titleEn: "Company",
        links: [
          { href: "/", label: "Pocetna", labelEn: "Home" },
          { href: "/o-nama", label: "O nama", labelEn: "About" },
          { href: "/poslovne-uniforme", label: "Poslovne uniforme", labelEn: "Business uniforms" },
          { href: "/prodajna-mesta", label: "Prodajna mesta", labelEn: "Store locations" },
          { href: "/blog", label: "Blog", labelEn: "Blog" },
          { href: "/kontakt", label: "Kontakt", labelEn: "Contact" },
        ],
      },
      {
        title: "Shop",
        titleEn: "Shop",
        links: [
          { href: "/web-shop", label: "Web Shop", labelEn: "Web Shop" },
          { href: "/akcije", label: "Akcije", labelEn: "Sale" },
          { href: "/web-shop?inStock=1", label: "Na stanju", labelEn: "In stock" },
          { href: "/dokumenta", label: "Dokumenta", labelEn: "Documents" },
          { href: "/checkout", label: "Checkout", labelEn: "Checkout" },
        ],
      },
      {
        title: "Pravno",
        titleEn: "Legal",
        links: [
          { href: "/uslovi_kupovine", label: "Uslovi kupovine", labelEn: "Purchase terms" },
          { href: "/polisa_privatnosti", label: "Polisa privatnosti", labelEn: "Privacy policy" },
          { href: "/reklamacije", label: "Reklamacije", labelEn: "Complaints" },
          { href: "/isporuka", label: "Isporuka", labelEn: "Delivery" },
        ],
      },
    ],
  },
  contactPage: {
    title: "Kontakt",
    titleEn: "Contact",
    intro: "Javite nam se za porudzbine, savete, posete prodajnim mestima i informacije o artiklima.",
    introEn: "Reach out for orders, styling advice, showroom visits and product information.",
    detailsTitle: "Kontakt podaci",
    detailsTitleEn: "Contact details",
    formTitle: "Posaljite upit",
    formTitleEn: "Send an inquiry",
    preferredStorePlaceholder: "Zeljena lokacija ili online",
    preferredStorePlaceholderEn: "Preferred location or online",
    onlineOptionLabel: "Online savetovanje",
    onlineOptionLabelEn: "Online assistance",
    submitLabel: "Posalji",
    submitLabelEn: "Send",
  },
  storesPage: {
    title: "Prodajna mesta",
    titleEn: "Store locations",
    intro: "Posetite prodajno mesto, isprobajte modele uzivo i dogovorite stilsku pomoc sa timom.",
    introEn: "Visit the showroom, try pieces in person and get styling guidance from the team.",
    callCtaLabel: "Pozovi radnju",
    callCtaLabelEn: "Call store",
    contactCardTitle: "Kontakt",
    contactCardTitleEn: "Contact",
    hoursCardTitle: "Radno vreme",
    hoursCardTitleEn: "Working hours",
  },
  aboutPage: {
    heroImage: "/img/hero.jpg",
    heroAlt: "Santos & Santorini hero",
    heroAltEn: "Santos & Santorini hero",
    heroTitle: "O nama",
    heroTitleEn: "About us",
    heroSubtitle: "Santos & Santorini atelier, Nis",
    heroSubtitleEn: "Santos & Santorini atelier, Nis",
    introTitle: "Santos & Santorini",
    introTitleEn: "Santos & Santorini",
    paragraphs: [
      "Brend je posvecen elegantnom muskom stilu, savremenim krojevima i pazljivo odabranim materijalima. Fokus je na balansu izmedju klasicnog izgleda i modernog komfora.",
      "U okviru web shop ponude dostupni su ready-to-wear artikli, izdvojene akcije i blog sadrzaj koji prati kolekcije, stil i novosti iz brenda.",
    ],
    paragraphsEn: [
      "The brand is dedicated to elegant menswear, contemporary cuts and carefully selected materials. The focus is on balancing classic appearance with modern comfort.",
      "The web shop includes ready-to-wear pieces, selected sale offers and blog content following collections, style and brand news.",
    ],
    primaryCtaLabel: "Web Shop",
    primaryCtaLabelEn: "Web Shop",
    primaryCtaHref: "/web-shop",
    secondaryCtaLabel: "Kontakt",
    secondaryCtaLabelEn: "Contact",
    secondaryCtaHref: "/kontakt",
    secondaryImage: "/img/hero2.jpg",
    secondaryImageAlt: "Atelier visual",
    secondaryImageAltEn: "Atelier visual",
  },
  stores: [
    {
      slug: "nis",
      city: "Nis",
      cityEn: "Nis",
      title: "Santos & Santorini Nis",
      titleEn: "Santos & Santorini Nis",
      address: "Obrenoviceva 9, 18000 Nis, Srbija",
      addressEn: "Obrenoviceva 9, 18000 Nis, Serbia",
      mapLabel: "Obrenoviceva 9 Nis, Srbija",
      phone: "+381 69 445 5106",
      landline: "+381 18 514 276",
      email: "santos.pobedina@gmail.com",
      hours: ["Pon-Pet: 09:00 - 21:00", "Subota: 09:00 - 20:00", "Nedelja: 10:00 - 17:00"],
      hoursEn: ["Mon-Fri: 09:00 - 21:00", "Saturday: 09:00 - 20:00", "Sunday: 10:00 - 17:00"],
      mapEmbedUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3639.7269588634736!2d21.892546976667187!3d43.320317373896415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4755b0733fffffff%3A0x997bd3a90b12829c!2sSantos%20%26%20Santorini!5e1!3m2!1sen!2srs!4v1774780655927!5m2!1sen!2srs",
    },
    {
      slug: "krusevac",
      city: "Krusevac",
      cityEn: "Krusevac",
      title: "Santos & Santorini Krusevac",
      titleEn: "Santos & Santorini Krusevac",
      address: "Trg Fontana 16, Krusevac, Srbija",
      addressEn: "Trg Fontana 16, Krusevac, Serbia",
      mapLabel: "Trg Fontana 16 Krusevac, Srbija",
      phone: "+381 69 44 55 104",
      landline: "+381 37 443 960",
      email: "santos.krusevac@gmail.com",
      hours: ["Pon-Pet: 09:00 - 21:00", "Subota: 09:00 - 18:00", "Nedelja: Ne radimo"],
      hoursEn: ["Mon-Fri: 09:00 - 21:00", "Saturday: 09:00 - 18:00", "Sunday: Closed"],
      mapEmbedUrl:
        "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3624.143938196094!2d21.330695!3d43.579821!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4756870062ccd25d%3A0x780e3454e14c0558!2sSantos%20%26%20Santorini!5e1!3m2!1sen!2srs!4v1774780623102!5m2!1sen!2srs",
    },
  ],
};

const decodeText = (value: unknown, fallback: string) =>
  decodeHtmlEntities(String(value || fallback || "").trim());

const normalizeNavItems = (value: unknown, fallback: SiteNavItem[]) => {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const href = String(row.href || "").trim();
      const label = decodeText(row.label, "");
      const labelEn = decodeText(row.labelEn, label);
      if (!href || !label) return null;
      return { href, label, labelEn };
    })
    .filter((item): item is SiteNavItem => Boolean(item))
    .slice(0, 24);
  return items.length ? items : fallback;
};

const normalizeFooterGroups = (value: unknown, fallback: SiteFooterGroup[]) => {
  if (!Array.isArray(value)) return fallback;
  const groups = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = decodeText(row.title, "");
      const titleEn = decodeText(row.titleEn, title);
      const links = normalizeNavItems(row.links, []);
      if (!title || !links.length) return null;
      return { title, titleEn, links };
    })
    .filter((item): item is SiteFooterGroup => Boolean(item))
    .slice(0, 12);
  return groups.length ? groups : fallback;
};

const normalizeTextList = (value: unknown, fallback: string[], max = 12) => {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => decodeText(item, "")).filter(Boolean).slice(0, max);
  return items.length ? items : fallback;
};

const normalizeStores = (value: unknown, fallback: SiteStoreLocation[]) => {
  if (!Array.isArray(value)) return fallback;
  const stores = value.reduce<SiteStoreLocation[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const row = item as Record<string, unknown>;
    const slug = String(row.slug || "").trim().toLowerCase();
    const city = decodeText(row.city, "");
    const cityEn = decodeText(row.cityEn, city);
    const title = decodeText(row.title, "");
    const titleEn = decodeText(row.titleEn, title);
    const address = decodeText(row.address, "");
    const addressEn = decodeText(row.addressEn, address);
    const mapLabel = decodeText(row.mapLabel, "");
    const phone = String(row.phone || "").trim();
    const landline = String(row.landline || "").trim();
    const email = String(row.email || "").trim();
    const hours = normalizeTextList(row.hours, []);
    const hoursEn = normalizeTextList(row.hoursEn, hours);
    const mapEmbedUrl = String(row.mapEmbedUrl || "").trim();
    if (!slug || !city || !title || !address || !phone || !email || !hours.length || !mapEmbedUrl) return acc;
    acc.push({
      slug,
      city,
      cityEn,
      title,
      titleEn,
      address,
      addressEn,
      mapLabel,
      phone,
      landline: landline || undefined,
      email,
      hours,
      hoursEn,
      mapEmbedUrl,
    });
    return acc;
  }, []);
  return stores.length ? stores : fallback;
};

async function readSiteContentUncached(): Promise<SiteContent> {
  const raw = await readPersistentJsonFile<Partial<SiteContent>>(SITE_CONTENT_PATH, {});
  return {
    navigation: { items: normalizeNavItems(raw.navigation?.items, DEFAULT_SITE_CONTENT.navigation.items) },
    footer: {
      eyebrow: decodeText(raw.footer?.eyebrow, DEFAULT_SITE_CONTENT.footer.eyebrow),
      eyebrowEn: decodeText(raw.footer?.eyebrowEn, DEFAULT_SITE_CONTENT.footer.eyebrowEn),
      brandCopy: decodeText(raw.footer?.brandCopy, DEFAULT_SITE_CONTENT.footer.brandCopy),
      brandCopyEn: decodeText(raw.footer?.brandCopyEn, DEFAULT_SITE_CONTENT.footer.brandCopyEn),
      instagramUrl: String(raw.footer?.instagramUrl || DEFAULT_SITE_CONTENT.footer.instagramUrl).trim(),
      bottomTagline: decodeText(raw.footer?.bottomTagline, DEFAULT_SITE_CONTENT.footer.bottomTagline),
      bottomTaglineEn: decodeText(raw.footer?.bottomTaglineEn, DEFAULT_SITE_CONTENT.footer.bottomTaglineEn),
      groups: normalizeFooterGroups(raw.footer?.groups, DEFAULT_SITE_CONTENT.footer.groups),
    },
    contactPage: {
      title: decodeText(raw.contactPage?.title, DEFAULT_SITE_CONTENT.contactPage.title),
      titleEn: decodeText(raw.contactPage?.titleEn, DEFAULT_SITE_CONTENT.contactPage.titleEn),
      intro: decodeText(raw.contactPage?.intro, DEFAULT_SITE_CONTENT.contactPage.intro),
      introEn: decodeText(raw.contactPage?.introEn, DEFAULT_SITE_CONTENT.contactPage.introEn),
      detailsTitle: decodeText(raw.contactPage?.detailsTitle, DEFAULT_SITE_CONTENT.contactPage.detailsTitle),
      detailsTitleEn: decodeText(raw.contactPage?.detailsTitleEn, DEFAULT_SITE_CONTENT.contactPage.detailsTitleEn),
      formTitle: decodeText(raw.contactPage?.formTitle, DEFAULT_SITE_CONTENT.contactPage.formTitle),
      formTitleEn: decodeText(raw.contactPage?.formTitleEn, DEFAULT_SITE_CONTENT.contactPage.formTitleEn),
      preferredStorePlaceholder: decodeText(raw.contactPage?.preferredStorePlaceholder, DEFAULT_SITE_CONTENT.contactPage.preferredStorePlaceholder),
      preferredStorePlaceholderEn: decodeText(raw.contactPage?.preferredStorePlaceholderEn, DEFAULT_SITE_CONTENT.contactPage.preferredStorePlaceholderEn),
      onlineOptionLabel: decodeText(raw.contactPage?.onlineOptionLabel, DEFAULT_SITE_CONTENT.contactPage.onlineOptionLabel),
      onlineOptionLabelEn: decodeText(raw.contactPage?.onlineOptionLabelEn, DEFAULT_SITE_CONTENT.contactPage.onlineOptionLabelEn),
      submitLabel: decodeText(raw.contactPage?.submitLabel, DEFAULT_SITE_CONTENT.contactPage.submitLabel),
      submitLabelEn: decodeText(raw.contactPage?.submitLabelEn, DEFAULT_SITE_CONTENT.contactPage.submitLabelEn),
    },
    storesPage: {
      title: decodeText(raw.storesPage?.title, DEFAULT_SITE_CONTENT.storesPage.title),
      titleEn: decodeText(raw.storesPage?.titleEn, DEFAULT_SITE_CONTENT.storesPage.titleEn),
      intro: decodeText(raw.storesPage?.intro, DEFAULT_SITE_CONTENT.storesPage.intro),
      introEn: decodeText(raw.storesPage?.introEn, DEFAULT_SITE_CONTENT.storesPage.introEn),
      callCtaLabel: decodeText(raw.storesPage?.callCtaLabel, DEFAULT_SITE_CONTENT.storesPage.callCtaLabel),
      callCtaLabelEn: decodeText(raw.storesPage?.callCtaLabelEn, DEFAULT_SITE_CONTENT.storesPage.callCtaLabelEn),
      contactCardTitle: decodeText(raw.storesPage?.contactCardTitle, DEFAULT_SITE_CONTENT.storesPage.contactCardTitle),
      contactCardTitleEn: decodeText(raw.storesPage?.contactCardTitleEn, DEFAULT_SITE_CONTENT.storesPage.contactCardTitleEn),
      hoursCardTitle: decodeText(raw.storesPage?.hoursCardTitle, DEFAULT_SITE_CONTENT.storesPage.hoursCardTitle),
      hoursCardTitleEn: decodeText(raw.storesPage?.hoursCardTitleEn, DEFAULT_SITE_CONTENT.storesPage.hoursCardTitleEn),
    },
    aboutPage: {
      heroImage: String(raw.aboutPage?.heroImage || DEFAULT_SITE_CONTENT.aboutPage.heroImage).trim(),
      heroAlt: decodeText(raw.aboutPage?.heroAlt, DEFAULT_SITE_CONTENT.aboutPage.heroAlt),
      heroAltEn: decodeText(raw.aboutPage?.heroAltEn, DEFAULT_SITE_CONTENT.aboutPage.heroAltEn),
      heroTitle: decodeText(raw.aboutPage?.heroTitle, DEFAULT_SITE_CONTENT.aboutPage.heroTitle),
      heroTitleEn: decodeText(raw.aboutPage?.heroTitleEn, DEFAULT_SITE_CONTENT.aboutPage.heroTitleEn),
      heroSubtitle: decodeText(raw.aboutPage?.heroSubtitle, DEFAULT_SITE_CONTENT.aboutPage.heroSubtitle),
      heroSubtitleEn: decodeText(raw.aboutPage?.heroSubtitleEn, DEFAULT_SITE_CONTENT.aboutPage.heroSubtitleEn),
      introTitle: decodeText(raw.aboutPage?.introTitle, DEFAULT_SITE_CONTENT.aboutPage.introTitle),
      introTitleEn: decodeText(raw.aboutPage?.introTitleEn, DEFAULT_SITE_CONTENT.aboutPage.introTitleEn),
      paragraphs: normalizeTextList(raw.aboutPage?.paragraphs, DEFAULT_SITE_CONTENT.aboutPage.paragraphs, 12),
      paragraphsEn: normalizeTextList(raw.aboutPage?.paragraphsEn, DEFAULT_SITE_CONTENT.aboutPage.paragraphsEn, 12),
      primaryCtaLabel: decodeText(raw.aboutPage?.primaryCtaLabel, DEFAULT_SITE_CONTENT.aboutPage.primaryCtaLabel),
      primaryCtaLabelEn: decodeText(raw.aboutPage?.primaryCtaLabelEn, DEFAULT_SITE_CONTENT.aboutPage.primaryCtaLabelEn),
      primaryCtaHref: String(raw.aboutPage?.primaryCtaHref || DEFAULT_SITE_CONTENT.aboutPage.primaryCtaHref).trim(),
      secondaryCtaLabel: decodeText(raw.aboutPage?.secondaryCtaLabel, DEFAULT_SITE_CONTENT.aboutPage.secondaryCtaLabel),
      secondaryCtaLabelEn: decodeText(raw.aboutPage?.secondaryCtaLabelEn, DEFAULT_SITE_CONTENT.aboutPage.secondaryCtaLabelEn),
      secondaryCtaHref: String(raw.aboutPage?.secondaryCtaHref || DEFAULT_SITE_CONTENT.aboutPage.secondaryCtaHref).trim(),
      secondaryImage: String(raw.aboutPage?.secondaryImage || DEFAULT_SITE_CONTENT.aboutPage.secondaryImage).trim(),
      secondaryImageAlt: decodeText(raw.aboutPage?.secondaryImageAlt, DEFAULT_SITE_CONTENT.aboutPage.secondaryImageAlt),
      secondaryImageAltEn: decodeText(raw.aboutPage?.secondaryImageAltEn, DEFAULT_SITE_CONTENT.aboutPage.secondaryImageAltEn),
    },
    stores: normalizeStores(raw.stores, DEFAULT_SITE_CONTENT.stores),
  };
}

const getSiteContentCached = unstable_cache(async () => readSiteContentUncached(), ["site-content-v1"], {
  revalidate: 300,
  tags: [SITE_CONTENT_CACHE_TAG],
});

export async function getSiteContent(): Promise<SiteContent> {
  return getSiteContentCached();
}

export async function updateSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getSiteContent();
  const next: SiteContent = {
    navigation: {
      items: patch.navigation == null ? current.navigation.items : normalizeNavItems(patch.navigation.items, current.navigation.items),
    },
    footer: {
      eyebrow: patch.footer?.eyebrow == null ? current.footer.eyebrow : decodeText(patch.footer.eyebrow, current.footer.eyebrow),
      eyebrowEn: patch.footer?.eyebrowEn == null ? current.footer.eyebrowEn : decodeText(patch.footer.eyebrowEn, current.footer.eyebrowEn),
      brandCopy: patch.footer?.brandCopy == null ? current.footer.brandCopy : decodeText(patch.footer.brandCopy, current.footer.brandCopy),
      brandCopyEn: patch.footer?.brandCopyEn == null ? current.footer.brandCopyEn : decodeText(patch.footer.brandCopyEn, current.footer.brandCopyEn),
      instagramUrl: patch.footer?.instagramUrl == null ? current.footer.instagramUrl : String(patch.footer.instagramUrl).trim() || current.footer.instagramUrl,
      bottomTagline: patch.footer?.bottomTagline == null ? current.footer.bottomTagline : decodeText(patch.footer.bottomTagline, current.footer.bottomTagline),
      bottomTaglineEn: patch.footer?.bottomTaglineEn == null ? current.footer.bottomTaglineEn : decodeText(patch.footer.bottomTaglineEn, current.footer.bottomTaglineEn),
      groups: patch.footer?.groups == null ? current.footer.groups : normalizeFooterGroups(patch.footer.groups, current.footer.groups),
    },
    contactPage: {
      title: patch.contactPage?.title == null ? current.contactPage.title : decodeText(patch.contactPage.title, current.contactPage.title),
      titleEn: patch.contactPage?.titleEn == null ? current.contactPage.titleEn : decodeText(patch.contactPage.titleEn, current.contactPage.titleEn),
      intro: patch.contactPage?.intro == null ? current.contactPage.intro : decodeText(patch.contactPage.intro, current.contactPage.intro),
      introEn: patch.contactPage?.introEn == null ? current.contactPage.introEn : decodeText(patch.contactPage.introEn, current.contactPage.introEn),
      detailsTitle: patch.contactPage?.detailsTitle == null ? current.contactPage.detailsTitle : decodeText(patch.contactPage.detailsTitle, current.contactPage.detailsTitle),
      detailsTitleEn: patch.contactPage?.detailsTitleEn == null ? current.contactPage.detailsTitleEn : decodeText(patch.contactPage.detailsTitleEn, current.contactPage.detailsTitleEn),
      formTitle: patch.contactPage?.formTitle == null ? current.contactPage.formTitle : decodeText(patch.contactPage.formTitle, current.contactPage.formTitle),
      formTitleEn: patch.contactPage?.formTitleEn == null ? current.contactPage.formTitleEn : decodeText(patch.contactPage.formTitleEn, current.contactPage.formTitleEn),
      preferredStorePlaceholder: patch.contactPage?.preferredStorePlaceholder == null ? current.contactPage.preferredStorePlaceholder : decodeText(patch.contactPage.preferredStorePlaceholder, current.contactPage.preferredStorePlaceholder),
      preferredStorePlaceholderEn: patch.contactPage?.preferredStorePlaceholderEn == null ? current.contactPage.preferredStorePlaceholderEn : decodeText(patch.contactPage.preferredStorePlaceholderEn, current.contactPage.preferredStorePlaceholderEn),
      onlineOptionLabel: patch.contactPage?.onlineOptionLabel == null ? current.contactPage.onlineOptionLabel : decodeText(patch.contactPage.onlineOptionLabel, current.contactPage.onlineOptionLabel),
      onlineOptionLabelEn: patch.contactPage?.onlineOptionLabelEn == null ? current.contactPage.onlineOptionLabelEn : decodeText(patch.contactPage.onlineOptionLabelEn, current.contactPage.onlineOptionLabelEn),
      submitLabel: patch.contactPage?.submitLabel == null ? current.contactPage.submitLabel : decodeText(patch.contactPage.submitLabel, current.contactPage.submitLabel),
      submitLabelEn: patch.contactPage?.submitLabelEn == null ? current.contactPage.submitLabelEn : decodeText(patch.contactPage.submitLabelEn, current.contactPage.submitLabelEn),
    },
    storesPage: {
      title: patch.storesPage?.title == null ? current.storesPage.title : decodeText(patch.storesPage.title, current.storesPage.title),
      titleEn: patch.storesPage?.titleEn == null ? current.storesPage.titleEn : decodeText(patch.storesPage.titleEn, current.storesPage.titleEn),
      intro: patch.storesPage?.intro == null ? current.storesPage.intro : decodeText(patch.storesPage.intro, current.storesPage.intro),
      introEn: patch.storesPage?.introEn == null ? current.storesPage.introEn : decodeText(patch.storesPage.introEn, current.storesPage.introEn),
      callCtaLabel: patch.storesPage?.callCtaLabel == null ? current.storesPage.callCtaLabel : decodeText(patch.storesPage.callCtaLabel, current.storesPage.callCtaLabel),
      callCtaLabelEn: patch.storesPage?.callCtaLabelEn == null ? current.storesPage.callCtaLabelEn : decodeText(patch.storesPage.callCtaLabelEn, current.storesPage.callCtaLabelEn),
      contactCardTitle: patch.storesPage?.contactCardTitle == null ? current.storesPage.contactCardTitle : decodeText(patch.storesPage.contactCardTitle, current.storesPage.contactCardTitle),
      contactCardTitleEn: patch.storesPage?.contactCardTitleEn == null ? current.storesPage.contactCardTitleEn : decodeText(patch.storesPage.contactCardTitleEn, current.storesPage.contactCardTitleEn),
      hoursCardTitle: patch.storesPage?.hoursCardTitle == null ? current.storesPage.hoursCardTitle : decodeText(patch.storesPage.hoursCardTitle, current.storesPage.hoursCardTitle),
      hoursCardTitleEn: patch.storesPage?.hoursCardTitleEn == null ? current.storesPage.hoursCardTitleEn : decodeText(patch.storesPage.hoursCardTitleEn, current.storesPage.hoursCardTitleEn),
    },
    aboutPage: {
      heroImage: patch.aboutPage?.heroImage == null ? current.aboutPage.heroImage : String(patch.aboutPage.heroImage).trim() || current.aboutPage.heroImage,
      heroAlt: patch.aboutPage?.heroAlt == null ? current.aboutPage.heroAlt : decodeText(patch.aboutPage.heroAlt, current.aboutPage.heroAlt),
      heroAltEn: patch.aboutPage?.heroAltEn == null ? current.aboutPage.heroAltEn : decodeText(patch.aboutPage.heroAltEn, current.aboutPage.heroAltEn),
      heroTitle: patch.aboutPage?.heroTitle == null ? current.aboutPage.heroTitle : decodeText(patch.aboutPage.heroTitle, current.aboutPage.heroTitle),
      heroTitleEn: patch.aboutPage?.heroTitleEn == null ? current.aboutPage.heroTitleEn : decodeText(patch.aboutPage.heroTitleEn, current.aboutPage.heroTitleEn),
      heroSubtitle: patch.aboutPage?.heroSubtitle == null ? current.aboutPage.heroSubtitle : decodeText(patch.aboutPage.heroSubtitle, current.aboutPage.heroSubtitle),
      heroSubtitleEn: patch.aboutPage?.heroSubtitleEn == null ? current.aboutPage.heroSubtitleEn : decodeText(patch.aboutPage.heroSubtitleEn, current.aboutPage.heroSubtitleEn),
      introTitle: patch.aboutPage?.introTitle == null ? current.aboutPage.introTitle : decodeText(patch.aboutPage.introTitle, current.aboutPage.introTitle),
      introTitleEn: patch.aboutPage?.introTitleEn == null ? current.aboutPage.introTitleEn : decodeText(patch.aboutPage.introTitleEn, current.aboutPage.introTitleEn),
      paragraphs: patch.aboutPage?.paragraphs == null ? current.aboutPage.paragraphs : normalizeTextList(patch.aboutPage.paragraphs, current.aboutPage.paragraphs, 12),
      paragraphsEn: patch.aboutPage?.paragraphsEn == null ? current.aboutPage.paragraphsEn : normalizeTextList(patch.aboutPage.paragraphsEn, current.aboutPage.paragraphsEn, 12),
      primaryCtaLabel: patch.aboutPage?.primaryCtaLabel == null ? current.aboutPage.primaryCtaLabel : decodeText(patch.aboutPage.primaryCtaLabel, current.aboutPage.primaryCtaLabel),
      primaryCtaLabelEn: patch.aboutPage?.primaryCtaLabelEn == null ? current.aboutPage.primaryCtaLabelEn : decodeText(patch.aboutPage.primaryCtaLabelEn, current.aboutPage.primaryCtaLabelEn),
      primaryCtaHref: patch.aboutPage?.primaryCtaHref == null ? current.aboutPage.primaryCtaHref : String(patch.aboutPage.primaryCtaHref).trim() || current.aboutPage.primaryCtaHref,
      secondaryCtaLabel: patch.aboutPage?.secondaryCtaLabel == null ? current.aboutPage.secondaryCtaLabel : decodeText(patch.aboutPage.secondaryCtaLabel, current.aboutPage.secondaryCtaLabel),
      secondaryCtaLabelEn: patch.aboutPage?.secondaryCtaLabelEn == null ? current.aboutPage.secondaryCtaLabelEn : decodeText(patch.aboutPage.secondaryCtaLabelEn, current.aboutPage.secondaryCtaLabelEn),
      secondaryCtaHref: patch.aboutPage?.secondaryCtaHref == null ? current.aboutPage.secondaryCtaHref : String(patch.aboutPage.secondaryCtaHref).trim() || current.aboutPage.secondaryCtaHref,
      secondaryImage: patch.aboutPage?.secondaryImage == null ? current.aboutPage.secondaryImage : String(patch.aboutPage.secondaryImage).trim() || current.aboutPage.secondaryImage,
      secondaryImageAlt: patch.aboutPage?.secondaryImageAlt == null ? current.aboutPage.secondaryImageAlt : decodeText(patch.aboutPage.secondaryImageAlt, current.aboutPage.secondaryImageAlt),
      secondaryImageAltEn: patch.aboutPage?.secondaryImageAltEn == null ? current.aboutPage.secondaryImageAltEn : decodeText(patch.aboutPage.secondaryImageAltEn, current.aboutPage.secondaryImageAltEn),
    },
    stores: patch.stores == null ? current.stores : normalizeStores(patch.stores, current.stores),
  };
  await writePersistentJsonFile(SITE_CONTENT_PATH, next);
  revalidateTag(SITE_CONTENT_CACHE_TAG);
  return next;
}
