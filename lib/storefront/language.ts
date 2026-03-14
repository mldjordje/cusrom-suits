export type StorefrontLanguage = "sr" | "en";

export const STOREFRONT_LANGUAGE_COOKIE = "santos_lang";

export type StorefrontSearchParams = Record<string, string | string[] | undefined>;

export const firstStorefrontParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const normalizeStorefrontLanguage = (value: unknown): StorefrontLanguage =>
  String(value || "").trim().toLowerCase() === "en" ? "en" : "sr";
