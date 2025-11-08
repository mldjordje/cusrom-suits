import { getTransparentCdnBase } from "./backend";

export type SpritePair = { webp: string; png: string };

let cachedBase: string | null = null;
const transparentBase = () => {
  if (!cachedBase) cachedBase = getTransparentCdnBase();
  return cachedBase;
};

export const spriteFileBase = (src: string) => {
  const i = src.lastIndexOf("/");
  const clean = i >= 0 ? src.slice(i + 1) : src;
  return clean.replace(/\.(png|jpg|jpeg|webp)$/i, "");
};

const buildPair = (src: string, folder?: "shading" | "specular" | "edges") => {
  const base = spriteFileBase(src);
  const prefix = folder ? `${transparentBase()}${folder}/` : transparentBase();
  return {
    webp: `${prefix}${base}.webp`,
    png: `${prefix}${base}.png`,
  } as SpritePair;
};

export const cdnPair = (src: string) => buildPair(src);
export const shadingPair = (src: string) => buildPair(src, "shading");
export const specularPair = (src: string) => buildPair(src, "specular");
export const edgesPair = (src: string) => buildPair(src, "edges");

export const toTransparentSilhouette = (src: string) => {
  const pair = cdnPair(src);
  return `url(${pair.webp}), url(${pair.png})`;
};

const availabilityCache = new Map<string, boolean>();

export const ensureAssetAvailable = async (url: string) => {
  if (typeof window === "undefined") return true;
  if (availabilityCache.has(url)) return availabilityCache.get(url)!;
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    const ok = response.ok;
    availabilityCache.set(url, ok);
    return ok;
  } catch {
    availabilityCache.set(url, false);
    return false;
  }
};
