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

type ManifestSets = {
  base: Set<string>;
  shading: Set<string>;
  specular: Set<string>;
  edges: Set<string>;
};

let manifestPromise: Promise<ManifestSets | null> | null = null;

const buildManifestSets = (payload: any): ManifestSets => {
  const files = payload?.files || {};
  const toSet = (key: string) => new Set<string>(Array.isArray(files[key]) ? files[key] : []);
  return {
    base: toSet("base"),
    shading: toSet("shading"),
    specular: toSet("specular"),
    edges: toSet("edges"),
  };
};

const loadManifest = async () => {
  if (typeof window === "undefined") return null;
  try {
    const url = `${transparentBase()}asset-manifest.json`;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const json = await res.json();
    return buildManifestSets(json);
  } catch {
    return null;
  }
};

const getManifest = async () => {
  if (!manifestPromise) manifestPromise = loadManifest();
  return manifestPromise;
};

const manifestHit = async (url: string) => {
  if (typeof window === "undefined") return null;
  const localUrl = url.startsWith("/") || url.startsWith(window.location.origin);
  if (!localUrl) return null;
  const manifest = await getManifest();
  if (!manifest) return null;
  const parts = url.split("/");
  const rawFile = parts[parts.length - 1] || "";
  const file = rawFile.split("?")[0];
  if (!file) return null;
  const group = url.includes("/shading/")
    ? "shading"
    : url.includes("/specular/")
    ? "specular"
    : url.includes("/edges/")
    ? "edges"
    : "base";
  const bucket = (manifest as any)[group] as Set<string> | undefined;
  if (!bucket) return group === "base" ? null : true;
  if (bucket.has(file)) return true;
  if (file.toLowerCase().endsWith(".webp")) {
    const pngName = file.replace(/\.webp$/i, ".png");
    if (bucket.has(pngName)) return true;
  }
  return group === "base" ? null : true;
};

export const ensureAssetAvailable = async (url: string) => {
  if (typeof window === "undefined") return true;
  if (availabilityCache.has(url)) return availabilityCache.get(url)!;

  const manifestResult = await manifestHit(url);
  if (manifestResult) {
    availabilityCache.set(url, true);
    return true;
  }

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
