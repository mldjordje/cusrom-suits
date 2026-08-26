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
/* The shape the catalogue is actually photographed in: a full-length shot of a
   man, head to shoes. Every garment category uses it, so the grid is one rhythm
   instead of a different card height per category. */
const SUIT_FRAME: Partial<CategoryContentEntry> = {
  imageRatio: "2-3",
  imageFocus: "top",
  imageFit: "cover",
};

/* Wide objects shot from above. The one documented exception to the frame
   above — see the note on the entries that use it. */
const FLAT_FRAME: Partial<CategoryContentEntry> = {
  imageRatio: "1-1",
  imageFocus: "center",
  imageFit: "cover",
};

/* The clip the landing hero is actually playing in production, reused so every
   category opens with motion on day one instead of the shared shop banner. Kept
   as a relative /fajlovi path, not the full santos.rs URL, because the two
   hosts are separate origins from the browser's point of view and the rewrite
   in next.config.ts proxies this path to the asset server.
   
   Placeholder, and deliberately so: this footage is portrait 478x850, shot for
   the landing's tall frame. A wide category hero fills with `cover`, so only
   its middle column is visible. Replacing it per category is one upload in
   admin -> Kategorije: izgled. */
export const DEFAULT_CATEGORY_HERO_VIDEO =
  "/fajlovi/site-assets/2026-08-21/1787302307595-39dcdc2a-6f15-4a07-9b7b-ade379a2cd80-proizvodnja-santos-video-hero.mp4";

/* Shown while the clip loads, and to anyone who asked the system to stop
   motion. The same poster the landing uses. */
export const DEFAULT_CATEGORY_HERO_POSTER = "/img/hero.jpg";

export const DEFAULT_CATEGORY_CONTENT: Record<string, Partial<CategoryContentEntry>> = {
  /* ---- Garments worn on a model --------------------------------------
     One frame for all of them, and it is the suit frame. Side by side the
     catalogue made the inconsistency obvious: a suit card stood tall while a
     blazer card beside it was squat, so the grid read as broken rather than as
     varied. 2:3 is the shape the photography was actually shot in, so it also
     crops the least. */
  odelo: SUIT_FRAME,
  sako: SUIT_FRAME,
  kaput: SUIT_FRAME,
  jakna: SUIT_FRAME,
  pantalone: SUIT_FRAME,
  kosulja: SUIT_FRAME,
  dzemper: SUIT_FRAME,
  prsluk: SUIT_FRAME,

  /* ---- Shot flat, on a plain ground -----------------------------------
     These are the exception the brief allows for. A belt or a wallet is a wide
     object photographed from above; forcing it into the tall suit frame would
     crop both ends off and leave the middle. The square is what fits them, and
     stating it here also lets a category page assert its own shape even when
     one of its articles is filed under suits by the catalog's priority order —
     a pocket square named "... za odelo" is. */
  obuca: FLAT_FRAME,
  aksesoari: FLAT_FRAME,
  kais: FLAT_FRAME,
  kravata: FLAT_FRAME,
  novcanik: FLAT_FRAME,
  torba: FLAT_FRAME,
  "card-holder": FLAT_FRAME,
};

/* Hero copy per category. Written to be true of the whole category rather than
   of any one article, so it stays correct as stock turns over, and kept to one
   line: this sits over a photograph, and a paragraph there is unreadable.
   All of it is editable in the admin — these are a starting point, not a
   position. */
