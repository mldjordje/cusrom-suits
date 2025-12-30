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
  const maskImage = mask ? `url(${mask})` : undefined;
  const resolvedLayers = useMemo(
    () =>
      layers
        .map((layer) => ({ id: layer.id, image: resolve(layer) }))
        .filter((entry): entry is { id: string; image: NonNullable<ReturnType<LayerResolver>> } => Boolean(entry.image)),
    [layers, resolve]
  );
  const backgroundImage = useMemo(() => {
    if (blendMode !== "normal") return undefined;
    if (!resolvedLayers.length) return undefined;
    const ordered = resolvedLayers.slice().reverse();
    return ordered
      .map((entry) => spriteBackground(entry.image))
      .filter(Boolean)
      .join(", ");
  }, [blendMode, resolvedLayers]);

  if (composite) {
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

  if (!resolvedLayers.length) return null;
  if (blendMode === "normal" && backgroundImage) {
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
  }

  return (
    <>
      {resolvedLayers.map((entry) => (
        <div
          key={`base-${entry.id}`}
          className="absolute inset-0"
          style={{
            backgroundImage: spriteBackground(entry.image),
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
      ))}
    </>
  );
};

export const BaseLayer = React.memo(BaseLayerComponent);
