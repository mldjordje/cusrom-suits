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
  const initialRotate = reduceMotion ? 0 : (index % 2 === 0 ? -1.8 : 1.8);

  return (
    <m.div
      className={className}
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 28,
              scale: 0.965,
              rotateZ: initialRotate,
              filter: "blur(8px)",
            }
      }
      whileInView={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              rotateZ: 0,
              filter: "blur(0px)",
            }
      }
      viewport={{ once: true, amount: 0.22 }}
      transition={{
        duration: reduceMotion ? 0 : 0.72,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={reduceMotion ? undefined : { scale: 0.985, y: 1 }}
    >
      {children}
    </m.div>
  );
}
