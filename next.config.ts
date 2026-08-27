import type { NextConfig } from "next";

const legacyAssetOrigin =
  process.env.LEGACY_ASSET_ORIGIN?.trim().replace(/\/$/, "") || "https://assets.santos.rs";
const legacyAssetUrl = legacyAssetOrigin ? new URL(legacyAssetOrigin) : null;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "http",
    hostname: "localhost",
    port: "",
    pathname: "/uploads/**",
  },
  {
    protocol: "https",
    hostname: "customsuits.adspire.rs",
    port: "",
    pathname: "/uploads/**",
  },
  {
    protocol: "https",
    hostname: "jmnuuekizaljlqdeupqr.supabase.co",
    port: "",
    pathname: "/storage/v1/object/public/**",
  },
  {
    protocol: "https",
    hostname: "santos.rs",
    port: "",
    pathname: "/fajlovi/**",
  },
];

if (legacyAssetUrl) {
  remotePatterns.push({
    protocol: legacyAssetUrl.protocol.replace(":", "") as "http" | "https",
    hostname: legacyAssetUrl.hostname,
    port: legacyAssetUrl.port,
    pathname: "/fajlovi/**",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    // Vercel free tier has a 5K/month transformation quota — disable the optimizer
    // entirely so all images are served directly from source (Supabase, cPanel).
    // Images are already resized/compressed by Sharp on upload, so no quality loss.
    unoptimized: true,
    remotePatterns,
  },
  async rewrites() {
    const beforeFiles = [
      {
        source: "/uploads/:path*",
        destination: "https://customsuits.adspire.rs/uploads/:path*",
      },
    ];
    const afterFiles = [];

    if (legacyAssetOrigin) {
      afterFiles.push({
        source: "/fajlovi/:path*",
        destination: `${legacyAssetOrigin}/fajlovi/:path*`,
      });
    }

    return {
      beforeFiles,
      afterFiles,
    };
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    /* Preview and development deployments are reachable (see the note in
       middleware.ts) but must never end up in an index.

       Tested for a known non-production value rather than for "not
       production", so a missing VERCEL_ENV cannot put noindex on the live
       site. The two possible mistakes here are not equal: a preview that
       fails to send the header is a nuisance, a production build that sends
       it deindexes the shop. */
    const vercelEnv = process.env.VERCEL_ENV;
    const isNonProductionDeployment = vercelEnv === "preview" || vercelEnv === "development";
    const indexingHeaders = isNonProductionDeployment
      ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      : [];

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...indexingHeaders],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/img/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The old/long-form suit category slug is still being discovered by
      // crawlers and currently falls through to a 200 noindex "not found"
      // page. Redirect it to the canonical indexable category landing page.
      { source: "/web-shop/kategorija/muska-odela", destination: "/web-shop/kategorija/odela", permanent: true },
      { source: "/shop", destination: "/web-shop", permanent: true },
      { source: "/shop/:path*", destination: "/web-shop", permanent: true },
      { source: "/pocetna", destination: "/", permanent: true },
      { source: "/korpa", destination: "/cart", permanent: true },
      { source: "/cart.php", destination: "/cart", permanent: true },
      { source: "/checkout-step-1", destination: "/checkout", permanent: true },
      { source: "/checkout-step-2", destination: "/checkout", permanent: true },
      { source: "/checkout-step-3", destination: "/checkout", permanent: true },
      { source: "/onama", destination: "/o-nama", permanent: true },
      { source: "/contact", destination: "/kontakt", permanent: true },
      { source: "/documents", destination: "/dokumenta", permanent: true },
      { source: "/prodavnice", destination: "/prodajna-mesta", permanent: true },
      { source: "/akcija", destination: "/akcije", permanent: true },
      { source: "/news", destination: "/blog", permanent: true },
      { source: "/news/:path*", destination: "/blog", permanent: true },
      { source: "/blog/:id(\\d+)", destination: "/blog", permanent: true },
      { source: "/nacin-placanja", destination: "/nacinplacanja", permanent: true },
      { source: "/custom-suits/measure", destination: "/custom-suits", permanent: false },
      { source: "/custom-suits/measure/:path*", destination: "/custom-suits", permanent: false },
      { source: "/nacin_placanja", destination: "/nacinplacanja", permanent: true },
      { source: "/zamena-i-povrat", destination: "/reklamacije", permanent: true },
      { source: "/dostava", destination: "/isporuka", permanent: true },
      { source: "/politika-privatnosti", destination: "/polisa_privatnosti", permanent: true },
      { source: "/uslovi-kupovine", destination: "/uslovi_kupovine", permanent: true },
      { source: "/politika-kolacica", destination: "/uslovi_koriscenja_kolacica", permanent: true },
    ];
  },
};

export default nextConfig;
