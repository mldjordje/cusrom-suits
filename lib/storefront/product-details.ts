import {
  decodeHtmlEntities,
  getCatalogProductCategoryLabel,
  getCatalogProductDisplayName,
  isCatalogProductNameSuspicious,
} from "@/lib/catalog/presentation";
import {
  getSizeGuideSettings,
  type SizeGuideFit,
  type SizeGuideGroup,
  type SizeGuideTable,
} from "@/lib/catalog/sizeGuides";
import type { CatalogProductView } from "@/lib/catalog/store";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export type ProductDetailField = {
  label: string;
  value: string;
};

export type ProductSizeOption = {
  label: string;
  legacyId: number;
  stock: number;
  inStock: boolean;
};

export type ProductSizeGuide = {
  title: string;
  intro: string;
  bullets: string[];
  buttonLabel: string;
  modalTitle: string;
  imageSrc: string | null;
  imageAlt: string;
  tables: SizeGuideTable[];
  fallbackNote: string | null;
};

export type ProductWashCareIcon =
  | "gentleWash"
  | "dryCleaning"
  | "doNotBleach"
  | "lowIron"
  | "noTumbleDry";

export type ProductWashCareItem = {
  icon: ProductWashCareIcon;
  title: string;
  description: string;
};

export type ProductSeoFaq = {
  question: string;
  answer: string;
};

export type ProductSeoFields = {
  seoTitle: string;
  metaDescription: string;
  aiSummary: string;
  occasionTags: string[];
  styleTags: string[];
  fit: string;
  material: string;
  color: string;
  targetUse: string;
  faq: ProductSeoFaq[];
};

const stripHtml = (value: string | null) =>
  decodeHtmlEntities((value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const normalizeString = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

const normalizeStringList = (value: unknown, max = 12) => {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(
    new Set(
      raw
        .map((item) => normalizeString(item))
        .filter(Boolean),
    ),
  ).slice(0, max);
};

const normalizeSeoFaq = (value: unknown, max = 6): ProductSeoFaq[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = normalizeString(row.question);
      const answer = normalizeString(row.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is ProductSeoFaq => Boolean(item))
    .slice(0, max);
};

export const getProductSeoFields = (product: CatalogProductView): ProductSeoFields => {
  const seo =
    product.rawPayload?.seo && typeof product.rawPayload.seo === "object"
      ? (product.rawPayload.seo as Record<string, unknown>)
      : {};

  return {
    seoTitle: normalizeString(seo.seoTitle),
    metaDescription: normalizeString(seo.metaDescription),
    aiSummary: normalizeString(seo.aiSummary),
    occasionTags: normalizeStringList(seo.occasionTags, 12),
    styleTags: normalizeStringList(seo.styleTags, 12),
    fit: normalizeString(seo.fit),
    material: normalizeString(seo.material),
    color: normalizeString(seo.color),
    targetUse: normalizeString(seo.targetUse),
    faq: normalizeSeoFaq(seo.faq, 6),
  };
};

const normalizeImageCandidate = (value: unknown) => sanitizeStorefrontImageSrc(value);

const BELT_NAME_SIZE_RE = /^0+(\d+)\s+/;

const extractSizes = (product: CatalogProductView) => {
  if (Array.isArray(product.attributes?.size)) {
    const explicit = (product.attributes.size as unknown[])
      .map((value) => String(value || "").trim())
      .filter((value) => value.length > 0);
    if (explicit.length > 0) return explicit;
  }
  // Legacy belt products (e.g. "010 Beltrano") have the size encoded as a
  // zero-padded numeric prefix in the name; mOffice sends empty ARTIKAL_VELICINA.
  const nameMatch = product.name.match(BELT_NAME_SIZE_RE);
  if (nameMatch) {
    const code = String(parseInt(nameMatch[1], 10));
    if (code !== "0") return [code];
  }
  return [];
};

const sizeAliases: Record<string, string> = {
  "1XL": "XL",
  "2XL": "XXL",
  "3XL": "XXXL",
  "4XL": "4XL",
  "5XL": "5XL",
  "6XL": "6XL",
};

const normalizeKey = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  return sizeAliases[normalized] || normalized;
};

const sizeOrder = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "1XL",
  "XXL",
  "2XL",
  "XXXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
];

