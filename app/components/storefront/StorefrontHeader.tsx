import StorefrontAnnouncementBar from "@/app/components/storefront/StorefrontAnnouncementBar";
import StorefrontHeaderClient from "@/app/components/storefront/StorefrontHeaderClient";
import { getSiteContent, type SiteNavItem } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const BUSINESS_UNIFORMS_NAV_ITEM: SiteNavItem = {
  href: "/poslovne-uniforme",
  label: "Poslovne uniforme",
  labelEn: "Business uniforms",
};

const REQUIRED_NAV_ITEMS = [BUSINESS_UNIFORMS_NAV_ITEM];

export default async function StorefrontHeader({
  lang = "sr",
  variant = "default",
}: {
  lang?: StorefrontLanguage;
  variant?: "default" | "contrast";
}) {
  const isEn = lang === "en";
  const siteContent = await getSiteContent();
  const navigationItems = REQUIRED_NAV_ITEMS.reduce((items, requiredItem) => {
    if (items.some((item) => item.href === requiredItem.href)) return items;
    const anchorIndex = items.findIndex((item) => item.href === "/blog" || item.href === "/kontakt");
    const nextItems = [...items];
    if (anchorIndex >= 0) {
      nextItems.splice(anchorIndex, 0, requiredItem);
      return nextItems;
    }
    return [...nextItems, requiredItem];
  }, siteContent.navigation.items.filter((item) => item.href !== "/prodajna-mesta" && item.href !== "/loyalty-program"));
  const navItems = navigationItems.map((item) => ({
    href: item.href,
    label: isEn ? item.labelEn : item.label,
  }));

  return (
    <>
      <StorefrontAnnouncementBar lang={lang} content={siteContent.announcements} />
      <StorefrontHeaderClient lang={lang} variant={variant} navItems={navItems} />
    </>
  );
}
