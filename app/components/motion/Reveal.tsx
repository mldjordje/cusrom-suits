"use client";

import { m, useReducedMotion } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

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
  const prefersReduced = useReducedMotion();
  const { reduceMotion: budgetReduce } = useAnimationBudget();
  const reduceMotion = Boolean(prefersReduced || budgetReduce);
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
      initial={{ opacity: 0, y, scale: 0.985, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
