"use client";

import React from "react";
import { SuitLayer } from "../../data/options";

type Props = {
  kind: "shading" | "specular";
  layers: SuitLayer[];
  tone?: "light" | "medium" | "dark";
  shadingPair: (src: string) => { webp: string; png: string };
  specularPair: (src: string) => { webp: string; png: string };
  imageSet: (webp: string, png: string) => string;
};

export const PerPartOverlay: React.FC<Props> = ({ kind, layers, tone, shadingPair, specularPair, imageSet }) => {
  const isShading = kind === "shading";
  const blend = isShading
    ? ("multiply" as const)
    : (tone === "dark" ? "soft-light" : tone === "light" ? "screen" : "overlay") as const;
  const opacity = isShading
    ? (tone === "dark" ? 0.28 : tone === "light" ? 0.40 : 0.35)
    : (tone === "dark" ? 0.08 : tone === "light" ? 0.12 : 0.10);

  return (
    <>
      {layers.map((l) => {
        const pair = isShading ? shadingPair(l.src) : specularPair(l.src);
        return (
          <div
            key={`${kind}-${l.id}`}
            className="absolute inset-0"
            style={{
              backgroundImage: imageSet(pair.webp, pair.png),
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              backgroundPosition: "center",
              mixBlendMode: blend as any,
              opacity,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

export default PerPartOverlay;

