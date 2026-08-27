"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import { MOTION_READY_CLASS } from "@/lib/motion/tokens";

/**
 * Single owner of scroll on the storefront.
 *
 * Before this component the page had four motion runtimes fighting over the
 * same scroll position: framer-motion's `whileInView`, a GSAP ScrollTrigger in
 * HeroParallaxFx, a second independent GSAP ScrollTrigger in
 * StorefrontViewportEffects, and a hand-rolled IntersectionObserver + rAF loop
 * in LuxScrollFx. Different curves, different trigger points, two competing
 * `ScrollTrigger.refresh()` calls, no shared timeline. Everything scroll-driven
 * now goes through this provider; framer-motion keeps only discrete UI state
 * (cart drawer, search overlay, mobile nav, tabs).
 *
 * Lenis rather than GSAP's own ScrollSmoother: ScrollSmoother needs a
 * transformed wrapper/content pair, and a transformed ancestor breaks
 * `position: sticky`. The storefront header and StickyMiniNav are both sticky,
 * so that trade is not available. Lenis leaves the layout alone.
 */

declare global {
  interface Window {
    __ssMotionFailsafe?: number;
  }
}

// Idempotent, and safe to call at module scope — GSAP ignores repeat
// registrations. Guarded for the server pass, where `window` is absent.
if (typeof window !== "undefined") {
  // SplitText is free as of GSAP 3.13 — no Club membership, commercial use
  // included — so line-masked headlines cost nothing beyond these bytes.
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

type MotionContextValue = {
  /** Null when motion is off, or before the provider has booted. */
  lenis: Lenis | null;
  reduceMotion: boolean;
};

const MotionContext = createContext<MotionContextValue>({ lenis: null, reduceMotion: true });

/**
 * For anything that needs to drive scroll rather than react to it — anchor
 * links, "back to top", a drawer that must freeze the page behind it.
 */
export const useMotion = () => useContext(MotionContext);

export default function MotionProvider({ children }: { children: ReactNode }) {
  /* Pathname only, never useSearchParams. Reading search params in a client
     component outside a Suspense boundary makes Next bail out of server
     rendering for the whole tree; the last time that happened here it showed
     up as a hydration mismatch that killed every client effect on the page
     (see the note in LuxScrollFx). */
  const pathname = usePathname() || "";
  const { reduceMotion } = useAnimationBudget();
  /* State, not a ref: consumers need to re-render when the instance appears.
     A ref read during render is captured before the effect has filled it, so
     every consumer would hold `null` forever — which for the preloader means
     silently falling back to `body { overflow: hidden }` and fighting Lenis
     over who owns the scroll lock. */
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    /* Deliberately not clearing window.__ssMotionFailsafe here. Being alive is
       not the same as having revealed anything — this provider only sets up
       Lenis and the ticker. SceneFx is what actually animates the hidden start
       states away, so SceneFx owns the timer. Clearing it here would mean a
       throw inside SceneFx left the page permanently at opacity 0 with nothing
       coming to fix it, which is the exact failure this project has already
       shipped once (the invisible desktop footer). */

    if (reduceMotion) {
      // Nothing is hidden, nothing needs revealing, and smooth scroll is
      // exactly the kind of motion the preference is asking us not to do.
      root.classList.remove(MOTION_READY_CLASS);
      if (window.__ssMotionFailsafe) {
        window.clearTimeout(window.__ssMotionFailsafe);
        window.__ssMotionFailsafe = 0;
      }
      return;
    }

    root.classList.add(MOTION_READY_CLASS);

    // Mobile browsers fire resize when the address bar hides. Without this,
    // every such frame re-runs every ScrollTrigger's start/end calculation.
    ScrollTrigger.config({ ignoreMobileResize: true });
    // Scrub tweens are position-driven, not time-driven; letting GSAP "catch
    // up" after a slow frame makes them jump instead of lag.
    gsap.ticker.lagSmoothing(0);

    const instance = new Lenis({ autoRaf: false, duration: 1.05 });
    setLenis(instance);

    // One rAF loop for the whole page: GSAP's ticker drives Lenis, and Lenis
    // tells ScrollTrigger where it ended up. Two loops would tear.
    const drive = (time: number) => instance.raf(time * 1000);
    instance.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(drive);

    return () => {
      gsap.ticker.remove(drive);
      instance.off("scroll", ScrollTrigger.update);
      instance.destroy();
      setLenis(null);
      gsap.ticker.lagSmoothing(500, 33);
      root.classList.remove(MOTION_READY_CLASS);
    };
  }, [reduceMotion]);

  // Route changes swap the whole section list; measured start/end positions
  // from the previous route are meaningless after that.
  useEffect(() => {
    if (reduceMotion) return;
    lenis?.resize();
    ScrollTrigger.refresh();
  }, [lenis, pathname, reduceMotion]);

  const value = useMemo(() => ({ lenis, reduceMotion }), [lenis, reduceMotion]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
