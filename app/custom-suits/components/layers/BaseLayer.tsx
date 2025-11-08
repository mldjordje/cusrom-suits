"use client";

import React from "react";

type Props = {
  maskUrl?: string | null;
  color: string;
};

export const BaseLayer: React.FC<Props> = ({ maskUrl, color }) => (
  <div
    className="absolute inset-0"
    style={{
      backgroundColor: color,
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

export default BaseLayer;

