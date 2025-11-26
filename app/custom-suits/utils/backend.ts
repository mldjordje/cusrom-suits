export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE?.trim();
  const base = env && env.length > 0 ? env : "https://customsuits.adspire.rs/api/";
  return base.endsWith("/") ? base : `${base}/`;
}

const ensureTrailingSlash = (value: string) => (value && value.endsWith("/") ? value : `${value}/`);
const CDN_TRANSPARENT = "/assets/suits/transparent/";
const LEGACY_REMOTE = "https://customsuits.adspire.rs/uploads/transparent/";

export function getTransparentCdnBase() {
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  // If a remote CDN is provided and is not the legacy adspire path, honor it.
  if (explicit && explicit.indexOf("customsuits.adspire.rs/uploads/transparent") === -1) {
    return ensureTrailingSlash(explicit);
  }

  const localDev =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_TRANSPARENT_LOCAL_BASE?.trim()
      : null;
  if (localDev) return ensureTrailingSlash(localDev);

  // Default to bundled static assets to avoid remote 404s; legacy remote as last resort
  return ensureTrailingSlash(CDN_TRANSPARENT || explicit || LEGACY_REMOTE);
}
