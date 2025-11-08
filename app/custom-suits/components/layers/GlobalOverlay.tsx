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
        mixBlendMode: "soft-light",
        pointerEvents: "none",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          `linear-gradient(180deg, rgba(255,255,255,${settings.highlightTop}), transparent 40%),` +
          `linear-gradient(0deg, rgba(0,0,0,${settings.highlightBottom}), transparent 45%)`,
        mixBlendMode: "soft-light",
        opacity: 0.8,
        pointerEvents: "none",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        boxShadow: `inset 0 0 160px rgba(0,0,0,${settings.vignette})`,
        pointerEvents: "none",
      }}
    />
  </>
);
