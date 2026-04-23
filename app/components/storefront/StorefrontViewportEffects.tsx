"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

/* Bez .ss-footer__* i .ss-shop-hero__media: GSAP autoAlpha:0 + ScrollTrigger "top 88%" cesto nikad ne okine
   na kratkim stranama (footer u prvom ekranu) -> nevidljiv footer na desktopu. Footer ne animiraj ovde. */
const REVEAL_SELECTOR = [
  ".ss-filter-panel",
  ".product-single__details-tab",
  ".ss-product-glass-card",
].join(", ");

const PARALLAX_SELECTOR = [
  ".ss-banner-panel img",
  ".ss-story-card img",
].join(", ");

export default function StorefrontViewportEffects() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { reduceMotion, allowParallax } = useAnimationBudget();
  const routeState = `${pathname || ""}?${searchParams.toString()}`;

  useEffect(() => {
    if (reduceMotion) return;

    let mounted = true;
    let cleanup: (() => void) | null = null;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const boot = async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap"),
        import("gsap/dist/ScrollTrigger"),
      ]);
      if (!mounted) return;

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const pointerCoarse =
        window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 820px)").matches;

      const context = gsap.context(() => {
        const revealTargets = gsap.utils.toArray<HTMLElement>(REVEAL_SELECTOR);
        revealTargets.forEach((target, index) => {
          gsap.fromTo(
            target,
            {
              autoAlpha: 0,
              y: pointerCoarse ? 16 : 28,
            },
            {
              autoAlpha: 1,
              y: 0,
              duration: pointerCoarse ? 0.5 : 0.7,
              delay: Math.min(index * 0.02, 0.12),
              ease: "power3.out",
              clearProps: "transform,opacity,visibility",
              scrollTrigger: {
                trigger: target,
                start: pointerCoarse ? "top 94%" : "top 88%",
                once: true,
              },
            },
          );
        });

        if (allowParallax) {
          const parallaxTargets = gsap.utils.toArray<HTMLElement>(PARALLAX_SELECTOR);
          parallaxTargets.forEach((target) => {
            const section = target.closest(".ss-shop-hero__media, .ss-banner-panel, .ss-story-card");
            if (!section) return;

            gsap.fromTo(
              target,
              { yPercent: -4, scale: 1.02 },
              {
                yPercent: 4,
                scale: 1.08,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: pointerCoarse ? 0.35 : 0.7,
                },
              },
            );
          });
        }

        ScrollTrigger.refresh();
      }, document.body);

      cleanup = () => context.revert();
    };

    const runBoot = () => {
      void boot().catch(() => {});
    };

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(runBoot, { timeout: 1200 });
    } else {
      timeoutHandle = window.setTimeout(runBoot, 180);
    }

    return () => {
      mounted = false;
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
      cleanup?.();
    };
  }, [allowParallax, reduceMotion, routeState]);

  return null;
}
