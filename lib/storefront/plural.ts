/**
 * Serbian and English count labels.
 *
 * The storefront used to hardcode the genitive plural everywhere, so a single
 * match rendered "1 proizvoda" / "1 artikala" and English got "1 products".
 * Serbian has three numeric forms, and which one a number takes depends on its
 * last two digits, not on whether it is greater than one:
 *
 *   one  — 1, 21, 31 …            but NOT 11
 *   few  — 2, 3, 4, 22, 23, 24 …  but NOT 12, 13, 14
 *   many — everything else (0, 5..20, 25 …)
 */
export type SerbianPluralForms = {
  one: string;
  few: string;
  many: string;
};

export const serbianPluralForm = (count: number): keyof SerbianPluralForms => {
  const n = Math.abs(Math.trunc(Number(count) || 0));
  const lastTwo = n % 100;
  const last = n % 10;
  if (last === 1 && lastTwo !== 11) return "one";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "few";
  return "many";
};

export const pluralizeSr = (count: number, forms: SerbianPluralForms) =>
  forms[serbianPluralForm(count)];

export const pluralizeEn = (count: number, one: string, other = `${one}s`) =>
  Math.abs(Number(count) || 0) === 1 ? one : other;

/** Ready-made nouns the storefront counts. */
export const SR_PLURALS = {
  proizvod: { one: "proizvod", few: "proizvoda", many: "proizvoda" },
  artikal: { one: "artikal", few: "artikla", many: "artikala" },
  model: { one: "model", few: "modela", many: "modela" },
  rezultat: { one: "rezultat", few: "rezultata", many: "rezultata" },
  velicina: { one: "velicina", few: "velicine", many: "velicina" },
  komad: { one: "komad", few: "komada", many: "komada" },
} as const satisfies Record<string, SerbianPluralForms>;

type CountedNoun = keyof typeof SR_PLURALS;

/**
 * `countLabel(3, "proizvod", "product", isEn)` → "3 proizvoda" / "3 products".
 * Returns the noun only — callers that need a different number (e.g. "8 / 214")
 * compose the label themselves and pass the number the noun must agree with.
 */
export const nounForCount = (
  count: number,
  srNoun: CountedNoun,
  enNoun: string,
  isEn: boolean,
) => (isEn ? pluralizeEn(count, enNoun) : pluralizeSr(count, SR_PLURALS[srNoun]));

export const countLabel = (
  count: number,
  srNoun: CountedNoun,
  enNoun: string,
  isEn: boolean,
) => `${count} ${nounForCount(count, srNoun, enNoun, isEn)}`;
