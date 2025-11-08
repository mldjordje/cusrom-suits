"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  blendMode?: React.CSSProperties["mixBlendMode"];
  opacity?: number;
  composite?: string | null;
  mask?: string | null;
};

export const BaseLayer: React.FC<Props> = ({
  layers,
  resolve,
  blendMode = "normal",
  opacity = 1,
  composite,
  mask,
}) => {
  if (composite) {
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
  }

  return (
    <>
      {layers.map((layer) => {
        const image = resolve(layer);
        if (!image) return null;
        return (
          <div
            key={`base-${layer.id}`}
            className="absolute inset-0"
            style={{
              backgroundImage: spriteBackground(image),
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              backgroundPosition: "center",
              mixBlendMode: blendMode,
              opacity,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};
