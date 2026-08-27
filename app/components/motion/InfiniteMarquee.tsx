"use client";

import { motion } from "framer-motion";

type InfiniteMarqueeProps = {
  items: string[];
  speed?: number;
  className?: string;
  goldAccent?: boolean;
};

export default function InfiniteMarquee({
  items,
  speed = 28,
  className = "",
  goldAccent = true,
}: InfiniteMarqueeProps) {
  // Repeat items to ensure smooth continuous loop
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className={`luxury-marquee overflow-hidden py-3 py-md-4 border-top border-bottom ${className}`}>
      <motion.div
        className="d-flex align-items-center flex-nowrap"
        style={{ width: "max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: speed,
        }}
      >
        {repeated.map((text, idx) => (
          <div
            key={`${text}-${idx}`}
            className="d-inline-flex align-items-center flex-shrink-0 px-3 px-md-4"
          >
            <span
              className="text-uppercase fw-medium"
              style={{
                letterSpacing: "0.22em",
                fontSize: "clamp(0.72rem, 1.1vw, 0.88rem)",
                color: goldAccent ? "var(--lux-fg, #f2eee7)" : "inherit",
              }}
            >
              {text}
            </span>
            <span
              aria-hidden="true"
              className="mx-3 mx-md-4"
              style={{
                color: "var(--lux-gold, #c9a96e)",
                opacity: 0.65,
                fontSize: "0.85em",
              }}
            >
              ◆
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
