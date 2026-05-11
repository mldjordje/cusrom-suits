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
  const viewAmount = Math.min(Math.max(amount, 0.05), 0.22);
  const resolvedY = Math.min(y, 14);

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
      initial={{ opacity: 0, y: resolvedY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: viewAmount, margin: "0px 0px 10% 0px" }}
      transition={{ duration: 0.56, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
