import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  normalizeLandingCustomSections,
  normalizeLandingProductSectionContent,
  normalizeLandingProductSections,
} from "@/lib/catalog/landingSections";
import { normalizeLandingFixedSections } from "@/lib/catalog/landingPageSections";
import {
  getLandingSettings,
  type LandingCategoryTile,
  type LandingContactPoint,
  updateLandingSettings,
  type LandingDocument,
  type LandingSettings,
  type LandingStoryCard,
  type LandingUniformImage,
  type LandingUniformVideo,
} from "@/lib/catalog/landingSettings";

type PatchPayload = Partial<LandingSettings>;

const parseIdList = (value: unknown): number[] => {
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
  }
  return Array.from(unique);
};

const parseDocuments = (value: unknown): LandingDocument[] => {
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
    .slice(0, 24);
};

const parseUniformImages = (value: unknown): LandingUniformImage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const title = String(entry.title || "").trim();
      const image = String(entry.image || "").trim();
      const alt = String(entry.alt || "").trim();
      if (!title && !image && !alt) return null;
      const gallery = Array.isArray(entry.gallery)
        ? (entry.gallery as unknown[]).map((g) => String(g || "").trim()).filter((g) => g.length > 0)
        : undefined;
      return { title, image, alt, ...(gallery && gallery.length ? { gallery } : {}) };
    })
    .filter((item): item is LandingUniformImage => Boolean(item))
    .slice(0, 24);
};

const parseUniformVideos = (value: unknown): LandingUniformVideo[] => {
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
    .slice(0, 24);
};

const parseStringList = (value: unknown, max = 12): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
};

const parseCategoryTiles = (value: unknown): LandingCategoryTile[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const label = String(entry.label || "").trim();
      const image = String(entry.image || "").trim();
      if (!label && !image) return null;
      return {
        id: String(entry.id || `category-${index + 1}`).trim() || `category-${index + 1}`,
        label,
        labelEn: String(entry.labelEn || "").trim(),
        href: String(entry.href || "").trim() || "/web-shop",
        image,
      };
    })
    .filter((item): item is LandingCategoryTile => Boolean(item))
    .slice(0, 12);
};

const parseStoryCards = (value: unknown): LandingStoryCard[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      return {
        id: String(entry.id || `story-${index + 1}`).trim() || `story-${index + 1}`,
        badge: String(entry.badge || "").trim(),
        title: String(entry.title || "").trim(),
        copy: String(entry.copy || "").trim(),
        image: String(entry.image || "").trim(),
        ctaLabel: String(entry.ctaLabel || "").trim(),
        ctaHref: String(entry.ctaHref || "").trim(),
      };
    })
    .filter((item): item is LandingStoryCard => Boolean(item))
    .slice(0, 6);
};

