"use client";

import React from "react";
import { ToneVisual } from "../../utils/visual";

type Props = {
  noiseData: string;
  settings: ToneVisual;
};

export const GlobalOverlay: React.FC<Props> = ({ noiseData, settings }) => (
  <>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${noiseData})`,
        backgroundRepeat: "repeat",
        opacity: settings.noise,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(circle at 50% 25%, rgba(255,255,255,${settings.highlightTop}), transparent 55%), linear-gradient(200deg, rgba(0,0,0,${settings.highlightBottom}), transparent 60%)`,
        mixBlendMode: "soft-light",
        pointerEvents: "none",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(circle at 50% 60%, rgba(0,0,0,${settings.vignette}) 55%, transparent 85%)`,
        mixBlendMode: "multiply",
        opacity: 0.9,
        pointerEvents: "none",
      }}
    />
  </>
);
