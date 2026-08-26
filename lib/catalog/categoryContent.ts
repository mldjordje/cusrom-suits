/**
 * Per-category presentation settings the admin edits without a deploy.
 *
 * Three unrelated complaints share one root cause — the storefront hard-codes a
 * single answer for every category:
 *
 *  - Suit photos are portrait and the card stage is 1:1 on `cover`, so trousers
 *    and shoes get cropped away. Accessories are landscape and need the
 *    opposite treatment. There is no single ratio that serves both.
 *  - The shop hero (with its "Kolekcija" / "Akcija" pills) is the same block on
 *    every category page, and the client wants a different video per category.
 *  - The size guide is offered on cufflinks and belts, which have no sizes.
 *
 * Rather than encode one more guess per category in code, each of those is a
 * stored knob here. Everything defaults to `inherit`/`auto`, so a category with
 * no entry renders exactly as it did before this file existed.
 */

/** How a product photo is fitted into its stage. */
export type CategoryImageFit = "cover" | "contain";

/** Named stage shapes. `auto` means "inherit the site-wide --ss-product-ratio". */
export type CategoryImageRatio = "auto" | "1-1" | "4-5" | "3-4" | "2-3" | "5-4" | "3-2";

/** Vertical anchor for the visible part of a cropped photo. */
export type CategoryImageFocus = "top" | "center" | "bottom";

export type CategoryHeroMedia = "inherit" | "image" | "video";

export type CategorySizeGuideMode = "auto" | "text" | "off";

export type CategoryContentEntry = {
  /** Slugified category or auto-group name — see `categoryContentKey`. */
  key: string;
  /** Human label, stored so the admin list can name keys the catalog no longer returns. */
  label: string;

  imageRatio: CategoryImageRatio;
  imageFit: CategoryImageFit;
  imageFocus: CategoryImageFocus;
  /** Painted behind a `contain` photo, where the stage is wider than the image. */
  imageBackground: string;

  heroMedia: CategoryHeroMedia;
  heroImage: string;
  heroVideoUrl: string;
  heroVideoPoster: string;
  heroTitle: string;
  heroTitleEn: string;
  heroLead: string;
  heroLeadEn: string;
  /** The "Kolekcija" / "Akcija" pills. Off by default on category pages. */
  showHeroActions: boolean;

  sizeGuideMode: CategorySizeGuideMode;
  sizeGuideText: string;
  sizeGuideTextEn: string;

  updatedAt: string;
};

export type CategoryContentSettings = Record<string, CategoryContentEntry>;

/** Numeric `aspect-ratio` value for each named shape. */
export const CATEGORY_IMAGE_RATIO_VALUES: Record<Exclude<CategoryImageRatio, "auto">, number> = {
  "1-1": 1,
  "4-5": 4 / 5,
  "3-4": 3 / 4,
  "2-3": 2 / 3,
  "5-4": 5 / 4,
  "3-2": 3 / 2,
};

export const CATEGORY_IMAGE_RATIO_OPTIONS: Array<{
  value: CategoryImageRatio;
  label: string;
  hint: string;
}> = [
  { value: "auto", label: "Automatski", hint: "Prema kategoriji: odela uspravno, ostalo kvadrat" },
  { value: "1-1", label: "1:1 kvadrat", hint: "Aksesoari, detalji" },
  { value: "4-5", label: "4:5 blago uspravno", hint: "Košulje, džemperi" },
  { value: "3-4", label: "3:4 uspravno", hint: "Sakoi, kaputi" },
  { value: "2-3", label: "2:3 visoko", hint: "Odela — ceo čovek sa cipelama" },
  { value: "5-4", label: "5:4 blago položeno", hint: "Kaiševi, novčanici" },
  { value: "3-2", label: "3:2 položeno", hint: "Obuća, široki kadrovi" },
];

const RATIO_KEYS = new Set(Object.keys(CATEGORY_IMAGE_RATIO_VALUES));

/**
 * Stable lookup key for a category name.
 *
 * Deliberately derived from the name rather than from
 * `normalizeCatalogCategoryGroupKey`: that function only knows the ten shop
 * groups, so "Manžetne" and "Lančić" both collapse to "" there and could never
 * be addressed separately. Slugifying the name lets any category the admin
 * creates — now or later — carry its own settings without a code change.
 */
export const categoryContentKey = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseString = (value: unknown, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const parseEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const text = String(value ?? "").trim() as T;
  return allowed.includes(text) ? text : fallback;
};

