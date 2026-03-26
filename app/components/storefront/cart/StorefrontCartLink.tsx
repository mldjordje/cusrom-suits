"use client";

import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";

export default function StorefrontCartLink({
  className,
  ariaLabel,
}: {
  className?: string;
  ariaLabel?: string;
}) {
  const { itemCount, openCartDrawer } = useCart();

  return (
    <button
      type="button"
      className={`ss-cart-trigger-btn ${className || ""}`.trim()}
      aria-label={ariaLabel || "Korpa"}
      onClick={openCartDrawer}
    >
      <span className="ss-cart-trigger-btn__inner">
        <svg
          width="21"
          height="21"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="ss-cart-trigger-btn__icon"
        >
          <path d="M3.5 4.75H17.5L16.25 12.75H5L3.5 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2.5 2.75H4L4.75 4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7.25" cy="16.75" r="1" fill="currentColor" />
          <circle cx="14.25" cy="16.75" r="1" fill="currentColor" />
        </svg>
        {itemCount > 0 ? (
          <span className="ss-cart-trigger-btn__badge">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}
