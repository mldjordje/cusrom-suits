import { SuitLayer } from "../../data/options";

export type SpritePair = { webp: string; png: string };

export type PanZoomState = {
  scale: number;
  offset: { x: number; y: number };
};

export type LayerResolver = (layer: SuitLayer) => SpritePair;

export const spriteBackground = (pair: SpritePair) => `url(${pair.webp}), url(${pair.png})`;
