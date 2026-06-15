import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Custom suits",
  description: "Custom suits i odela po meri Santos & Santorini: krojacki pristup, izbor tkanina i direktan kontakt za preporuku.",
  path: "/custom-suits",
  keywords: ["custom suits", "odela po meri", "santos custom suits", "tailoring srbija"],
});

export default function CustomSuitsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
