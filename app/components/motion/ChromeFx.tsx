"use client";

import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotion } from "@/app/components/motion/MotionProvider";

/**
 * Page chrome that reacts to scroll: the progress hairline and the header's
 * hide-on-descend behaviour.
 *
 * Both are driven from the single ScrollTrigger instance rather than a fresh
 * scroll listener, and both write to the document element instead of to React
 * state — a progress bar re-rendering the storefront header sixty times a
 * second is the kind of thing that makes a page feel heavy for no reason.
 *
 * Contract, consumed by santos-lux.scss:
 *   --ss-progress          0 → 1, the bar's scaleX
 *   [data-scroll-dir]      "down" | "up", drives the header's translate
 *   [data-scrolled]        present once past the first screen
 */
export default function ChromeFx() {
  const pathname = usePathname() || "";
  const { reduceMotion } = useMotion();

  useGSAP(
    () => {
      const root = document.documentElement;

      // With motion off there is no bar and no hiding header, but the
      // "past the fold" flag is state, not animation, so it stays.
      const progress = reduceMotion ? null : document.querySelector<HTMLElement>("[data-ss-progress]");

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          if (progress) gsap.set(progress, { scaleX: self.progress });

          const direction = self.direction === -1 ? "up" : "down";
          if (root.dataset.scrollDir !== direction) root.dataset.scrollDir = direction;

          // Below this the header has nothing to sit on but the hero, where
          // it is transparent by design.
          const past = self.scroll() > window.innerHeight * 0.6;
          if (past) root.dataset.scrolled = "";
          else delete root.dataset.scrolled;
        },
      });

      return () => {
        delete root.dataset.scrollDir;
        delete root.dataset.scrolled;
      };
    },
    { dependencies: [pathname, reduceMotion] },
  );

  if (reduceMotion) return null;

  return (
    <span className="ss-progress" aria-hidden="true">
      <span className="ss-progress__fill" data-ss-progress />
    </span>
  );
}
