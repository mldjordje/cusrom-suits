import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import StorefrontAuthProvider from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontRuntimeShell from "@/app/components/storefront/StorefrontRuntimeShell";
import CookieConsent from "@/app/components/storefront/CookieConsent";
import "./uomo.scss";
import "./webshop-polish.scss";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontAuthProvider>
      <StorefrontCartProvider>
        <StorefrontRuntimeShell />
        {children}
        <CookieConsent />
        <Analytics />
      </StorefrontCartProvider>
    </StorefrontAuthProvider>
  );
}
