import type { Metadata } from "next";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export const SITE_NAME = "Santos & Santorini";
export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || "https://santos.rs").replace(/\/+$/, "");
export const DEFAULT_OG_IMAGE = "/img/hero.jpg";

export const COMPANY_INFO = {
  name: SITE_NAME,
  legalName: "Santos & Santorini",
  email: "prodaja@santos.rs",
  phone: "+381694455106",
  phoneDisplay: "+381 69 445 5106",
  streetAddress: "Obrenoviceva 9",
  addressLocality: "Nis",
  postalCode: "18000",
  addressCountry: "RS",
};

const DEFAULT_KEYWORDS = [
  "santos",
  "santos and santorini",
  "muska moda",
  "muska odela",
  "web shop odela",
  "ready to wear",
  "custom suits",
  "poslovne uniforme",
];

export const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
};

export const withStorefrontLanguage = (
  path: string,
  lang: StorefrontLanguage = "sr",
) => {
  if (lang !== "en") return path;
  return path.includes("?") ? `${path}&lang=en` : `${path}?lang=en`;
};

export const truncateText = (value: string, maxLength = 160) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  lang?: StorefrontLanguage;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
  type?: "website" | "article";
};

export const buildSeoMetadata = ({
  title,
  description,
  path,
  lang = "sr",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords = [],
  type = "website",
}: BuildMetadataInput): Metadata => {
  const localizedPath = withStorefrontLanguage(path, lang);
  const metadataDescription = truncateText(description, 170);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: metadataDescription,
    keywords: [...DEFAULT_KEYWORDS, ...keywords],
    alternates: {
      canonical: localizedPath,
      languages: {
        "sr-RS": path,
        "en-US": withStorefrontLanguage(path, "en"),
      },
    },
    openGraph: {
      type,
      url: absoluteUrl(localizedPath),
      title,
      description: metadataDescription,
      siteName: SITE_NAME,
      locale: lang === "en" ? "en_US" : "sr_RS",
      alternateLocale: lang === "en" ? ["sr_RS"] : ["en_US"],
      images: [
        {
          url: absoluteUrl(image),
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metadataDescription,
      images: [absoluteUrl(image)],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
};

export const buildBreadcrumbJsonLd = (
  items: Array<{ name: string; path: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const buildOrganizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: COMPANY_INFO.name,
  url: SITE_URL,
  email: COMPANY_INFO.email,
  telephone: COMPANY_INFO.phoneDisplay,
  logo: absoluteUrl("/img/logo.png"),
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_INFO.streetAddress,
    addressLocality: COMPANY_INFO.addressLocality,
    postalCode: COMPANY_INFO.postalCode,
    addressCountry: COMPANY_INFO.addressCountry,
  },
});

export const buildLocalBusinessJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: COMPANY_INFO.name,
  url: SITE_URL,
  image: absoluteUrl(DEFAULT_OG_IMAGE),
  telephone: COMPANY_INFO.phoneDisplay,
  email: COMPANY_INFO.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_INFO.streetAddress,
    addressLocality: COMPANY_INFO.addressLocality,
    postalCode: COMPANY_INFO.postalCode,
    addressCountry: COMPANY_INFO.addressCountry,
  },
});

export const buildWebSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: COMPANY_INFO.name,
  url: SITE_URL,
  inLanguage: ["sr-RS", "en-US"],
  potentialAction: {
    "@type": "SearchAction",
    target: `${absoluteUrl("/web-shop")}?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});
