export function getBackendBase() {
  const env = process.env.NEXT_PUBLIC_BACKEND_BASE || "";
  const base = env.trim() || "https://customsuits.adspire.rs/custom-suits-backend/api/";
  return base.replace(/\/?$/, "/");
}

