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
};

export default nextConfig;