type SizeKind = "numeric" | "alpha";

const getSizeKind = (value: string): SizeKind | null => {
  const normalized = normalizeKey(value);
  if (/^\d+(?:[.,]\d+)?$/.test(normalized)) return "numeric";
  if (sizeOrder.includes(normalized) || /^\d*X*S$/i.test(normalized) || /^\d*X*L$/i.test(normalized)) {
    return "alpha";
  }
  return null;
};

const getDominantSizeKind = (variants: CatalogProductView[]) => {
  const counts: Record<SizeKind, number> = { numeric: 0, alpha: 0 };

  for (const variant of variants) {
    for (const size of extractSizes(variant)) {
      const kind = getSizeKind(size);
      if (kind) counts[kind] += 1;
    }
  }

  if (counts.numeric === 0 || counts.alpha === 0) return null;
  if (counts.numeric === counts.alpha) return null;
  return counts.numeric > counts.alpha ? "numeric" : "alpha";
};

const getDisplaySizesForVariant = (
  variant: CatalogProductView,
  dominantKind: SizeKind | null,
) => {
  const sizes = extractSizes(variant);
  if (!dominantKind || sizes.length <= 1) return sizes;

  const matching = sizes.filter((size) => getSizeKind(size) === dominantKind);
  return matching.length > 0 ? matching : sizes;
};

const getSizeSortValue = (value: string) => {
  const normalized = normalizeKey(value);
  const intlIndex = sizeOrder.indexOf(normalized);
  if (intlIndex >= 0) {
    return { bucket: 1, value: intlIndex };
  }

  const numeric = Number.parseFloat(normalized.replace(",", "."));
  if (Number.isFinite(numeric) && /\d/.test(normalized)) {
    return { bucket: 0, value: numeric };
  }

  return { bucket: 2, value: normalized };
};

const compareSizes = (left: string, right: string) => {
  const a = getSizeSortValue(left);
  const b = getSizeSortValue(right);
  if (a.bucket !== b.bucket) return a.bucket - b.bucket;
  if (typeof a.value === "number" && typeof b.value === "number") {
    return a.value - b.value;
  }
  return String(a.value).localeCompare(String(b.value), "sr");
};

const productText = (product: CatalogProductView, lang: StorefrontLanguage) => {
  if (lang === "en") {
    return {
      name: decodeHtmlEntities(product.nameEn || product.name),
      description: decodeHtmlEntities(product.descriptionEn || product.description),
      specification: decodeHtmlEntities(product.specificationEn || product.specification),
    };
  }

  return {
    name: decodeHtmlEntities(product.name),
    description: decodeHtmlEntities(product.description),
    specification: decodeHtmlEntities(product.specification),
  };
};

const getProductHaystack = (product: CatalogProductView) =>
  [
    product.name,
    product.nameEn || "",
    product.description || "",
    product.descriptionEn || "",
    product.specification || "",
    product.specificationEn || "",
    product.categories.flatMap((category) => category.path).join(" "),
    product.categories.map((category) => category.name).join(" "),
    Object.values(product.attributes || {})
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .join(" "),
  ]
    .join(" ")
    .toLowerCase();

/** ASCII-ish fold so regexes match Serbian Latin category names (npr. "KOSULJE", "Obuca"). */
const foldLatinSrForMatch = (value: string) =>
  value
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z");

const getProductGroups = (product: CatalogProductView): SizeGuideGroup[] => {
  const haystack = foldLatinSrForMatch(getProductHaystack(product));
  const groups = new Set<SizeGuideGroup>();
  const isSuit = /odel|suit/.test(haystack);

  if (/cipel|shoe|loafer|mokasin|patik|sneaker|obuc/.test(haystack)) {
    groups.add("shoes");
  }

  if (isSuit || /sako|blazer|jacket|blejzer|kaput|coat/.test(haystack)) {
    groups.add("blazer");
  }

  if (isSuit || /pantal|trouser|pants/.test(haystack)) {
    groups.add("trousers");
  }

  if (/kosulj|shirt/.test(haystack)) {
    groups.add("shirt");
  }

  return Array.from(groups);
};

