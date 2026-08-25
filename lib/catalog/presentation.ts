import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";

const COLLAPSE_WHITESPACE = /\s+/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const PRODUCT_TYPE_MATCHERS = [
  { key: "suit", pattern: /odel|suit/u },
  { key: "blazer", pattern: /sako|blazer|jacket/u },
  { key: "shirt", pattern: /kosulj|shirt/u },
  { key: "trousers", pattern: /pantal|trouser/u },
  { key: "shoes", pattern: /cipe|cipel|obuc|shoe|patik|sneaker/u },
  { key: "coat", pattern: /kaput|coat/u },
  { key: "jacket", pattern: /jakn|jacket/u },
  { key: "knitwear", pattern: /dzemper|knit|sweater/u },
  { key: "polo", pattern: /polo/u },
  { key: "tshirt", pattern: /majic|t-?shirt/u },
] as const;

const EMBEDDED_PRODUCT_TYPE_HINTS = [
  "odelo",
  "odel",
  "sako",
  "kosulja",
  "kosulj",
  "kosu",
  "pantalone",
  "pantal",
  "cipele",
  "cipel",
  "obuca",
  "jakna",
  "jakn",
  "kaput",
  "kap",
  "dzemper",
  "dzemp",
  "majica",
  "majic",
  "polo",
  "shirt",
  "trousers",
  "trouser",
  "shoes",
  "shoe",
  "coat",
  "jacket",
  "blazer",
  "suit",
  "sweater",
  "knitwear",
  "tshirt",
] as const;

type CatalogDisplayLanguage = "sr" | "en";

type CatalogCategoryLike = {
  name: string;
  path?: string[] | null;
};

type CatalogProductNameInput = {
  name: string;
  sku?: string | null;
  manufCode?: string | null;
  categories?: CatalogCategoryLike[] | null;
  brand?: string | null;
};

const normalizeForMatch = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const CP1252_EXTENDED_MAP = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const repairMojibake = (value: string) => {
  const input = String(value || "");
  if (!/[ÃÄÅÆÐÑØÙÚÛÝÞßŁłŒœŠšŽžƒ…†‡‰‹›–—‘’“”™]/u.test(input)) return input;

  try {
    const bytes = Uint8Array.from(
      [...input].map((char) => {
        const codePoint = char.codePointAt(0);
        if (codePoint == null) return 0x3f;
        if (codePoint <= 0xff) return codePoint;
        return CP1252_EXTENDED_MAP.get(codePoint) ?? 0x3f;
      }),
    );
    const repaired = new TextDecoder("utf-8").decode(bytes);
    if (!repaired || repaired.includes("\uFFFD")) return input;
    return repaired;
  } catch {
    return input;
  }
};

