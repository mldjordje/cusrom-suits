"use client";

import React from "react";

type Props = {
  jacketUnionMask?: string | null;
  noiseData: string;
  vignetteStrength?: number; // 0..1 center darkness
  noiseOpacity?: number;     // 0..1
};

export const GlobalOverlays: React.FC<Props> = ({ jacketUnionMask, noiseData, vignetteStrength = 0.09, noiseOpacity = 0.05 }) => (
  <>
    {/* AO/Vignette */}
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(closest-side, rgba(0,0,0,${vignetteStrength}), rgba(0,0,0,0) 70%)`,
        mixBlendMode: 'multiply' as any,
        WebkitMaskImage: jacketUnionMask ? `url(${jacketUnionMask})` : undefined,
        WebkitMaskRepeat: jacketUnionMask ? 'no-repeat' : undefined,
        WebkitMaskSize: jacketUnionMask ? 'contain' : undefined,
        WebkitMaskPosition: jacketUnionMask ? 'center' : undefined,
        maskImage: jacketUnionMask ? `url(${jacketUnionMask})` : undefined,
        maskRepeat: jacketUnionMask ? 'no-repeat' : undefined,
        maskSize: jacketUnionMask ? 'contain' : undefined,
        maskPosition: jacketUnionMask ? 'center' : undefined,
        pointerEvents: 'none',
      }}
    />
    {/* Micro-noise */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${noiseData})`,
        backgroundRepeat: 'repeat',
        mixBlendMode: 'overlay' as any,
        opacity: noiseOpacity,
        WebkitMaskImage: jacketUnionMask ? `url(${jacketUnionMask})` : undefined,
        WebkitMaskRepeat: jacketUnionMask ? 'no-repeat' : undefined,
        WebkitMaskSize: jacketUnionMask ? 'contain' : undefined,
        WebkitMaskPosition: jacketUnionMask ? 'center' : undefined,
        maskImage: jacketUnionMask ? `url(${jacketUnionMask})` : undefined,
        maskRepeat: jacketUnionMask ? 'no-repeat' : undefined,
        maskSize: jacketUnionMask ? 'contain' : undefined,
        maskPosition: jacketUnionMask ? 'center' : undefined,
        pointerEvents: 'none',
      }}
    />
  </>
);

export default GlobalOverlays;

