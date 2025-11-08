import { getTransparentCdnBase } from "./backend";

export type SpritePair = { webp: string; png: string };
type LayerFolder = "shading" | "specular" | "edges";

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

const FALLBACK_SOURCES: Record<string, Partial<Record<LayerFolder, string | null>>> = {
  sleeves: {
    shading: "interior+sleeves",
    specular: "interior+sleeves",
    edges: "interior+sleeves",
  },
  "length_long+cut_slim": {
    shading: null,
    specular: null,
    edges: null,
  },
};

const remapBaseName = (name: string, folder?: LayerFolder) => {
  if (!folder) return name;
  const fallback = FALLBACK_SOURCES[name]?.[folder];
  if (fallback === null) return null;
  return fallback ?? name;
};

const buildPair = (src: string, folder?: LayerFolder) => {
  const baseName = remapBaseName(spriteFileBase(src), folder);
  if (baseName === null) return null;
  const prefix = folder ? `${transparentBase()}${folder}/` : transparentBase();
  return {
    webp: `${prefix}${baseName}.webp`,
    png: `${prefix}${baseName}.png`,
  } as SpritePair;
};

export const cdnPair = (src: string) => buildPair(src) as SpritePair;
export const shadingPair = (src: string): SpritePair | null => buildPair(src, "shading");
export const specularPair = (src: string): SpritePair | null => buildPair(src, "specular");
export const edgesPair = (src: string): SpritePair | null => buildPair(src, "edges");

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

const relativeFromBase = (url: string) => {
  const base = transparentBase();
  if (url.startsWith(base)) return url.slice(base.length);
  if (typeof window !== "undefined" && base.startsWith("/")) {
    const absolute = `${window.location.origin}${base}`;
    if (url.startsWith(absolute)) return url.slice(absolute.length);
  }
  if (typeof window !== "undefined" && base.startsWith("http")) {
    return url.startsWith(base) ? url.slice(base.length) : null;
  }
  return null;
};

const manifestHit = async (url: string) => {
  if (typeof window === "undefined") return null;
  const manifest = await getManifest();
  if (!manifest) return null;
  const relative = relativeFromBase(url);
  if (!relative) return null;
  const segments = relative.split("/").filter(Boolean);
  const file = segments.pop();
  if (!file) return null;
  const parentFolder = segments.pop();
  const group: keyof ManifestSets =
    parentFolder === "shading"
      ? "shading"
      : parentFolder === "specular"
      ? "specular"
      : parentFolder === "edges"
      ? "edges"
      : "base";
  const bucket = manifest[group];
  if (!bucket || bucket.size === 0) return group === "base" ? null : false;
  if (bucket.has(file)) return true;
  if (file.toLowerCase().endsWith(".webp")) {
    const pngName = file.replace(/\.webp$/i, ".png");
    if (bucket.has(pngName)) return true;
  }
  return false;
};

export const ensureAssetAvailable = async (url: string) => {
  if (typeof window === "undefined") return true;
  if (availabilityCache.has(url)) return availabilityCache.get(url)!;

  const manifestResult = await manifestHit(url);
  if (manifestResult !== null) {
    availabilityCache.set(url, manifestResult);
    return manifestResult;
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
