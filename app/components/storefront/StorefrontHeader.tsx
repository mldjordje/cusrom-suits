import StorefrontHeaderClient from "@/app/components/storefront/StorefrontHeaderClient";
import { getSiteContent, type SiteNavItem } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const BUSINESS_UNIFORMS_NAV_ITEM: SiteNavItem = {
  href: "/poslovne-uniforme",
  label: "Poslovne uniforme",
  labelEn: "Business uniforms",
};

export default async function StorefrontHeader({
  lang = "sr",
  variant = "default",
}: {
  lang?: StorefrontLanguage;
  variant?: "default" | "contrast";
}) {
  const isEn = lang === "en";
  const siteContent = await getSiteContent();
  const navigationItems = siteContent.navigation.items.some((item) => item.href === BUSINESS_UNIFORMS_NAV_ITEM.href)
    ? siteContent.navigation.items
    : (() => {
        const anchorIndex = siteContent.navigation.items.findIndex(
          (item) => item.href === "/blog" || item.href === "/prodajna-mesta" || item.href === "/kontakt",
        );
        const nextItems = [...siteContent.navigation.items];
        if (anchorIndex >= 0) {
          nextItems.splice(anchorIndex, 0, BUSINESS_UNIFORMS_NAV_ITEM);
          return nextItems;
        }
        return [...nextItems, BUSINESS_UNIFORMS_NAV_ITEM];
      })();
  const navItems = navigationItems.map((item) => ({
    href: item.href,
    label: isEn ? item.labelEn : item.label,
  }));

  return <StorefrontHeaderClient lang={lang} variant={variant} navItems={navItems} />;
}
