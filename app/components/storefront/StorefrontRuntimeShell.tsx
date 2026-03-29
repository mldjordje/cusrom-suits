"use client";

import dynamic from "next/dynamic";
import StorefrontPreloader from "@/app/components/storefront/StorefrontPreloader";

const StorefrontViewportEffects = dynamic(
  () => import("@/app/components/storefront/StorefrontViewportEffects"),
  { ssr: false },
);

const StorefrontCartDrawer = dynamic(
  () => import("@/app/components/storefront/cart/StorefrontCartDrawer"),
  { ssr: false },
);

const StorefrontMobileShopNav = dynamic(
  () => import("@/app/components/storefront/StorefrontMobileShopNav"),
  { ssr: false },
);

const StorefrontSearchOverlay = dynamic(
  () => import("@/app/components/storefront/StorefrontSearchOverlay"),
  { ssr: false },
);

export default function StorefrontRuntimeShell() {
  return (
    <>
      <StorefrontPreloader />
      <StorefrontViewportEffects />
      <StorefrontCartDrawer />
      <StorefrontSearchOverlay />
      <StorefrontMobileShopNav />
    </>
  );
}
