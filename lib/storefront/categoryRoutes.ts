// Indexable category landing routes: /web-shop/kategorija/<slug>
//
// Before these existed the shop's ten categories lived only as query params
// (`/web-shop?categoryGroup=sako`) and every one of them canonicalised back to
// `/web-shop`. That left the highest-volume commercial queries in this niche —
// "muski sako", "muske kosulje", "muski kaput" — with no page that could rank.
//
// Each entry here becomes a real URL with its own canonical, H1, metadata and
// CollectionPage JSON-LD, filtered to a single `categoryGroup`.
//
// `groupKey` must be a value produced by normalizeCatalogCategoryGroupKey()
// (lib/catalog/store.ts) — that is what the catalog query filters on.
// `seoKey` indexes CATEGORY_SEO_COPY (lib/storefront/categorySeoCopy.ts) for the
// descriptive body text; it is null when no copy has been supplied yet.

export type CategoryRoute = {
  slug: string;
  groupKey: string;
  seoKey: string | null;
  /** H1 + breadcrumb label (SR) */
  label: string;
  labelEn: string;
  /** <title>, without the site-name suffix the layout template appends */
  metaTitle: string;
  metaTitleEn: string;
  metaDescription: string;
  metaDescriptionEn: string;
  /** Intro paragraph rendered under the H1 — unique body text per URL */
  lead: string;
  leadEn: string;
  keywords: string[];
};

