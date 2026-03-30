"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const delay = reduceMotion ? 0 : Math.min((index % 12) * 0.05, 0.4);
  const xShift = reduceMotion ? 0 : (index % 2 === 0 ? -10 : 10);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduceMotion || !mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{
        opacity: 0,
        y: 22,
        x: xShift,
        scale: 0.97,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 0.68,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  );
}
