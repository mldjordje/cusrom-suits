"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "../../landing.module.scss";
import { useInView } from "./useInView";

type RevealProps = {
  children: ReactNode;
  /** Milliseconds added before this element starts, for stagger. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/** Uncovers its child with a clip-path wipe once it enters the viewport. */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  style,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: "150px 0px 150px 0px",
  });

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${inView ? styles.revealOn : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
