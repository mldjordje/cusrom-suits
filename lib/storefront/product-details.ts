import { formatCatalogProductName } from "@/lib/catalog/presentation";
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
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
  const numeric = Number.parseFloat(normalized.replace(",", "."));
  if (Number.isFinite(numeric) && /\d/.test(normalized)) {
    return { bucket: 0, value: numeric };
  }

  const intlIndex = sizeOrder.indexOf(normalized);
  if (intlIndex >= 0) {
    return { bucket: 1, value: intlIndex };
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
      name: product.nameEn || product.name,
      description: product.descriptionEn || product.description,
      specification: product.specificationEn || product.specification,
    };
  }

  return {
    name: product.name,
    description: product.description,
    specification: product.specification,
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

  if (/ko[šs]ulj|shirt|polo|majic|t-?shirt|sweater|d[žz]emper|knit/.test(haystack)) {
    return "soft";
  }

  return "general";
};

export const getLocalizedCatalogProductName = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => formatCatalogProductName(productText(product, lang).name, product.sku);

export const getLocalizedCatalogDescription = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => productText(product, lang).description;

export const getLocalizedCatalogSpecification = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => productText(product, lang).specification;

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
    : "Detalji materijala potvrđeni su na originalnoj deklaraciji proizvoda.";
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
): ProductSizeGuide => {
  const joined = sizeOptions.map((option) => option.label).join(", ");
  const hasNumericSizes = sizeOptions.some((option) => /^\d/.test(option.label));
  const family = getProductFamily(product);

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
        family === "tailored"
          ? "If you are between two sizes, choose the larger size for tailored garments and adjust in atelier if needed."
          : "If you are between two sizes, choose the larger size for a more comfortable fit.",
        "If you need help, contact our team and we will recommend the best size before ordering.",
      ],
    };
  }

  return {
    title: "Kako da odredite veličinu",
    intro: hasNumericSizes
      ? `Dostupne veličine: ${joined || "pogledajte iznad"} . Brojčane veličine prate evropski konfekcijski sistem.`
      : `Dostupne veličine: ${joined || "pogledajte iznad"} . Slovne veličine prate standardnu internacionalnu skalu.`,
    bullets: [
      hasNumericSizes
        ? "Izmerite obim grudi i struka preko lagane košulje i uporedite sa veličinom koju inače nosite."
        : "Izmerite obim grudi preko najšireg dela i uporedite sa veličinom koju obično nosite u košuljama ili trikotaži.",
      family === "tailored"
        ? "Ako ste između dve veličine, za odela i sakoa preporuka je veća veličina uz naknadno korigovanje."
        : "Ako ste između dve veličine, uzmite veću veličinu radi udobnijeg pada.",
      "Ako želite potvrdu pre poručivanja, kontaktirajte naš tim i preporučićemo odgovarajući broj.",
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
    { label: "Dostupne veličine", value: sizes },
    {
      label: "Deklaracija",
      value: "Santos & Santorini, Obrenovićeva 9, Niš, Srbija",
    },
  ];
};

export const getProductWashCare = (
  product: CatalogProductView,
  lang: StorefrontLanguage,
) => {
  const family = getProductFamily(product);
  const tailored = family === "tailored";

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
              symbol: "30°",
              title: "Gentle wash",
              description: "Wash at up to 30°C on a gentle program.",
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
    title: "Wash care simboli i značenje",
    note: "Ako se originalna etiketa razlikuje od ovog vodiča, pratite ušivenu deklaraciju na proizvodu.",
    items: tailored
      ? [
          {
            symbol: "P",
            title: "Hemijsko čišćenje",
            description: "Za odela, sakoe i slične krojene modele preporučuje se profesionalno čišćenje.",
          },
          {
            symbol: "No Cl",
            title: "Bez izbeljivača",
            description: "Izbeljivači mogu oštetiti vlakna, boju i konstrukciju materijala.",
          },
          {
            symbol: "Low",
            title: "Peglanje na nižoj temperaturi",
            description: "Peglajte pažljivo, najbolje preko pamučne krpe ili sa naličja.",
          },
          {
            symbol: "No TD",
            title: "Bez mašinskog sušenja",
            description: "Sušite prirodno, na ofingeru ili ravnoj podlozi.",
          },
        ]
      : [
          {
            symbol: "30°",
            title: "Pranje do 30°C",
            description: "Koristite nežan program pranja i blagi deterdžent.",
          },
          {
            symbol: "No Cl",
            title: "Bez izbeljivača",
            description: "Ne koristiti varikinu i jaka sredstva za beljenje.",
          },
          {
            symbol: "Low",
            title: "Peglanje na nižoj temperaturi",
            description: "Po potrebi peglati sa naličja kako bi se sačuvala struktura tkanine.",
          },
          {
            symbol: "No TD",
            title: "Bez sušilice",
            description: "Prirodno sušenje čuva oblik i završnu obradu proizvoda.",
          },
        ],
  };
};