const isTailoredProduct = (product: CatalogProductView) => {
  const haystack = getProductHaystack(product);
  return /odel|suit|sako|blazer|jacket|blejzer|kaput|coat|pantal|trouser/.test(haystack);
};

const getProductFit = (
  product: CatalogProductView,
  sizeOptions: ProductSizeOption[],
): SizeGuideFit | null => {
  const haystack = foldLatinSrForMatch(
    `${getProductHaystack(product)} ${sizeOptions.map((option) => option.label).join(" ")}`,
  );
  if (/\bslim\b|slim fit|strukiran/.test(haystack)) return "slim";
  if (/\bregular\b|regular fit|classic fit|klasic/.test(haystack)) return "regular";
  return null;
};

const getSizeGuideBullets = (
  lang: StorefrontLanguage,
  hasNumericSizes: boolean,
) => {
  if (lang === "en") {
    return [
      hasNumericSizes
        ? "Compare chest, waist and shoulder width with a garment that already fits you well."
        : "Compare the listed shirt or shoe measurements with a model you already wear comfortably.",
      "If you are between two sizes, choose the larger size first and adjust with tailoring if needed.",
      "For final confirmation, contact the atelier and we will help you pick the closest size before ordering.",
    ];
  }

  return [
    hasNumericSizes
      ? "Uporedite mere grudi, struka i ramena sa komadom koji vam vec dobro stoji."
      : "Uporedite navedene mere kosulje ili obuce sa modelom koji vec nosite bez problema.",
    "Ako ste izmedju dve velicine, sigurniji izbor je veca velicina uz eventualnu doradu.",
    "Za finalnu potvrdu mozete nas kontaktirati pre porudzbine i pomoci cemo oko izbora broja.",
  ];
};

export const productSupportsSizeGuide = (_product: CatalogProductView) => true;

export const getLocalizedCatalogProductName = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => {
  const baseInput = {
    sku: product.sku,
    manufCode: product.manufCode,
    categories: product.categories,
    brand: product.brand,
  };

  const localizedName = getCatalogProductDisplayName(
    {
      ...baseInput,
      name: productText(product, lang).name,
    },
    lang,
  );

  if (lang !== "sr" || !product.nameEn) return localizedName;

  const fallbackName = getCatalogProductDisplayName(
    {
      ...baseInput,
      name: product.nameEn,
    },
    lang,
  );
  const categoryLabel = getCatalogProductCategoryLabel(
    {
      ...baseInput,
      name: product.name,
    },
    lang,
  );
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const localizedIsGeneric = normalize(localizedName) === normalize(categoryLabel);
  const localizedLooksLikeTruncatedCategory =
    localizedName.trim().length <= 3 &&
    normalize(categoryLabel).startsWith(normalize(localizedName));
  const fallbackIsUsable =
    fallbackName &&
    normalize(fallbackName) !== normalize(categoryLabel) &&
    !isCatalogProductNameSuspicious(fallbackName);

  return fallbackIsUsable &&
    (localizedIsGeneric ||
      localizedLooksLikeTruncatedCategory ||
      isCatalogProductNameSuspicious(localizedName))
    ? fallbackName
    : localizedName;
};

export const getLocalizedCatalogDescription = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => productText(product, lang).description;

export const getLocalizedCatalogSpecification = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => productText(product, lang).specification;

export const getCatalogProductImageSources = (
  currentProduct: CatalogProductView,
  variants: CatalogProductView[] = [],
  fallbackImages: string[] = [],
) => {
  // coverImage is the canonical representative image — always first so listing
  // and detail page always agree on which image appears first.
  const sources = [
    currentProduct.coverImage,
    ...currentProduct.images,
    ...variants.flatMap((variant) => [variant.coverImage, ...variant.images]),
  ]
    .map(normalizeImageCandidate)
    .filter((value) => value.length > 0);

  if (sources.length > 0) {
    return Array.from(new Set(sources));
  }

  return Array.from(
    new Set(
      fallbackImages
        .map(normalizeImageCandidate)
        .filter((value) => value.length > 0),
    ),
  );
};

