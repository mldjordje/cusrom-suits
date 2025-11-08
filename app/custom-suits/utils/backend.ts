export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE || "";
  const base = env.trim() || "https://customsuits.adspire.rs/api/";
  return base.replace(/\/?$/, "/");
}

export function getTransparentCdnBase() {
  // 1) Explicit override always wins
  const explicit = process.env.NEXT_PUBLIC_TRANSPARENT_CDN_BASE?.trim();
  if (explicit) return explicit.replace(/\/?$/, "/");

  // 2) Safe default: ship from Next public to avoid CORS in prod until backend is opened
  // Place assets under public/assets/suits/transparent/
  // You can later switch to CDN by setting NEXT_PUBLIC_TRANSPARENT_CDN_BASE
  return "/assets/suits/transparent/";
}
