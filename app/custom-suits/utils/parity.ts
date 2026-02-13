export const PARITY_MODE_HOCKERTY_WITHOUT_MODEL = "hockerty_without_model" as const;

type UnknownRecord = Record<string, unknown>;

export type ParityPreset = {
  key: "brown" | "blue";
  textureStrength: number;
  textureContrast: number;
  textureBrightness: number;
  textureSaturateMul?: number;
  stripeSpacingJacket: number;
  stripeSpacingPants: number;
  pantsTextureRotation: number;
  jacketLightingMul: number;
  pantsLightingMul: number;
  phaseOffset: {
    leftMain: { x: number; y: number };
    leftUnderlap: { x: number; y: number };
    rightFly: { x: number; y: number };
    rightUnder: { x: number; y: number };
    waist: { x: number; y: number };
  };
};

const BROWN_ALIASES = [
  "brown",
  "braon",
  "mahogany",
  "chocolate",
  "cognac",
  "dark brown",
  "dark-brown",
];

const BLUE_ALIASES = [
  "blue",
  "plava",
  "navy",
  "teget",
  "cobalt",
  "indigo",
  "dark blue",
  "dark-blue",
];

const PARITY_PRESETS: Record<ParityPreset["key"], ParityPreset> = {
  brown: {
    key: "brown",
    textureStrength: 0.2,
    textureContrast: 1.68,
    textureBrightness: 1.05,
    textureSaturateMul: 0.97,
    stripeSpacingJacket: 6.6,
    stripeSpacingPants: 6.9,
    pantsTextureRotation: -2,
    jacketLightingMul: 1.06,
    pantsLightingMul: 0.9,
    phaseOffset: {
      leftMain: { x: -1, y: 0 },
      leftUnderlap: { x: -1, y: 0 },
      rightFly: { x: 1, y: 0 },
      rightUnder: { x: 1, y: 0 },
      waist: { x: 0, y: 0 },
    },
  },
  blue: {
    key: "blue",
    textureStrength: 0.18,
    textureContrast: 1.58,
    textureBrightness: 1.03,
    textureSaturateMul: 0.92,
    stripeSpacingJacket: 6.1,
    stripeSpacingPants: 6.2,
    pantsTextureRotation: -1,
    jacketLightingMul: 1.04,
    pantsLightingMul: 0.9,
    phaseOffset: {
      leftMain: { x: -1, y: 0 },
      leftUnderlap: { x: -1, y: 0 },
      rightFly: { x: 1, y: 0 },
      rightUnder: { x: 1, y: 0 },
      waist: { x: 0, y: 0 },
    },
  },
};

const toLower = (value: unknown) => String(value ?? "").trim().toLowerCase();

const containsAny = (haystack: string, needles: string[]) => needles.some((needle) => haystack.includes(needle));

const fabricSearchText = (fabric: unknown) => {
  if (!fabric || typeof fabric !== "object") return "";
  const data = fabric as UnknownRecord;
  return [
    data.id,
    data.code,
    data.name,
    data.texture,
    data.pattern,
    data.uzorak,
    data.weave,
    data.weaveName,
    data.weave_name,
  ]
    .map(toLower)
    .filter(Boolean)
    .join(" ");
};

export const isParityModeEnabled = (mode: string | undefined | null) =>
  toLower(mode) === PARITY_MODE_HOCKERTY_WITHOUT_MODEL;

export const getParityPreset = (fabric: unknown): ParityPreset | null => {
  const haystack = fabricSearchText(fabric);
  if (!haystack) return null;

  if (containsAny(haystack, BROWN_ALIASES)) return PARITY_PRESETS.brown;
  if (containsAny(haystack, BLUE_ALIASES)) return PARITY_PRESETS.blue;

  return null;
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const buildTextureFilterWithParity = ({
  baseFilter,
  brightness,
  contrast,
  saturate,
}: {
  baseFilter: string;
  brightness: number;
  contrast: number;
  saturate: number;
}) =>
  `${baseFilter} brightness(${clampNumber(brightness, 0.8, 2.4).toFixed(2)}) contrast(${clampNumber(
    contrast,
    0.9,
    2.4
  ).toFixed(2)}) saturate(${clampNumber(saturate, 0.8, 1.3).toFixed(2)})`;

export const getParityPresetKeys = () => Object.keys(PARITY_PRESETS) as ParityPreset["key"][];
