"use client";

import { useEffect, useRef } from "react";
import styles from "../landing.module.scss";
import { getMotion } from "./_fx/motion";

/**
 * Continuity between sections. A hairline draws itself outward from the centre
 * as the seam crosses the viewport, carrying the chapter mark of the section
 * about to begin — the element that closes one chapter is the element that
 * opens the next.
 */
export default function LxSeam({ mark }: { mark: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let dead = false;
    let ctx: { revert: () => void } | null = null;

    void getMotion().then((core) => {
      if (dead || !core) return;
      ctx = core.gsap.context(() => {
        core.gsap.fromTo(
          `.${styles.seamRule}`,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: node,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          },
        );
      }, node);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={ref} className={styles.seam} aria-hidden="true">
      <span className={styles.seamRule} />
      <span className={styles.seamMark}>{mark}</span>
    </div>
  );
}
