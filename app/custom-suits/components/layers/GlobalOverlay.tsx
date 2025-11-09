"use client";

import React from "react";
import { ToneVisual } from "../../utils/visual";

type Props = {
  noiseData: string;
  settings: ToneVisual;
  mask?: string | null;
};

const maskStyles = (mask?: string | null): React.CSSProperties =>
  mask
    ? {
        WebkitMaskImage: `url(${mask})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        WebkitMaskPosition: "center",
        maskImage: `url(${mask})`,
        maskRepeat: "no-repeat",
        maskSize: "contain",
        maskPosition: "center",
        maskMode: "alpha",
      }
    : {};

export const GlobalOverlay: React.FC<Props> = ({ noiseData, settings, mask }) => (
  <>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${noiseData})`,
        backgroundRepeat: "repeat",
        opacity: settings.noise,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        ...maskStyles(mask),
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(circle at 50% 25%, rgba(255,255,255,${settings.highlightTop}), transparent 55%), linear-gradient(200deg, rgba(0,0,0,${settings.highlightBottom}), transparent 60%)`,
        mixBlendMode: "soft-light",
        pointerEvents: "none",
        ...maskStyles(mask),
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(circle at 50% 60%, rgba(0,0,0,${settings.vignette}) 55%, transparent 85%)`,
        mixBlendMode: "multiply",
        opacity: 0.9,
        pointerEvents: "none",
        ...maskStyles(mask),
      }}
    />
  </>
);
