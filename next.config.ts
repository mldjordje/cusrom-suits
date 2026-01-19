import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
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
