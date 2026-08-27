"use client";

import { useRef, useState, MouseEvent } from "react";

type SpotlightCardProps = {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
  size?: number;
};

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(201, 169, 110, 0.12)",
  borderColor = "rgba(201, 169, 110, 0.25)",
  size = 350,
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`luxury-spotlight-card position-relative overflow-hidden ${className}`}
      style={{
        transition: "border-color 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="luxury-spotlight-overlay position-absolute top-0 start-0 w-100 h-100 pointer-events-none"
        style={{
          opacity,
          background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          transition: "opacity 0.3s ease",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        className="luxury-spotlight-border position-absolute top-0 start-0 w-100 h-100 pointer-events-none"
        style={{
          opacity,
          border: `1px solid ${borderColor}`,
          borderRadius: "inherit",
          transition: "opacity 0.3s ease",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
