"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

/**
 * Scroll behaviour for the lux layer.
 *
 * Deliberately IntersectionObserver + one rAF-throttled scroll listener rather
 * than GSAP/ScrollTrigger: the reveals here are the first thing a visitor sees,
 * and StorefrontViewportEffects already defers its GSAP import to idle time.
 * Waiting on a ~40kB bundle before the hero copy can animate is the wrong
 * trade for the landing page. GSAP stays for the heavier pinned work.
 *
 * Markup contract (styles live in santos-lux.scss):
 *   [data-lux-reveal]            fades and rises once, on enter
 *   [data-lux-reveal-stagger]    staggers its direct children
 *   .lux-lines                   headline whose .lux-lines__inner ride up
 *   .lux-rule                    hairline that draws left-to-right
 *   [data-lux-parallax]          drifts against the scroll, strength in the
 *                                attribute value (default 0.12)
 */

const REVEAL_SELECTOR = "[data-lux-reveal], .lux-lines, .lux-rule";
const STAGGER_STEP_MS = 90;

export default function LuxScrollFx() {
  /* Pathname only, deliberately — no useSearchParams. Reading search params in
     a client component that is not inside a Suspense boundary makes Next bail
     out of server rendering for the whole tree, which showed up here as a
     hydration mismatch that killed every client effect on the page. Route
     changes are what these reveals need to re-scan for; query changes on the
     same route re-render the list in place and the observer picks it up. */
  const routeState = usePathname() || "";
  const { reduceMotion, allowParallax } = useAnimationBudget();

  // --- reveals -----------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.querySelector<HTMLElement>(".ss-lux");
    if (!root) return;

    // With motion off, the CSS already renders everything in place. Marking
    // is-in anyway keeps a single source of truth for "this has arrived".
    if (reduceMotion) {
      root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add("is-in"));
      return;
    }

    /* Opt the page into hidden start states only now that this script is
       running. Without the flag the CSS renders everything visible, so a
       failed or blocked bundle degrades to a static page instead of a blank
       one. Removed on cleanup for the same reason. */
    root.classList.add("lux-fx-ready");

    // Stagger children by writing the delay each element reads back in CSS.
    root.querySelectorAll<HTMLElement>("[data-lux-reveal-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        (child as HTMLElement).style.setProperty("--lux-reveal-delay", `${index * STAGGER_STEP_MS}ms`);
      });
    });

    root.querySelectorAll<HTMLElement>(".lux-lines").forEach((headline) => {
      headline.querySelectorAll<HTMLElement>(".lux-lines__inner").forEach((line, index) => {
        line.style.setProperty("--lux-line-delay", `${index * 110}ms`);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      // Fire a little before the element is fully on screen so the motion is
      // finishing, not starting, by the time the reader's eye lands on it.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    for (const target of targets) {
      // Anything already in the first screen should not animate in late.
      if (target.getBoundingClientRect().top < window.innerHeight * 0.9) {
        target.classList.add("is-in");
        continue;
      }
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      root.classList.remove("lux-fx-ready");
    };
  }, [reduceMotion, routeState]);

  // --- parallax ----------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduceMotion || !allowParallax) return;

    const root = document.querySelector<HTMLElement>(".ss-lux");
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-lux-parallax]"));
    if (!targets.length) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      const viewport = window.innerHeight;
      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) continue;
        const strength = Number(target.dataset.luxParallax) || 0.12;
        // -1 above the fold, 0 centred, +1 below — so the drift is symmetric
        // around the moment the element is centred in the viewport.
        const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
        target.style.setProperty("--lux-parallax", `${(progress * strength * viewport).toFixed(2)}px`);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [allowParallax, reduceMotion, routeState]);

  return null;
}
