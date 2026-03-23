const IMAGE_PATH_EXTENSION_RE = /\.(avif|webp|png|jpe?g|gif|svg|ico|bmp)(?:$|[?#])/i;
const KNOWN_EXTENSIONLESS_IMAGE_PATHS = ["/storage/v1/object/public/", "/uploads/"];

export const sanitizeStorefrontImageSrc = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("//")) {
    return sanitizeStorefrontImageSrc(`https:${raw}`);
  }

  if (raw.startsWith("/") || raw.startsWith("data:image/")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const pathname = url.pathname.toLowerCase();
    const hasExtension = IMAGE_PATH_EXTENSION_RE.test(pathname);

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
