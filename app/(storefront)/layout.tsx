import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import StorefrontAuthProvider from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontRuntimeShell from "@/app/components/storefront/StorefrontRuntimeShell";
import CookieConsent from "@/app/components/storefront/CookieConsent";
import PromoPopups from "@/app/components/storefront/PromoPopups";
import { getPopupSettings } from "@/lib/marketing/popupSettings";
import "./uomo.scss";
import "./webshop-polish.scss";
import "./premium.scss";

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const popupSettings = await getPopupSettings();
  return (
    <StorefrontAuthProvider>
      <StorefrontCartProvider>
        <StorefrontRuntimeShell />
        {children}
        <CookieConsent />
        <PromoPopups settings={popupSettings} />
        <Analytics />
      </StorefrontCartProvider>
    </StorefrontAuthProvider>
  );
}
