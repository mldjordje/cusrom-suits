"use client";

import React, { useEffect, useState } from "react";
import { SuitLayer } from "../../data/options";
import { Tone, getToneConfig } from "../../utils/visual";

type Pair = { webp: string; png: string };

const cache = new Map<string, string | null>();

async function chooseAvailable(pair: Pair): Promise<string | null> {
  const key = `${pair.webp}|${pair.png}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const tryLoad = (url: string) =>
    new Promise<boolean>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  if (await tryLoad(pair.webp)) { cache.set(key, pair.webp); return pair.webp; }
  if (await tryLoad(pair.png)) { cache.set(key, pair.png); return pair.png; }
  cache.set(key, null);
  return null;
}

type Props = {
  layers: SuitLayer[];
  tone?: Tone;
  level?: import("../../utils/visual").Level;
  shadingPair: (src: string) => Pair;
  specularPair: (src: string) => Pair;
  imageSet?: (webp: string, png: string) => string; // not used with graceful fallback
};

export const PerPartOverlays: React.FC<Props> = ({ layers, tone, level, shadingPair, specularPair }) => {
  const cfg = getToneConfig(tone, level);
  const [urls, setUrls] = useState<Record<string, { shading: string | null; specular: string | null }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, { shading: string | null; specular: string | null }> = {};
      for (const l of layers) {
        const sh = await chooseAvailable(shadingPair(l.src));
        const sp = await chooseAvailable(specularPair(l.src));
        next[l.id] = { shading: sh, specular: sp };
      }
      if (!cancelled) setUrls(next);
    })();
    return () => { cancelled = true; };
  }, [layers.map(l => l.src).join('|')]);

  return (
    <>
      {layers.map((l) => (
        <React.Fragment key={`pp-${l.id}`}>
          {urls[l.id]?.shading && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${urls[l.id]!.shading})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                mixBlendMode: 'multiply' as any,
                opacity: cfg.shadingOpacity,
                pointerEvents: 'none',
              }}
            />
          )}
          {urls[l.id]?.specular && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${urls[l.id]!.specular})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                mixBlendMode: cfg.specularBlend as any,
                opacity: cfg.specularOpacity,
                pointerEvents: 'none',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export default PerPartOverlays;
