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
