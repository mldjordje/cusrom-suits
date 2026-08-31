"use client";

import type { ElementType } from "react";
import styles from "../../landing.module.scss";
import { useInView } from "./useInView";

type SplitLinesProps = {
  /** One entry per rendered line. Line breaks are authored, never measured —
      a measured split reflows on every resize and flashes on first paint. */
  lines: string[];
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
};

/** Raises each line out from behind its own mask. */
export default function SplitLines({
  lines,
  as: Tag = "h2",
  className = "",
  delay = 0,
  stagger = 70,
}: SplitLinesProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.35 });

  return (
    <Tag
      ref={ref}
      className={`${styles.lines} ${inView ? styles.linesOn : ""} ${className}`}
    >
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className={styles.line}>
          <span
            className={styles.lineInner}
            style={{ transitionDelay: `${delay + index * stagger}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
