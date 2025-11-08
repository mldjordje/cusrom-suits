"use client";

import React from "react";

type Props = {
  noiseData: string;
  noiseOpacity?: number;
};

export const GlobalOverlay: React.FC<Props> = ({ noiseData, noiseOpacity = 0.08 }) => (
  <>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${noiseData})`,
        backgroundRepeat: "repeat",
        opacity: noiseOpacity,
        mixBlendMode: "soft-light",
        pointerEvents: "none",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.15), transparent 60%)," +
          "radial-gradient(circle at bottom, rgba(0,0,0,0.15), transparent 70%)",
        mixBlendMode: "soft-light",
        opacity: 0.35,
        pointerEvents: "none",
      }}
    />
  </>
);
