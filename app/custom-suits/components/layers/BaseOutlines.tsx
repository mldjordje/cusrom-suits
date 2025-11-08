"use client";

import React from "react";
import { SuitLayer } from "../../data/options";

type Props = {
  layers: SuitLayer[];
  cdnPair: (src: string) => { webp: string; png: string };
  imageSet: (webp: string, png: string) => string;
};

export const BaseOutlines: React.FC<Props> = ({ layers, cdnPair, imageSet }) => (
  <>
    {layers.map((l) => (
      <div
        key={`base-${l.id}`}
        className="absolute inset-0"
        style={{
          backgroundImage: imageSet(cdnPair(l.src).webp, cdnPair(l.src).png),
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply' as any,
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
    ))}
  </>
);

export default BaseOutlines;