const HERO_COPY: Record<string, { title: string; titleEn: string; lead: string; leadEn: string }> = {
  odelo: {
    title: "Odelo koje stoji kako treba",
    titleEn: "A suit that sits right",
    lead: "Za venčanje, posao i svečane prilike — klasični i moderni krojevi.",
    leadEn: "For weddings, business and formal occasions — classic and modern cuts.",
  },
  sako: {
    title: "Sako za svaku priliku",
    titleEn: "A blazer for any occasion",
    lead: "Najbrži put do elegantnog izgleda bez kompletnog odela.",
    leadEn: "The fastest route to a sharp look without a full suit.",
  },
  kosulja: {
    title: "Košulje koje se nose svaki dan",
    titleEn: "Shirts made for every day",
    lead: "Jednobojni i dezenirani modeli za posao i svečane prilike.",
    leadEn: "Plain and patterned models for business and formal wear.",
  },
  pantalone: {
    title: "Pantalone za posao i izlazak",
    titleEn: "Trousers for work and evening",
    lead: "Klasične i strukirane, uz sako ili samostalno.",
    leadEn: "Classic and tailored, with a blazer or on their own.",
  },
  kaput: {
    title: "Kaput za hladne dane",
    titleEn: "A coat for the cold months",
    lead: "Topli materijali i krojevi koji lepo stoje preko odela.",
    leadEn: "Warm fabrics, cut to sit properly over a suit.",
  },
  jakna: {
    title: "Jakne za prelazne dane",
    titleEn: "Jackets for the in-between days",
    lead: "Lakši modeli za jesen i proleće, uz košulju ili džemper.",
    leadEn: "Lighter models for spring and autumn, over a shirt or knit.",
  },
  prsluk: {
    title: "Prsluk koji zaokružuje kroj",
    titleEn: "The waistcoat that completes the cut",
    lead: "Uz odelo za trodelni izgled ili samostalno uz košulju.",
    leadEn: "With a suit for a three-piece look, or on its own over a shirt.",
  },
  dzemper: {
    title: "Džemperi za slojevito nošenje",
    titleEn: "Knitwear for layering",
    lead: "Preko košulje, ispod sakoa ili samostalno.",
    leadEn: "Over a shirt, under a blazer, or on its own.",
  },
  obuca: {
    title: "Cipele koje izdrže",
    titleEn: "Shoes built to last",
    lead: "Klasični i moderni modeli za posao i svečane prilike.",
    leadEn: "Classic and modern models for business and formal wear.",
  },
  aksesoari: {
    title: "Detalji koji se pamte",
    titleEn: "The details people remember",
    lead: "Kaiševi, kravate, manžetne i sitnice koje zaokružuju kombinaciju.",
    leadEn: "Belts, ties, cufflinks and the small things that finish a look.",
  },
  kais: {
    title: "Kaiševi od prave kože",
    titleEn: "Belts in real leather",
    lead: "Klasične i automatik kopče, uz odelo i uz farmerke.",
    leadEn: "Classic and automatic buckles, for a suit or for jeans.",
  },
  kravata: {
    title: "Kravate i leptir-mašne",
    titleEn: "Ties and bow ties",
    lead: "Jednobojne i dezenirane, za svečane i poslovne prilike.",
    leadEn: "Plain and patterned, for formal and business occasions.",
  },
  novcanik: {
    title: "Novčanici koji traju",
    titleEn: "Wallets that last",
    lead: "Kompaktni modeli od kože, za svaki dan.",
    leadEn: "Compact leather models for everyday carry.",
  },
  torba: {
    title: "Torbe za posao i put",
    titleEn: "Bags for work and travel",
    lead: "Modeli za laptop, dokumenta i kratka putovanja.",
    leadEn: "Models for a laptop, documents and short trips.",
  },
  "card-holder": {
    title: "Držači za kartice",
    titleEn: "Card holders",
    lead: "Tanki kožni modeli kada novčanik nije potreban.",
    leadEn: "Slim leather models for when a wallet is too much.",
  },
};

/** Human name for a default, used when the catalog is not consulted. */
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  odelo: "Odela",
  sako: "Sakoi",
  kosulja: "Košulje",
  pantalone: "Pantalone",
  kaput: "Kaputi",
  jakna: "Jakne",
  prsluk: "Prsluci",
  dzemper: "Džemperi",
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
  const copy = HERO_COPY[key];
  return makeCategoryContentEntry(key, DEFAULT_CATEGORY_LABELS[key] || key, {
    ...preset,
    ...(copy
      ? {
          heroMedia: "video" as const,
          heroVideoUrl: DEFAULT_CATEGORY_HERO_VIDEO,
          heroVideoPoster: DEFAULT_CATEGORY_HERO_POSTER,
          heroTitle: copy.title,
          heroTitleEn: copy.titleEn,
          heroLead: copy.lead,
          heroLeadEn: copy.leadEn,
        }
      : {}),
  });
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
  let next = entry;

  if (next.imageRatio === "auto") {
    const preset = DEFAULT_CATEGORY_CONTENT[next.key];
    if (preset?.imageRatio) {
      next = { ...next, imageRatio: preset.imageRatio, imageFocus: preset.imageFocus || next.imageFocus };
    }
  }

  /* Same principle applied to the hero. "inherit" with nothing uploaded is not
     a choice to show the shared shop banner — it is the field never having been
     touched. A row saved for some unrelated reason (a size-guide note, a change
     of framing) used to write "inherit" alongside it and silently opt that one
     category out of the hero every other category now gets. */
  /* The test is whether a source was actually supplied, not which mode is
     selected. Picking "Video za ovu kategoriju" and then not uploading one is
     the common half-finished state, and it used to leave the category with no
     hero at all — worse than the default it replaced. */
  const hasHeroSource =
    (next.heroMedia === "video" && next.heroVideoUrl.trim().length > 0) ||
    (next.heroMedia === "image" && next.heroImage.trim().length > 0);

  if (!hasHeroSource) {
    const fallback = defaultEntryFor(next.key);
    if (fallback && fallback.heroMedia !== "inherit") {
      next = {
        ...next,
        /* Every source field is copied, not just the image one: the default is
           a video, and carrying the mode across without its URL reproduces
           exactly the half-configured state this branch exists to repair. */
        heroMedia: fallback.heroMedia,
        heroImage: fallback.heroImage,
        heroVideoUrl: fallback.heroVideoUrl,
        heroVideoPoster: next.heroVideoPoster.trim() || fallback.heroVideoPoster,
        heroTitle: next.heroTitle.trim() || fallback.heroTitle,
        heroTitleEn: next.heroTitleEn.trim() || fallback.heroTitleEn,
        heroLead: next.heroLead.trim() || fallback.heroLead,
        heroLeadEn: next.heroLeadEn.trim() || fallback.heroLeadEn,
      };
    }
  }

  return next;
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
