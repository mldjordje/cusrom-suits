import { decodeHtmlEntities, getCatalogProductDisplayName, isCatalogProductNameSuspicious } from "@/lib/catalog/presentation";
import type { CatalogProductView } from "@/lib/catalog/store";
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
};

export type ProductWashCareItem = {
  symbol: string;
  title: string;
  description: string;
};

const stripHtml = (value: string | null) =>
  decodeHtmlEntities((value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const extractSizes = (product: CatalogProductView) =>
  Array.isArray(product.attributes?.size)
    ? product.attributes.size
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
    : [];

const normalizeKey = (value: string) => value.trim().toUpperCase();

const sizeOrder = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
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

const getProductFamily = (product: CatalogProductView) => {
  const haystack = [
    product.name,
    product.nameEn || "",
    product.categories.map((category) => category.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (/odel|suit|sako|blazer|jacket|kaput|coat|pantal|trouser/.test(haystack)) {
    return "tailored";
  }

  if (/kosulj|shirt|polo|majic|t-?shirt|sweater|dzemper|knit/.test(haystack)) {
    return "soft";
  }

  return "general";
};

export const productSupportsSizeGuide = (product: CatalogProductView) =>
  getProductFamily(product) === "tailored";

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

export const getProductSizeGuide = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
  sizeOptions: ProductSizeOption[],
): ProductSizeGuide | null => {
  if (!productSupportsSizeGuide(product)) {
    return null;
  }

  const joined = sizeOptions.map((option) => option.label).join(", ");
  const hasNumericSizes = sizeOptions.some((option) => /^\d/.test(option.label));

  if (lang === "en") {
    return {
      title: "How to determine your size",
      intro: hasNumericSizes
        ? `Available sizes: ${joined || "check the selector above"}. Numeric sizes follow the EU ready-to-wear scale.`
        : `Available sizes: ${joined || "check the selector above"}. Letter sizes follow the standard international scale.`,
      bullets: [
        hasNumericSizes
          ? "Measure chest and waist over a light shirt, then compare with your usual EU suit or trouser size."
          : "Measure chest around the fullest part and compare with the size you usually wear in shirts or knitwear.",
        "If you are between two sizes, choose the larger size for tailored garments and adjust in atelier if needed.",
        "If you need help, contact our team and we will recommend the best size before ordering.",
      ],
    };
  }

  return {
    title: "Kako da odredite velicinu",
    intro: hasNumericSizes
      ? `Dostupne velicine: ${joined || "pogledajte iznad"}. Brojcane velicine prate evropski konfekcijski sistem.`
      : `Dostupne velicine: ${joined || "pogledajte iznad"}. Slovne velicine prate standardnu internacionalnu skalu.`,
    bullets: [
      hasNumericSizes
        ? "Izmerite obim grudi i struka preko lagane kosulje i uporedite sa velicinom koju inace nosite."
        : "Izmerite obim grudi preko najsireg dela i uporedite sa velicinom koju obicno nosite u kosuljama ili trikotazi.",
      "Ako ste izmedju dve velicine, za odela i sakoa preporuka je veca velicina uz naknadno korigovanje.",
      "Ako zelite potvrdu pre porucivanja, kontaktirajte nas tim i preporucicemo odgovarajuci broj.",
    ],
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
  const sizes = sizeOptions.map((option) => option.label).join(", ") || selectedSize || "-";

  if (lang === "en") {
    return [
      { label: "Product", value: name },
      { label: "SKU", value: product.sku || "-" },
      { label: "Brand", value: product.brand || "Santos & Santorini" },
      { label: "Material", value: material },
      { label: "Available sizes", value: sizes },
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
    { label: "Dostupne velicine", value: sizes },
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
  const tailored = productSupportsSizeGuide(product);

  if (lang === "en") {
    return {
      title: "Wash care symbols and meanings",
      note: "Always follow the original sewn-in care label if it differs from this guide.",
      items: tailored
        ? [
            {
              symbol: "P",
              title: "Dry clean",
              description: "Professional dry cleaning is recommended for tailored garments.",
            },
            {
              symbol: "No Cl",
              title: "Do not bleach",
              description: "Bleach can damage fibers, color, and structure.",
            },
            {
              symbol: "Low",
              title: "Low iron",
              description: "Iron at low temperature, ideally with a pressing cloth.",
            },
            {
              symbol: "No TD",
              title: "No tumble dry",
              description: "Let the garment air dry naturally on a hanger.",
            },
          ]
        : [
            {
              symbol: "30",
              title: "Gentle wash",
              description: "Wash at up to 30C on a gentle program.",
            },
            {
              symbol: "No Cl",
              title: "Do not bleach",
              description: "Avoid bleach and aggressive whiteners.",
            },
            {
              symbol: "Low",
              title: "Low iron",
              description: "Iron inside out at low temperature when needed.",
            },
            {
              symbol: "No TD",
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
            symbol: "P",
            title: "Hemijsko ciscenje",
            description: "Za odela, sakoe i slicne krojene modele preporucuje se profesionalno ciscenje.",
          },
          {
            symbol: "No Cl",
            title: "Bez izbeljivaca",
            description: "Izbeljivaci mogu ostetiti vlakna, boju i konstrukciju materijala.",
          },
          {
            symbol: "Low",
            title: "Peglanje na nizoj temperaturi",
            description: "Peglajte pazljivo, najbolje preko pamučne krpe ili sa nalicja.",
          },
          {
            symbol: "No TD",
            title: "Bez masinskog susenja",
            description: "Susite prirodno, na ofingeru ili ravnoj podlozi.",
          },
        ]
      : [
          {
            symbol: "30",
            title: "Pranje do 30C",
            description: "Koristite nezan program pranja i blagi deterdzent.",
          },
          {
            symbol: "No Cl",
            title: "Bez izbeljivaca",
            description: "Ne koristiti varikinu i jaka sredstva za beljenje.",
          },
          {
            symbol: "Low",
            title: "Peglanje na nizoj temperaturi",
            description: "Po potrebi peglati sa nalicja kako bi se sacuvala struktura tkanine.",
          },
          {
            symbol: "No TD",
            title: "Bez susilice",
            description: "Prirodno susenje cuva oblik i zavrsnu obradu proizvoda.",
          },
        ],
  };
};
