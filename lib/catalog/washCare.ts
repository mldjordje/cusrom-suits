export type WashCareGroup = "washing" | "bleaching" | "drying" | "ironing" | "professional";
export type WashCareLanguage = "sr" | "en";

type LocalizedText = { name: string; description: string };

export type WashCareRenderSpec =
  | { kind: "wash"; temperature?: number; bars?: 1 | 2; hand?: true; crossed?: true }
  | { kind: "bleach"; mode: "any" | "oxygen" | "none" }
  | { kind: "tumble"; dots?: 1 | 2; crossed?: true }
  | { kind: "natural"; method: "line" | "dripLine" | "flat" | "dripFlat"; shade?: true }
  | { kind: "iron"; dots?: 1 | 2 | 3; noSteam?: true; crossed?: true }
  | { kind: "professional"; letter?: "P" | "F" | "W"; bars?: 1 | 2; crossed?: true };

const makeSymbol = <K extends string>(
  key: K,
  group: WashCareGroup,
  srName: string,
  enName: string,
  render: WashCareRenderSpec,
  srDescription = srName,
  enDescription = enName,
) => ({
  key,
  group,
  sr: { name: srName, description: srDescription } satisfies LocalizedText,
  en: { name: enName, description: enDescription } satisfies LocalizedText,
  render,
});

export const WASH_CARE_GROUPS: Record<WashCareGroup, Record<WashCareLanguage, string>> = {
  washing: { sr: "Pranje", en: "Washing" },
  bleaching: { sr: "Izbeljivanje", en: "Bleaching" },
  drying: { sr: "Sušenje", en: "Drying" },
  ironing: { sr: "Peglanje", en: "Ironing" },
  professional: { sr: "Profesionalno čišćenje", en: "Professional care" },
};

