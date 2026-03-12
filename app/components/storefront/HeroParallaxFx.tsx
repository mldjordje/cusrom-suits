"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

type HeroParallaxFxProps = {
  targetId: string;
};

export default function HeroParallaxFx({ targetId }: HeroParallaxFxProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    let mounted = true;
    let cleanup: (() => void) | null = null;

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
      }, root);

      cleanup = () => context.revert();
    };

    boot().catch(() => {});

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [reduceMotion, targetId]);

  return null;
}