const parseContactPoints = (value: unknown): LandingContactPoint[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as Record<string, unknown>;
      const label = String(entry.label || "").trim();
      const valueText = String(entry.value || "").trim();
      if (!label && !valueText) return null;
      return { label, value: valueText };
    })
    .filter((item): item is LandingContactPoint => Boolean(item))
    .slice(0, 12);
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const settings = await getLandingSettings();
  return NextResponse.json({ success: true, settings });
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
  const patch: PatchPayload = {};
  if ("showSaleSection" in row) patch.showSaleSection = Boolean(row.showSaleSection);
  if ("fixedSections" in row) patch.fixedSections = normalizeLandingFixedSections(row.fixedSections);
  if ("productSections" in row) patch.productSections = normalizeLandingProductSections(row.productSections);
  if ("productSectionContent" in row) patch.productSectionContent = normalizeLandingProductSectionContent(row.productSectionContent);
  if ("customSections" in row) patch.customSections = normalizeLandingCustomSections(row.customSections);
  if ("saleSectionTitle" in row) patch.saleSectionTitle = String(row.saleSectionTitle || "");
  if ("saleSectionSubtitle" in row) patch.saleSectionSubtitle = String(row.saleSectionSubtitle || "");
  if ("heroEyebrow" in row) patch.heroEyebrow = String(row.heroEyebrow || "");
  if ("heroTitleLine1" in row) patch.heroTitleLine1 = String(row.heroTitleLine1 || "");
  if ("heroTitleLine2" in row) patch.heroTitleLine2 = String(row.heroTitleLine2 || "");
  if ("heroPrimaryCtaLabel" in row) patch.heroPrimaryCtaLabel = String(row.heroPrimaryCtaLabel || "");
  if ("heroPrimaryCtaHref" in row) patch.heroPrimaryCtaHref = String(row.heroPrimaryCtaHref || "");
  if ("heroSecondaryCtaLabel" in row) patch.heroSecondaryCtaLabel = String(row.heroSecondaryCtaLabel || "");
  if ("heroSecondaryCtaHref" in row) patch.heroSecondaryCtaHref = String(row.heroSecondaryCtaHref || "");
  if ("heroTextColor" in row) patch.heroTextColor = String(row.heroTextColor || "");
  if ("navLinkColor" in row) patch.navLinkColor = String(row.navLinkColor || "");
  if ("bannerLeftTitle" in row) patch.bannerLeftTitle = String(row.bannerLeftTitle || "");
  if ("bannerLeftButtonLabel" in row) patch.bannerLeftButtonLabel = String(row.bannerLeftButtonLabel || "");
  if ("bannerLeftHref" in row) patch.bannerLeftHref = String(row.bannerLeftHref || "");
  if ("bannerLeftImage" in row) patch.bannerLeftImage = String(row.bannerLeftImage || "");
  if ("bannerRightTitle" in row) patch.bannerRightTitle = String(row.bannerRightTitle || "");
  if ("bannerRightButtonLabel" in row) patch.bannerRightButtonLabel = String(row.bannerRightButtonLabel || "");
  if ("bannerRightHref" in row) patch.bannerRightHref = String(row.bannerRightHref || "");
  if ("bannerRightImage" in row) patch.bannerRightImage = String(row.bannerRightImage || "");
  if ("companyMb" in row) patch.companyMb = String(row.companyMb || "");
  if ("companyPib" in row) patch.companyPib = String(row.companyPib || "");
  if ("customerRightsTitle" in row) patch.customerRightsTitle = String(row.customerRightsTitle || "");
  if ("customerRightsText" in row) patch.customerRightsText = String(row.customerRightsText || "");
  if ("purchaseGuideTitle" in row) patch.purchaseGuideTitle = String(row.purchaseGuideTitle || "");
  if ("purchaseGuideText" in row) patch.purchaseGuideText = String(row.purchaseGuideText || "");
  if ("documentsTitle" in row) patch.documentsTitle = String(row.documentsTitle || "");
  if ("documentsSubtitle" in row) patch.documentsSubtitle = String(row.documentsSubtitle || "");
  if ("documents" in row) patch.documents = parseDocuments(row.documents);
  if ("uniformsEyebrow" in row) patch.uniformsEyebrow = String(row.uniformsEyebrow || "");
  if ("uniformsTitle" in row) patch.uniformsTitle = String(row.uniformsTitle || "");
  if ("uniformsText" in row) patch.uniformsText = String(row.uniformsText || "");
  if ("uniformsCtaLabel" in row) patch.uniformsCtaLabel = String(row.uniformsCtaLabel || "");
  if ("uniformsCtaHref" in row) patch.uniformsCtaHref = String(row.uniformsCtaHref || "");
  if ("uniformsImages" in row) patch.uniformsImages = parseUniformImages(row.uniformsImages);
  if ("uniformsVideos" in row) patch.uniformsVideos = parseUniformVideos(row.uniformsVideos);
  if ("shopHeroEyebrow" in row) patch.shopHeroEyebrow = String(row.shopHeroEyebrow || "");
  if ("shopHeroTitle" in row) patch.shopHeroTitle = String(row.shopHeroTitle || "");
  if ("shopHeroLead" in row) patch.shopHeroLead = String(row.shopHeroLead || "");
  if ("shopHeroSections" in row && Array.isArray(row.shopHeroSections)) {
    patch.shopHeroSections = row.shopHeroSections as LandingSettings["shopHeroSections"];
  }
  if ("shopHeroImage" in row) patch.shopHeroImage = String(row.shopHeroImage || "");
  if ("shopHeroShowPromo" in row) patch.shopHeroShowPromo = Boolean(row.shopHeroShowPromo);
  if ("shopHeroPromoLabel" in row) patch.shopHeroPromoLabel = String(row.shopHeroPromoLabel || "");
  if ("shopHeroPromoHref" in row) patch.shopHeroPromoHref = String(row.shopHeroPromoHref || "");
  if ("storySectionTitle" in row) patch.storySectionTitle = String(row.storySectionTitle || "");
  if ("storySectionCtaLabel" in row) patch.storySectionCtaLabel = String(row.storySectionCtaLabel || "");
  if ("storySectionCtaHref" in row) patch.storySectionCtaHref = String(row.storySectionCtaHref || "");
  if ("storyCards" in row) patch.storyCards = parseStoryCards(row.storyCards);
  if ("categoryTiles" in row) patch.categoryTiles = parseCategoryTiles(row.categoryTiles);
  if ("aboutEyebrow" in row) patch.aboutEyebrow = String(row.aboutEyebrow || "");
  if ("aboutTitle" in row) patch.aboutTitle = String(row.aboutTitle || "");
  if ("aboutParagraphs" in row) patch.aboutParagraphs = parseStringList(row.aboutParagraphs, 6);
  if ("aboutPrimaryCtaLabel" in row) patch.aboutPrimaryCtaLabel = String(row.aboutPrimaryCtaLabel || "");
  if ("aboutPrimaryCtaHref" in row) patch.aboutPrimaryCtaHref = String(row.aboutPrimaryCtaHref || "");
  if ("aboutSecondaryCtaLabel" in row) patch.aboutSecondaryCtaLabel = String(row.aboutSecondaryCtaLabel || "");
  if ("aboutSecondaryCtaHref" in row) patch.aboutSecondaryCtaHref = String(row.aboutSecondaryCtaHref || "");
  if ("contactEyebrow" in row) patch.contactEyebrow = String(row.contactEyebrow || "");
  if ("contactTitle" in row) patch.contactTitle = String(row.contactTitle || "");
  if ("contactText" in row) patch.contactText = String(row.contactText || "");
  if ("contactPoints" in row) patch.contactPoints = parseContactPoints(row.contactPoints);
  if ("contactPrimaryCtaLabel" in row) patch.contactPrimaryCtaLabel = String(row.contactPrimaryCtaLabel || "");
  if ("contactPrimaryCtaHref" in row) patch.contactPrimaryCtaHref = String(row.contactPrimaryCtaHref || "");
  if ("contactSecondaryCtaLabel" in row) patch.contactSecondaryCtaLabel = String(row.contactSecondaryCtaLabel || "");
  if ("contactSecondaryCtaHref" in row) patch.contactSecondaryCtaHref = String(row.contactSecondaryCtaHref || "");
  if ("customerInfoEyebrow" in row) patch.customerInfoEyebrow = String(row.customerInfoEyebrow || "");
  if ("customerInfoTitle" in row) patch.customerInfoTitle = String(row.customerInfoTitle || "");
  if ("customerInfoPrimaryCtaLabel" in row) patch.customerInfoPrimaryCtaLabel = String(row.customerInfoPrimaryCtaLabel || "");
  if ("customerInfoPrimaryCtaHref" in row) patch.customerInfoPrimaryCtaHref = String(row.customerInfoPrimaryCtaHref || "");
  if ("customerInfoSecondaryCtaLabel" in row) patch.customerInfoSecondaryCtaLabel = String(row.customerInfoSecondaryCtaLabel || "");
  if ("customerInfoSecondaryCtaHref" in row) patch.customerInfoSecondaryCtaHref = String(row.customerInfoSecondaryCtaHref || "");
  if ("companyDetailsEyebrow" in row) patch.companyDetailsEyebrow = String(row.companyDetailsEyebrow || "");
  if ("companyPibLabel" in row) patch.companyPibLabel = String(row.companyPibLabel || "");
  if ("companyMbLabel" in row) patch.companyMbLabel = String(row.companyMbLabel || "");
  if ("documentsEmptyText" in row) patch.documentsEmptyText = String(row.documentsEmptyText || "");
  if ("blogSectionTitle" in row) patch.blogSectionTitle = String(row.blogSectionTitle || "");
  if ("blogSectionCtaLabel" in row) patch.blogSectionCtaLabel = String(row.blogSectionCtaLabel || "");
  if ("blogSectionCtaHref" in row) patch.blogSectionCtaHref = String(row.blogSectionCtaHref || "");
  if ("heroVideoUrl" in row) patch.heroVideoUrl = String(row.heroVideoUrl || "");
  if ("heroVideoMobileUrl" in row) patch.heroVideoMobileUrl = String(row.heroVideoMobileUrl || "");
  if ("heroVideoPosterUrl" in row) patch.heroVideoPosterUrl = String(row.heroVideoPosterUrl || "");
  if ("heroStripProductIds" in row) patch.heroStripProductIds = parseIdList(row.heroStripProductIds);
  if ("highlightedProductIds" in row) patch.highlightedProductIds = parseIdList(row.highlightedProductIds);
  if ("popularProductIds" in row) patch.popularProductIds = parseIdList(row.popularProductIds);
  if ("arrivalsProductIds" in row) patch.arrivalsProductIds = parseIdList(row.arrivalsProductIds);
  if ("saleProductIds" in row) patch.saleProductIds = parseIdList(row.saleProductIds);
  if ("trendingProductIds" in row) patch.trendingProductIds = parseIdList(row.trendingProductIds);

  const settings = await updateLandingSettings(patch);
  return NextResponse.json({ success: true, settings });
}
