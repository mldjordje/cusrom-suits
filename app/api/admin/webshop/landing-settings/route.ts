import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getLandingSettings, updateLandingSettings } from "@/lib/catalog/landingSettings";

type PatchPayload = {
  showSaleSection?: boolean;
  saleSectionTitle?: string;
  saleSectionSubtitle?: string;
  heroEyebrow?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroPrimaryCtaLabel?: string;
  heroPrimaryCtaHref?: string;
  heroSecondaryCtaLabel?: string;
  heroSecondaryCtaHref?: string;
  bannerLeftTitle?: string;
  bannerLeftButtonLabel?: string;
  bannerLeftHref?: string;
  bannerLeftImage?: string;
  bannerRightTitle?: string;
  bannerRightButtonLabel?: string;
  bannerRightHref?: string;
  bannerRightImage?: string;
  heroStripProductIds?: number[];
  highlightedProductIds?: number[];
  popularProductIds?: number[];
  arrivalsProductIds?: number[];
  saleProductIds?: number[];
  trendingProductIds?: number[];
};

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
  if ("heroStripProductIds" in row) patch.heroStripProductIds = parseIdList(row.heroStripProductIds);
  if ("highlightedProductIds" in row) patch.highlightedProductIds = parseIdList(row.highlightedProductIds);
  if ("popularProductIds" in row) patch.popularProductIds = parseIdList(row.popularProductIds);
  if ("arrivalsProductIds" in row) patch.arrivalsProductIds = parseIdList(row.arrivalsProductIds);
  if ("saleProductIds" in row) patch.saleProductIds = parseIdList(row.saleProductIds);
  if ("trendingProductIds" in row) patch.trendingProductIds = parseIdList(row.trendingProductIds);

  const settings = await updateLandingSettings(patch);
  return NextResponse.json({ success: true, settings });
}