export const makeCategoryContentEntry = (
  key: string,
  label: string,
  patch: Partial<CategoryContentEntry> = {},
): CategoryContentEntry => ({
  key,
  label,
  imageRatio: "auto",
  imageFit: "cover",
  imageFocus: "top",
  imageBackground: "#ffffff",
  heroMedia: "inherit",
  heroImage: "",
  heroVideoUrl: "",
  heroVideoPoster: "",
  heroTitle: "",
  heroTitleEn: "",
  heroLead: "",
  heroLeadEn: "",
  showHeroActions: false,
  sizeGuideMode: "auto",
  sizeGuideText: "",
  sizeGuideTextEn: "",
  updatedAt: new Date().toISOString(),
  ...patch,
});

export const normalizeCategoryContentEntry = (
  value: unknown,
  fallbackKey = "",
): CategoryContentEntry | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const key = categoryContentKey(parseString(row.key, fallbackKey));
  if (!key) return null;

  return {
    key,
    label: parseString(row.label, key),
    imageRatio: parseEnum(
      row.imageRatio,
      ["auto", ...Array.from(RATIO_KEYS)] as CategoryImageRatio[],
      "auto",
    ),
    imageFit: parseEnum(row.imageFit, ["cover", "contain"] as const, "cover"),
    imageFocus: parseEnum(row.imageFocus, ["top", "center", "bottom"] as const, "top"),
    /* Anything that is not a plain hex colour is dropped rather than passed
       through: this value lands in an inline `style`, and a stored string is
       admin-supplied text. */
    imageBackground: /^#[0-9a-f]{3,8}$/i.test(parseString(row.imageBackground))
      ? parseString(row.imageBackground)
      : "#ffffff",
    heroMedia: parseEnum(row.heroMedia, ["inherit", "image", "video"] as const, "inherit"),
    heroImage: parseString(row.heroImage),
    heroVideoUrl: parseString(row.heroVideoUrl),
    heroVideoPoster: parseString(row.heroVideoPoster),
    heroTitle: parseString(row.heroTitle),
    heroTitleEn: parseString(row.heroTitleEn),
    heroLead: parseString(row.heroLead),
    heroLeadEn: parseString(row.heroLeadEn),
    showHeroActions: row.showHeroActions === true,
    sizeGuideMode: parseEnum(row.sizeGuideMode, ["auto", "text", "off"] as const, "auto"),
    sizeGuideText: parseString(row.sizeGuideText).slice(0, 4000),
    sizeGuideTextEn: parseString(row.sizeGuideTextEn).slice(0, 4000),
    updatedAt: parseString(row.updatedAt, new Date().toISOString()),
  };
};

/**
 * Shipped defaults, applied where the admin has saved nothing.
 *
 * These are not "no opinion" values. The catalogue's suit, blazer, coat, jacket
 * and trouser photography is full-length: a man standing, shot head to shoes. On
 * the 1:1 stage this shop used, `cover` cut the bottom third off every one of
 * them — the trousers and shoes the client kept asking for. A 2:3 stage matches
 * how those photos were actually taken, so the common case now crops nothing at
 * all; a square legacy source loses its left and right margin instead, which is
 * backdrop rather than subject.
 *
 * Everything not listed here keeps the 1:1 square, which is right for the
 * accessories and shot-flat items that make up the rest of the catalogue.
 *
 * Stored settings still win outright — this is the starting point, not a lock.
 */
export const DEFAULT_CATEGORY_CONTENT: Record<string, Partial<CategoryContentEntry>> = {
  odelo: { imageRatio: "2-3", imageFocus: "top" },
  sako: { imageRatio: "3-4", imageFocus: "top" },
  kaput: { imageRatio: "2-3", imageFocus: "top" },
  jakna: { imageRatio: "3-4", imageFocus: "top" },
  pantalone: { imageRatio: "2-3", imageFocus: "top" },
  /* Shot flat or on a plain ground, wider than they are tall. Stated rather
     than left implicit so a category page can assert the square even when one
     of its articles is grouped elsewhere — a pocket square named "... za odelo"
     is filed under suits by the catalog's own priority order. */
  obuca: { imageRatio: "1-1", imageFocus: "center" },
  aksesoari: { imageRatio: "1-1", imageFocus: "center" },
  kais: { imageRatio: "1-1", imageFocus: "center" },
  kravata: { imageRatio: "1-1", imageFocus: "center" },
  novcanik: { imageRatio: "1-1", imageFocus: "center" },
  torba: { imageRatio: "1-1", imageFocus: "center" },
  "card-holder": { imageRatio: "1-1", imageFocus: "center" },
};

