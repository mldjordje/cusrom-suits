const IMAGE_PATH_EXTENSION_RE = /\.(avif|webp|png|jpe?g|gif|svg|ico|bmp)(?:$|[?#])/i;
const KNOWN_EXTENSIONLESS_IMAGE_PATHS = ["/storage/v1/object/public/", "/uploads/"];
const LEGACY_SANTOS_HOSTS = new Set(["santos.rs", "www.santos.rs"]);

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
    return raw;
  }
};

export const isRemoteStorefrontImageSrc = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://");
