import type { ReactNode } from "react";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import "./uomo.scss";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontCartProvider>{children}</StorefrontCartProvider>;
}
