"use client";

import { m, useReducedMotion } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type ProductItemMotionProps = {
  children: React.ReactNode;
  index?: number;
  className?: string;
};

export default function ProductItemMotion({ children, index = 0, className }: ProductItemMotionProps) {
  const prefersReduced = useReducedMotion();
  const { reduceMotion: budgetReduce } = useAnimationBudget();
  const reduceMotion = Boolean(prefersReduced || budgetReduce);
  const delay = reduceMotion ? 0 : Math.min((index % 8) * 0.035, 0.22);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{
        opacity: 0,
        y: 14,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px 8% 0px" }}
      transition={{
        duration: 0.52,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  );
}
