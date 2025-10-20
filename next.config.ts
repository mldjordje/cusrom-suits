import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ✅ Dozvoljavamo slike i sa lokalnog backend-a i sa produkcije
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/custom-suits-backend/**",
      },
      {
        protocol: "https",
        hostname: "customsuits.adspire.rs",
        port: "",
        pathname: "/custom-suits-backend/uploads/**",
      },
    ],
    // ili alternativno ako koristiš Next 15+ možeš i domains
    // domains: ["localhost", "customsuits.adspire.rs"],
  },
  reactStrictMode: true,
};

export default nextConfig;
