"use client";

/**
 * One motion core for the whole landing.
 *
 * The page previously had four independent `window.addEventListener("scroll")`
 * handlers plus a Lenis instance that nothing was subscribed to. That is not a
 * motion system, it is four animations that happen to share a scrollbar. This
 * module owns the single source of truth: Lenis drives gsap.ticker, gsap.ticker
 * drives ScrollTrigger, and every section registers its timeline against it.
 *
 * Nothing here loads unless the visitor actually allows motion.
 */

import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type MotionCore = {
  gsap: typeof GsapType;
  ScrollTrigger: typeof ScrollTriggerType;
  /** Touch devices get a shortened, cheaper version of every timeline. */
  coarse: boolean;
};

export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function prefersReduced(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarse(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

let corePromise: Promise<MotionCore | null> | null = null;

/**
 * Resolves once gsap, ScrollTrigger and (on precise pointers) Lenis are wired
 * together. Resolves to `null` when motion is not wanted — callers treat that
 * as "leave the markup in its final, static state".
 */
export function getMotion(): Promise<MotionCore | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (prefersReduced()) return Promise.resolve(null);

  if (!corePromise) {
    corePromise = (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);
      const coarse = isCoarse();

      if (!coarse) {
        // Smooth inertia only on mouse/trackpad. Touch already has native
        // momentum; hijacking it costs frames and breaks address-bar collapse.
        const { default: Lenis } = await import("lenis");
        const lenis = new Lenis({
          lerp: 0.09,
          wheelMultiplier: 0.9,
          smoothWheel: true,
          syncTouch: false,
        });

        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // Late-loading fonts and legacy-host imagery shift section heights and
      // would leave every pinned trigger measuring the wrong start point.
      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
      }
      window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

      return { gsap, ScrollTrigger, coarse };
    })().catch(() => null);
  }

  return corePromise;
}

/**
 * Registers a scoped gsap context against a section element. Everything the
 * setup function creates is reverted on unmount — including pin spacers, which
 * survive a plain `kill()` and leave holes in the layout.
 */
export function withMotion(
  root: HTMLElement,
  setup: (core: MotionCore, root: HTMLElement) => void,
): () => void {
  let dead = false;
  let ctx: { revert: () => void } | null = null;

  void getMotion().then((core) => {
    if (dead || !core) return;
    ctx = core.gsap.context(() => setup(core, root), root);
  });

  return () => {
    dead = true;
    ctx?.revert();
  };
}
