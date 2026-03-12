"use client";

import { m, useReducedMotion } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  amount?: number;
  y?: number;
  as?: "div" | "section" | "article";
};

const tagMap = {
  div: m.div,
  section: m.section,
  article: m.article,
};

export default function Reveal({
  children,
  className,
  id,
  delay = 0,
  amount = 0.2,
  y = 18,
  as = "div",
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = tagMap[as];

  if (reduceMotion) {
    return (
      <Tag className={className} id={id}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      id={id}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
