export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE?.trim();
  const base = env && env.length > 0 ? env : "https://customsuits.adspire.rs/api/";
  return base.endsWith("/") ? base : `${base}/`;
}

const ensureTrailingSlash = (value: string) =>
  value && value.endsWith("/") ? value : `${value}/`;

const CDN_TRANSPARENT = "/assets/suits/transparent/";
const LEGACY_REMOTE = "https://customsuits.adspire.rs/uploads/transparent/";

export function getTransparentCdnBase() {
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  if (explicit) return ensureTrailingSlash(explicit);

  const localDev =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_TRANSPARENT_LOCAL_BASE?.trim()
      : null;
  if (localDev) return ensureTrailingSlash(localDev);

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
  light: "/assets/suits/light/",
};

export function getPhotoCdnBase(variant: PhotoVariant = "blue") {
  const explicit = process.env.NEXT_PUBLIC_PHOTO_CDN_BASE?.trim();
  if (explicit) {
    const withVariant = explicit.includes("{variant}")
      ? explicit.replace("{variant}", variant)
      : explicit;
    return ensureTrailingSlash(withVariant);
  }

  return ensureTrailingSlash(PHOTO_BASES[variant]);
}
