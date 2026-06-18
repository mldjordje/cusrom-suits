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
  fabricTone?: "light" | "medium" | "dark";
  baseBlendMode?: React.CSSProperties["mixBlendMode"];
  baseOpacity?: number;
  panZoom: PanZoomState;
  canvas: { w: number; h: number };
  mask?: string | null;
  textureScale?: number;
  textureTileSizePx?: number;
  textureRotationDeg?: number;
  rotationScaleMode?: "fit" | "none";
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

const hexLuminance = (hex?: string | null): number | null => {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * CSS "color" blend keeps the BACKDROP's luminosity and only swaps in the fill's
 * hue/saturation. For a near-black, near-zero-saturation fill that means luminosity
 * passes through almost untouched — so a baked-in studio highlight on the base photo
 * (e.g. peak-lapel sheen) shows through unrecolored even on a "black" fabric. This
 * computes a multiply-clamp opacity, scaled by how dark the target is, to pull that
 * highlight bleed-through down. Tapers to 0 by mid lightness so normal/light fabrics
 * (where "color" blend already looks correct) are unaffected.
 */
const getHighlightClampOpacity = (
  fillHex?: string | null,
  baseHex?: string | null,
  blendMode?: React.CSSProperties["mixBlendMode"]
) => {
  if (blendMode !== "color") return 0;
  const fillLum = hexLuminance(fillHex);
  const baseLum = hexLuminance(baseHex);
  // Use the darker of the two — a stripe fabric's averaged fill colour is pulled
  // lighter by the white yarn, which would otherwise under-trigger the clamp on a
  // jacket that should read as a dark/black ground cloth.
  const lum =
    fillLum != null && baseLum != null
      ? Math.min(fillLum, baseLum)
      : fillLum ?? baseLum;
  if (lum == null || lum >= 130) return 0;
  return Math.max(0, Math.min(1, (130 - lum) / 130)) * 0.75;
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
  fabricTone,
  baseBlendMode = "color",
  baseOpacity = 0.92,
  panZoom,
  canvas,
  mask,
  textureScale = 1,
  textureTileSizePx,
  textureRotationDeg = 0,
  rotationScaleMode = "fit",
  maskSize = "contain",
  maskPosition = "center",
  maskRepeat = "no-repeat",
  backgroundAnchor = "center",
  rotationOrigin = "center",
  backgroundOffset,
}) => {
  const baseScale = panZoom.scale * textureScale;
  const rotationScale =
    textureRotationDeg && rotationScaleMode === "fit"
      ? computeRotationScale(canvas, textureRotationDeg)
      : 1;
  const rotationRenderScale = rotationScaleMode === "none" ? 1.18 : rotationScale;
  const hasRotation = Math.abs(textureRotationDeg) > 0.0001;
  const useTransformLayer = hasRotation || (rotationScaleMode === "none" && rotationRenderScale !== 1);
  const rotationCompensation = rotationScaleMode === "fit" && rotationScale ? 1 / rotationScale : 1;
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

  const fillColorForBlend = fabricAvgColor || baseColor;
  const hexClampOpacity = getHighlightClampOpacity(fabricAvgColor, baseColor, baseBlendMode);
  // "color" blend mode keeps the BACKDROP's luminosity, so a hex-based estimate alone
  // under-triggers on stripe fabrics (white yarn lightens the averaged fill colour).
  // fabricTone is the authoritative signal from the configurator, so it always wins.
  const toneClampOpacity =
    baseBlendMode === "color" ? (fabricTone === "dark" ? 0.34 : fabricTone === "medium" ? 0.16 : 0) : 0;
  const highlightClampOpacity = Math.max(hexClampOpacity, toneClampOpacity);

  const renderBaseFill = () => {
    if (mask) {
      const maskImage = buildMask(mask);
      return (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: fillColorForBlend,
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
          {highlightClampOpacity > 0.01 && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: fillColorForBlend,
                mixBlendMode: "multiply",
                opacity: highlightClampOpacity,
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
          )}
        </>
      );
    }

    return layers.map((layer) => {
      const sprite = resolve(layer);
      if (!sprite) return null;
      const maskImage = buildMask(undefined, sprite);
      return (
        <React.Fragment key={`fabric-base-${layer.id}`}>
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: fillColorForBlend,
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
          {highlightClampOpacity > 0.01 && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: fillColorForBlend,
                mixBlendMode: "multiply",
                opacity: highlightClampOpacity,
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
          )}
        </React.Fragment>
      );
    });
  };

  const renderTexture = () => {
    if (!fabricTexture) return null;

    const mixBlendMode =
      (textureStyle.mixBlendMode as React.CSSProperties["mixBlendMode"]) ?? "soft-light";
    const opacityRaw = Number(textureStyle.opacity ?? 0.26);
    const opacity = Math.min(Math.max(opacityRaw, 0), 0.88);
    const filter = textureStyle.filter ?? "brightness(1.00) contrast(1.08) saturate(1.02)";

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
      if (useTransformLayer) {
        const rotatedStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundSize: rotatedBgSize,
          backgroundPosition: rotatedBgPos,
        };
        const transform =
          rotationRenderScale !== 1
            ? `rotate(${textureRotationDeg}deg) scale(${rotationRenderScale})`
            : `rotate(${textureRotationDeg}deg)`;
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              overflow: "hidden",
              contain: "paint",
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
      if (useTransformLayer) {
        const rotatedStyle: React.CSSProperties = {
          ...baseStyle,
          backgroundSize: rotatedBgSize,
          backgroundPosition: rotatedBgPos,
        };
        const transform =
          rotationRenderScale !== 1
            ? `rotate(${textureRotationDeg}deg) scale(${rotationRenderScale})`
            : `rotate(${textureRotationDeg}deg)`;
        return (
          <div
            key={`fabric-weave-${layer.id}`}
            className="absolute inset-0 pointer-events-none"
            style={{
              overflow: "hidden",
              contain: "paint",
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
