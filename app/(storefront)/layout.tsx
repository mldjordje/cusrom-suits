import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import StorefrontMobileShopNav from "@/app/components/storefront/StorefrontMobileShopNav";
import StorefrontCartDrawer from "@/app/components/storefront/cart/StorefrontCartDrawer";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontPreloader from "@/app/components/storefront/StorefrontPreloader";
import StorefrontViewportEffects from "@/app/components/storefront/StorefrontViewportEffects";
import "./uomo.scss";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontCartProvider>
      <StorefrontPreloader />
      <StorefrontViewportEffects />
      {children}
      <StorefrontCartDrawer />
      <StorefrontMobileShopNav />
      <Analytics />
    </StorefrontCartProvider>
  );
}
