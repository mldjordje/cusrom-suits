"use client";

import { m, useReducedMotion } from "framer-motion";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function SectionHeadingReveal({ className, children }: Props) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <h2 className={className}>{children}</h2>;
  }

  return (
    <m.h2
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px 15% 0px" }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.h2>
  );
}