export const decodeHtmlEntities = (value: string | null | undefined) => {
  let decoded = String(value || "");

  for (let pass = 0; pass < 2; pass += 1) {
    const next = decoded.replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (match, entity) => {
      const normalized = String(entity || "").toLowerCase();
      if (normalized.startsWith("#x")) {
        const codePoint = Number.parseInt(normalized.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (normalized.startsWith("#")) {
        const codePoint = Number.parseInt(normalized.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return HTML_ENTITY_MAP[normalized] ?? match;
    });

    decoded = next;
    if (!/&(#x?[0-9a-f]+|[a-z]+);/iu.test(decoded)) {
      break;
    }
  }

  return repairMojibake(decoded).replace(/\bSantos\s*&\s*Santorini\b/giu, "Santos & Santorini");
};

const titleCaseToken = (value: string) =>
  value
    .toLowerCase()
    .split(/([\s/-]+)/)
    .map((part) => (/[\s/-]+/.test(part) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join("");

const getProductTypeLabel = (
  key: (typeof PRODUCT_TYPE_MATCHERS)[number]["key"],
  lang: CatalogDisplayLanguage,
) => {
  const labels = {
    suit: { sr: "Odelo", en: "Suit" },
    blazer: { sr: "Sako", en: "Blazer" },
    shirt: { sr: "Kosulja", en: "Shirt" },
    trousers: { sr: "Pantalone", en: "Trousers" },
    shoes: { sr: "Obuca", en: "Shoes" },
    coat: { sr: "Kaput", en: "Coat" },
    jacket: { sr: "Jakna", en: "Jacket" },
    knitwear: { sr: "Dzemper", en: "Knitwear" },
    polo: { sr: "Polo", en: "Polo" },
    tshirt: { sr: "Majica", en: "T-shirt" },
  } as const;

  return labels[key]?.[lang] || (lang === "en" ? "Product" : "Proizvod");
};

const inferProductTypeKey = (
  name: string,
  categories?: CatalogCategoryLike[] | null,
): (typeof PRODUCT_TYPE_MATCHERS)[number]["key"] | null => {
  const categoryValues = (categories || []).flatMap((category) => [
    String(category?.name || ""),
    ...((category?.path || []).map((entry) => String(entry || ""))),
  ]);
  const haystack = normalizeForMatch([name, ...categoryValues].join(" "));

  for (const matcher of PRODUCT_TYPE_MATCHERS) {
    if (matcher.pattern.test(haystack)) {
      return matcher.key;
    }
  }

  return null;
};

/** "4022 BLU" -> "4022 Blu". The model code is kept: it is the only thing that
 *  tells two shoes of the same colour apart, and dropping it left several
 *  unrelated models sharing the title "Blu". */
const maybeHumanizeColorCode = (value: string) => {
  const match = value.match(/^((?:[A-Z]?\d+(?:[./_-]\d+)*[\s/-]+)+)([A-Z]{3,}(?:[\s/-][A-Z]{2,})*)$/u);
  if (!match) return value;
  return `${match[1].replace(COLLAPSE_WHITESPACE, " ").trim()} ${titleCaseToken(match[2])}`.trim();
};

const normalizeProductTypeHint = (value: string) =>
  normalizeForMatch(value).replace(/[^a-z0-9]+/g, "");

const hasEmbeddedProductTypeHint = (value: string) => {
  const normalized = normalizeForMatch(value).replace(COLLAPSE_WHITESPACE, " ").trim();
  if (!normalized) return false;

  const firstToken = normalizeProductTypeHint(normalized.split(" ")[0] || "");
  if (!firstToken) return false;

  return EMBEDDED_PRODUCT_TYPE_HINTS.some((hint) => {
    const normalizedHint = normalizeProductTypeHint(hint);
    return (
      firstToken === normalizedHint ||
      firstToken.startsWith(normalizedHint) ||
      (firstToken.length >= 3 && normalizedHint.startsWith(firstToken))
    );
  });
};

const looksLikeLegacyTypeSuffix = (value: string) => {
  const firstToken = String(value || "")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^\p{L}-]+/gu, "");

  if (!firstToken) return false;
  if (/\d/u.test(firstToken)) return false;

  return firstToken.length >= 3 && firstToken.length <= 12;
};

const extractModelPrefixFromEmbeddedType = (value: string) => {
  const match = value.match(/^(.*?)\s+[A-Z]\.\s*(.+)$/u);
  if (!match) return null;

  const prefix = String(match[1] || "")
    .trim()
    .replace(/[._\-+/|:]+$/u, "")
    .trim();
  const suffix = String(match[2] || "")
    .trim()
    .replace(/^[._\-+/|:]+/u, "")
    .trim();

  const acceptsSuffix =
    hasEmbeddedProductTypeHint(suffix) ||
    (looksLikeModelPrefix(prefix) && looksLikeLegacyTypeSuffix(suffix));

  if (!prefix || !suffix || !acceptsSuffix) {
    return null;
  }

  return { prefix, suffix };
};

const looksLikeModelPrefix = (value: string) => {
  const normalized = String(value || "").trim();
  if (normalized.length < 3) return false;
  if (/\d/u.test(normalized)) return true;
  if (/[./_-]/u.test(normalized) && /\p{L}/u.test(normalized)) return true;
  return /^[\p{Lu}\s./_-]{3,}$/u.test(normalized);
};

export function formatCatalogProductName(name: string, sku?: string | null) {
  let value = decodeHtmlEntities(name).replace(COLLAPSE_WHITESPACE, " ").trim();
  if (!value) return value;

  if (sku && sku.trim()) {
    const skuPattern = new RegExp(`^${escapeRegExp(sku.trim())}[\\s_\\-:|]+`, "i");
    value = value.replace(skuPattern, "").trim();
  }

  const embeddedTypeParts = extractModelPrefixFromEmbeddedType(value);
  if (embeddedTypeParts) {
    const { prefix, suffix } = embeddedTypeParts;
    const prefixWords = prefix.match(/\p{L}{3,}/gu) || [];

    if (prefixWords.length > 0) {
      value = /^[\p{Lu}\d\s./_-]{3,}$/u.test(prefix) ? titleCaseToken(prefix) : prefix;
    } else if (looksLikeModelPrefix(prefix)) {
      value = /^[\p{Lu}\d\s./_-]{3,}$/u.test(prefix) ? titleCaseToken(prefix) : prefix;
    } else if (suffix) {
      value = suffix;
    }
  }

  value = value.replace(/^[A-Z]\.(?=[\p{Lu}][\p{Ll}])/u, "");
  const humanized = maybeHumanizeColorCode(value);
  // A humanized colour code already keeps its model number on purpose — the
  // generic code-prefix strip below would throw it away again.
  const keepCodePrefix = humanized !== value;
  value = humanized;

  const titleCaseStart = keepCodePrefix ? null : value.match(/[\p{Lu}][\p{Ll}]/u);
  if (titleCaseStart && typeof titleCaseStart.index === "number" && titleCaseStart.index > 0) {
    const prefix = value.slice(0, titleCaseStart.index).trim();
    const suffix = value.slice(titleCaseStart.index).trim();
    const prefixTokens = prefix.split(/\s+/).filter(Boolean);
    const looksLikeCode =
      /\d/.test(prefix) ||
      prefixTokens.length > 1 ||
      prefixTokens.some((token) => /^[\p{Lu}\d./_+-]+$/u.test(token.replace(/[.,;:]+$/, "")));

    if (looksLikeCode) {
      value = suffix;
    }
  }

  value = value.replace(/^[\s._\-+/|:]+/, "").trim();

  if (/^[\p{Lu}\s/-]{3,}$/u.test(value)) {
    return titleCaseToken(value);
  }

  return value;
}

export function isCatalogProductNameSuspicious(name: string) {
  const value = String(name || "").replace(COLLAPSE_WHITESPACE, " ").trim();
  if (!value) return true;

  const hasLetters = /\p{L}/u.test(value);
  const hasLowercase = /\p{Ll}/u.test(value);
  const hasDigits = /\d/u.test(value);
  const separators = (value.match(/[./_-]/g) || []).length;
  const lettersOnly = value.replace(/[^\p{L}]+/gu, "");
  const digitsOnly = value.replace(/\D+/g, "");

  if (!hasLetters) return true;
  if (/^[A-Z]?\d+(?:[./_-]\d+){1,}$/u.test(value)) return true;
  if (hasDigits && separators >= 2 && !hasLowercase) return true;
  if (hasDigits && separators >= 2 && digitsOnly.length >= lettersOnly.length) return true;
  if (hasDigits && lettersOnly.length <= 2 && digitsOnly.length >= 2) return true;
  if (hasDigits && digitsOnly.length >= lettersOnly.length * 2 && separators >= 1) return true;

  return false;
}

export function getCatalogProductCategoryLabel(
  input: CatalogProductNameInput,
  lang: CatalogDisplayLanguage = "sr",
) {
  const categories = input.categories || [];
  const firstCategory = categories.find((category) => String(category?.name || "").trim().length > 0);
  if (firstCategory) {
    return localizeDynamicCategoryLabel(String(firstCategory.name).trim(), lang);
  }

  const typeKey = inferProductTypeKey(input.name, categories);
  if (typeKey) {
    return getProductTypeLabel(typeKey, lang);
  }

  return lang === "en" ? "Collection" : "Kolekcija";
}

export function getCatalogProductDisplayName(
  input: CatalogProductNameInput,
  lang: CatalogDisplayLanguage = "sr",
) {
  const categoryLabel = getCatalogProductCategoryLabel(input, lang);
  const normalizedCategoryLabel = normalizeForMatch(categoryLabel);
  const genericPrefixPattern = /^(muska|zenska|decija|muski|zenski|deciji|musk[aioe]?|zensk[aioe]?)\b/u;

  const evaluateCandidate = (source: string | null | undefined) => {
    const formatted = formatCatalogProductName(String(source || ""), input.sku);
    if (!formatted) return null;

    const suspicious = isCatalogProductNameSuspicious(formatted);
    const meaningfulWords = formatted.match(/\p{L}{3,}/gu) || [];
    const normalizedFormatted = normalizeForMatch(formatted);
    const inferredType = inferProductTypeKey(String(source || input.name || ""), input.categories);
    const inferredTypeLabel = inferredType ? normalizeForMatch(getProductTypeLabel(inferredType, lang)) : "";

    let score = 0;
    if (!suspicious) score += 40;
    if (meaningfulWords.length >= 2) score += 30;
    if (/\p{L}/u.test(formatted) && /\d/u.test(formatted)) score += 25;
    if (normalizedFormatted !== normalizedCategoryLabel) score += 20;
    if (!genericPrefixPattern.test(normalizedFormatted)) score += 12;
    if (inferredTypeLabel && normalizedFormatted !== inferredTypeLabel) score += 10;
    if (
      inferredTypeLabel &&
      normalizedFormatted.includes(inferredTypeLabel) &&
      normalizedFormatted.length > inferredTypeLabel.length + 3
    ) {
      score += 10;
    }

    return {
      formatted,
      suspicious,
      meaningfulWords,
      normalizedFormatted,
      score,
    };
  };

  const candidates = [evaluateCandidate(input.name), evaluateCandidate(input.manufCode)]
    .filter((candidate): candidate is NonNullable<ReturnType<typeof evaluateCandidate>> => Boolean(candidate))
    .sort((left, right) => right.score - left.score || right.formatted.length - left.formatted.length);

  const bestCandidate = candidates[0];
  if (bestCandidate) {
    if (!bestCandidate.suspicious) {
      return bestCandidate.formatted;
    }

    if (/\p{L}/u.test(bestCandidate.formatted) && /\d/u.test(bestCandidate.formatted)) {
      return bestCandidate.formatted;
    }

    if (bestCandidate.meaningfulWords.length >= 2) {
      return bestCandidate.formatted;
    }

    const fallbackType = inferProductTypeKey(input.name || input.manufCode || "", input.categories);
    const fallbackTypeLabel = fallbackType ? normalizeForMatch(getProductTypeLabel(fallbackType, lang)) : "";
    if (
      fallbackTypeLabel &&
      bestCandidate.normalizedFormatted.includes(fallbackTypeLabel) &&
      bestCandidate.normalizedFormatted.length > fallbackTypeLabel.length + 3
    ) {
      return bestCandidate.formatted;
    }
  }

  /* Last resort: name the product after what it is. The category label is
     plural ("Muška odela", "Sakoi") because it names a shelf, and a product
     titled after its shelf reads as a listing header rather than an article —
     which is what the client kept reporting. The product-type label is the
     singular form of the same thing, so it is preferred whenever the type can
     be inferred; the category label stays as the fallback for categories with
     no matching type (Kaiševi, Manžetne, Lančići …). */
  const fallbackTypeKey = inferProductTypeKey(
    input.name || input.manufCode || "",
    input.categories,
  );
  if (fallbackTypeKey) return getProductTypeLabel(fallbackTypeKey, lang);

  if (categoryLabel) return categoryLabel;

  return lang === "en" ? "Santos product" : "Santos proizvod";
}