export const getPreferredCatalogProductForDisplay = (
  currentProduct: CatalogProductView,
  variants: CatalogProductView[],
  lang: StorefrontLanguage,
) => {
  const candidates = [currentProduct, ...variants].filter(
    (candidate, index, array) =>
      array.findIndex((item) => item.legacyId === candidate.legacyId) === index,
  );

  const scoreCandidate = (candidate: CatalogProductView) => {
    const displayName = getLocalizedCatalogProductName(candidate, lang);
    let score = 0;
    if (!isCatalogProductNameSuspicious(displayName)) score += 30;
    if (displayName && /\d/u.test(displayName) && /\p{L}/u.test(displayName)) score += 18;
    if (candidate.manufCode && candidate.manufCode.trim()) score += 14;
    if (candidate.coverImage) score += 12;
    if (candidate.categories.length > 0) score += 10;
    if (candidate.brand) score += 8;
    if (candidate.description || candidate.descriptionEn) score += 6;
    if (candidate.specification || candidate.specificationEn) score += 4;
    score += Math.min(
      10,
      Math.max(Number(candidate.stockTotal || 0), Number(candidate.stockWarehouse1 || 0)),
    );
    return score;
  };

  return [...candidates].sort((left, right) => {
    const scoreDiff = scoreCandidate(right) - scoreCandidate(left);
    if (scoreDiff !== 0) return scoreDiff;
    return right.legacyId - left.legacyId;
  })[0] || currentProduct;
};

export const getProductMaterial = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => {
  const specification = stripHtml(getLocalizedCatalogSpecification(product, lang));
  if (specification.length > 0 && specification.length <= 140) {
    return specification;
  }

  return lang === "en"
    ? "Material details are confirmed on the original product declaration."
    : "Detalji materijala potvrdjeni su na originalnoj deklaraciji proizvoda.";
};

export const getProductSizeOptions = (
  currentProduct: CatalogProductView,
  variants: CatalogProductView[],
) => {
  const map = new Map<string, ProductSizeOption>();
  const sizeVariants = variants.length ? variants : [currentProduct];
  const dominantKind = getDominantSizeKind(sizeVariants);
  const variantHasMedia = (variant: CatalogProductView) =>
    Boolean(
      (Array.isArray(variant.images) &&
        variant.images.some((img) => String(img || "").trim().length > 0)) ||
        String(variant.coverImage || "").trim().length > 0,
    );
  const isVariantOrderable = (variant: CatalogProductView, stock: number) =>
    stock > 0 && variant.isActive && variant.isExported;

  const shouldUseVariantForSize = (
    existing: ProductSizeOption,
    existingVariant: CatalogProductView | undefined,
    candidate: CatalogProductView,
    candidateStock: number,
    candidateInStock: boolean,
  ) => {
    const existingHasMedia = existingVariant ? variantHasMedia(existingVariant) : false;
    const candidateHasMedia = variantHasMedia(candidate);
    if (candidateInStock !== existing.inStock) return candidateInStock;
    if (candidateHasMedia !== existingHasMedia) return candidateHasMedia;
    if (candidateStock !== existing.stock) return candidateStock > existing.stock;
    return candidate.legacyId > existing.legacyId;
  };

  for (const variant of variants) {
    const stock = Math.max(
      0,
      Math.floor(
        Number(variant.stockTotal || 0) > 0
          ? Number(variant.stockTotal || 0)
          : Number(variant.stockWarehouse1 || 0),
      ),
    );
    const inStock = isVariantOrderable(variant, stock);
    const sizes = getDisplaySizesForVariant(variant, dominantKind);

    if (!sizes.length) continue;

    for (const size of sizes) {
      const key = normalizeKey(size);
      if (map.has(key)) {
        const existing = map.get(key)!;
        const existingVariant = variants.find((item) => item.legacyId === existing.legacyId);
        if (shouldUseVariantForSize(existing, existingVariant, variant, stock, inStock)) {
          map.set(key, {
            label: size,
            legacyId: variant.legacyId,
            stock: Math.max(existing.stock, stock),
            inStock: existing.inStock || inStock,
          });
        } else {
          map.set(key, {
            ...existing,
            stock: Math.max(existing.stock, stock),
            inStock: existing.inStock || inStock,
          });
        }
        continue;
      }

      map.set(key, {
        label: size,
        legacyId: variant.legacyId,
        stock,
        inStock,
      });
    }
  }

  if (!map.size) {
    for (const size of getDisplaySizesForVariant(currentProduct, dominantKind)) {
      const key = normalizeKey(size);
      const stock = Math.max(
        0,
        Math.floor(
          Number(currentProduct.stockTotal || 0) > 0
            ? Number(currentProduct.stockTotal || 0)
            : Number(currentProduct.stockWarehouse1 || 0),
        ),
      );
      map.set(key, {
        label: size,
        legacyId: currentProduct.legacyId,
        stock,
        inStock: isVariantOrderable(currentProduct, stock),
      });
    }
  }

  return Array.from(map.values()).sort((left, right) =>
    compareSizes(left.label, right.label),
  );
};

