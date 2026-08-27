"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

export default function LuxuryCursorGlow() {
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useSpring(0, { damping: 28, stiffness: 350 });
  const cursorY = useSpring(0, { damping: 28, stiffness: 350 });
  const glowX = useSpring(0, { damping: 40, stiffness: 180 });
  const glowY = useSpring(0, { damping: 40, stiffness: 180 });

  useEffect(() => {
    // Only enable on non-touch devices with fine cursor
    if (typeof window === "undefined") return;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer) return;

    setIsPointerDevice(true);

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      glowX.set(e.clientX);
      glowY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleTargetHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest("a, button, [role='button'], input, select, .cursor-pointer, .ss-premium-card");
      setIsHovered(Boolean(isInteractive));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleTargetHover, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleTargetHover);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [cursorX, cursorY, glowX, glowY, isVisible]);

  if (!isPointerDevice || !isVisible) return null;

  return (
    <div className="luxury-cursor-container pointer-events-none" style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {/* Outer ambient champagne aura */}
      <motion.div
        className="luxury-cursor-glow"
        style={{
          x: glowX,
          y: glowY,
          translateX: "-50%",
          translateY: "-50%",
          position: "fixed",
          width: isHovered ? "64px" : "36px",
          height: isHovered ? "64px" : "36px",
          borderRadius: "50%",
          background: isHovered
            ? "radial-gradient(circle, rgba(201, 169, 110, 0.35) 0%, rgba(201, 169, 110, 0.05) 70%, transparent 100%)"
            : "radial-gradient(circle, rgba(201, 169, 110, 0.2) 0%, transparent 80%)",
          border: isHovered ? "1px solid rgba(201, 169, 110, 0.4)" : "1px solid rgba(201, 169, 110, 0.15)",
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease",
          pointerEvents: "none",
        }}
      />
      {/* Core gold micro-dot */}
      <motion.div
        className="luxury-cursor-dot"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
          position: "fixed",
          width: isHovered ? "6px" : "4px",
          height: isHovered ? "6px" : "4px",
          borderRadius: "50%",
          backgroundColor: "var(--lux-gold, #c9a96e)",
          boxShadow: "0 0 8px rgba(201, 169, 110, 0.8)",
          transition: "transform 0.15s ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
