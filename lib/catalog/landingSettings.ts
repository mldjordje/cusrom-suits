import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";

const LANDING_SETTINGS_PATH = "data/landing-settings.json";

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
};

const DEFAULT_SETTINGS: LandingSettings = {
  showSaleSection: true,
  saleSectionTitle: "Aktuelne Akcije",
  saleSectionSubtitle: "Sekcija i proizvodi se kontrolisu kroz admin.",
  heroEyebrow: "Santos and Santorini video",
  heroTitleLine1: "Nova kolekcija",
  heroTitleLine2: "2026",
  heroPrimaryCtaLabel: "Shop now",
  heroPrimaryCtaHref: "/web-shop",
  heroSecondaryCtaLabel: "Custom suits",
  heroSecondaryCtaHref: "/custom-suits",
  bannerLeftTitle: "Ready to Wear",
  bannerLeftButtonLabel: "Shop now",
  bannerLeftHref: "/web-shop",
  bannerLeftImage: "/assets/images/home/legacy/hero-1.jpg",
  bannerRightTitle: "Custom Suits",
  bannerRightButtonLabel: "Start Design",
  bannerRightHref: "/custom-suits",
  bannerRightImage: "/assets/images/home/legacy/hero-3.jpg",
};

export async function getLandingSettings(): Promise<LandingSettings> {
  const settings = await readJsonFile<Partial<LandingSettings>>(LANDING_SETTINGS_PATH, {});
  return {
    showSaleSection: settings.showSaleSection !== false,
    saleSectionTitle: String(settings.saleSectionTitle || DEFAULT_SETTINGS.saleSectionTitle),
    saleSectionSubtitle: String(settings.saleSectionSubtitle || DEFAULT_SETTINGS.saleSectionSubtitle),
    heroEyebrow: String(settings.heroEyebrow || DEFAULT_SETTINGS.heroEyebrow),
    heroTitleLine1: String(settings.heroTitleLine1 || DEFAULT_SETTINGS.heroTitleLine1),
    heroTitleLine2: String(settings.heroTitleLine2 || DEFAULT_SETTINGS.heroTitleLine2),
    heroPrimaryCtaLabel: String(settings.heroPrimaryCtaLabel || DEFAULT_SETTINGS.heroPrimaryCtaLabel),
    heroPrimaryCtaHref: String(settings.heroPrimaryCtaHref || DEFAULT_SETTINGS.heroPrimaryCtaHref),
    heroSecondaryCtaLabel: String(settings.heroSecondaryCtaLabel || DEFAULT_SETTINGS.heroSecondaryCtaLabel),
    heroSecondaryCtaHref: String(settings.heroSecondaryCtaHref || DEFAULT_SETTINGS.heroSecondaryCtaHref),
    bannerLeftTitle: String(settings.bannerLeftTitle || DEFAULT_SETTINGS.bannerLeftTitle),
    bannerLeftButtonLabel: String(settings.bannerLeftButtonLabel || DEFAULT_SETTINGS.bannerLeftButtonLabel),
    bannerLeftHref: String(settings.bannerLeftHref || DEFAULT_SETTINGS.bannerLeftHref),
    bannerLeftImage: String(settings.bannerLeftImage || DEFAULT_SETTINGS.bannerLeftImage),
    bannerRightTitle: String(settings.bannerRightTitle || DEFAULT_SETTINGS.bannerRightTitle),
    bannerRightButtonLabel: String(settings.bannerRightButtonLabel || DEFAULT_SETTINGS.bannerRightButtonLabel),
    bannerRightHref: String(settings.bannerRightHref || DEFAULT_SETTINGS.bannerRightHref),
    bannerRightImage: String(settings.bannerRightImage || DEFAULT_SETTINGS.bannerRightImage),
  };
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
  };
  await writeJsonFile(LANDING_SETTINGS_PATH, next);
  return next;
}
