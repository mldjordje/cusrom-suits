"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type BlurTextProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
};

export default function BlurText({
  text,
  className = "",
  as: Component = "h2",
  delay = 0.04,
  animateBy = "words",
  direction = "bottom",
}: BlurTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  return (
    <Component
      ref={ref as unknown as React.RefObject<HTMLHeadingElement>}
      className={`luxury-blur-text ${className}`}
      style={{ display: "inline-flex", flexWrap: "wrap", gap: animateBy === "words" ? "0.28em" : "0.02em" }}
    >
      {elements.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          initial={{
            opacity: 0,
            filter: "blur(10px)",
            transform: direction === "bottom" ? "translateY(20px)" : "translateY(-20px)",
          }}
          animate={
            inView
              ? {
                  opacity: 1,
                  filter: "blur(0px)",
                  transform: "translateY(0px)",
                }
              : {}
          }
          transition={{
            duration: 0.7,
            delay: i * delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
        >
          {segment === " " ? "\u00A0" : segment}
        </motion.span>
      ))}
    </Component>
  );
}
