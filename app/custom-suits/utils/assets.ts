import { getPhotoCdnBase, getTransparentCdnBase } from "./backend";

export type SpritePair = { webp: string; png: string };
type LayerFolder = "shading" | "specular" | "edges";
export type PhotoVariant = "blue" | "black" | "light";
export type FabricRenderMode = "photoVariant" | "fabricSpecific";
export type RenderGarment = "jacket" | "pants";

let cachedBase: string | null = null;
const transparentBase = () => {
  if (!cachedBase) cachedBase = getTransparentCdnBase();
  return cachedBase;
};

const transparentVersion =
  (process.env.NEXT_PUBLIC_TRANSPARENT_VERSION &&
    process.env.NEXT_PUBLIC_TRANSPARENT_VERSION.trim()) ||
  "ultra-3";

const appendVersion = (url: string) => {
  if (!transparentVersion) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${encodeURIComponent(transparentVersion)}`;
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
};

const PHOTO_FALLBACK_SOURCES: Partial<Record<PhotoVariant, Record<string, string>>> = {
  blue: {
    "length_long+cut_slim-cleaned": "length_long+cut_slim",
  },
  black: {
    "interior+sleeves": "sleeves",
    "length_long+cut_slim-cleaned": "length_long+cut_slim",
  },
  light: {
    "length_long+cut_slim-cleaned": "length_long+cut_slim",
  },
};

const photoBaseName = (src: string, variant: PhotoVariant = "blue") => {
  const requestedBaseName = spriteFileBase(src);
  return PHOTO_FALLBACK_SOURCES[variant]?.[requestedBaseName] ?? requestedBaseName;
};

type ManifestData = { files: Set<string> };

let manifestPromise: Promise<ManifestData | null> | null = null;
const buildManifestData = (payload: any): ManifestData => {
  const keys = Object.keys(payload?.files || {});
  return {
    files: new Set(keys),
  };
};

const loadManifest = async () => {
  if (typeof window === "undefined") return null;
  try {
    const url = `${transparentBase()}asset-manifest.json`;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const json = await res.json();
    return buildManifestData(json);
  } catch {
    return null;
  }
};

const getManifest = async () => {
  if (!manifestPromise) manifestPromise = loadManifest();
  return manifestPromise;
};

const remapBaseName = (name: string, folder?: LayerFolder) => {
  if (!folder) return name;
  const fallback = FALLBACK_SOURCES[name]?.[folder];
  if (fallback === null) return null;
  return fallback ?? name;
};

const buildPair = (src: string, folder?: LayerFolder) => {
  const baseName = remapBaseName(spriteFileBase(src), folder);
  if (!baseName) return null;
  const prefix = folder ? `${transparentBase()}${folder}/` : transparentBase();
  return {
    webp: appendVersion(`${prefix}${baseName}.webp`),
    png: appendVersion(`${prefix}${baseName}.png`),
  } as SpritePair;
};

export const cdnPair = (src: string) => buildPair(src) as SpritePair;
export const shadingPair = (src: string): SpritePair | null => buildPair(src, "shading");
export const specularPair = (src: string): SpritePair | null => buildPair(src, "specular");
export const edgesPair = (src: string): SpritePair | null => buildPair(src, "edges");

export const photoPair = (
  src: string,
  variant: PhotoVariant = "blue"
) => {
  const baseName = photoBaseName(src, variant);
  const prefix = getPhotoCdnBase(variant);
  return {
    webp: appendVersion(`${prefix}${baseName}.webp`),
    png: appendVersion(`${prefix}${baseName}.png`),
  } as SpritePair;
};

type PairTokens = Record<string, string>;

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const applyTemplateTokens = (template: string, tokens: PairTokens) => {
  let output = template;
  for (const [key, raw] of Object.entries(tokens)) {
    const safe = raw ?? "";
    output = output
      .replace(new RegExp(`\\{${key}\\}`, "g"), safe)
      .replace(new RegExp(`#${key}#`, "g"), safe);
  }
  return output;
};

const normalizePairPath = (value: string) => value.trim();