/** Label used when a default has to be materialised without a catalog lookup. */
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  odelo: "Odela",
  sako: "Sakoi",
  kaput: "Kaputi",
  jakna: "Jakne",
  pantalone: "Pantalone",
  obuca: "Obuća",
  aksesoari: "Aksesoari",
  kais: "Kaiševi",
  kravata: "Kravate",
  novcanik: "Novčanici",
  torba: "Torbe",
  "card-holder": "Card holder",
};

const defaultEntryFor = (key: string): CategoryContentEntry | null => {
  const preset = DEFAULT_CATEGORY_CONTENT[key];
  if (!preset) return null;
  return makeCategoryContentEntry(key, DEFAULT_CATEGORY_LABELS[key] || key, preset);
};

/**
 * `imageRatio: "auto"` means "whatever suits this category", not "force a
 * square". The difference is not academic: saving any unrelated field on a suit
 * category — a hero video, a line of size-guide copy — used to write `auto`
 * alongside it and silently pin those cards back to 1:1, cropping the trousers
 * and shoes off again. A stored row therefore only overrides the framing it
 * actually chose.
 */
const withDefaultFraming = (entry: CategoryContentEntry): CategoryContentEntry => {
  if (entry.imageRatio !== "auto") return entry;
  const preset = DEFAULT_CATEGORY_CONTENT[entry.key];
  if (!preset?.imageRatio) return entry;
  return { ...entry, imageRatio: preset.imageRatio, imageFocus: preset.imageFocus || entry.imageFocus };
};

/**
 * First stored entry matching any of `keys`, in the order given.
 *
 * Callers pass candidates most-specific-first ("manzetne" before "aksesoari"),
 * so a subcategory override always beats its parent group.
 */
export const resolveCategoryContent = (
  settings: CategoryContentSettings,
  keys: Array<string | null | undefined>,
): CategoryContentEntry | null => {
  const normalized = keys
    .map((raw) => categoryContentKey(String(raw || "")))
    .filter(Boolean);

  /* Saved settings first, across every candidate: an admin choice on the parent
     group must still beat a shipped default for a subcategory. */
  for (const key of normalized) {
    const stored = settings[key];
    if (stored) return withDefaultFraming(stored);
  }
  for (const key of normalized) {
    const fallback = defaultEntryFor(key);
    if (fallback) return fallback;
  }
  return null;
};

/**
 * Lookup keys for one product's categories, most specific first.
 *
 * Each assigned category contributes two candidates: its own slug ("manzetne")
 * and the shop group it rolls up to ("aksesoari"). The specific one is tried
 * first for every category before any group is, so a subcategory override
 * always beats the group setting no matter which order the catalog returns.
 *
 * `normalizeGroupKey` is injected rather than imported to keep this module free
 * of a dependency on the catalog store.
 */
export const productCategoryContentKeys = (
  categories: Array<{ name?: string | null } | null | undefined> | null | undefined,
  normalizeGroupKey: (value: string) => string,
  /**
   * The group the catalog itself resolved for this product. Required for the
   * large part of the catalogue that carries no categories at all — a belt
   * named "Automatik diagonal 2" is grouped from its name, and without this it
   * would match nothing here.
   */
  resolvedGroupKey?: string,
): string[] => {
  const names = (categories || [])
    .map((category) => String(category?.name || "").trim())
    .filter(Boolean);

  const specific = names.map((name) => categoryContentKey(name));
  const groups = names.map((name) => categoryContentKey(normalizeGroupKey(name))).filter(Boolean);

  return [...specific, ...groups, categoryContentKey(resolvedGroupKey || "")].filter(Boolean);
};

/** CSS custom properties for a product image stage, ready for an inline `style`. */
export const categoryImageStyle = (
  entry: CategoryContentEntry | null,
): Record<string, string> => {
  if (!entry) return {};
  const style: Record<string, string> = {};

  if (entry.imageRatio !== "auto") {
    style["--ss-product-ratio"] = String(CATEGORY_IMAGE_RATIO_VALUES[entry.imageRatio]);
  }
  style["--ss-product-fit"] = entry.imageFit;
  style["--ss-product-position"] = `center ${entry.imageFocus}`;
  /* Only meaningful under `contain`; harmless otherwise since `cover` leaves no
     stage showing. */
  style["--ss-product-pad-bg"] = entry.imageBackground;

  return style;
};

/**
 * Intrinsic box Next.js should reserve for a card image, matched to the stage
 * so nothing reflows while the photo loads.
 */
export const categoryImageBox = (
  entry: CategoryContentEntry | null,
  width: number,
): { width: number; height: number } => {
  const ratio =
    entry && entry.imageRatio !== "auto" ? CATEGORY_IMAGE_RATIO_VALUES[entry.imageRatio] : 1;
  return { width, height: Math.round(width / ratio) };
};
