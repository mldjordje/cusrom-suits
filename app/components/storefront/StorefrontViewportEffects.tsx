"use client";

import { useEffect } from "react";

const SELECTOR = [
  ".page-wrapper .btn",
  ".page-wrapper .pc__atc",
  ".page-wrapper .ss-filter-chip",
  ".page-wrapper .ss-filter-panel",
  ".page-wrapper .product-single__details-tab",
  ".page-wrapper .ss-product-glass-card",
  ".page-wrapper .ss-editorial-card",
  ".page-wrapper .ss-home18-hero__card-item",
  ".ss-mobile-nav-panel__hero",
  ".ss-mobile-nav-quicklink",
  ".ss-mobile-nav-link",
  ".ss-footer__panel",
  ".ss-footer__bottom",
].join(", ");

export default function StorefrontViewportEffects() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-inview", entry.isIntersecting);
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14,
      },
    );

    const observed = new WeakSet<Element>();
    const scan = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      for (const element of elements) {
        element.classList.add("ss-viewfx");
        if (observed.has(element)) continue;
        observed.add(element);
        observer.observe(element);
      }
    };

    scan();

    const mutationObserver = new MutationObserver(() => {
      scan();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
