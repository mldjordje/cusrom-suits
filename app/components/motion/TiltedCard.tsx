"use client";

import { useRef, useState, MouseEvent } from "react";

type TiltedCardProps = {
  children: React.ReactNode;
  className?: string;
  maxAngle?: number;
  scale?: number;
  perspective?: number;
  glare?: boolean;
};

export default function TiltedCard({
  children,
  className = "",
  maxAngle = 8,
  scale = 1.02,
  perspective = 1000,
  glare = true,
}: TiltedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -maxAngle;
    const rY = ((x - centerX) / centerX) * maxAngle;

    setRotateX(rX);
    setRotateY(rY);

    if (glare) {
      setGlarePosition({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        opacity: 0.18,
      });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`luxury-tilted-card-wrapper position-relative ${className}`}
      style={{
        perspective: `${perspective}px`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="luxury-tilted-card-inner w-100 h-100 position-relative"
        style={{
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {children}

        {glare ? (
          <div
            className="luxury-tilted-glare position-absolute top-0 start-0 w-100 h-100 pointer-events-none rounded-1"
            style={{
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(243, 220, 158, ${glarePosition.opacity}), transparent 60%)`,
              transition: "opacity 0.3s ease",
              opacity: glarePosition.opacity,
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
