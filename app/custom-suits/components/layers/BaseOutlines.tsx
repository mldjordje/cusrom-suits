"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  opacity?: number;
  composite?: string | null;
  mask?: string | null;
};

export const BaseOutlines: React.FC<Props> = ({ layers, resolve, opacity = 0.15, composite, mask }) => {
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
          mixBlendMode: "multiply",
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
        const sprite = resolve(layer);
        return (
          <div
            key={`edge-${layer.id}`}
            className="absolute inset-0"
            style={{
              backgroundImage: spriteBackground(sprite),
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              backgroundPosition: "center",
              mixBlendMode: "multiply",
              opacity,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};
