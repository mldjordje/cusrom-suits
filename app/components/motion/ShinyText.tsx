"use client";

import { CSSProperties, ReactNode } from "react";

type ShinyTextProps = {
  text: string | ReactNode;
  disabled?: boolean;
  speed?: number;
  className?: string;
  shimmerWidth?: number;
  color?: string;
  shineColor?: string;
};

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = "",
  color = "#c9a96e",
  shineColor = "#fff3db",
}: ShinyTextProps) {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  const style: CSSProperties = {
    backgroundImage: `linear-gradient(120deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: "200% 100%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: `ss-shiny-shimmer ${speed}s infinite linear`,
    display: "inline-block",
  };

  return (
    <>
      <style>{`
        @keyframes ss-shiny-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
      <span className={`luxury-shiny-text ${className}`} style={style}>
        {text}
      </span>
    </>
  );
}
