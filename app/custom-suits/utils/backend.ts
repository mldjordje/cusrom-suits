export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE || "";
  const base = env.trim() || "https://customsuits.adspire.rs/api/";
  return base.replace(/\/?$/, "/");
}

export function getTransparentCdnBase() {
  // Derive https://customsuits.adspire.rs/uploads/transparent/
  const api = getBackendBase();
  const root = api.replace(/\/api\/?$/i, "/");
  return root + "uploads/transparent/";
}
