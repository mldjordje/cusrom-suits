"use client";

import React from "react";
import { SuitLayer } from "../../data/options";
import { LayerResolver, PanZoomState, SpritePair, spriteBackground } from "./types";

type Props = {
  layers: SuitLayer[];
  resolve: LayerResolver;
  fabricTexture?: string;
  textureStyle: React.CSSProperties;
  baseColor: string;
  fabricAvgColor?: string | null;
  baseBlendMode?: React.CSSProperties["mixBlendMode"];
  baseOpacity?: number;
  panZoom: PanZoomState;
  canvas: { w: number; h: number };
  mask?: string | null;
  textureScale?: number;
  textureTileSizePx?: number;
};

const buildMask = (mask?: string | null, fallback?: SpritePair | null) =>
  mask ? `url(${mask})` : fallback ? spriteBackground(fallback) : undefined;

const FabricUnionComponent: React.FC<Props> = ({
  layers,
  resolve,
  fabricTexture,
  textureStyle,
  baseColor,
  fabricAvgColor,
  baseBlendMode = "color",
  baseOpacity = 0.92,
  panZoom,
  canvas,
  mask,
  textureScale = 1,
  textureTileSizePx,
}) => {
  const baseScale = panZoom.scale * textureScale;
  const bgSize =
    typeof textureTileSizePx === "number" && Number.isFinite(textureTileSizePx)
      ? `${(textureTileSizePx * baseScale).toFixed(2)}px ${(textureTileSizePx * baseScale).toFixed(2)}px`
      : `${(baseScale * 100).toFixed(2)}% ${(baseScale * 100).toFixed(2)}%`;
  const bgPos = `calc(50% + ${Math.round(panZoom.offset.x)}px) calc(50% + ${Math.round(
    panZoom.offset.y
  )}px)`;

  const renderBaseFill = () => {
    if (mask) {
      return (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: fabricAvgColor || baseColor,
            mixBlendMode: baseBlendMode,
            opacity: baseOpacity,
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
      if (!sprite) return null;
      const maskImage = buildMask(undefined, sprite);
      return (
        <div
          key={`fabric-base-${layer.id}`}
        className="absolute inset-0"
        style={{
          backgroundColor: fabricAvgColor || baseColor,
          mixBlendMode: baseBlendMode,
          opacity: baseOpacity,
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

    const mixBlendMode =
      (textureStyle.mixBlendMode as React.CSSProperties["mixBlendMode"]) ?? "soft-light";
    const opacity = Math.min(Number(textureStyle.opacity ?? 0.26), 0.55);
    const filter = textureStyle.filter ?? "brightness(0.98) contrast(1.12) saturate(1.04)";

    const baseStyle: React.CSSProperties = {
      backgroundImage: `url(${fabricTexture})`,
      backgroundRepeat: "repeat",
      backgroundSize: bgSize,
      backgroundPosition: bgPos,
      pointerEvents: "none",
      ...textureStyle,
      mixBlendMode,
      opacity,
      filter,
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
      if (!sprite) return null;
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

export const FabricUnion = React.memo(FabricUnionComponent);