export const WASH_CARE_SYMBOLS = [
  makeSymbol("wash30", "washing", "Pranje na 30°C", "Wash at 30°C", { kind: "wash", temperature: 30 }),
  makeSymbol("wash30Mild", "washing", "Blago pranje na 30°C", "Mild wash at 30°C", { kind: "wash", temperature: 30, bars: 1 }),
  makeSymbol("wash30VeryMild", "washing", "Vrlo blago pranje na 30°C", "Very mild wash at 30°C", { kind: "wash", temperature: 30, bars: 2 }),
  makeSymbol("wash40", "washing", "Pranje na 40°C", "Wash at 40°C", { kind: "wash", temperature: 40 }),
  makeSymbol("wash40Mild", "washing", "Blago pranje na 40°C", "Mild wash at 40°C", { kind: "wash", temperature: 40, bars: 1 }),
  makeSymbol("wash40VeryMild", "washing", "Vrlo blago pranje na 40°C", "Very mild wash at 40°C", { kind: "wash", temperature: 40, bars: 2 }),
  makeSymbol("wash60", "washing", "Pranje na 60°C", "Wash at 60°C", { kind: "wash", temperature: 60 }),
  makeSymbol("wash60Mild", "washing", "Blago pranje na 60°C", "Mild wash at 60°C", { kind: "wash", temperature: 60, bars: 1 }),
  makeSymbol("wash95", "washing", "Pranje na 95°C", "Wash at 95°C", { kind: "wash", temperature: 95 }),
  makeSymbol("handWash", "washing", "Ručno pranje", "Hand wash", { kind: "wash", hand: true }),
  makeSymbol("doNotWash", "washing", "Ne prati", "Do not wash", { kind: "wash", crossed: true }),

  makeSymbol("bleachAny", "bleaching", "Dozvoljeno izbeljivanje", "Bleaching allowed", { kind: "bleach", mode: "any" }),
  makeSymbol("bleachOxygen", "bleaching", "Samo izbeljivač bez hlora", "Only oxygen bleach", { kind: "bleach", mode: "oxygen" }),
  makeSymbol("doNotBleach", "bleaching", "Ne izbeljivati", "Do not bleach", { kind: "bleach", mode: "none" }),

  makeSymbol("tumbleDryLow", "drying", "Sušilica na niskoj temperaturi", "Tumble dry low", { kind: "tumble", dots: 1 }),
  makeSymbol("tumbleDryNormal", "drying", "Sušilica na normalnoj temperaturi", "Tumble dry normal", { kind: "tumble", dots: 2 }),
  makeSymbol("doNotTumbleDry", "drying", "Ne sušiti u sušilici", "Do not tumble dry", { kind: "tumble", crossed: true }),
  makeSymbol("lineDry", "drying", "Sušiti na konopcu", "Line dry", { kind: "natural", method: "line" }),
  makeSymbol("dripLineDry", "drying", "Ocediti i sušiti na konopcu", "Drip line dry", { kind: "natural", method: "dripLine" }),
  makeSymbol("flatDry", "drying", "Sušiti položeno", "Dry flat", { kind: "natural", method: "flat" }),
  makeSymbol("dripFlatDry", "drying", "Ocediti i sušiti položeno", "Drip dry flat", { kind: "natural", method: "dripFlat" }),
  makeSymbol("lineDryShade", "drying", "Sušiti na konopcu u hladu", "Line dry in shade", { kind: "natural", method: "line", shade: true }),
  makeSymbol("dripLineDryShade", "drying", "Ocediti i sušiti na konopcu u hladu", "Drip line dry in shade", { kind: "natural", method: "dripLine", shade: true }),
  makeSymbol("flatDryShade", "drying", "Sušiti položeno u hladu", "Dry flat in shade", { kind: "natural", method: "flat", shade: true }),
  makeSymbol("dripFlatDryShade", "drying", "Ocediti i sušiti položeno u hladu", "Drip dry flat in shade", { kind: "natural", method: "dripFlat", shade: true }),

  makeSymbol("ironLow", "ironing", "Peglanje do 120°C", "Iron up to 120°C", { kind: "iron", dots: 1 }),
  makeSymbol("ironMedium", "ironing", "Peglanje do 160°C", "Iron up to 160°C", { kind: "iron", dots: 2 }),
  makeSymbol("ironHigh", "ironing", "Peglanje do 210°C", "Iron up to 210°C", { kind: "iron", dots: 3 }),
  makeSymbol("ironNoSteam", "ironing", "Peglanje bez pare", "Do not steam", { kind: "iron", noSteam: true }),
  makeSymbol("doNotIron", "ironing", "Ne peglati", "Do not iron", { kind: "iron", crossed: true }),

  makeSymbol("dryCleanP", "professional", "Hemijsko čišćenje P", "Professional dry clean P", { kind: "professional", letter: "P" }),
  makeSymbol("dryCleanPMild", "professional", "Blago hemijsko čišćenje P", "Mild professional dry clean P", { kind: "professional", letter: "P", bars: 1 }),
  makeSymbol("dryCleanF", "professional", "Hemijsko čišćenje F", "Professional dry clean F", { kind: "professional", letter: "F" }),
  makeSymbol("dryCleanFMild", "professional", "Blago hemijsko čišćenje F", "Mild professional dry clean F", { kind: "professional", letter: "F", bars: 1 }),
  makeSymbol("doNotDryClean", "professional", "Ne čistiti hemijski", "Do not dry clean", { kind: "professional", crossed: true }),
  makeSymbol("wetClean", "professional", "Profesionalno mokro čišćenje", "Professional wet clean", { kind: "professional", letter: "W" }),
  makeSymbol("wetCleanMild", "professional", "Blago mokro čišćenje", "Mild professional wet clean", { kind: "professional", letter: "W", bars: 1 }),
  makeSymbol("wetCleanVeryMild", "professional", "Vrlo blago mokro čišćenje", "Very mild professional wet clean", { kind: "professional", letter: "W", bars: 2 }),
  makeSymbol("doNotWetClean", "professional", "Ne čistiti mokrim postupkom", "Do not wet clean", { kind: "professional", letter: "W", crossed: true }),
] as const;

export type WashCareSymbolKey = (typeof WASH_CARE_SYMBOLS)[number]["key"];

const symbolByKey = new Map<WashCareSymbolKey, (typeof WASH_CARE_SYMBOLS)[number]>(
  WASH_CARE_SYMBOLS.map((symbol) => [symbol.key, symbol]),
);

export const isWashCareSymbolKey = (value: unknown): value is WashCareSymbolKey =>
  typeof value === "string" && symbolByKey.has(value as WashCareSymbolKey);

export const parseWashCareSymbolKeys = (value: unknown): WashCareSymbolKey[] => {
  if (!Array.isArray(value)) return [];
  const selected = new Set(value.filter(isWashCareSymbolKey));
  return WASH_CARE_SYMBOLS.map((symbol) => symbol.key).filter((key) => selected.has(key));
};

export const validateWashCareSymbolKeys = (value: unknown): WashCareSymbolKey[] | null => {
  if (!Array.isArray(value) || value.some((item) => !isWashCareSymbolKey(item))) return null;
  return parseWashCareSymbolKeys(value);
};

export type LocalizedWashCareItem = {
  icon: WashCareSymbolKey;
  title: string;
  description: string;
};

export const getLocalizedWashCareItems = (
  value: unknown,
  language: WashCareLanguage,
): LocalizedWashCareItem[] =>
  parseWashCareSymbolKeys(value).map((key) => {
    const symbol = symbolByKey.get(key)!;
    return { icon: key, title: symbol[language].name, description: symbol[language].description };
  });

export const getWashCareSymbol = (key: WashCareSymbolKey) => symbolByKey.get(key)!;
