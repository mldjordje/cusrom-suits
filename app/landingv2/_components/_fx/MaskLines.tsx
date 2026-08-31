"use client";

import { useLayoutEffect, useRef, type ElementType } from "react";
import styles from "../../landing.module.scss";
import { getMotion, prefersReduced, withMotion } from "./motion";

type MaskLinesProps = {
  /** One entry per rendered line. Breaks are authored, never measured — a
      measured split reflows on resize and flashes on first paint. */
  lines: string[];
  as?: ElementType;
  className?: string;
  /** "word" staggers each word out of its own mask; "line" moves whole lines. */
  mode?: "word" | "line";
  /** Ties the reveal to scroll position instead of firing once on entry. */
  scrub?: boolean;
  stagger?: number;
  start?: string;
};

/**
 * The headline treatment. Every word sits inside its own `overflow: hidden`
 * box and is lifted out on a custom curve — the previous version faded whole
 * blocks at once, which reads as a template, not as typography.
 *
 * Markup renders in its final visible state, so no-JS and reduced-motion
 * visitors see finished text with zero layout shift; the hidden start state is
 * only ever applied when motion is allowed.
 */
export default function MaskLines({
  lines,
  as: Tag = "h2",
  className = "",
  mode = "word",
  scrub = false,
  stagger = 0.055,
  start = "top 82%",
}: MaskLinesProps) {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReduced()) return;

    const parts = Array.from(root.querySelectorAll<HTMLElement>(`.${styles.maskPart}`));
    // Hide synchronously: waiting for the async gsap import would let the
    // finished text paint for a frame before it jumps back to hidden.
    for (const part of parts) {
      part.style.transform = "translate3d(0, 110%, 0) rotate(2.5deg)";
      part.style.opacity = "0";
    }

    return withMotion(root, ({ gsap }) => {
      gsap.to(parts, {
        y: 0,
        rotate: 0,
        opacity: 1,
        duration: scrub ? undefined : 1.05,
        ease: "expo.out",
        stagger: mode === "word" ? stagger : stagger * 2.2,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: root,
          start,
          end: scrub ? "bottom 55%" : undefined,
          scrub: scrub ? 0.8 : false,
          once: !scrub,
        },
      });
    });
  }, [lines, mode, scrub, stagger, start]);

  return (
    <Tag ref={ref} className={`${styles.maskLines} ${className}`}>
      {lines.map((line, lineIndex) => (
        <span key={`${line}-${lineIndex}`} className={styles.maskLine}>
          {mode === "word" ? (
            line.split(" ").map((word, wordIndex) => (
              <span key={`${word}-${wordIndex}`} className={styles.maskWord}>
                <span className={styles.maskPart}>{word}</span>
              </span>
            ))
          ) : (
            <span className={styles.maskPart}>{line}</span>
          )}
        </span>
      ))}
    </Tag>
  );
}

/** Imperative twin for headings that are not authored as line arrays. */
export function revealOnScroll(
  root: HTMLElement,
  targets: HTMLElement[],
  options: { y?: number; stagger?: number; start?: string } = {},
) {
  if (prefersReduced()) return () => undefined;
  const { y = 34, stagger = 0.08, start = "top 84%" } = options;

  return withMotion(root, ({ gsap }) => {
    gsap.from(targets, {
      y,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      stagger,
      scrollTrigger: { trigger: root, start, once: true },
    });
  });
}

export { getMotion };
