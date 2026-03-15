import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  getLandingSettings,
  updateLandingSettings,
  type LandingDocument,
  type LandingSettings,
  type LandingUniformImage,
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
      return { title, image, alt };
    })
    .filter((item): item is LandingUniformImage => Boolean(item))
    .slice(0, 24);
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
  if ("saleSectionTitle" in row) patch.saleSectionTitle = String(row.saleSectionTitle || "");
  if ("saleSectionSubtitle" in row) patch.saleSectionSubtitle = String(row.saleSectionSubtitle || "");
  if ("heroEyebrow" in row) patch.heroEyebrow = String(row.heroEyebrow || "");
  if ("heroTitleLine1" in row) patch.heroTitleLine1 = String(row.heroTitleLine1 || "");
  if ("heroTitleLine2" in row) patch.heroTitleLine2 = String(row.heroTitleLine2 || "");
  if ("heroPrimaryCtaLabel" in row) patch.heroPrimaryCtaLabel = String(row.heroPrimaryCtaLabel || "");
  if ("heroPrimaryCtaHref" in row) patch.heroPrimaryCtaHref = String(row.heroPrimaryCtaHref || "");
  if ("heroSecondaryCtaLabel" in row) patch.heroSecondaryCtaLabel = String(row.heroSecondaryCtaLabel || "");
  if ("heroSecondaryCtaHref" in row) patch.heroSecondaryCtaHref = String(row.heroSecondaryCtaHref || "");
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
  if ("shopHeroEyebrow" in row) patch.shopHeroEyebrow = String(row.shopHeroEyebrow || "");
  if ("shopHeroTitle" in row) patch.shopHeroTitle = String(row.shopHeroTitle || "");
  if ("shopHeroLead" in row) patch.shopHeroLead = String(row.shopHeroLead || "");
  if ("shopHeroImage" in row) patch.shopHeroImage = String(row.shopHeroImage || "");
  if ("heroStripProductIds" in row) patch.heroStripProductIds = parseIdList(row.heroStripProductIds);
  if ("highlightedProductIds" in row) patch.highlightedProductIds = parseIdList(row.highlightedProductIds);
  if ("popularProductIds" in row) patch.popularProductIds = parseIdList(row.popularProductIds);
  if ("arrivalsProductIds" in row) patch.arrivalsProductIds = parseIdList(row.arrivalsProductIds);
  if ("saleProductIds" in row) patch.saleProductIds = parseIdList(row.saleProductIds);
  if ("trendingProductIds" in row) patch.trendingProductIds = parseIdList(row.trendingProductIds);

  const settings = await updateLandingSettings(patch);
  return NextResponse.json({ success: true, settings });
}
