import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from "next/font/google";
import AppMotionShell from "@/app/components/motion/AppMotionShell";
import { SITE_NAME, SITE_URL, buildSeoMetadata } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
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
  icons: {
    icon: [
      { url: "/img/logo.png", type: "image/png" },
      { url: "/img/logo-header-mobile.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/img/logo.png", type: "image/png" }],
    shortcut: ["/img/logo.png"],
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
    <html lang="sr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <AppMotionShell>{children}</AppMotionShell>
      </body>
    </html>
  );
}
