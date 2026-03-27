import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [48, 64, 96, 112, 120, 180, 330, 420, 690, 900],
    qualities: [60, 75],
    remotePatterns: [
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
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "https://customsuits.adspire.rs/uploads/:path*",
        },
      ],
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
      { source: "/polisa_privatnosti", destination: "/dokumenta", permanent: true },
      { source: "/uslovi_kupovine", destination: "/dokumenta", permanent: true },
      { source: "/nacin-placanja", destination: "/dokumenta", permanent: true },
      { source: "/nacinplacanja", destination: "/dokumenta", permanent: true },
      { source: "/reklamacije", destination: "/dokumenta", permanent: true },
      { source: "/zamena-i-povrat", destination: "/dokumenta", permanent: true },
      { source: "/isporuka", destination: "/dokumenta", permanent: true },
      { source: "/dostava", destination: "/dokumenta", permanent: true },
    ];
  },
};

export default nextConfig;
