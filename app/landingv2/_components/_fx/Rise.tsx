"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "../../landing.module.scss";
import { useInView } from "./useInView";

type RiseProps = {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/**
 * The quiet one: a short lift and fade for labels, captions and prices. Used
 * everywhere the clip-path wipe would be too loud for a line of 11px type.
 */
export default function Rise({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  style,
}: RiseProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });

  return (
    <Tag
      ref={ref}
      className={`${styles.rise} ${inView ? styles.riseOn : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
