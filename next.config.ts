const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "",               // prazan string označava podrazumevani port (80)
        pathname: "/custom-suits-backend/**"  // dozvoli sve putanje ispod /custom-suits-backend/
      }
    ]
  },
  // ...ostala podešavanja (ukoliko postoje)
};

export default nextConfig;
