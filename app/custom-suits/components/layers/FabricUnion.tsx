"use client";

import React from "react";
import { Tone, getToneConfig } from "../../utils/visual";

type Props = {
  fabricUrl: string;
  maskUrl?: string | null;
  tone?: Tone;
  canvasSize: { w: number; h: number };
  scale: number;
  offset: { x: number; y: number };
  filter: string; // from toneBlend
};

export const FabricUnion: React.FC<Props> = ({ fabricUrl, maskUrl, tone, canvasSize, scale, offset, filter }) => {
  const cfg = getToneConfig(tone);
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${fabricUrl})`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${Math.round(canvasSize.w * scale)}px ${Math.round(canvasSize.h * scale)}px`,
        backgroundPosition: `${Math.round(offset.x)}px ${Math.round(offset.y)}px`,
        mixBlendMode: cfg.weaveBlend as any,
        opacity: cfg.weaveOpacity,
        filter,
        WebkitMaskImage: maskUrl ? `url(${maskUrl})` : undefined,
        WebkitMaskRepeat: maskUrl ? 'no-repeat' : undefined,
        WebkitMaskSize: maskUrl ? 'contain' : undefined,
        WebkitMaskPosition: maskUrl ? 'center' : undefined,
        maskImage: maskUrl ? `url(${maskUrl})` : undefined,
        maskRepeat: maskUrl ? 'no-repeat' : undefined,
        maskSize: maskUrl ? 'contain' : undefined,
        maskPosition: maskUrl ? 'center' : undefined,
        pointerEvents: 'none',
      }}
    />
  );
};

export default FabricUnion;

