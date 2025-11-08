"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  blendMode?: React.CSSProperties["mixBlendMode"];
  opacity?: number;
};

export const BaseLayer: React.FC<Props> = ({ layers, resolve, blendMode = "normal", opacity = 1 }) => (
  <>
    {layers.map((layer) => {
      const image = resolve(layer);
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