export const getSelectedProductSize = (product: CatalogProductView) =>
  extractSizes(product)[0] || null;

export const getProductSizeGuide = async (
  product: CatalogProductView,
  lang: StorefrontLanguage,
  sizeOptions: ProductSizeOption[],
): Promise<ProductSizeGuide | null> => {
  const groups = getProductGroups(product);
  const settings = await getSizeGuideSettings();
  const fit = getProductFit(product, sizeOptions);
  const joined = sizeOptions.map((option) => option.label).join(", ");
  const hasNumericSizes = sizeOptions.some((option) => /^\d/.test(option.label));
  const localizedFallback =
    lang === "en"
      ? "This item does not have a dedicated size table yet. Use the selector above or contact us for a recommendation."
      : "Ovaj model jos nema posebnu tabelu velicina. Iskoristite izbor velicine iznad ili nas kontaktirajte za preporuku.";

  const relevantTables = groups.length
    ? settings.tables.filter((table) => groups.includes(table.group))
    : settings.tables;
  const tables = relevantTables.filter((table) => {
    if (!fit) return true;
    if (table.fit === "standard") return true;
    return table.fit === fit;
  });

  const visibleTables = tables.length ? tables : relevantTables;

  return {
    title: lang === "en" ? "How to determine your size" : "Kako da odredite velicinu",
    intro:
      lang === "en"
        ? `Available sizes: ${joined || "check the selector above"}. Use the guide below to compare the product measurements with a garment you already own.`
        : `Dostupne velicine: ${joined || "pogledajte iznad"}. Uporedite mere iz vodica sa komadom koji vam vec odgovara.`,
    bullets: getSizeGuideBullets(lang, hasNumericSizes),
    buttonLabel: lang === "en" ? "Determine size" : "Odredite velicinu",
    modalTitle: lang === "en" ? "Size guide" : "Tabela velicina",
    imageSrc: (() => {
      if (settings.categoryImages && groups.length) {
        for (const group of groups) {
          const src = settings.categoryImages[group as import("@/lib/catalog/sizeGuides").SizeGuideGroup];
          if (src) return src;
        }
      }
      return settings.imageSrc;
    })(),
    imageAlt: settings.imageAlt,
    tables: visibleTables,
    fallbackNote: visibleTables.length ? null : localizedFallback,
  };
};

export const getProductDeclaration = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
  selectedSize: string | null,
  material: string,
  sizeOptions: ProductSizeOption[],
): ProductDetailField[] => {
  const name = getLocalizedCatalogProductName(product, lang);
  const customDeclaration =
    typeof product.rawPayload?.declaration === "string" &&
    product.rawPayload.declaration.trim().length > 0
      ? product.rawPayload.declaration.trim()
      : null;

  if (lang === "en") {
    const fields: ProductDetailField[] = [
      { label: "Product", value: name },
      { label: "SKU", value: product.sku || "-" },
      { label: "Brand", value: product.brand || "Santos & Santorini" },
      { label: "Material", value: material },
      {
        label: "Declaration",
        value: "Santos & Santorini, Obrenoviceva 9, Nis, Serbia",
      },
    ];
    if (customDeclaration) fields.push({ label: "Note", value: customDeclaration });
    return fields;
  }

  const fields: ProductDetailField[] = [
    { label: "Naziv proizvoda", value: name },
    { label: "SKU", value: product.sku || "-" },
    { label: "Brend", value: product.brand || "Santos & Santorini" },
    { label: "Materijal", value: material },
    {
      label: "Deklaracija",
      value: "Santos & Santorini, Obrenoviceva 9, Nis, Srbija",
    },
  ];
  if (customDeclaration) fields.push({ label: "Napomena", value: customDeclaration });
  return fields;
};

