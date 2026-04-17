import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const disallowAdmin = ["/admin", "/admin/", "/admin-login", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowAdmin,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: disallowAdmin,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: disallowAdmin,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: disallowAdmin,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: disallowAdmin,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: disallowAdmin,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
