export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE?.trim();
  const base = env && env.length > 0 ? env : "/api/";
  return base.endsWith("/") ? base : `${base}/`;
}

export function buildBackendUrl(path: string) {
  const base = getBackendBase();
  const trimmed = path.replace(/^\/+/, "");
  return `${base}${trimmed}`;
}

const ensureTrailingSlash = (value: string) =>
  value && value.endsWith("/") ? value : `${value}/`;

const CDN_TRANSPARENT = "/assets/suits/transparent/";
const LOCAL_DEV_TRANSPARENT = "/assets/suits/transparent/";
const LEGACY_REMOTE = "https://customsuits.adspire.rs/uploads/transparent/";
const isDevelopment = process.env.NODE_ENV === "development";

export function getTransparentCdnBase() {
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  if (isDevelopment) {
    const localDev = process.env.NEXT_PUBLIC_TRANSPARENT_LOCAL_BASE?.trim();
    return ensureTrailingSlash(localDev || LOCAL_DEV_TRANSPARENT);
  }
  if (explicit) return ensureTrailingSlash(explicit);

  // Default to bundled static assets; legacy remote as last resort
  return ensureTrailingSlash(CDN_TRANSPARENT || explicit || LEGACY_REMOTE);
}

/* =========================================================
   PHOTO BASES - added "light"
========================================================= */

type PhotoVariant = "blue" | "black" | "light";

const PHOTO_BASES: Record<PhotoVariant, string> = {
  blue: "/assets/suits/blue/",
  black: "/assets/suits/black/",
  // Light variant does not exist locally, so blue is the closest bundled fallback.
  light: "/assets/suits/blue/",
};

export function getPhotoCdnBase(variant: PhotoVariant = "blue") {
  if (isDevelopment) {
    return ensureTrailingSlash(PHOTO_BASES[variant]);
  }
  const explicit = process.env.NEXT_PUBLIC_PHOTO_CDN_BASE?.trim();
  if (explicit) {
    const withVariant = explicit.includes("{variant}")
      ? explicit.replace("{variant}", variant)
      : explicit;
    return ensureTrailingSlash(withVariant);
  }

  return ensureTrailingSlash(PHOTO_BASES[variant]);
}
