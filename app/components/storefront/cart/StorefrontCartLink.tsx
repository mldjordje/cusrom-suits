"use client";

import Link from "next/link";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";

export default function StorefrontCartLink({
  className,
  ariaLabel,
  href,
}: {
  className?: string;
  ariaLabel?: string;
  href?: string;
}) {
  const { itemCount } = useCart();

  return (
    <Link href={href || "/cart"} className={className} aria-label={ariaLabel || "Korpa"}>
      <span className="position-relative d-inline-flex align-items-center">
        <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3.5 4.75H17.5L16.25 12.75H5L3.5 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2.5 2.75H4L4.75 4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7.25" cy="16.75" r="1" fill="currentColor" />
          <circle cx="14.25" cy="16.75" r="1" fill="currentColor" />
        </svg>
        {itemCount > 0 ? (
          <span
            className="position-absolute top-0 start-100 translate-middle rounded-pill bg-dark text-white d-inline-flex align-items-center justify-content-center"
            style={{ minWidth: 18, height: 18, fontSize: 10, padding: "0 4px" }}
          >
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
