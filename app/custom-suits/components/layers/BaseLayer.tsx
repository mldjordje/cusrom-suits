"use client";

import React, { useMemo } from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  blendMode?: React.CSSProperties["mixBlendMode"];
  opacity?: number;
  filter?: React.CSSProperties["filter"];
  composite?: string | null;
  mask?: string | null;
};

const BaseLayerComponent: React.FC<Props> = ({
  layers,
  resolve,
  blendMode = "normal",
  opacity = 1,
  filter,
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
          filter,
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

  const maskImage = mask ? `url(${mask})` : undefined;
  const backgroundImage = useMemo(() => {
    if (!layers.length) return undefined;
    const resolved = layers
      .map((layer) => resolve(layer))
      .filter((pair): pair is NonNullable<ReturnType<LayerResolver>> => Boolean(pair));
    if (!resolved.length) return undefined;
    const ordered = resolved.slice().reverse();
    return ordered.map((pair) => spriteBackground(pair)).filter(Boolean).join(", ");
  }, [layers, resolve]);

  if (!backgroundImage) return null;

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        backgroundPosition: "center",
        mixBlendMode: blendMode,
        opacity,
        filter,
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

export const BaseLayer = React.memo(BaseLayerComponent);
