import StorefrontHeaderClient from "@/app/components/storefront/StorefrontHeaderClient";
import { getSiteContent } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default async function StorefrontHeader({
  lang = "sr",
  variant = "default",
}: {
  lang?: StorefrontLanguage;
  variant?: "default" | "contrast";
}) {
  const isEn = lang === "en";
  const siteContent = await getSiteContent();
  const navItems = siteContent.navigation.items.map((item) => ({
    href: item.href,
    label: isEn ? item.labelEn : item.label,
  }));

  return <StorefrontHeaderClient lang={lang} variant={variant} navItems={navItems} />;
}
