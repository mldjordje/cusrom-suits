const IMAGE_PATH_EXTENSION_RE = /\.(avif|webp|png|jpe?g|gif|svg|ico|bmp)(?:$|[?#])/i;
const KNOWN_EXTENSIONLESS_IMAGE_PATHS = ["/storage/v1/object/public/", "/uploads/"];
const LEGACY_SANTOS_HOSTS = new Set(["santos.rs", "www.santos.rs", "assets.santos.rs", "www.assets.santos.rs"]);

/**
 * Bumped when the bytes behind an existing image URL change.
 *
 * Product photos are served with `Cache-Control: max-age=31536000` from both
 * assets.santos.rs and Supabase Storage, and they are overwritten in place so
 * that the paths stored in catalog_product_media never have to move. That
 * combination means a visitor who loaded a photo before it was rewritten keeps
 * the old bytes for a year. It bit us for real: a pass that padded every
 * non-square photo out to 1:1 shipped, was reverted within hours, and anyone
 * who browsed in between would have gone on seeing blurred bands around the
 * cards long after the files themselves were fixed.
 *
 * Appending this token gives those users a URL they have never cached, at the
 * cost of one re-download. Bump it only when existing files change in place —
 * new uploads already carry a UUID in their path and never need it.
 *
 * Deliberately NOT part of sanitizeStorefrontImageSrc: that function also feeds
 * the Ananas mapper and the Google Merchant feed, and those publish image URLs
 * to partners who ingest them. A cache token has no business in a product feed.
 * It is applied at render time instead, by the storefront image components.
 */
const IMAGE_CACHE_VERSION = "2";

export const withStorefrontImageCacheVersion = (src: string) => {
  if (!src || src.startsWith("data:")) return src;

  // Some stored URLs already carry a `v` from an earlier cache bust, so this
  // replaces that key rather than appending a second one.
  const [base, query = ""] = src.split("?");
  const params = query
    .split("&")
    .filter((pair) => pair && !/^v=/.test(pair));
  params.push(`v=${IMAGE_CACHE_VERSION}`);
  return `${base}?${params.join("&")}`;
};

const toLegacyAssetPath = (pathname: string, search = "") =>
  pathname.startsWith("/fajlovi/") ? `${pathname}${search}` : "";

export const sanitizeStorefrontImageSrc = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("//")) {
    return sanitizeStorefrontImageSrc(`https:${raw}`);
  }

  // Legacy content sometimes stores paths or protocol-less hostnames.
  // Keep /fajlovi paths local so next.config rewrites can proxy them to the
  // cPanel asset origin. santos.rs now points to Vercel, not public_html.
  if (raw.startsWith("/fajlovi/")) {
    return raw;
  }

  if (/^(santos\.rs|www\.santos\.rs)\//i.test(raw)) {
    return sanitizeStorefrontImageSrc(`https://${raw}`);
  }

  if (raw.startsWith("/") || raw.startsWith("data:image/")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const pathname = url.pathname.toLowerCase();
    const hasExtension = IMAGE_PATH_EXTENSION_RE.test(pathname);
    const legacyAssetPath = LEGACY_SANTOS_HOSTS.has(url.hostname.toLowerCase())
      ? toLegacyAssetPath(url.pathname, url.search)
      : "";

    if (legacyAssetPath) {
      if (pathname.startsWith("/fajlovi/product/") && !hasExtension) {
        return "";
      }

      return legacyAssetPath;
    }

    if (
      url.hostname === "santos.rs" &&
      pathname.startsWith("/fajlovi/product/") &&
      !hasExtension
    ) {
      return "";
    }

    if (!hasExtension && !KNOWN_EXTENSIONLESS_IMAGE_PATHS.some((segment) => pathname.includes(segment))) {
      return "";
    }

    return url.toString();
  } catch {
    // URL parse failed — likely due to unencoded spaces in a legacy file path.
    // Encode spaces and retry once so "foo bar.jpg" URLs still resolve correctly.
    const withEncodedSpaces = raw.replace(/ /g, "%20");
    if (withEncodedSpaces !== raw) {
      return sanitizeStorefrontImageSrc(withEncodedSpaces);
    }
    return raw;
  }
};

