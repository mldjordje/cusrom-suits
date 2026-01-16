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
  textureRotationDeg?: number;
  maskSize?: string;
  maskPosition?: string;
  maskRepeat?: React.CSSProperties["maskRepeat"];
  backgroundAnchor?: "center" | "top-left";
  rotationOrigin?: string;
  backgroundOffset?: { x: number; y: number };
};

const buildMask = (mask?: string | null, fallback?: SpritePair | null) => {
  if (mask) {
    return mask.includes("url(") ? mask : `url(${mask})`;
  }
  return fallback ? spriteBackground(fallback) : undefined;
};

const computeRotationScale = (canvas: { w: number; h: number }, angleDeg: number) => {
  const normalized = ((angleDeg % 360) + 360) % 360;
  if (normalized === 0) return 1;
  const rad = (normalized * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bboxW = canvas.w * cos + canvas.h * sin;
  const bboxH = canvas.w * sin + canvas.h * cos;
  if (!bboxW || !bboxH) return 1;
  return Math.max(1, canvas.w / bboxW, canvas.h / bboxH);
};

const parsePxBackgroundSize = (value?: React.CSSProperties["backgroundSize"]) => {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(/\s+/);
  if (!parts.length) return null;
  const [xRaw, yRaw] = parts.length === 1 ? [parts[0], parts[0]] : parts;
  const parsePart = (part: string) => {
    const trimmed = part.trim();
    if (!trimmed.endsWith("px")) return null;
    const num = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(num) ? num : null;
  };
  const x = parsePart(xRaw);
  const y = parsePart(yRaw);
  if (x === null || y === null) return null;
  return { x, y };
};

const scalePxBackgroundSize = (size: { x: number; y: number }, scale: number) =>
  `${(size.x * scale).toFixed(2)}px ${(size.y * scale).toFixed(2)}px`;

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
  textureRotationDeg = 0,
  maskSize = "contain",
  maskPosition = "center",
  maskRepeat = "no-repeat",
  backgroundAnchor = "center",
  rotationOrigin = "center",
  backgroundOffset,
}) => {
  const baseScale = panZoom.scale * textureScale;
  const rotationScale = textureRotationDeg ? computeRotationScale(canvas, textureRotationDeg) : 1;
  const rotationCompensation = rotationScale ? 1 / rotationScale : 1;
  const offsetX = panZoom.offset.x + (backgroundOffset?.x ?? 0);
  const offsetY = panZoom.offset.y + (backgroundOffset?.y ?? 0);
  const buildBgSize = (scale: number) =>
    typeof textureTileSizePx === "number" && Number.isFinite(textureTileSizePx)
      ? `${(textureTileSizePx * scale).toFixed(2)}px ${(textureTileSizePx * scale).toFixed(2)}px`
      : `${(scale * 100).toFixed(2)}% ${(scale * 100).toFixed(2)}%`;
  const bgSize = buildBgSize(baseScale);
  const bgPos =
    backgroundAnchor === "top-left"
      ? `${Math.round(offsetX)}px ${Math.round(offsetY)}px`
      : `calc(50% + ${Math.round(offsetX)}px) calc(50% + ${Math.round(offsetY)}px)`;
  const textureBgSize = textureStyle.backgroundSize;
  const resolvedBgSize = textureBgSize ?? bgSize;
  const resolvedBgPos = textureStyle.backgroundPosition ?? bgPos;
  const parsedBgSize = parsePxBackgroundSize(textureBgSize);
  const rotatedBgSize = parsedBgSize
    ? scalePxBackgroundSize(parsedBgSize, rotationCompensation)
    : textureBgSize ?? buildBgSize(baseScale * rotationCompensation);
  const rotatedBgPos =
    backgroundAnchor === "top-left"
      ? `${Math.round(offsetX * rotationCompensation)}px ${Math.round(
          offsetY * rotationCompensation
        )}px`
      : `calc(50% + ${Math.round(offsetX * rotationCompensation)}px) calc(50% + ${Math.round(
          offsetY * rotationCompensation
        )}px)`;
  const maskSizeValue = maskSize;
  const maskPositionValue = maskPosition;
  const maskRepeatValue = maskRepeat;

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
            WebkitMaskRepeat: maskRepeatValue,
            WebkitMaskSize: maskSizeValue,
            WebkitMaskPosition: maskPositionValue,
            maskImage: buildMask(mask),
            maskRepeat: maskRepeatValue,
            maskSize: maskSizeValue,
            maskPosition: maskPositionValue,
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
          WebkitMaskRepeat: maskRepeatValue,
          WebkitMaskSize: maskSizeValue,
            WebkitMaskPosition: maskPositionValue,
            maskImage,
            maskRepeat: maskRepeatValue,
            maskSize: maskSizeValue,
            maskPosition: maskPositionValue,
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
    const opacityRaw = Number(textureStyle.opacity ?? 0.26);
    const opacity = Math.min(Math.max(opacityRaw, 0), 0.88);
    const filter = textureStyle.filter ?? "brightness(0.98) contrast(1.12) saturate(1.04)";

    const baseStyle: React.CSSProperties = {
      backgroundImage: `url(${fabricTexture})`,
      backgroundRepeat: "repeat",
      backgroundSize: resolvedBgSize,
      backgroundPosition: resolvedBgPos,
      pointerEvents: "none",
      ...textureStyle,
      mixBlendMode,
      opacity,
      filter,
    };

    if (mask) {
      const maskImage = buildMask(mask);
      if (textureRotationDeg) {
        const rotatedStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundSize: rotatedBgSize,
          backgroundPosition: rotatedBgPos,
        };
        const transform =
          rotationScale !== 1
            ? `rotate(${textureRotationDeg}deg) scale(${rotationScale})`
            : `rotate(${textureRotationDeg}deg)`;
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              WebkitMaskImage: maskImage,
              WebkitMaskRepeat: maskRepeatValue,
              WebkitMaskSize: maskSizeValue,
              WebkitMaskPosition: maskPositionValue,
              maskImage,
              maskRepeat: maskRepeatValue,
              maskSize: maskSizeValue,
              maskPosition: maskPositionValue,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                ...rotatedStyle,
                transform,
                transformOrigin: rotationOrigin,
              }}
            />
          </div>
        );
      }
      return (
        <div
          className="absolute inset-0"
          style={{
            ...baseStyle,
            WebkitMaskImage: maskImage,
            WebkitMaskRepeat: maskRepeatValue,
            WebkitMaskSize: maskSizeValue,
            WebkitMaskPosition: maskPositionValue,
            maskImage,
            maskRepeat: maskRepeatValue,
            maskSize: maskSizeValue,
            maskPosition: maskPositionValue,
          }}
        />
      );
    }

    return layers.map((layer) => {
      const sprite = resolve(layer);
      if (!sprite) return null;
      const maskImage = buildMask(undefined, sprite);
      if (textureRotationDeg) {
        const rotatedStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundSize: rotatedBgSize,
          backgroundPosition: rotatedBgPos,
        };
        const transform =
          rotationScale !== 1
            ? `rotate(${textureRotationDeg}deg) scale(${rotationScale})`
            : `rotate(${textureRotationDeg}deg)`;
        return (
          <div
            key={`fabric-weave-${layer.id}`}
            className="absolute inset-0 pointer-events-none"
            style={{
              WebkitMaskImage: maskImage,
              WebkitMaskRepeat: maskRepeatValue,
              WebkitMaskSize: maskSizeValue,
              WebkitMaskPosition: maskPositionValue,
              maskImage,
              maskRepeat: maskRepeatValue,
              maskSize: maskSizeValue,
              maskPosition: maskPositionValue,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                ...rotatedStyle,
                transform,
                transformOrigin: rotationOrigin,
              }}
            />
          </div>
        );
      }
      return (
        <div
          key={`fabric-weave-${layer.id}`}
          className="absolute inset-0"
          style={{
            ...baseStyle,
            WebkitMaskImage: maskImage,
            WebkitMaskRepeat: maskRepeatValue,
            WebkitMaskSize: maskSizeValue,
            WebkitMaskPosition: maskPositionValue,
            maskImage,
            maskRepeat: maskRepeatValue,
            maskSize: maskSizeValue,
            maskPosition: maskPositionValue,
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
