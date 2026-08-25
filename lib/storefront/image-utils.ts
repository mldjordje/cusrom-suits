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