const buildPairFromResolved = (resolvedPath: string, baseName: string): SpritePair => {
  const clean = normalizePairPath(resolvedPath);
  if (/\.(png|webp|jpe?g)$/i.test(clean)) {
    const webp = appendVersion(clean.replace(/\.(png|webp|jpe?g)$/i, ".webp"));
    const png = appendVersion(clean.replace(/\.(png|webp|jpe?g)$/i, ".png"));
    return { webp, png };
  }
  const prefix = ensureTrailingSlash(clean);
  return {
    webp: appendVersion(`${prefix}${baseName}.webp`),
    png: appendVersion(`${prefix}${baseName}.png`),
  };
};

const normalizeMode = (value?: string | null): FabricRenderMode | null => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "fabricspecific" || normalized === "fabric_specific" || normalized === "fabric-specific") {
    return "fabricSpecific";
  }
  if (normalized === "photovariant" || normalized === "photo_variant" || normalized === "photo-variant") {
    return "photoVariant";
  }
  return null;
};

export const fabricSpecificPair = ({
  src,
  renderBasePath,
  garment,
  fabricId,
  variant,
}: {
  src: string;
  renderBasePath?: string | null;
  garment?: RenderGarment;
  fabricId?: string | number | null;
  variant?: PhotoVariant;
}): SpritePair | null => {
  const template = renderBasePath?.trim();
  if (!template) return null;
  const baseName = photoBaseName(src, variant);
  const tokens: PairTokens = {
    basename: baseName,
    layer: baseName,
    file: baseName,
    fabricId: fabricId == null ? "" : String(fabricId),
    garment: garment ?? "",
    variant: variant ?? "blue",
  };
  const resolved = applyTemplateTokens(template, tokens).trim();
  if (!resolved || /[{#].*[}#]/.test(resolved)) return null;
  return buildPairFromResolved(resolved, baseName);
};

export const resolveFabricRenderPair = ({
  src,
  variant,
  renderMode,
  renderBasePath,
  garment,
  fabricId,
}: {
  src: string;
  variant: PhotoVariant;
  renderMode?: string | null;
  renderBasePath?: string | null;
  garment?: RenderGarment;
  fabricId?: string | number | null;
}): { mode: FabricRenderMode; pair: SpritePair } => {
  const requestedMode = normalizeMode(renderMode);
  if (requestedMode === "fabricSpecific") {
    const pair = fabricSpecificPair({ src, renderBasePath, garment, fabricId, variant });
    if (pair) {
      return { mode: "fabricSpecific", pair };
    }
  }
  return { mode: "photoVariant", pair: photoPair(src, variant) };
};


export const toTransparentSilhouette = (src: string) => {
  const pair = cdnPair(src);
  return `url(${pair.webp}), url(${pair.png})`;
};

const relativeFromBase = (url: string) => {
  const base = transparentBase();
  if (url.startsWith(base)) return url.slice(base.length);
  if (typeof window !== "undefined" && base.startsWith("http")) {
    return url.startsWith(base) ? url.slice(base.length) : null;
  }
  if (typeof window !== "undefined" && base.startsWith("/")) {
    const absolute = `${window.location.origin}${base}`;
    if (url.startsWith(absolute)) return url.slice(absolute.length);
  }
  return null;
};

const manifestHit = async (url: string) => {
  if (typeof window === "undefined") return null;
  const manifest = await getManifest();
  if (!manifest) return null;
  const relative = relativeFromBase(url);
  if (!relative) return null;
  const trimmed = relative.split("?")[0];
  return manifest.files.has(trimmed) ? true : null;
};

const availabilityCache = new Map<string, boolean>();

export const ensureAssetAvailable = async (url: string) => {
  if (typeof window === "undefined") return true;
  if (availabilityCache.has(url)) return availabilityCache.get(url)!;

  const manifestResult = await manifestHit(url);
  if (manifestResult !== null) {
    availabilityCache.set(url, manifestResult);
    return manifestResult;
  }

  try {
    const response = await fetch(url, { method: "HEAD", cache: "force-cache" });
    const ok = response.ok;
    availabilityCache.set(url, ok);
    return ok;
  } catch {
    availabilityCache.set(url, false);
    return false;
  }
};