export const isRemoteStorefrontImageSrc = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://");

/**
 * Pre-rendered size variants.
 *
 * Product photos are stored once, downscaled to 1800px by the upload route, at
 * roughly 150-200 KB each. `images.unoptimized` in next.config disables
 * Vercel's optimizer, so every consumer downloaded that same file: a 96px
 * gallery thumbnail and a 330px grid card both pulled the full 190 KB. A
 * detail page moved ~1.7 MB of JPEG to paint ~250 KB worth of pixels, and a
 * 24-card grid moved several times that.
 *
 * The fix deliberately uses no host feature. Neither Supabase's render/image
 * endpoint nor Vercel's optimizer is involved — both meter per image and both
 * would have to be replaced along with the host. Instead the upload route
 * writes plain WebP copies next to the original:
 *
 *   webshop/2026-08-26/1787-uuid.jpg         <- original, unchanged
 *   webshop/2026-08-26/1787-uuid.w400.webp   <- gallery thumbnails
 *   webshop/2026-08-26/1787-uuid.w800.webp   <- grid cards
 *   webshop/2026-08-26/1787-uuid.w1200.webp  <- gallery hero
 *
 * They are ordinary objects in the bucket, so they survive a move to any other
 * static host untouched.
 *
 * A variant URL is only ever a *preferred* candidate: the storefront image
 * components keep the original right behind it in their fallback chain, so an
 * image uploaded before this shipped (and not yet backfilled) simply loads the
 * original after one failed request. Nothing breaks while the backfill runs.
 */
const SUPABASE_PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const VARIANT_SUFFIX_RE = /\.w(\d+)\.webp$/i;

/** Widths actually written on upload, smallest first. */
export const STOREFRONT_IMAGE_VARIANT_WIDTHS = [400, 800, 1200] as const;

export const isSupabaseStorageImageSrc = (src: string) =>
  src.includes(SUPABASE_PUBLIC_OBJECT_SEGMENT);

/** `foo.jpg` + 400 -> `foo.w400.webp`. Exported so the upload route and the
 *  backfill script derive the exact same paths the storefront asks for. */
export const storefrontImageVariantPath = (path: string, width: number) =>
  `${path.replace(/\.[a-z0-9]+$/i, "")}.w${width}.webp`;

export const isStorefrontImageVariantSrc = (src: string) =>
  VARIANT_SUFFIX_RE.test(String(src || "").split("?")[0]);

/**
 * Picks the smallest stored variant that still covers the layout width at 2x,
 * so a retina screen gets a sharp picture. Returns "" when no variant applies
 * (non-Supabase host, unknown width, or a layout wider than the largest
 * variant) and the caller should use the original.
 */
export const storefrontImageVariantSrc = (
  src: string,
  width: number | null | undefined,
): string => {
  if (!src || !isSupabaseStorageImageSrc(src)) return "";
  if (isStorefrontImageVariantSrc(src)) return "";

  const cssWidth = Number(width);
  if (!Number.isFinite(cssWidth) || cssWidth <= 0) return "";

  // Prefer the smallest variant that covers 2x, so retina stays sharp. When
  // nothing does — the 900px gallery hero — take the largest variant anyway as
  // long as it still covers the layout at 1x, which is far better than sending
  // the full-resolution original for the page's LCP image.
  const widths = STOREFRONT_IMAGE_VARIANT_WIDTHS;
  const largest = widths[widths.length - 1];
  const variant =
    widths.find((candidate) => candidate >= cssWidth * 2) ??
    (largest >= cssWidth ? largest : null);
  if (!variant) return "";

  const [base, query = ""] = src.split("?");
  if (!/\.(jpe?g|png|webp)$/i.test(base)) return "";
  return query ? `${storefrontImageVariantPath(base, variant)}?${query}` : storefrontImageVariantPath(base, variant);
};
