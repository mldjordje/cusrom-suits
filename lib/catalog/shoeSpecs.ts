import type { SizeGuideTable } from "@/lib/catalog/sizeGuides";

/**
 * Footwear-specific product data.
 *
 * Shoes do not fit the garment model the rest of the catalogue uses. A suit is
 * one SKU per size, synced from mOffice, and its size table lives globally in
 * /admin/size-guides. A hand-entered shoe has no mOffice rows to fan out from,
 * so the admin has to type the numbers, and the number that matters (insole
 * length in cm) is not a garment measurement at all.
 *
 * This keeps both on one product: the size ladder that feeds the storefront
 * selector, and the material breakdown that feeds the declaration.
 */

export type ShoeSizeEntry = {
  /** EU shoe number, e.g. "42". */
  size: string;
  /** Insole (gaziste) length in cm for that number, e.g. "26.5". Optional. */
  insoleCm: string;
  /** Per-number stock. 0 renders the number as sold out, not missing. */
  stock: number;
};

export type ShoeSpec = {
  sizes: ShoeSizeEntry[];
  /** Upper / lice. */
  upper: string;
  /** Lining / postava. */
  lining: string;
  /** Sole / djon. */
  sole: string;
  /** Footbed / uloznaa tabanica. */
  insole: string;
};

export const EMPTY_SHOE_SPEC: ShoeSpec = {
  sizes: [],
  upper: "",
  lining: "",
  sole: "",
  insole: "",
};

/** Default ladder offered in the admin form. Admin ticks what it stocks. */
export const SHOE_SIZE_LADDER = ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47"] as const;

export const SHOE_UPPER_OPTIONS = [
  "Prirodna koža",
  "Prevrnuta koža (velur)",
  "Nubuk",
  "Lakovana koža",
  "Eko koža",
  "Tekstil",
  "Kombinovano",
] as const;

export const SHOE_LINING_OPTIONS = [
  "Prirodna koža",
  "Tekstil",
  "Eko koža",
  "Krzno",
] as const;

export const SHOE_SOLE_OPTIONS = [
  "Koža",
  "Guma",
  "TR / termoguma",
  "Poliuretan",
  "Kombinovano",
] as const;

export const SHOE_INSOLE_OPTIONS = [
  "Prirodna koža",
  "Tekstil",
  "Memory foam",
  "Anatomska, izvlačiva",
] as const;

const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Shoe numbers are digits, optionally with a half step ("41", "41.5"). */
const normalizeSizeLabel = (value: unknown) => {
  const raw = text(value).replace(",", ".");
  const match = /^(\d{2})(?:\.(0|5))?$/.exec(raw);
  if (!match) return "";
  return match[2] === "5" ? `${match[1]}.5` : match[1];
};

const normalizeInsole = (value: unknown) => {
  const raw = text(value).replace(",", ".").replace(/\s*cm$/i, "");
  if (!raw) return "";
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0 || num > 60) return "";
  // Keep one decimal at most: "26.5" reads as a measurement, "26.50" as noise.
  return String(Math.round(num * 10) / 10);
};

const normalizeStock = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
};

export const normalizeShoeSpec = (value: unknown): ShoeSpec | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;

  const seen = new Set<string>();
  const sizes: ShoeSizeEntry[] = [];
  if (Array.isArray(row.sizes)) {
    for (const entry of row.sizes) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const size = normalizeSizeLabel(item.size);
      if (!size || seen.has(size)) continue;
      seen.add(size);
      sizes.push({
        size,
        insoleCm: normalizeInsole(item.insoleCm),
        stock: normalizeStock(item.stock),
      });
    }
  }
  sizes.sort((a, b) => Number(a.size) - Number(b.size));

  const spec: ShoeSpec = {
    sizes: sizes.slice(0, 24),
    upper: text(row.upper).slice(0, 80),
    lining: text(row.lining).slice(0, 80),
    sole: text(row.sole).slice(0, 80),
    insole: text(row.insole).slice(0, 80),
  };

  const hasContent =
    spec.sizes.length > 0 || spec.upper || spec.lining || spec.sole || spec.insole;
  return hasContent ? spec : null;
};

/** Reads the spec off a product's raw payload. */
export const getShoeSpec = (rawPayload: Record<string, unknown> | null | undefined): ShoeSpec | null =>
  normalizeShoeSpec(rawPayload?.shoe);

/** Size labels for the storefront selector / attributes.size mirror. */
export const shoeSizeLabels = (spec: ShoeSpec | null): string[] =>
  spec ? spec.sizes.map((entry) => entry.size) : [];

/** Sum of per-number stock — what the product-level stock field should hold. */
export const shoeTotalStock = (spec: ShoeSpec | null): number =>
  spec ? spec.sizes.reduce((acc, entry) => acc + entry.stock, 0) : 0;

/**
 * Renders the material breakdown as the specification / SEO material text, so
 * the declaration block and the product schema stay filled without a second
 * storefront code path.
 */
export const shoeMaterialSummary = (spec: ShoeSpec | null, lang: "sr" | "en" = "sr"): string => {
  if (!spec) return "";
  const labels =
    lang === "en"
      ? { upper: "Upper", lining: "Lining", sole: "Sole", insole: "Footbed" }
      : { upper: "Lice", lining: "Postava", sole: "Đon", insole: "Tabanica" };
  return (["upper", "lining", "sole", "insole"] as const)
    .filter((key) => spec[key])
    .map((key) => `${labels[key]}: ${spec[key]}`)
    .join(", ");
};

/**
 * Builds a per-product size table from the entered insole lengths. Falls back
 * to null when the admin ticked numbers but typed no cm — the global shoes
 * table from /admin/size-guides then still applies.
 */
export const shoeSpecToSizeGuideTable = (
  spec: ShoeSpec | null,
  idSeed: string | number,
  lang: "sr" | "en" = "sr",
): SizeGuideTable | null => {
  if (!spec) return null;
  const rows = spec.sizes.filter((entry) => entry.insoleCm);
  if (rows.length < 2) return null;

  const id = `shoe-${idSeed}`;
  return {
    id,
    title: lang === "en" ? "This model" : "Ovaj model",
    group: "shoes",
    categoryKey: "",
    fit: "standard",
    headers:
      lang === "en" ? ["Size", "Insole length (cm)"] : ["Broj", "Dužina gazišta (cm)"],
    rows: rows.map((entry, index) => ({
      id: `${id}-row-${index + 1}`,
      cells: [entry.size, entry.insoleCm],
    })),
    notes: [
      lang === "en"
        ? "Measure your foot standing, heel against a wall, and compare with the insole length."
        : "Izmerite stopalo stojeći, petom uz zid, pa uporedite sa dužinom gazišta.",
    ],
  };
};
