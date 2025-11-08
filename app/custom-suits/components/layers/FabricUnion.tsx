"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, PanZoomState, SpritePair, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  fabricTexture?: string;
  toneStyle: React.CSSProperties;
  baseColor: string;
  fabricAvgColor?: string | null;
  panZoom: PanZoomState;
  mask?: string | null;
};

const buildMask = (mask?: string | null, fallback?: SpritePair) =>
  mask ? `url(${mask})` : fallback ? spriteBackground(fallback) : undefined;

export const FabricUnion: React.FC<Props> = ({
  layers,
  resolve,
  fabricTexture,
  toneStyle,
  baseColor,
  fabricAvgColor,
  panZoom,
  mask,
}) => {
  const bgSize = `${Math.round(600 * panZoom.scale)}px ${Math.round(733 * panZoom.scale)}px`;
  const bgPos = `${Math.round(panZoom.offset.x)}px ${Math.round(panZoom.offset.y)}px`;

  const renderBaseFill = () => {
    if (mask) {
      return (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: fabricAvgColor || baseColor,
            WebkitMaskImage: buildMask(mask),
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage: buildMask(mask),
            maskRepeat: "no-repeat",
            maskSize: "contain",
            maskPosition: "center",
            pointerEvents: "none",
          }}
        />
      );
    }

    return layers.map((layer) => {
      const sprite = resolve(layer);
      const maskImage = buildMask(undefined, sprite);
      return (
        <div
          key={`fabric-base-${layer.id}`}
          className="absolute inset-0"
          style={{
            backgroundColor: fabricAvgColor || baseColor,
            WebkitMaskImage: maskImage,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage,
            maskRepeat: "no-repeat",
            maskSize: "contain",
            maskPosition: "center",
            pointerEvents: "none",
          }}
        />
      );
    });
  };

  const renderTexture = () => {
    if (!fabricTexture) return null;

    const baseStyle: React.CSSProperties = {
      backgroundImage: `url(${fabricTexture})`,
      backgroundRepeat: "repeat",
      backgroundSize: bgSize,
      backgroundPosition: bgPos,
      ...toneStyle,
      pointerEvents: "none",
    };

    if (mask) {
      const maskImage = buildMask(mask);
      return (
        <div
          className="absolute inset-0"
          style={{
            ...baseStyle,
            WebkitMaskImage: maskImage,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage,
            maskRepeat: "no-repeat",
            maskSize: "contain",
            maskPosition: "center",
          }}
        />
      );
    }

    return layers.map((layer) => {
      const sprite = resolve(layer);
      const maskImage = buildMask(undefined, sprite);
      return (
        <div
          key={`fabric-weave-${layer.id}`}
          className="absolute inset-0"
          style={{
            ...baseStyle,
            WebkitMaskImage: maskImage,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage,
            maskRepeat: "no-repeat",
            maskSize: "contain",
            maskPosition: "center",
          }}
        />
      );
    });
  };

  return (
    <>
      {renderBaseFill()}
      {renderTexture()}
    </>
  );
};
