import type { Metadata } from "next";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export const SITE_NAME = "Santos & Santorini";
export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || "https://santos.rs").replace(/\/+$/, "");
export const DEFAULT_OG_IMAGE = "/img/og-default.jpg";

/** Stable @id for JSON-LD graph linking (Product offers, FAQ, etc.) */
export const ORGANIZATION_JSONLD_ID = `${SITE_URL}#organization`;

const parseSameAsFromEnv = (): string[] => {
  const raw = String(process.env.NEXT_PUBLIC_ORG_SAME_AS || "").trim();
  if (raw) {
    return raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
  }
  return [
    "https://www.instagram.com/santos.santorini/",
    "https://www.facebook.com/share/1GqmAg7ENk/?mibextid=wwXIfr",
  ];
};

export const COMPANY_SAME_AS = parseSameAsFromEnv();

export const COMPANY_INFO = {
  name: SITE_NAME,
  legalName: "Santos & Santorini",
  email: "prodaja@santos.rs",
  phone: "+381694455106",
  phoneDisplay: "+381 69 445 5106",
  streetAddress: "Obrenoviceva 9",
  addressLocality: "Niš",
  postalCode: "18000",
  addressCountry: "RS",
  latitude: 43.3209,
  longitude: 21.8954,
  priceRange: "€€",
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
  "muska odeca nis",
  "odela nis",
  "muska elegancija srbija",
  "santos santorini nis",
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
  "@id": ORGANIZATION_JSONLD_ID,
  name: COMPANY_INFO.name,
  url: SITE_URL,
  email: COMPANY_INFO.email,
  telephone: COMPANY_INFO.phoneDisplay,
  logo: absoluteUrl("/img/logo.png"),
  sameAs: COMPANY_SAME_AS,
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
  "@id": `${SITE_URL}#localbusiness`,
  name: COMPANY_INFO.name,
  url: SITE_URL,
  image: absoluteUrl(DEFAULT_OG_IMAGE),
  telephone: COMPANY_INFO.phoneDisplay,
  email: COMPANY_INFO.email,
  priceRange: COMPANY_INFO.priceRange,
  currenciesAccepted: "RSD",
  paymentAccepted: "Cash, Credit Card",
  sameAs: COMPANY_SAME_AS,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_INFO.streetAddress,
    addressLocality: COMPANY_INFO.addressLocality,
    postalCode: COMPANY_INFO.postalCode,
    addressCountry: COMPANY_INFO.addressCountry,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: COMPANY_INFO.latitude,
    longitude: COMPANY_INFO.longitude,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "09:00",
      closes: "15:00",
    },
  ],
  hasMap: `https://maps.google.com/?q=${COMPANY_INFO.latitude},${COMPANY_INFO.longitude}`,
});

export const buildWebSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}#website`,
  name: COMPANY_INFO.name,
  url: SITE_URL,
  inLanguage: ["sr-RS", "en-US"],
  publisher: { "@id": ORGANIZATION_JSONLD_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: `${absoluteUrl("/web-shop")}?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

/** Product video — YouTube ili direktan URL (schema.org VideoObject). */
export const buildProductVideoObjectJsonLd = (input: {
  name: string;
  description: string;
  pageUrl: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
}) => {
  const { name, description, pageUrl, videoUrl, thumbnailUrl } = input;
  let embedUrl: string | undefined;
  let contentUrl = videoUrl;
  try {
    const u = new URL(videoUrl, SITE_URL);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    embedUrl = undefined;
  }
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description: truncateText(description, 240),
    thumbnailUrl: thumbnailUrl ? absoluteUrl(thumbnailUrl) : undefined,
    uploadDate: new Date().toISOString().slice(0, 10),
    contentUrl: /^https?:\/\//i.test(contentUrl) ? contentUrl : absoluteUrl(contentUrl),
    embedUrl,
    isFamilyFriendly: true,
    publisher: { "@id": ORGANIZATION_JSONLD_ID },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(pageUrl),
    },
  };
};
