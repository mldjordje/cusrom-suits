export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE || "";
  const base = env.trim() || "https://customsuits.adspire.rs/api/";
  return base.replace(/\/?$/, "/");
}

export function getTransparentCdnBase() {
  // Allow overriding full CDN base or just the subdirectory
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  if (explicit) return explicit.replace(/\/?$/, "/");

  // Local dev convenience: if on localhost and no explicit base, serve from Next public folder
  try {
    if (typeof window !== "undefined") {
      const h = window.location?.hostname || "";
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(h)) {
        return "/assets/suits/transparent/";
      }
    }
  } catch {}

  const subdir = (process.env.NEXT_PUBLIC_TRANSPARENT_SUBDIR || "uploads/transparent/")
    .trim()
    .replace(/^\/+/, "");

  const api = getBackendBase();
  const root = api.replace(/\/api\/?$/i, "/");
  return (root + subdir).replace(/\/?$/, "/");
}
