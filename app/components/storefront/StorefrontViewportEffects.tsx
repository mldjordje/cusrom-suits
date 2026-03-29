"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

const SELECTOR = [
  ".page-wrapper .btn",
  ".page-wrapper .pc__atc",
  ".page-wrapper .ss-filter-chip",
  ".page-wrapper .ss-filter-panel",
  ".page-wrapper .product-single__details-tab",
  ".page-wrapper .ss-product-glass-card",
  ".page-wrapper .ss-editorial-card",
  ".page-wrapper .product-card",
  ".page-wrapper .blog-grid__item",
  ".page-wrapper .ss-story-card",
  ".page-wrapper .ss-banner-panel",
  ".page-wrapper .ss-home18-hero__card-item",
  ".ss-mobile-nav-panel__hero",
  ".ss-mobile-nav-quicklink",
  ".ss-mobile-nav-link",
  ".ss-mobile-nav-pill",
  ".ss-mobile-nav-close",
  ".ss-footer__panel",
  ".ss-footer__bottom",
].join(", ");

export default function StorefrontViewportEffects() {
  const pathname = usePathname();
  const { reduceMotion } = useAnimationBudget();

  useEffect(() => {
    const scan = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      for (const element of elements) {
        element.classList.add("ss-viewfx");
        if (reduceMotion) {
          element.classList.add("is-inview");
        }
      }
      return elements;
    };

    if (reduceMotion) {
      scan();
      return;
    }

    const root = document.querySelector(".page-wrapper") ?? document.body;
    let frameId = 0;

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
    const observeElements = () => {
      const elements = scan();
      for (const element of elements) {
        if (observed.has(element)) continue;
        observed.add(element);
        observer.observe(element);
      }
    };

    const scheduleObserveElements = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        observeElements();
      });
    };

    observeElements();

    const mutationObserver = new MutationObserver(() => {
      scheduleObserveElements();
    });
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname, reduceMotion]);

  return null;
}
