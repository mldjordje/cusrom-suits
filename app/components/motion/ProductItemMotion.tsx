"use client";

import { m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type ProductItemMotionProps = {
  children: React.ReactNode;
  index?: number;
  className?: string;
};

export default function ProductItemMotion({ children, index = 0, className }: ProductItemMotionProps) {
  const { reduceMotion } = useAnimationBudget();
  const delay = reduceMotion ? 0 : Math.min((index % 8) * 0.045, 0.28);

  return (
    <m.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98, filter: "blur(4px)" }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
    >
      {children}
    </m.div>
  );
}

