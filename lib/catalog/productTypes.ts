type CatalogCategoryLike = {
  name?: string | null;
  path?: string[] | null;
};

type CatalogProductTypeInput = {
  name?: string | null;
  categories?: CatalogCategoryLike[] | null;
  rawPayload?: Record<string, unknown> | null;
};

const normalizeForProductType = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export const BUSINESS_UNIFORM_PRODUCT_TYPE = "business_uniform";
export const FOOTWEAR_PRODUCT_TYPE = "footwear";

export function isBusinessUniformProduct(product: CatalogProductTypeInput) {
  const rawType = normalizeForProductType(String(product.rawPayload?.productType || ""));
  if (rawType === BUSINESS_UNIFORM_PRODUCT_TYPE || rawType === "poslovne_uniforme") {
    return true;
  }

  const categoryText = (product.categories || [])
    .flatMap((category) => [category?.name || "", ...(category?.path || [])])
    .join(" ");
  const haystack = normalizeForProductType(`${product.name || ""} ${categoryText}`);

  return /poslovn.*uniform|business.*uniform|uniforme|uniforma/u.test(haystack);
}

/**
 * Footwear needs its own size table (EU number + insole length) and its own
 * material breakdown, so the storefront has to know a product is a shoe before
 * it renders either.
 *
 * The name regex alone was not enough: hand-entered models are named after the
 * last, not the category ("Derbi 042"), and those fell through to the garment
 * tables. An explicit admin flag wins; the name stays as the fallback so the
 * mOffice-synced shoes keep working untouched.
 */
export function isFootwearProduct(product: CatalogProductTypeInput) {
  const rawType = normalizeForProductType(String(product.rawPayload?.productType || ""));
  if (rawType === FOOTWEAR_PRODUCT_TYPE || rawType === "obuca" || rawType === "cipele") {
    return true;
  }
  // A product explicitly marked as something else is not a shoe, whatever it
  // happens to be called.
  if (rawType) return false;

  const categoryText = (product.categories || [])
    .flatMap((category) => [category?.name || "", ...(category?.path || [])])
    .join(" ");
  const haystack = normalizeForProductType(`${product.name || ""} ${categoryText}`);

  /* Deliberately narrower than the last names a shoe can carry: "oxford" and
     "derby" are also shirt-fabric and collar names, so matching them here would
     have sent Kosulja Oxford to the footwear size table. Models named only
     after the last are what the explicit admin flag above is for. */
  return /cipel|cipe|obuc|shoe|loafer|mokasin|patik|sneaker/u.test(haystack);
}
