import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { Montserrat } from "next/font/google";
import AppMotionShell from "@/app/components/motion/AppMotionShell";
import { SITE_NAME, SITE_URL, buildSeoMetadata } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  ...buildSeoMetadata({
    title: SITE_NAME,
    description:
      "Muska moda, ready-to-wear kolekcija, custom suits i poslovne uniforme brenda Santos & Santorini iz Nisa.",
    path: "/",
    keywords: ["muska odeca", "odela nis", "muska elegancija", "tailoring srbija"],
  }),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  category: "fashion",
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  // Storefront PWA manifest — admin layout overrides this with /admin-manifest.webmanifest
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/android-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/img/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/android-icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/android-icon-192.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${montserrat.variable} ${playfairDisplay.variable}`}
    >
      <body className="antialiased">
        <AppMotionShell>{children}</AppMotionShell>
      </body>
    </html>
  );
}
