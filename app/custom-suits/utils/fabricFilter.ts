/**
 * Solids-only gate for the public custom-suits configurator (launch 2026-06-18).
 *
 * Stripes/checks still render flat through the geometry engine vs. Hockerty, so the live
 * configurator ships SOLID fabrics only. A fabric counts as solid when it is explicitly
 * tagged solid in the CMS, OR no pattern keyword appears in any of its metadata/name/
 * texture fields. Conservative by design: anything that smells like a stripe/check is
 * excluded so a mislabelled pattern can never leak into the public picker.
 *
 * Caveat: a stripe swatch with NO metadata and a neutral name (e.g. a raw phone photo)
 * can slip through as "solid"; tag such fabrics with pattern in /admin/fabrics.
 */

const PATTERN_RX =
  /(prug|stripe|pinstripe|linij|\blines?\b|karo|check|glen|windowpane|gingham|houndstooth|pepito|plaid|tartan|kocka)/i;
const SOLID_RX = /^(solid|jednobojn\w*)$/i;

export const isSolidFabric = (fabric: unknown): boolean => {
  if (!fabric || typeof fabric !== "object") return false;
  const data = fabric as Record<string, unknown>;
  const explicit = String(data.pattern ?? data.uzorak ?? "").trim();
  const token = [
    data.pattern,
    data.uzorak,
    data.weave,
    data.weave_name,
    data.weaveName,
    data.pattern_name,
    data.patternName,
    data.pattern_type,
    data.patternType,
    data.texturePattern,
    data.texture_pattern,
    data.design,
    data.motif,
    data.name,
    data.texture,
  ]
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase();
  if (PATTERN_RX.test(token)) return false;
  if (explicit) return SOLID_RX.test(explicit);
  return true;
};

/** Keep only solid fabrics. Returns only solids (may be empty) and never leaks patterns. */
export const filterSolidFabrics = <T,>(list: readonly T[]): T[] =>
  list.filter((fabric) => isSolidFabric(fabric));
