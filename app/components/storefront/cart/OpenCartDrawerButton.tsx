"use client";

import type { ReactNode } from "react";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";

export default function OpenCartDrawerButton({
  className,
  children,
  ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const { openCartDrawer } = useCart();

  return (
    <button type="button" onClick={openCartDrawer} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