const WASH_CARE_ICONS: ProductWashCareIcon[] = [
  "gentleWash",
  "dryCleaning",
  "doNotBleach",
  "lowIron",
  "noTumbleDry",
];

const ALL_WASH_CARE_ITEMS_SR: Record<ProductWashCareIcon, ProductWashCareItem> = {
  gentleWash: {
    icon: "gentleWash",
    title: "Pranje do 30C",
    description: "Koristite nezan program pranja i blagi deterdzent.",
  },
  dryCleaning: {
    icon: "dryCleaning",
    title: "Hemijsko ciscenje",
    description: "Za odela, sakoe i slicne krojene modele preporucuje se profesionalno ciscenje.",
  },
  doNotBleach: {
    icon: "doNotBleach",
    title: "Bez izbeljivaca",
    description: "Izbeljivaci mogu ostetiti vlakna, boju i konstrukciju materijala.",
  },
  lowIron: {
    icon: "lowIron",
    title: "Peglanje na nizoj temperaturi",
    description: "Peglajte pazljivo, najbolje preko tanke krpe ili sa nalicja.",
  },
  noTumbleDry: {
    icon: "noTumbleDry",
    title: "Bez susilice",
    description: "Prirodno susenje cuva oblik i zavrsnu obradu proizvoda.",
  },
};

const ALL_WASH_CARE_ITEMS_EN: Record<ProductWashCareIcon, ProductWashCareItem> = {
  gentleWash: {
    icon: "gentleWash",
    title: "Gentle wash",
    description: "Wash at up to 30C on a gentle program.",
  },
  dryCleaning: {
    icon: "dryCleaning",
    title: "Dry clean",
    description: "Professional dry cleaning is recommended for tailored garments.",
  },
  doNotBleach: {
    icon: "doNotBleach",
    title: "Do not bleach",
    description: "Bleach can damage fibers, color, and structure.",
  },
  lowIron: {
    icon: "lowIron",
    title: "Low iron",
    description: "Iron at low temperature, ideally with a pressing cloth.",
  },
  noTumbleDry: {
    icon: "noTumbleDry",
    title: "No tumble dry",
    description: "Let the garment air dry naturally on a hanger.",
  },
};

export const getProductWashCare = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => {
  const allItems = lang === "en" ? ALL_WASH_CARE_ITEMS_EN : ALL_WASH_CARE_ITEMS_SR;
  const title =
    lang === "en" ? "Wash care symbols and meanings" : "Wash care simboli i znacenje";
  const note =
    lang === "en"
      ? "Always follow the original sewn-in care label if it differs from this guide."
      : "Ako se originalna etiketa razlikuje od ovog vodica, pratite usivenu deklaraciju na proizvodu.";

  const rawIcons = product.rawPayload?.washCareIcons;
  const overrideIcons: ProductWashCareIcon[] | null =
    Array.isArray(rawIcons) && rawIcons.length > 0
      ? (rawIcons as string[]).filter((v): v is ProductWashCareIcon =>
          WASH_CARE_ICONS.includes(v as ProductWashCareIcon),
        )
      : null;

  if (overrideIcons && overrideIcons.length > 0) {
    return { title, note, items: overrideIcons.map((icon) => allItems[icon]) };
  }

  const tailored = isTailoredProduct(product);
  const defaultIcons: ProductWashCareIcon[] = tailored
    ? ["dryCleaning", "doNotBleach", "lowIron", "noTumbleDry"]
    : ["gentleWash", "doNotBleach", "lowIron", "noTumbleDry"];

  return { title, note, items: defaultIcons.map((icon) => allItems[icon]) };
};
