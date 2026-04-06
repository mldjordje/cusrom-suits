import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import StorefrontAuthProvider from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontRuntimeShell from "@/app/components/storefront/StorefrontRuntimeShell";
import "./uomo.scss";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontAuthProvider>
      <StorefrontCartProvider>
        <StorefrontRuntimeShell />
        {children}
        <Analytics />
      </StorefrontCartProvider>
    </StorefrontAuthProvider>
  );
}
