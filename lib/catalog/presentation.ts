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

const EMBEDDED_PRODUCT_TYPE_PATTERN =
  /(?:^|[\s/-])([A-Z])\.\s*(Odelo|Sako|Ko[sš]ulja|Pantalone|Cipele|Jakna|Kaput|D[zž]emper|Majica|Polo)\b/iu;

const normalizeForMatch = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export const decodeHtmlEntities = (value: string | null | undefined) =>
  String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (match, entity) => {
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

const maybeHumanizeColorCode = (value: string) => {
  const match = value.match(/^(?:[A-Z]?\d+(?:[./_-]\d+)*[\s/-]+)+([A-Z]{3,}(?:[\s/-][A-Z]{2,})*)$/u);
  if (!match) return value;
  return titleCaseToken(match[1]);
};

export function formatCatalogProductName(name: string, sku?: string | null) {
  let value = decodeHtmlEntities(name).replace(COLLAPSE_WHITESPACE, " ").trim();
  if (!value) return value;

  if (sku && sku.trim()) {
    const skuPattern = new RegExp(`^${escapeRegExp(sku.trim())}[\\s_\\-:|]+`, "i");
    value = value.replace(skuPattern, "").trim();
  }

  const embeddedTypeMatch = EMBEDDED_PRODUCT_TYPE_PATTERN.exec(value);
  if (embeddedTypeMatch) {
    const embeddedType = embeddedTypeMatch[2];
    const prefix = value.slice(0, embeddedTypeMatch.index).trim().replace(/[._\-+/|:]+$/u, "").trim();
    const suffix = value
      .slice(embeddedTypeMatch.index + embeddedTypeMatch[0].length)
      .trim()
      .replace(/^[._\-+/|:]+/u, "")
      .trim();
    const prefixWords = prefix.match(/\p{L}{3,}/gu) || [];

    if (prefixWords.length > 0) {
      value = /^[\p{Lu}\d\s./_-]{3,}$/u.test(prefix) ? titleCaseToken(prefix) : prefix;
    } else if (suffix) {
      value = `${embeddedType} ${suffix}`.trim();
    } else {
      value = embeddedType;
    }
  }

  value = value.replace(/^[A-Z]\.(?=[\p{Lu}][\p{Ll}])/u, "");
  value = maybeHumanizeColorCode(value);

  const titleCaseStart = value.match(/[\p{Lu}][\p{Ll}]/u);
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
    return String(firstCategory.name).trim();
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
    if (inferredTypeLabel && normalizedFormatted.includes(inferredTypeLabel) && normalizedFormatted.length > inferredTypeLabel.length + 3) {
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

  if (categoryLabel) return categoryLabel;

  return lang === "en" ? "Santos product" : "Santos proizvod";
}