export const CATEGORY_ROUTES: CategoryRoute[] = [
  {
    slug: "odela",
    groupKey: "odelo",
    seoKey: "odelo",
    label: "Muška odela",
    labelEn: "Men's suits",
    metaTitle: "Muška odela — svečana i poslovna odela",
    metaTitleEn: "Men's suits — formal and business",
    metaDescription:
      "Muška odela za venčanje, posao i svečane prilike. Klasični i moderni krojevi, kvalitetni materijali, dostupne veličine i isporuka širom Srbije.",
    metaDescriptionEn:
      "Men's suits for weddings, business and formal occasions. Classic and modern cuts, quality fabrics, sizes in stock and delivery across Serbia.",
    lead: "Odela za venčanje, poslovne sastanke, maturu i svečane prilike — klasični i moderni krojevi u proverenom kvalitetu izrade.",
    leadEn:
      "Suits for weddings, business meetings and formal occasions — classic and modern cuts, made to last.",
    keywords: ["muska odela", "musko odelo", "odelo za vencanje", "svecano odelo", "poslovno odelo"],
  },
  {
    slug: "muski-sakoi",
    groupKey: "sako",
    seoKey: "sako",
    label: "Muški sakoi",
    labelEn: "Men's blazers",
    metaTitle: "Muški sakoi — poslovni i casual modeli",
    metaTitleEn: "Men's blazers — business and casual",
    metaDescription:
      "Muški sakoi za poslovne i svečane prilike. Klasični, casual i strukirani modeli koji se lako kombinuju uz pantalone, farmerke i košulje.",
    metaDescriptionEn:
      "Men's blazers for business and formal wear. Classic, casual and structured models that pair with trousers, jeans and shirts.",
    lead: "Sako je najbrži put do elegantnog izgleda bez kompletnog odela — poslovni, klasični i casual modeli za svaku kombinaciju.",
    leadEn:
      "A blazer is the fastest route to a sharp look without a full suit — business, classic and casual models.",
    keywords: ["muski sako", "sakoi", "poslovni sako", "casual sako", "muski sakoi cena"],
  },
  {
    slug: "muske-kosulje",
    groupKey: "kosulja",
    seoKey: "kosulja",
    label: "Muške košulje",
    labelEn: "Men's shirts",
    metaTitle: "Muške košulje — poslovne i svečane",
    metaTitleEn: "Men's shirts — business and formal",
    metaDescription:
      "Muške košulje za posao, svečane prilike i svakodnevno nošenje. Jednobojni i dezenirani modeli, kvalitetni materijali i dostupne veličine.",
    metaDescriptionEn:
      "Men's shirts for business, formal occasions and everyday wear. Plain and patterned models in quality fabrics.",
    lead: "Od klasičnih jednobojnih do modernih dezena — košulje koje se uklapaju uz odela, sakoe i pantalone.",
    leadEn: "From plain classics to modern patterns — shirts that work with suits, blazers and trousers.",
    keywords: ["muske kosulje", "poslovna kosulja", "svecana kosulja", "bela kosulja muska"],
  },
  {
    slug: "muske-pantalone",
    groupKey: "pantalone",
    seoKey: "pantalone",
    label: "Muške pantalone",
    labelEn: "Men's trousers",
    metaTitle: "Muške pantalone — elegantne i poslovne",
    metaTitleEn: "Men's trousers — formal and business",
    metaDescription:
      "Elegantne muške pantalone za posao i svečane prilike. Moderni krojevi, udobni materijali i veličine dostupne odmah sa stanja.",
    metaDescriptionEn:
      "Elegant men's trousers for business and formal wear. Modern cuts, comfortable fabrics, sizes in stock.",
    lead: "Elegantne pantalone koje se nose ceo dan i kombinuju uz košulje, sakoe i cipele.",
    leadEn: "Elegant trousers built for all-day wear, easy to pair with shirts, blazers and dress shoes.",
    keywords: ["muske pantalone", "elegantne pantalone", "poslovne pantalone", "pantalone za odelo"],
  },
  {
    slug: "muski-kaputi",
    groupKey: "kaput",
    seoKey: "kaput",
    label: "Muški kaputi",
    labelEn: "Men's coats",
    metaTitle: "Muški kaputi — zimski i poslovni",
    metaTitleEn: "Men's coats — winter and business",
    metaDescription:
      "Muški kaputi za zimu i poslovne prilike. Klasični krojevi i topli materijali koji zadržavaju elegantan izgled i po hladnom vremenu.",
    metaDescriptionEn:
      "Men's coats for winter and business. Classic cuts and warm fabrics that keep a sharp look in cold weather.",
    lead: "Kaput koji drži toplotu i liniju — klasični krojevi za posao, svečane prilike i svakodnevno nošenje.",
    leadEn: "Coats that hold both warmth and shape — classic cuts for work, formal wear and everyday.",
    keywords: ["muski kaput", "zimski kaput", "kaput za odelo", "muski kaputi cena"],
  },
  {
    slug: "muske-jakne",
    groupKey: "jakna",
    seoKey: "jakna",
    label: "Muške jakne",
    labelEn: "Men's jackets",
    metaTitle: "Muške jakne — prelazne i zimske",
    metaTitleEn: "Men's jackets — transitional and winter",
    metaDescription:
      "Muške jakne za prelazni period i zimu. Lagani i topliji modeli, moderan dizajn i udobnost bez odricanja od elegancije.",
    metaDescriptionEn:
      "Men's jackets for the transitional season and winter. Lightweight and warmer models, modern design.",
    lead: "Lagane jakne za prelazni period i topliji modeli za zimu — funkcionalnost uz moderan kroj.",
    leadEn: "Lightweight jackets for shoulder seasons and warmer models for winter.",
    keywords: ["muske jakne", "zimska jakna muska", "prelazna jakna", "muska jakna cena"],
  },
  {
    slug: "muski-prsluci",
    groupKey: "prsluk",
    seoKey: "prsluk",
    label: "Muški prsluci",
    labelEn: "Men's waistcoats",
    metaTitle: "Muški prsluci — za odelo i košulju",
    metaTitleEn: "Men's waistcoats — for suits and shirts",
    metaDescription:
      "Muški prsluci kao deo trodelnog odela ili uz košulju. Kvalitetni materijali i krojevi koji prate liniju tela.",
    metaDescriptionEn:
      "Men's waistcoats as part of a three-piece suit or worn with a shirt. Quality fabrics and body-following cuts.",
    lead: "Prsluk kao deo trodelnog odela ili uz košulju — detalj koji podiže celu kombinaciju.",
    leadEn: "A waistcoat as part of a three-piece suit or with a shirt — the detail that lifts the whole look.",
    keywords: ["muski prsluk", "prsluk za odelo", "trodelno odelo", "prsluci muski"],
  },
  {
    slug: "muske-cipele",
    groupKey: "obuca",
    seoKey: "obuca",
    label: "Muške cipele",
    labelEn: "Men's shoes",
    metaTitle: "Muške cipele — elegantne i poslovne",
    metaTitleEn: "Men's shoes — formal and business",
    metaDescription:
      "Elegantne muške cipele za odelo, posao i svečane prilike. Spoj udobnosti, kvalitetne izrade i modernog izgleda.",
    metaDescriptionEn:
      "Elegant men's shoes for suits, business and formal occasions. Comfort, quality construction and a modern look.",
    lead: "Cipele za odelo, poslovni sastanak i svečane prilike — osnova svakog dobrog stila.",
    leadEn: "Shoes for suits, business meetings and formal occasions — the base of every good outfit.",
    keywords: ["muske cipele", "elegantne cipele", "cipele za odelo", "poslovne cipele muske"],
  },
  {
    slug: "muski-aksesoari",
    groupKey: "aksesoari",
    seoKey: "aksesoari",
    label: "Muški aksesoari",
    labelEn: "Men's accessories",
    metaTitle: "Muški aksesoari — kravate, kaiševi, novčanici",
    metaTitleEn: "Men's accessories — ties, belts, wallets",
    metaDescription:
      "Muški aksesoari: kravate, leptir-mašne, kaiševi, novčanici i maramice za sako. Detalji koji zaokružuju elegantnu kombinaciju.",
    metaDescriptionEn:
      "Men's accessories: ties, bow ties, belts, wallets and pocket squares. The details that finish an outfit.",
    lead: "Kravate, leptir-mašne, kaiševi, novčanici i maramice za sako — završni detalj svake kombinacije.",
    leadEn: "Ties, bow ties, belts, wallets and pocket squares — the finishing detail.",
    keywords: ["muski aksesoari", "kravate", "muski kaisevi", "novcanici muski", "leptir masna"],
  },
  {
    slug: "muski-dzemperi",
    groupKey: "dzemper",
    seoKey: null,
    label: "Muški džemperi",
    labelEn: "Men's knitwear",
    metaTitle: "Muški džemperi — pleteni modeli",
    metaTitleEn: "Men's knitwear — jumpers and cardigans",
    metaDescription:
      "Muški džemperi i pleteni modeli za slojevito nošenje uz košulju i sako. Udobni materijali i krojevi za hladnije dane.",
    metaDescriptionEn:
      "Men's jumpers and knitwear for layering over shirts and under blazers. Comfortable fabrics for colder days.",
    lead: "Pleteni modeli za slojevito nošenje — preko košulje, ispod sakoa ili samostalno.",
    leadEn: "Knitwear for layering — over a shirt, under a blazer, or on its own.",
    keywords: ["muski dzemperi", "pleteni dzemper", "dzemper muski", "dzemper za kosulju"],
  },
];

export const CATEGORY_ROUTE_BY_SLUG: Record<string, CategoryRoute> = Object.fromEntries(
  CATEGORY_ROUTES.map((route) => [route.slug, route]),
);

export const CATEGORY_ROUTE_BY_GROUP_KEY: Record<string, CategoryRoute> = Object.fromEntries(
  CATEGORY_ROUTES.map((route) => [route.groupKey, route]),
);

export const categoryRoutePath = (slug: string) => `/web-shop/kategorija/${slug}`;

/**
 * Path for a category group key, or null when that group has no dedicated route.
 * Callers fall back to the `?categoryGroup=` query form for ungrouped/admin
 * categories (kais, kravata, novcanik, torba, card-holder …).
 */
export const categoryPathForGroupKey = (groupKey: string): string | null => {
  const route = CATEGORY_ROUTE_BY_GROUP_KEY[groupKey];
  return route ? categoryRoutePath(route.slug) : null;
};

export const getCategoryRoute = (slug: string): CategoryRoute | null =>
  CATEGORY_ROUTE_BY_SLUG[String(slug || "").toLowerCase()] || null;
