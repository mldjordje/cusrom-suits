"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

type ParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  offset?: number;
  priority?: boolean;
  sizes?: string;
};

export default function ParallaxImage({
  src,
  alt,
  className = "",
  aspectRatio = "4 / 5",
  offset = 40,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.02, 1.08]);

  return (
    <div
      ref={ref}
      className={`luxury-parallax-frame position-relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        backgroundColor: "#17140f",
      }}
    >
      <motion.div
        className="w-100 h-100 position-absolute top-0 start-0"
        style={{ y, scale, height: `calc(100% + ${offset * 2}px)`, top: -offset }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
      </motion.div>

      {/* Cinematic Reveal Curtain */}
      <motion.div
        className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none"
        style={{
          background: "#0a0908",
          zIndex: 4,
          transformOrigin: "top center",
        }}
        initial={{ scaleY: 1 }}
        animate={inView ? { scaleY: 0 } : { scaleY: 1 }}
        transition={{
          duration: 1.1,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.1,
        }}
      />
    </div>
  );
}
