const COLLAPSE_WHITESPACE = /\s+/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function formatCatalogProductName(name: string, sku?: string | null) {
  let value = String(name || "").replace(COLLAPSE_WHITESPACE, " ").trim();
  if (!value) return value;

  if (sku && sku.trim()) {
    const skuPattern = new RegExp(`^${escapeRegExp(sku.trim())}[\\s_\\-:|]+`, "i");
    value = value.replace(skuPattern, "").trim();
  }

  value = value.replace(/^[A-Z]\.(?=[\p{Lu}][\p{Ll}])/u, "");

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

  return value.replace(/^[\s._\-+/|:]+/, "").trim();
}
