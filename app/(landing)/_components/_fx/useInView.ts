"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fraction of the element that must be visible before it counts as in view. */
  threshold?: number;
  /** Shrinks the viewport from the bottom so things reveal slightly late. */
  rootMargin?: string;
  /** Reveals are one-way by default — re-animating on scroll-back looks cheap. */
  once?: boolean;
};

export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.02,
  rootMargin = "100px 0px 100px 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Immediate check if element is already in or near viewport
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150 && rect.bottom > -100) {
      setInView(true);
      if (once) return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || (entry.intersectionRatio && entry.intersectionRatio > 0)) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    // Safety fallback: ensure content is never permanently hidden
    const safetyTimer = window.setTimeout(() => {
      setInView(true);
    }, 1200);

    return () => {
      window.clearTimeout(safetyTimer);
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
