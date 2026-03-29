"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

const DESKTOP_SELECTOR = [
  ".page-wrapper .ss-editorial-section",
  ".page-wrapper .ss-filter-panel",
  ".page-wrapper .product-single__details-tab",
  ".page-wrapper .ss-product-glass-card",
  ".page-wrapper .blog-grid__item",
  ".page-wrapper .ss-story-card",
  ".page-wrapper .ss-banner-panel",
  ".page-wrapper .ss-home18-hero__card-item",
  ".page-wrapper .product-card",
  ".ss-footer__panel",
  ".ss-footer__bottom",
].join(", ");

const MOBILE_SELECTOR = [
  ".page-wrapper .ss-editorial-section",
  ".page-wrapper .ss-filter-panel",
  ".page-wrapper .product-single",
  ".page-wrapper .product-single__details-tab",
  ".page-wrapper .ss-product-glass-card",
  ".page-wrapper .ss-shop-gallery",
  ".page-wrapper .ss-banner-panel",
  ".page-wrapper .ss-story-card",
  ".page-wrapper .blog-grid__item",
  ".ss-footer__panel",
  ".ss-footer__bottom",
].join(", ");

export default function StorefrontViewportEffects() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { reduceMotion } = useAnimationBudget();
  const routeState = `${pathname || ""}?${searchParams.toString()}`;

  useEffect(() => {
    const pointerCoarse = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 820px)").matches;
    const selector = pointerCoarse ? MOBILE_SELECTOR : DESKTOP_SELECTOR;

    const scan = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        (element, index, collection) => collection.indexOf(element) === index,
      );

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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: pointerCoarse ? "0px 0px -6% 0px" : "0px 0px -12% 0px",
        threshold: pointerCoarse ? 0.08 : 0.14,
      },
    );

    const observeElements = () => {
      for (const element of scan()) {
        observer.observe(element);
      }
    };

    observeElements();

    const retryTimers = [220, 900].map((delay) =>
      window.setTimeout(() => {
        observeElements();
      }, delay),
    );

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [reduceMotion, routeState]);

  return null;
}
