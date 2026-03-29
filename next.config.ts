import type { NextConfig } from "next";

const legacyAssetOrigin = process.env.LEGACY_ASSET_ORIGIN?.trim().replace(/\/$/, "");
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
  images: {
    unoptimized: true,
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [48, 64, 96, 112, 120, 180, 330, 420, 690, 900],
    qualities: [60, 75],
    remotePatterns,
  },
  async rewrites() {
    const beforeFiles = [
      {
        source: "/uploads/:path*",
        destination: "https://customsuits.adspire.rs/uploads/:path*",
      },
    ];

    if (legacyAssetOrigin) {
      beforeFiles.push({
        source: "/fajlovi/:path*",
        destination: `${legacyAssetOrigin}/fajlovi/:path*`,
      });
    }

    return {
      beforeFiles,
    };
  },
  async redirects() {
    return [
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
