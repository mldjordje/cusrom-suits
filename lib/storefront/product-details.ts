import { decodeHtmlEntities, getCatalogProductDisplayName, isCatalogProductNameSuspicious } from "@/lib/catalog/presentation";
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

const stripHtml = (value: string | null) =>
  decodeHtmlEntities((value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const normalizeImageCandidate = (value: unknown) => sanitizeStorefrontImageSrc(value);

const extractSizes = (product: CatalogProductView) =>
  Array.isArray(product.attributes?.size)
    ? product.attributes.size
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
    : [];

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

const getProductGroups = (product: CatalogProductView): SizeGuideGroup[] => {
  const haystack = getProductHaystack(product);
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
  const haystack = `${getProductHaystack(product)} ${sizeOptions.map((option) => option.label).join(" ").toLowerCase()}`;
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
) =>
  getCatalogProductDisplayName(
    {
      name: productText(product, lang).name,
      sku: product.sku,
      manufCode: product.manufCode,
      categories: product.categories,
      brand: product.brand,
    },
    lang,
  );

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
  const sources = [
    ...currentProduct.images,
    currentProduct.coverImage,
    ...variants.flatMap((variant) => [...variant.images, variant.coverImage]),
    ...fallbackImages,
  ]
    .map(normalizeImageCandidate)
    .filter((value) => value.length > 0);

  return Array.from(new Set(sources));
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

  for (const variant of variants) {
    const stock = Math.max(
      0,
      Math.floor(
        Number(variant.stockTotal || 0) > 0
          ? Number(variant.stockTotal || 0)
          : Number(variant.stockWarehouse1 || 0),
      ),
    );
    const sizes = extractSizes(variant);

    if (!sizes.length) continue;

    for (const size of sizes) {
      const key = normalizeKey(size);
      if (map.has(key)) {
        const existing = map.get(key)!;
        if (stock > existing.stock) {
          map.set(key, {
            label: size,
            legacyId: variant.legacyId,
            stock,
            inStock: stock > 0,
          });
        }
        continue;
      }

      map.set(key, {
        label: size,
        legacyId: variant.legacyId,
        stock,
        inStock: stock > 0,
      });
    }
  }

  if (!map.size) {
    for (const size of extractSizes(currentProduct)) {
      const key = normalizeKey(size);
      map.set(key, {
        label: size,
        legacyId: currentProduct.legacyId,
        stock: Math.max(
          0,
          Math.floor(
            Number(currentProduct.stockTotal || 0) > 0
              ? Number(currentProduct.stockTotal || 0)
              : Number(currentProduct.stockWarehouse1 || 0),
          ),
        ),
        inStock: true,
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

  if (lang === "en") {
    return [
      { label: "Product", value: name },
      { label: "SKU", value: product.sku || "-" },
      { label: "Brand", value: product.brand || "Santos & Santorini" },
      { label: "Material", value: material },
      {
        label: "Declaration",
        value: "Santos & Santorini, Obrenoviceva 9, Nis, Serbia",
      },
    ];
  }

  return [
    { label: "Naziv proizvoda", value: name },
    { label: "SKU", value: product.sku || "-" },
    { label: "Brend", value: product.brand || "Santos & Santorini" },
    { label: "Materijal", value: material },
    {
      label: "Deklaracija",
      value: "Santos & Santorini, Obrenoviceva 9, Nis, Srbija",
    },
  ];
};

export const getProductWashCare = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => {
  const tailored = isTailoredProduct(product);

  if (lang === "en") {
    return {
      title: "Wash care symbols and meanings",
      note: "Always follow the original sewn-in care label if it differs from this guide.",
      items: tailored
        ? [
            {
              icon: "dryCleaning" as const,
              title: "Dry clean",
              description: "Professional dry cleaning is recommended for tailored garments.",
            },
            {
              icon: "doNotBleach" as const,
              title: "Do not bleach",
              description: "Bleach can damage fibers, color, and structure.",
            },
            {
              icon: "lowIron" as const,
              title: "Low iron",
              description: "Iron at low temperature, ideally with a pressing cloth.",
            },
            {
              icon: "noTumbleDry" as const,
              title: "No tumble dry",
              description: "Let the garment air dry naturally on a hanger.",
            },
          ]
        : [
            {
              icon: "gentleWash" as const,
              title: "Gentle wash",
              description: "Wash at up to 30C on a gentle program.",
            },
            {
              icon: "doNotBleach" as const,
              title: "Do not bleach",
              description: "Avoid bleach and aggressive whiteners.",
            },
            {
              icon: "lowIron" as const,
              title: "Low iron",
              description: "Iron inside out at low temperature when needed.",
            },
            {
              icon: "noTumbleDry" as const,
              title: "No tumble dry",
              description: "Air dry to preserve shape and finish.",
            },
          ],
    };
  }

  return {
    title: "Wash care simboli i znacenje",
    note: "Ako se originalna etiketa razlikuje od ovog vodica, pratite usivenu deklaraciju na proizvodu.",
    items: tailored
      ? [
          {
            icon: "dryCleaning" as const,
            title: "Hemijsko ciscenje",
            description: "Za odela, sakoe i slicne krojene modele preporucuje se profesionalno ciscenje.",
          },
          {
            icon: "doNotBleach" as const,
            title: "Bez izbeljivaca",
            description: "Izbeljivaci mogu ostetiti vlakna, boju i konstrukciju materijala.",
          },
          {
            icon: "lowIron" as const,
            title: "Peglanje na nizoj temperaturi",
            description: "Peglajte pazljivo, najbolje preko tanke krpe ili sa nalicja.",
          },
          {
            icon: "noTumbleDry" as const,
            title: "Bez masinskog susenja",
            description: "Susite prirodno, na ofingeru ili ravnoj podlozi.",
          },
        ]
      : [
          {
            icon: "gentleWash" as const,
            title: "Pranje do 30C",
            description: "Koristite nezan program pranja i blagi deterdzent.",
          },
          {
            icon: "doNotBleach" as const,
            title: "Bez izbeljivaca",
            description: "Ne koristiti varikinu i jaka sredstva za beljenje.",
          },
          {
            icon: "lowIron" as const,
            title: "Peglanje na nizoj temperaturi",
            description: "Po potrebi peglati sa nalicja kako bi se sacuvala struktura tkanine.",
          },
          {
            icon: "noTumbleDry" as const,
            title: "Bez susilice",
            description: "Prirodno susenje cuva oblik i zavrsnu obradu proizvoda.",
          },
        ],
  };
};
