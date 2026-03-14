import type { ReactNode } from "react";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontViewportEffects from "@/app/components/storefront/StorefrontViewportEffects";
import "./uomo.scss";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontCartProvider>
      <StorefrontViewportEffects />
      {children}
    </StorefrontCartProvider>
  );
}
