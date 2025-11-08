"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  opacity?: number;
  blendMode?: React.CSSProperties["mixBlendMode"];
  composite?: string | null;
  mask?: string | null;
};

export const ShadingLayer: React.FC<Props> = ({
  opacity = 0.2,
  blendMode = "multiply",
  composite,
  mask,
}) => {
  if (!composite) return null;
  const maskImage = mask ? `url(${mask})` : undefined;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${composite})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        backgroundPosition: "center",
        mixBlendMode: blendMode,
        opacity,
        WebkitMaskImage: maskImage,
        WebkitMaskRepeat: maskImage ? "no-repeat" : undefined,
        WebkitMaskSize: maskImage ? "contain" : undefined,
        WebkitMaskPosition: maskImage ? "center" : undefined,
        maskImage,
        maskRepeat: maskImage ? "no-repeat" : undefined,
        maskSize: maskImage ? "contain" : undefined,
        maskPosition: maskImage ? "center" : undefined,
        pointerEvents: "none",
      }}
    />
  );
};
