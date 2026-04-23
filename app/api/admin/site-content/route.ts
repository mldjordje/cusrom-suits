import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  getSiteContent,
  updateSiteContent,
  type SiteAboutPageContent,
  type SiteAnnouncementsContent,
  type SiteContactPageContent,
  type SiteFooterContent,
  type SiteNavItem,
  type SiteStoreLocation,
  type SiteStoresPageContent,
  type SiteTestimonial,
  type SiteTestimonialsContent,
} from "@/lib/storefront/siteContent";

type SiteContentPatch = {
  navigation?: { items: SiteNavItem[] };
  footer?: SiteFooterContent;
  contactPage?: SiteContactPageContent;
  storesPage?: SiteStoresPageContent;
  aboutPage?: SiteAboutPageContent;
  stores?: SiteStoreLocation[];
  announcements?: SiteAnnouncementsContent;
  testimonials?: SiteTestimonialsContent;
};

const parseTextList = (value: unknown, max = 12) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, max);
};

const parseNavItems = (value: unknown): SiteNavItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const href = String(row.href || "").trim();
      const label = String(row.label || "").trim();
      const labelEn = String(row.labelEn || "").trim();
      if (!href || !label) return null;
      return { href, label, labelEn: labelEn || label };
    })
    .filter((item): item is SiteNavItem => Boolean(item))
    .slice(0, 24);
};

const parseFooter = (value: unknown): SiteFooterContent | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  return {
    eyebrow: String(row.eyebrow || "").trim(),
    eyebrowEn: String(row.eyebrowEn || "").trim(),
    brandCopy: String(row.brandCopy || "").trim(),
    brandCopyEn: String(row.brandCopyEn || "").trim(),
    instagramUrl: String(row.instagramUrl || "").trim(),
    facebookUrl: String(row.facebookUrl || "").trim(),
    bottomTagline: String(row.bottomTagline || "").trim(),
    bottomTaglineEn: String(row.bottomTaglineEn || "").trim(),
    groups: Array.isArray(row.groups)
      ? row.groups
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as Record<string, unknown>;
            const title = String(entry.title || "").trim();
            const titleEn = String(entry.titleEn || "").trim();
            const links = parseNavItems(entry.links);
            if (!title || !links.length) return null;
            return { title, titleEn: titleEn || title, links };
          })
          .filter((item): item is NonNullable<SiteFooterContent["groups"][number]> => Boolean(item))
          .slice(0, 12)
      : [],
  };
};

