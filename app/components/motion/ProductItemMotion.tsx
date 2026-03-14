"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";

type ProductItemMotionProps = {
  children: React.ReactNode;
  index?: number;
  className?: string;
};

export default function ProductItemMotion({ children, index = 0, className }: ProductItemMotionProps) {
  const { reduceMotion } = useAnimationBudget();
  const [mounted, setMounted] = useState(false);
  const delay = reduceMotion ? 0 : Math.min((index % 8) * 0.045, 0.28);
  const initialRotate = reduceMotion ? 0 : (index % 2 === 0 ? -1.8 : 1.8);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduceMotion || !mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={
        {
          opacity: 0,
          y: 28,
          scale: 0.985,
          rotateZ: initialRotate,
        }
      }
      whileInView={
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateZ: 0,
        }
      }
      viewport={{ once: true, amount: 0.22 }}
      transition={{
        duration: 0.72,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.985, y: 1 }}
    >
      {children}
    </m.div>
  );
}
