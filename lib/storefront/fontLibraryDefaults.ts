export const ALLOWED_FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800"] as const;
export type FontWeight = (typeof ALLOWED_FONT_WEIGHTS)[number];
export type FontSource = "google" | "uploaded";
export type FontFallback = "sans-serif" | "serif";

export type FontFamilyRecord = {
  id: string;
  name: string;
  source: FontSource;
  fallback: FontFallback;
  weights: FontWeight[];
  files?: Partial<Record<FontWeight, string>>;
};

export const DEFAULT_FONT_LIBRARY: FontFamilyRecord[] = [
  { id: "montserrat", name: "Montserrat", source: "google", fallback: "sans-serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { id: "playfair-display", name: "Playfair Display", source: "google", fallback: "serif", weights: ["400", "500", "600", "700", "800"] },
];

export const normalizeFontFamilyName = (value: unknown): string | null => {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 80 || !/^[\p{L}\p{N} .&'_-]+$/u.test(name)) return null;
  return name;
};

export const slugifyFontFamily = (value: string) => value
  .normalize("NFD").replace(/\p{Diacritic}/gu, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);

export const findFontByLegacyName = (library: FontFamilyRecord[], name: unknown) => {
  const target = String(name || "").trim().toLowerCase();
  return library.find((font) => font.name.toLowerCase() === target) || null;
};

export const normalizeFontLibrary = (value: unknown): FontFamilyRecord[] => {
  const stored = Array.isArray(value) ? value : [];
  const normalized = stored.flatMap((item): FontFamilyRecord[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = normalizeFontFamilyName(row.name);
    const id = slugifyFontFamily(String(row.id || name || ""));
    const source = row.source === "uploaded" ? "uploaded" : row.source === "google" ? "google" : null;
    const fallback = row.fallback === "serif" ? "serif" : row.fallback === "sans-serif" ? "sans-serif" : null;
    const weights = Array.isArray(row.weights) ? row.weights.map(String).filter((weight): weight is FontWeight => ALLOWED_FONT_WEIGHTS.includes(weight as FontWeight)) : [];
    if (!id || !name || !source || !fallback || !weights.length) return [];
    const files = row.files && typeof row.files === "object" ? row.files as Partial<Record<FontWeight, string>> : undefined;
    if (source === "uploaded" && weights.some((weight) => !files?.[weight])) return [];
    return [{ id, name, source, fallback, weights: Array.from(new Set(weights)), ...(files ? { files } : {}) }];
  });
  const byId = new Map(DEFAULT_FONT_LIBRARY.map((font) => [font.id, font]));
  for (const font of normalized) if (!byId.has(font.id)) byId.set(font.id, font);
  return Array.from(byId.values());
};