const parseStores = (value: unknown): SiteStoreLocation[] => {
  if (!Array.isArray(value)) return [];
  return value.reduce<SiteStoreLocation[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const row = item as Record<string, unknown>;
    const slug = String(row.slug || "").trim();
    const city = String(row.city || "").trim();
    const cityEn = String(row.cityEn || "").trim();
    const title = String(row.title || "").trim();
    const titleEn = String(row.titleEn || "").trim();
    const address = String(row.address || "").trim();
    const addressEn = String(row.addressEn || "").trim();
    const mapLabel = String(row.mapLabel || "").trim();
    const phone = String(row.phone || "").trim();
    const landline = String(row.landline || "").trim();
    const email = String(row.email || "").trim();
    const hours = parseTextList(row.hours);
    const hoursEn = parseTextList(row.hoursEn);
    const mapEmbedUrl = String(row.mapEmbedUrl || "").trim();

    if (!slug || !city || !title || !address || !phone || !email || !mapEmbedUrl) return acc;

    acc.push({
      slug,
      city,
      cityEn: cityEn || city,
      title,
      titleEn: titleEn || title,
      address,
      addressEn: addressEn || address,
      mapLabel,
      phone,
      landline: landline || undefined,
      email,
      hours,
      hoursEn: hoursEn.length ? hoursEn : hours,
      mapEmbedUrl,
    });
    return acc;
  }, []).slice(0, 12);
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const content = await getSiteContent();
  return NextResponse.json({ success: true, content });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }

  const row = payload as Record<string, unknown>;
  const patch: SiteContentPatch = {};

  if ("navigation" in row && row.navigation && typeof row.navigation === "object") {
    patch.navigation = { items: parseNavItems((row.navigation as Record<string, unknown>).items) };
  }
  if ("footer" in row) patch.footer = parseFooter(row.footer);
  if ("contactPage" in row && row.contactPage && typeof row.contactPage === "object") {
    const value = row.contactPage as Record<string, unknown>;
    patch.contactPage = {
      title: String(value.title || "").trim(),
      titleEn: String(value.titleEn || "").trim(),
      intro: String(value.intro || "").trim(),
      introEn: String(value.introEn || "").trim(),
      detailsTitle: String(value.detailsTitle || "").trim(),
      detailsTitleEn: String(value.detailsTitleEn || "").trim(),
      formTitle: String(value.formTitle || "").trim(),
      formTitleEn: String(value.formTitleEn || "").trim(),
      preferredStorePlaceholder: String(value.preferredStorePlaceholder || "").trim(),
      preferredStorePlaceholderEn: String(value.preferredStorePlaceholderEn || "").trim(),
      onlineOptionLabel: String(value.onlineOptionLabel || "").trim(),
      onlineOptionLabelEn: String(value.onlineOptionLabelEn || "").trim(),
      submitLabel: String(value.submitLabel || "").trim(),
      submitLabelEn: String(value.submitLabelEn || "").trim(),
    };
  }
  if ("storesPage" in row && row.storesPage && typeof row.storesPage === "object") {
    const value = row.storesPage as Record<string, unknown>;
    patch.storesPage = {
      title: String(value.title || "").trim(),
      titleEn: String(value.titleEn || "").trim(),
      intro: String(value.intro || "").trim(),
      introEn: String(value.introEn || "").trim(),
      callCtaLabel: String(value.callCtaLabel || "").trim(),
      callCtaLabelEn: String(value.callCtaLabelEn || "").trim(),
      contactCardTitle: String(value.contactCardTitle || "").trim(),
      contactCardTitleEn: String(value.contactCardTitleEn || "").trim(),
      hoursCardTitle: String(value.hoursCardTitle || "").trim(),
      hoursCardTitleEn: String(value.hoursCardTitleEn || "").trim(),
    };
  }
  if ("aboutPage" in row && row.aboutPage && typeof row.aboutPage === "object") {
    const value = row.aboutPage as Record<string, unknown>;
    patch.aboutPage = {
      heroImage: String(value.heroImage || "").trim(),
      heroAlt: String(value.heroAlt || "").trim(),
      heroAltEn: String(value.heroAltEn || "").trim(),
      heroTitle: String(value.heroTitle || "").trim(),
      heroTitleEn: String(value.heroTitleEn || "").trim(),
      heroSubtitle: String(value.heroSubtitle || "").trim(),
      heroSubtitleEn: String(value.heroSubtitleEn || "").trim(),
      introTitle: String(value.introTitle || "").trim(),
      introTitleEn: String(value.introTitleEn || "").trim(),
      paragraphs: parseTextList(value.paragraphs),
      paragraphsEn: parseTextList(value.paragraphsEn),
      primaryCtaLabel: String(value.primaryCtaLabel || "").trim(),
      primaryCtaLabelEn: String(value.primaryCtaLabelEn || "").trim(),
      primaryCtaHref: String(value.primaryCtaHref || "").trim(),
      secondaryCtaLabel: String(value.secondaryCtaLabel || "").trim(),
      secondaryCtaLabelEn: String(value.secondaryCtaLabelEn || "").trim(),
      secondaryCtaHref: String(value.secondaryCtaHref || "").trim(),
      secondaryImage: String(value.secondaryImage || "").trim(),
      secondaryImageAlt: String(value.secondaryImageAlt || "").trim(),
      secondaryImageAltEn: String(value.secondaryImageAltEn || "").trim(),
    };
  }
  if ("stores" in row) patch.stores = parseStores(row.stores);
  if ("testimonials" in row && row.testimonials && typeof row.testimonials === "object") {
    const value = row.testimonials as Record<string, unknown>;
    const items = Array.isArray(value.items)
      ? (value.items as unknown[]).reduce<SiteTestimonial[]>((acc, item) => {
          if (!item || typeof item !== "object") return acc;
          const entry = item as Record<string, unknown>;
          const text = String(entry.text || "").trim();
          const author = String(entry.author || "").trim();
          if (!text || !author) return acc;
          const textEn = String(entry.textEn || "").trim();
          const location = String(entry.location || "").trim();
          const locationEn = String(entry.locationEn || "").trim();
          const productSku = String(entry.productSku || "").trim();
          const ratingValue = Number(entry.rating);
          const rating =
            Number.isFinite(ratingValue) && ratingValue > 0 && ratingValue <= 5
              ? Math.round(ratingValue)
              : 5;
          const id = String(entry.id || "").trim() || `t-${acc.length + 1}`;
          acc.push({ id, text, textEn: textEn || text, author, location, locationEn: locationEn || location, productSku, rating });
          return acc;
        }, []).slice(0, 24)
      : [];
    patch.testimonials = {
      enabled: value.enabled == null ? items.length > 0 : Boolean(value.enabled) && items.length > 0,
      title: String(value.title || "").trim(),
      titleEn: String(value.titleEn || "").trim(),
      items,
    };
  }
  if ("announcements" in row && row.announcements && typeof row.announcements === "object") {
    const value = row.announcements as Record<string, unknown>;
    const items = parseTextList(value.items, 6);
    const itemsEn = parseTextList(value.itemsEn, 6);
    patch.announcements = {
      enabled: value.enabled == null ? items.length > 0 : Boolean(value.enabled),
      items,
      itemsEn: itemsEn.length ? itemsEn : items,
    };
  }

  const content = await updateSiteContent(patch);
  return NextResponse.json({ success: true, content });
}
