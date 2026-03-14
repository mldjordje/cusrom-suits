"use client";

import { useEffect } from "react";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type HeroParallaxFxProps = {
  targetId: string;
};

export default function HeroParallaxFx({ targetId }: HeroParallaxFxProps) {
  const { allowParallax } = useAnimationBudget();

  useEffect(() => {
    if (!allowParallax) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    let mounted = true;
    let cleanup: (() => void) | null = null;
    let idleHandle: number | null = null;

    const boot = async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([import("gsap"), import("gsap/dist/ScrollTrigger")]);
      if (!mounted) return;

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const root = document.getElementById(targetId);
      if (!root) return;

      const context = gsap.context(() => {
        const intro = root.querySelector("[data-hero-intro]");
        const cards = root.querySelectorAll("[data-hero-card]");
        const glows = root.querySelectorAll("[data-hero-glow]");

        if (intro) {
          gsap.to(intro, {
            yPercent: -12,
            opacity: 0.85,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.8,
            },
          });
        }

        if (cards.length > 0) {
          gsap.to(cards, {
            yPercent: -10,
            rotateZ: (index: number) => (index % 2 === 0 ? -1.2 : 1.2),
            stagger: 0.06,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.9,
            },
          });
        }

        if (glows.length > 0) {
          gsap.to(glows, {
            yPercent: (index: number) => (index === 0 ? -18 : 16),
            xPercent: (index: number) => (index === 0 ? -8 : 10),
            scale: (index: number) => (index === 0 ? 1.08 : 0.94),
            stagger: 0.04,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.9,
            },
          });
        }
      }, root);

      cleanup = () => context.revert();
    };

    const runBoot = () => {
      boot().catch(() => {});
    };

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(runBoot, { timeout: 900 });
    } else {
      window.setTimeout(runBoot, 180);
    }

    return () => {
      mounted = false;
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (cleanup) cleanup();
    };
  }, [allowParallax, targetId]);

  return null;
}
