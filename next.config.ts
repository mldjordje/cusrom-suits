import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/custom-suits",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/uploads/**", // lokalno — bez /custom-suits-backend
      },
      {
        protocol: "https",
        hostname: "customsuits.adspire.rs",
        port: "",
        pathname: "/uploads/**", // produkcija — direktno iz /uploads/
      },
    ],
  },
};

export default nextConfig;
