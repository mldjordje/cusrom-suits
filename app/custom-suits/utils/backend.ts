export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE || "";
  const base = env.trim() || "https://customsuits.adspire.rs/api/";
  return base.replace(/\/?$/, "/");
}

const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);
const CDN_DEFAULT = "https://customsuits.adspire.rs/uploads/transparent/";
const LOCAL_FALLBACK = "/assets/suits/transparent/";

export function getTransparentCdnBase() {
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  if (explicit) return ensureTrailingSlash(explicit);

  if (process.env.NODE_ENV === "development") {
    const localOverride = process.env.NEXT_PUBLIC_TRANSPARENT_LOCAL_BASE?.trim();
    return ensureTrailingSlash(localOverride || LOCAL_FALLBACK);
  }

  return ensureTrailingSlash(CDN_DEFAULT);
}
