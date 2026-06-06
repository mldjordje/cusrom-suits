/**
 * Extracts a model code (the legacy `manufcode` equivalent) from a product's
 * manufacturer code or name. The old site grouped every size/variant into one model
 * by `manufcode` and showed the "primary" variant's photos for the whole group; we
 * reuse the same key to share photos across in-stock variants of the same model.
 *
 * Examples: "M. Košulja C8/61  M.Košulja" -> "c8/61", "CASCAVEL/75 M.Košulja" ->
 * "cascavel/75", "M. Pantalone P20/228/3N" -> "p20/228/3n".
 *
 * Returns "" for values without a distinctive code (e.g. "Kravata", "Kapa", or a bare
 * size like "75") so unrelated products never collapse together.
 */
const TYPE_WORDS =
  /\b(kosulja|pantalone|odelo|sako|kaput|cipele|dzemper|kais|kaisevi|kravata|prsluk|jakna|majica|bermude|bokserice|kapa|sal|marama|carapa|carape|novcanik|torba|maska|navlaka|kutija)\b/g;

export function extractModelCode(
  manufCode: string | null | undefined,
  name: string | null | undefined,
): string {
  const raw = String(manufCode || "").trim() || String(name || "").trim();
  if (!raw) return "";
  const deburr = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = deburr
    .replace(/\s+m\.[a-z]+.*$/, "") // trailing " M.Košulja" type annotation
    .replace(/\b[mzd]\.\s*/g, " ") // "M." / "Ž." / "D." gender prefix
    .replace(/\b(muska|muski|zenska|zenski|decija|deciji)\b/g, " ")
    .replace(TYPE_WORDS, " ")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const code = cleaned.replace(/\s/g, "");
  const flat = code.replace(/[^a-z0-9]/g, "");
  // Distinctive only with a letter+digit combo (c8/61, p20, cascavel/75); rejects bare
  // numeric/size codes ("1", "75", "30") that would merge unrelated products.
  if (flat.length < 3 || !/[a-z]\d|\d[a-z]|[a-z]+\/\d/.test(flat)) return "";
  return code;
}
