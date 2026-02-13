"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import AdminNav from "../components/AdminNav";
import SuitPreview from "@/app/custom-suits/components/SuitPreview";
import { useSuitConfigurator } from "@/app/custom-suits/hooks/useSuitConfigurator";
import { suits, fabrics as fallbackFabrics } from "@/app/custom-suits/data/options";
import { useFabrics } from "@/app/custom-suits/hooks/useFabrics";
import { PANTS_STRIPE_MANUAL_TUNING } from "@/app/custom-suits/components/pantsStripeManualTuning";

const vestStyles: Array<{
  id: string;
  name: string;
}> = [
  { id: "single_4", name: "Jednoredni (4 dugmeta)" },
  { id: "single_5", name: "Jednoredni (5 dugmadi)" },
  { id: "double_6", name: "Dvoredni (6 dugmadi)" },
];
const SuitPreviewCompat = SuitPreview as unknown as ComponentType<Record<string, unknown>>;

type PreviewView = "both" | "jacket" | "pants";
type ContrastLevel = "low" | "medium" | "high";
type LayerKey = "fabric" | "style" | "ao" | "vignette";
type StatusType = "idle" | "loading" | "success" | "error";
type Status = { type: StatusType; message?: string };
type SuitPreviewRenderDebug = {
  renderMode: "transparent" | "photoVariant" | "fabricSpecific";
  requestedRenderMode: "photoVariant" | "fabricSpecific";
  photoVariant: "blue" | "black" | "light";
  forcedPhotoVariant: "blue" | "black" | "light" | null;
  renderBasePath: string | null;
  usePhotoBase: boolean;
  isStripeFabric: boolean;
  hasTextureStripes: boolean;
  jacketPhotoLayerCount: number;
  pantsPhotoLayerCount: number;
};

type TuningDraft = {
  textureScale: string;
  textureStrength: string;
  textureContrast: string;
  textureBrightness: string;
  stripeSpacingJacket: string;
  stripeSpacingPants: string;
  pantsTextureRotation: string;
  photoVariant: string;
  renderMode: string;
  renderBasePath: string;
  colorHex: string;
};

type DraftKey = keyof TuningDraft;

type PantsZoneDraft = {
  singleLeftAbsDeg: string;
  singleFlyAbsDeg: string;
  singleRightAbsDeg: string;
  leftMainAbsDeg: string;
  rightUpperAbsDeg: string;
  rightLowerAbsDeg: string;
  waistAbsDeg: string;
  boundaryTopXRatio: string;
  boundaryBottomXRatio: string;
  boundaryMinXRatio: string;
  boundaryMaxXRatio: string;
  waistXRatio: string;
  rightLowerStartYRatio: string;
  rightLowerSlopeRatio: string;
  beltStartXRatio: string;
  beltTopYRatio: string;
  beltBottomYRatio: string;
  boundaryFeatherPx: string;
  leftMainOffsetX: string;
  leftMainOffsetY: string;
  leftUnderlapOffsetX: string;
  leftUnderlapOffsetY: string;
  rightFlyOffsetX: string;
  rightFlyOffsetY: string;
  rightUnderOffsetX: string;
  rightUnderOffsetY: string;
  waistOffsetX: string;
  waistOffsetY: string;
};

type PantsZoneKey = keyof PantsZoneDraft;

type FabricPatch = {
  textureScale?: number;
  textureStrength?: number;
  textureContrast?: number;
  textureBrightness?: number;
  stripeSpacingJacket?: number;
  stripeSpacingPants?: number;
  pantsTextureRotation?: number;
  photoVariant?: "blue" | "black" | "light";
  renderMode?: "photoVariant" | "fabricSpecific";
  renderBasePath?: string;
  colorHex?: string;
};

type LocalPreset = { id: string; name: string; draft: TuningDraft };

type SliderDef = {
  key:
    | "textureScale"
    | "textureStrength"
    | "textureContrast"
    | "textureBrightness"
    | "stripeSpacingJacket"
    | "stripeSpacingPants"
    | "pantsTextureRotation";
  label: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
  fixed: number;
};

type ZoneSliderDef = {
  key: PantsZoneKey;
  label: string;
  min: number;
  max: number;
  step: number;
  fallback: number;
  fixed: number;
};

const PRESET_STORAGE_KEY = "admin:preview-tuning:presets:v2";
const DEFAULT_STYLE = suits[0]?.id || "single_1btn";
const DEFAULT_COLOR = suits[0]?.colorId || "blue";

const DEFAULT_DRAFT: TuningDraft = {
  textureScale: "",
  textureStrength: "",
  textureContrast: "",
  textureBrightness: "",
  stripeSpacingJacket: "",
  stripeSpacingPants: "",
  pantsTextureRotation: "",
  photoVariant: "",
  renderMode: "",
  renderBasePath: "",
  colorHex: "",
};

const DEFAULT_ZONE_DRAFT: PantsZoneDraft = {
  singleLeftAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.singleLeftAbsDeg),
  singleFlyAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.singleFlyAbsDeg),
  singleRightAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.singleRightAbsDeg),
  leftMainAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.leftMainAbsDeg),
  rightUpperAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.rightUpperAbsDeg),
  rightLowerAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.rightLowerAbsDeg),
  waistAbsDeg: String(PANTS_STRIPE_MANUAL_TUNING.directions.waistAbsDeg),
  boundaryTopXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryTopXRatio),
  boundaryBottomXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryBottomXRatio),
  boundaryMinXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryMinXRatio),
  boundaryMaxXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryMaxXRatio),
  waistXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.waistXRatio),
  rightLowerStartYRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.rightLowerStartYRatio),
  rightLowerSlopeRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.rightLowerSlopeRatio),
  beltStartXRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.beltStartXRatio),
  beltTopYRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.beltTopYRatio),
  beltBottomYRatio: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.beltBottomYRatio),
  boundaryFeatherPx: String(PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryFeatherPx),
  leftMainOffsetX: String(PANTS_STRIPE_MANUAL_TUNING.offsets.leftMain.x),
  leftMainOffsetY: String(PANTS_STRIPE_MANUAL_TUNING.offsets.leftMain.y),
  leftUnderlapOffsetX: String(PANTS_STRIPE_MANUAL_TUNING.offsets.leftUnderlap.x),
  leftUnderlapOffsetY: String(PANTS_STRIPE_MANUAL_TUNING.offsets.leftUnderlap.y),
  rightFlyOffsetX: String(PANTS_STRIPE_MANUAL_TUNING.offsets.rightFly.x),
  rightFlyOffsetY: String(PANTS_STRIPE_MANUAL_TUNING.offsets.rightFly.y),
  rightUnderOffsetX: String(PANTS_STRIPE_MANUAL_TUNING.offsets.rightUnder.x),
  rightUnderOffsetY: String(PANTS_STRIPE_MANUAL_TUNING.offsets.rightUnder.y),
  waistOffsetX: String(PANTS_STRIPE_MANUAL_TUNING.offsets.waist.x),
  waistOffsetY: String(PANTS_STRIPE_MANUAL_TUNING.offsets.waist.y),
};

const DEFAULT_LAYER_VISIBILITY: Record<LayerKey, boolean> = {
  fabric: true,
  style: true,
  ao: true,
  vignette: true,
};

const DEFAULT_BULK_MASK: Record<DraftKey, boolean> = {
  textureScale: true,
  textureStrength: true,
  textureContrast: true,
  textureBrightness: true,
  stripeSpacingJacket: true,
  stripeSpacingPants: true,
  pantsTextureRotation: true,
  photoVariant: true,
  renderMode: true,
  renderBasePath: false,
  colorHex: true,
};

const SLIDERS: SliderDef[] = [
  {
    key: "textureScale",
    label: "Texture scale",
    min: 0.03,
    max: 3.2,
    step: 0.01,
    fallback: 1,
    fixed: 2,
  },
  {
    key: "textureStrength",
    label: "Texture strength",
    min: 0,
    max: 2.2,
    step: 0.01,
    fallback: 0.28,
    fixed: 2,
  },
  {
    key: "textureContrast",
    label: "Texture contrast",
    min: 0.5,
    max: 2.4,
    step: 0.01,
    fallback: 1.1,
    fixed: 2,
  },
  {
    key: "textureBrightness",
    label: "Texture brightness",
    min: 0.5,
    max: 2.2,
    step: 0.01,
    fallback: 1,
    fixed: 2,
  },
  {
    key: "stripeSpacingJacket",
    label: "Stripe spacing jacket",
    min: 0.5,
    max: 24,
    step: 0.5,
    fallback: 6,
    fixed: 1,
  },
  {
    key: "stripeSpacingPants",
    label: "Stripe spacing pants",
    min: 0.5,
    max: 24,
    step: 0.5,
    fallback: 6,
    fixed: 1,
  },
  {
    key: "pantsTextureRotation",
    label: "Pants rotation",
    min: -180,
    max: 180,
    step: 1,
    fallback: 0,
    fixed: 0,
  },
];

const ZONE_SLIDERS: ZoneSliderDef[] = [
  { key: "singleLeftAbsDeg", label: "Single left angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "singleFlyAbsDeg", label: "Single fly angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "singleRightAbsDeg", label: "Single right angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "leftMainAbsDeg", label: "Left zone angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "rightUpperAbsDeg", label: "Right upper angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "rightLowerAbsDeg", label: "Right lower angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "waistAbsDeg", label: "Belt angle", min: -180, max: 180, step: 1, fallback: 0, fixed: 0 },
  { key: "boundaryTopXRatio", label: "Boundary top X", min: -0.2, max: 1.2, step: 0.01, fallback: 0.2, fixed: 2 },
  { key: "boundaryBottomXRatio", label: "Boundary bottom X", min: -0.2, max: 1.2, step: 0.01, fallback: 0.5, fixed: 2 },
  { key: "boundaryMinXRatio", label: "Boundary min X", min: -0.2, max: 1.2, step: 0.01, fallback: 0.2, fixed: 2 },
  { key: "boundaryMaxXRatio", label: "Boundary max X", min: -0.2, max: 1.2, step: 0.01, fallback: 0.6, fixed: 2 },
  { key: "waistXRatio", label: "Waist split X", min: 0.6, max: 1.2, step: 0.005, fallback: 0.94, fixed: 3 },
  { key: "rightLowerStartYRatio", label: "Right lower start Y", min: -0.2, max: 1.8, step: 0.01, fallback: 1.1, fixed: 2 },
  { key: "rightLowerSlopeRatio", label: "Right lower slope", min: -1, max: 1, step: 0.01, fallback: 0, fixed: 2 },
  { key: "beltStartXRatio", label: "Belt start X", min: 0.7, max: 1.05, step: 0.001, fallback: 0.97, fixed: 3 },
  { key: "beltTopYRatio", label: "Belt top Y", min: -0.2, max: 1.2, step: 0.005, fallback: 0.02, fixed: 3 },
  { key: "beltBottomYRatio", label: "Belt bottom Y", min: -0.2, max: 1.2, step: 0.005, fallback: 0.98, fixed: 3 },
  { key: "boundaryFeatherPx", label: "Boundary feather", min: 0, max: 8, step: 0.05, fallback: 0.6, fixed: 2 },
  { key: "leftMainOffsetX", label: "Left offset X", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "leftMainOffsetY", label: "Left offset Y", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "leftUnderlapOffsetX", label: "Underlap offset X", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "leftUnderlapOffsetY", label: "Underlap offset Y", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "rightFlyOffsetX", label: "Right fly offset X", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "rightFlyOffsetY", label: "Right fly offset Y", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "rightUnderOffsetX", label: "Right lower offset X", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "rightUnderOffsetY", label: "Right lower offset Y", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "waistOffsetX", label: "Waist offset X", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
  { key: "waistOffsetY", label: "Waist offset Y", min: -80, max: 80, step: 1, fallback: 0, fixed: 0 },
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const parseNullableNumber = (value: string) => {
  const raw = value.trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const toDraftValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
};

const normalizePhotoVariant = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "blue" || normalized === "black" || normalized === "light") {
    return normalized as "blue" | "black" | "light";
  }
  return null;
};

const normalizeRenderMode = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "fabricspecific" ||
    normalized === "fabric_specific" ||
    normalized === "fabric-specific"
  ) {
    return "fabricSpecific" as const;
  }
  if (
    normalized === "photovariant" ||
    normalized === "photo_variant" ||
    normalized === "photo-variant"
  ) {
    return "photoVariant" as const;
  }
  return null;
};

const normalizeHex = (value: string) => {
  const raw = value.trim().replace(/^#/, "").toLowerCase();
  if (!raw) return null;
  if (!/^[0-9a-f]{6}$/.test(raw)) return null;
  return `#${raw}`;
};

const draftFromFabric = (fabric: any): TuningDraft => ({
  textureScale: toDraftValue(fabric?.textureScale ?? fabric?.texture_scale),
  textureStrength: toDraftValue(fabric?.textureStrength ?? fabric?.texture_strength),
  textureContrast: toDraftValue(fabric?.textureContrast ?? fabric?.texture_contrast),
  textureBrightness: toDraftValue(fabric?.textureBrightness ?? fabric?.texture_brightness),
  stripeSpacingJacket: toDraftValue(
    fabric?.stripeSpacingJacket ?? fabric?.stripe_spacing_jacket
  ),
  stripeSpacingPants: toDraftValue(
    fabric?.stripeSpacingPants ?? fabric?.stripe_spacing_pants
  ),
  pantsTextureRotation: toDraftValue(
    fabric?.pantsTextureRotation ?? fabric?.pants_texture_rotation
  ),
  photoVariant: toDraftValue(fabric?.photoVariant ?? fabric?.photo_variant),
  renderMode: toDraftValue(fabric?.renderMode ?? fabric?.render_mode),
  renderBasePath: toDraftValue(
    fabric?.renderBasePath ?? fabric?.render_base_path ?? fabric?.render_path
  ),
  colorHex: toDraftValue(
    fabric?.colorHex ?? fabric?.color_hex ?? fabric?.hexColor ?? fabric?.hex
  ),
});

const normalizeDraftForCompare = (draft: TuningDraft): TuningDraft => ({
  textureScale: draft.textureScale.trim(),
  textureStrength: draft.textureStrength.trim(),
  textureContrast: draft.textureContrast.trim(),
  textureBrightness: draft.textureBrightness.trim(),
  stripeSpacingJacket: draft.stripeSpacingJacket.trim(),
  stripeSpacingPants: draft.stripeSpacingPants.trim(),
  pantsTextureRotation: draft.pantsTextureRotation.trim(),
  photoVariant: draft.photoVariant.trim().toLowerCase(),
  renderMode: draft.renderMode.trim().toLowerCase(),
  renderBasePath: draft.renderBasePath.trim(),
  colorHex: draft.colorHex.trim().toLowerCase(),
});

const draftToPatch = (draft: TuningDraft): FabricPatch => {
  const patch: FabricPatch = {};
  const textureScale = parseNullableNumber(draft.textureScale);
  const textureStrength = parseNullableNumber(draft.textureStrength);
  const textureContrast = parseNullableNumber(draft.textureContrast);
  const textureBrightness = parseNullableNumber(draft.textureBrightness);
  const stripeSpacingJacket = parseNullableNumber(draft.stripeSpacingJacket);
  const stripeSpacingPants = parseNullableNumber(draft.stripeSpacingPants);
  const pantsTextureRotation = parseNullableNumber(draft.pantsTextureRotation);
  if (textureScale !== null) patch.textureScale = textureScale;
  if (textureStrength !== null) patch.textureStrength = textureStrength;
  if (textureContrast !== null) patch.textureContrast = textureContrast;
  if (textureBrightness !== null) patch.textureBrightness = textureBrightness;
  if (stripeSpacingJacket !== null) patch.stripeSpacingJacket = stripeSpacingJacket;
  if (stripeSpacingPants !== null) patch.stripeSpacingPants = stripeSpacingPants;
  if (pantsTextureRotation !== null) patch.pantsTextureRotation = pantsTextureRotation;
  const photoVariant = normalizePhotoVariant(draft.photoVariant);
  const renderMode = normalizeRenderMode(draft.renderMode);
  const renderBasePath = draft.renderBasePath.trim();
  const colorHex = normalizeHex(draft.colorHex);
  if (photoVariant) patch.photoVariant = photoVariant;
  if (renderMode) patch.renderMode = renderMode;
  if (renderBasePath) patch.renderBasePath = renderBasePath;
  if (colorHex) patch.colorHex = colorHex;
  return patch;
};

const patchToDraft = (patch: Record<string, unknown>): Partial<TuningDraft> => {
  const next: Partial<TuningDraft> = {};
  const assignNumeric = (field: SliderDef["key"], keys: string[]) => {
    for (const key of keys) {
      const raw = patch[key];
      if (raw == null) continue;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        next[field] = String(raw);
        return;
      }
      if (typeof raw === "string" && raw.trim()) {
        const num = Number(raw.trim());
        if (Number.isFinite(num)) {
          next[field] = String(num);
          return;
        }
      }
    }
  };

  assignNumeric("textureScale", ["textureScale", "texture_scale"]);
  assignNumeric("textureStrength", ["textureStrength", "texture_strength"]);
  assignNumeric("textureContrast", ["textureContrast", "texture_contrast"]);
  assignNumeric("textureBrightness", ["textureBrightness", "texture_brightness"]);
  assignNumeric("stripeSpacingJacket", ["stripeSpacingJacket", "stripe_spacing_jacket"]);
  assignNumeric("stripeSpacingPants", ["stripeSpacingPants", "stripe_spacing_pants"]);
  assignNumeric("pantsTextureRotation", ["pantsTextureRotation", "pants_texture_rotation"]);

  const photoVariant = normalizePhotoVariant(
    String(patch.photoVariant ?? patch.photo_variant ?? "")
  );
  if (photoVariant) next.photoVariant = photoVariant;

  const renderMode = normalizeRenderMode(
    String(patch.renderMode ?? patch.render_mode ?? "")
  );
  if (renderMode) next.renderMode = renderMode;

  const renderBasePath = String(
    patch.renderBasePath ?? patch.render_base_path ?? patch.render_path ?? ""
  ).trim();
  if (renderBasePath) next.renderBasePath = renderBasePath;

  const colorHex = normalizeHex(
    String(patch.colorHex ?? patch.color_hex ?? patch.hexColor ?? patch.hex ?? "")
  );
  if (colorHex) next.colorHex = colorHex;

  return next;
};

const patchIsEmpty = (patch: FabricPatch) => Object.keys(patch).length === 0;

const summarizeDebug = (debug: SuitPreviewRenderDebug | null) => {
  if (!debug) return "n/a";
  return `${debug.renderMode}/${debug.photoVariant} j${debug.jacketPhotoLayerCount} p${debug.pantsPhotoLayerCount}`;
};

export default function PreviewTuningAdminPage() {
  const [config, dispatch] = useSuitConfigurator({ styleId: DEFAULT_STYLE, colorId: DEFAULT_COLOR });
  const configWithVest = config as typeof config & {
    vestEnabled?: boolean;
    vestStyleId?: string;
  };
  const dispatchLoose = dispatch as unknown as (action: { type: string; payload?: unknown }) => void;
  const [draft, setDraft] = useState<TuningDraft>(DEFAULT_DRAFT);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState<"all" | "light" | "medium" | "dark">("all");
  const [previewView, setPreviewView] = useState<PreviewView>("both");
  const [previewLevel, setPreviewLevel] = useState<ContrastLevel>("medium");
  const [compareMode, setCompareMode] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYER_VISIBILITY);
  const [baselineDebug, setBaselineDebug] = useState<SuitPreviewRenderDebug | null>(null);
  const [tunedDebug, setTunedDebug] = useState<SuitPreviewRenderDebug | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkMask, setBulkMask] = useState<Record<DraftKey, boolean>>(DEFAULT_BULK_MASK);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  const [jsonPatchInput, setJsonPatchInput] = useState("");
  const [zoneDraft, setZoneDraft] = useState<PantsZoneDraft>(DEFAULT_ZONE_DRAFT);
  const { fabrics, loading: fabricsLoading, error: fabricsError } = useFabrics();

  const fabricList = useMemo(() => (fabrics.length ? fabrics : fallbackFabrics), [fabrics]);
  const selectedFabric = useMemo(
    () => fabricList.find((f: any) => String(f.id) === String(config.colorId)) ?? fabricList[0] ?? null,
    [config.colorId, fabricList]
  );

  const sourceDraft = useMemo(
    () => (selectedFabric ? draftFromFabric(selectedFabric) : DEFAULT_DRAFT),
    [selectedFabric]
  );

  const isDirty = useMemo(() => {
    const current = normalizeDraftForCompare(draft);
    const source = normalizeDraftForCompare(sourceDraft);
    return JSON.stringify(current) !== JSON.stringify(source);
  }, [draft, sourceDraft]);

  useEffect(() => {
    if (!selectedFabric) return;
    const hasCurrent = fabricList.some((fabric: any) => String(fabric.id) === String(config.colorId));
    if (!config.colorId || !hasCurrent) {
      dispatch({ type: "SET_COLOR", payload: String(selectedFabric.id) });
    }
  }, [config.colorId, dispatch, fabricList, selectedFabric]);

  useEffect(() => {
    if (!selectedFabric) {
      setDraft(DEFAULT_DRAFT);
      return;
    }
    setDraft(draftFromFabric(selectedFabric));
    setStatus({ type: "idle" });
  }, [selectedFabric]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const items = parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id || ""),
          name: String(item.name || "Preset"),
          draft: { ...DEFAULT_DRAFT, ...(item.draft || {}) } as TuningDraft,
        }))
        .filter((item) => item.id);
      setPresets(items);
    } catch {
      setPresets([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const zoneOverrideRuntime = useMemo(() => {
    const toNum = (value: string, fallback: number) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };
    return {
      directions: {
        singleLeftAbsDeg: toNum(
          zoneDraft.singleLeftAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.singleLeftAbsDeg
        ),
        singleFlyAbsDeg: toNum(
          zoneDraft.singleFlyAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.singleFlyAbsDeg
        ),
        singleRightAbsDeg: toNum(
          zoneDraft.singleRightAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.singleRightAbsDeg
        ),
        leftMainAbsDeg: toNum(
          zoneDraft.leftMainAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.leftMainAbsDeg
        ),
        rightUpperAbsDeg: toNum(
          zoneDraft.rightUpperAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.rightUpperAbsDeg
        ),
        rightLowerAbsDeg: toNum(
          zoneDraft.rightLowerAbsDeg,
          PANTS_STRIPE_MANUAL_TUNING.directions.rightLowerAbsDeg
        ),
        waistAbsDeg: toNum(zoneDraft.waistAbsDeg, PANTS_STRIPE_MANUAL_TUNING.directions.waistAbsDeg),
      },
      boundaries: {
        boundaryTopXRatio: toNum(
          zoneDraft.boundaryTopXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryTopXRatio
        ),
        boundaryBottomXRatio: toNum(
          zoneDraft.boundaryBottomXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryBottomXRatio
        ),
        boundaryMinXRatio: toNum(
          zoneDraft.boundaryMinXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryMinXRatio
        ),
        boundaryMaxXRatio: toNum(
          zoneDraft.boundaryMaxXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryMaxXRatio
        ),
        waistXRatio: toNum(
          zoneDraft.waistXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.waistXRatio
        ),
        rightLowerStartYRatio: toNum(
          zoneDraft.rightLowerStartYRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.rightLowerStartYRatio
        ),
        rightLowerSlopeRatio: toNum(
          zoneDraft.rightLowerSlopeRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.rightLowerSlopeRatio
        ),
        beltStartXRatio: toNum(
          zoneDraft.beltStartXRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.beltStartXRatio
        ),
        beltTopYRatio: toNum(
          zoneDraft.beltTopYRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.beltTopYRatio
        ),
        beltBottomYRatio: toNum(
          zoneDraft.beltBottomYRatio,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.beltBottomYRatio
        ),
        boundaryFeatherPx: toNum(
          zoneDraft.boundaryFeatherPx,
          PANTS_STRIPE_MANUAL_TUNING.boundaries.boundaryFeatherPx
        ),
      },
      offsets: {
        leftMain: {
          x: toNum(zoneDraft.leftMainOffsetX, PANTS_STRIPE_MANUAL_TUNING.offsets.leftMain.x),
          y: toNum(zoneDraft.leftMainOffsetY, PANTS_STRIPE_MANUAL_TUNING.offsets.leftMain.y),
        },
        leftUnderlap: {
          x: toNum(
            zoneDraft.leftUnderlapOffsetX,
            PANTS_STRIPE_MANUAL_TUNING.offsets.leftUnderlap.x
          ),
          y: toNum(
            zoneDraft.leftUnderlapOffsetY,
            PANTS_STRIPE_MANUAL_TUNING.offsets.leftUnderlap.y
          ),
        },
        rightFly: {
          x: toNum(zoneDraft.rightFlyOffsetX, PANTS_STRIPE_MANUAL_TUNING.offsets.rightFly.x),
          y: toNum(zoneDraft.rightFlyOffsetY, PANTS_STRIPE_MANUAL_TUNING.offsets.rightFly.y),
        },
        rightUnder: {
          x: toNum(zoneDraft.rightUnderOffsetX, PANTS_STRIPE_MANUAL_TUNING.offsets.rightUnder.x),
          y: toNum(zoneDraft.rightUnderOffsetY, PANTS_STRIPE_MANUAL_TUNING.offsets.rightUnder.y),
        },
        waist: {
          x: toNum(zoneDraft.waistOffsetX, PANTS_STRIPE_MANUAL_TUNING.offsets.waist.x),
          y: toNum(zoneDraft.waistOffsetY, PANTS_STRIPE_MANUAL_TUNING.offsets.waist.y),
        },
      },
    } as const;
  }, [zoneDraft]);

  if (typeof window !== "undefined") {
    (window as any).__SANTOS_PANTS_STRIPE_TUNING_OVERRIDE = zoneOverrideRuntime;
  }

  const zoneSignature = useMemo(() => JSON.stringify(zoneOverrideRuntime), [zoneOverrideRuntime]);

  useEffect(
    () => () => {
      if (typeof window === "undefined") return;
      if ((window as any).__SANTOS_PANTS_STRIPE_TUNING_OVERRIDE) {
        delete (window as any).__SANTOS_PANTS_STRIPE_TUNING_OVERRIDE;
      }
    },
    []
  );

  const visibleFabrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fabricList.filter((fabric: any) => {
      if (toneFilter !== "all" && String(fabric?.tone || "") !== toneFilter) return false;
      if (!q) return true;
      const hay = `${fabric?.name || ""} ${fabric?.id || ""} ${fabric?.code || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fabricList, search, toneFilter]);

  const selectedBulkIdSet = useMemo(() => new Set(selectedBulkIds.map(String)), [selectedBulkIds]);
  const previewPatch = useMemo(() => draftToPatch(draft), [draft]);
  const previewFabrics = useMemo(() => {
    if (!selectedFabric) return fabricList;
    const selectedId = String(selectedFabric.id);
    return fabricList.map((fabric: any) =>
      String(fabric.id) === selectedId ? { ...fabric, ...previewPatch } : fabric
    );
  }, [fabricList, previewPatch, selectedFabric]);

  const patchJsonPreview = useMemo(() => JSON.stringify(previewPatch, null, 2), [previewPatch]);

  const setDraftField = (key: DraftKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (status.type === "success") setStatus({ type: "idle" });
  };

  const setZoneField = (key: PantsZoneKey, value: string) => {
    setZoneDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetDraft = () => {
    setDraft(sourceDraft);
    setStatus({ type: "idle" });
  };

  const bumpFabricsRevision = () => {
    if (typeof window === "undefined") return;
    const stamp = String(Date.now());
    window.localStorage.setItem("fabrics:rev", stamp);
    window.dispatchEvent(new Event("fabrics:updated"));
  };

  const appendBaseFabricFields = (fd: FormData, fabric: any) => {
    fd.set("id", String(fabric.id));
    fd.set("name", String(fabric.name || "").trim());
    fd.set("tone", String(fabric.tone || "medium"));
    if (fabric.price != null && String(fabric.price).trim()) fd.set("price", String(fabric.price));
    if (fabric.code) fd.set("code", String(fabric.code));
    if (fabric.texture) fd.set("texture", String(fabric.texture));
    if (fabric.pattern) fd.set("pattern", String(fabric.pattern));
  };

  const appendPatchFields = (
    fd: FormData,
    patch: FabricPatch,
    fieldMask?: Partial<Record<DraftKey, boolean>>
  ) => {
    const allow = (key: DraftKey) => fieldMask?.[key] !== false;
    if (allow("textureScale") && patch.textureScale != null) fd.set("textureScale", String(patch.textureScale));
    if (allow("textureStrength") && patch.textureStrength != null)
      fd.set("textureStrength", String(patch.textureStrength));
    if (allow("textureContrast") && patch.textureContrast != null)
      fd.set("textureContrast", String(patch.textureContrast));
    if (allow("textureBrightness") && patch.textureBrightness != null)
      fd.set("textureBrightness", String(patch.textureBrightness));
    if (allow("stripeSpacingJacket") && patch.stripeSpacingJacket != null)
      fd.set("stripeSpacingJacket", String(patch.stripeSpacingJacket));
    if (allow("stripeSpacingPants") && patch.stripeSpacingPants != null)
      fd.set("stripeSpacingPants", String(patch.stripeSpacingPants));
    if (allow("pantsTextureRotation") && patch.pantsTextureRotation != null)
      fd.set("pantsTextureRotation", String(patch.pantsTextureRotation));
    if (allow("photoVariant") && patch.photoVariant) fd.set("photoVariant", patch.photoVariant);
    if (allow("renderMode") && patch.renderMode) fd.set("renderMode", patch.renderMode);
    if (allow("renderBasePath") && patch.renderBasePath)
      fd.set("renderBasePath", patch.renderBasePath);
    if (allow("colorHex") && patch.colorHex) fd.set("colorHex", patch.colorHex);
  };

  const savePatchForFabric = useCallback(
    async (
      fabric: any,
      patch: FabricPatch,
      fieldMask?: Partial<Record<DraftKey, boolean>>
    ) => {
      const fd = new FormData();
      appendBaseFabricFields(fd, fabric);
      appendPatchFields(fd, patch, fieldMask);
      const res = await fetch("/api/fabrics/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return { ok: false, message: String(json?.message || "Save failed") };
      }
      return { ok: true, message: "ok" };
    },
    []
  );

  const saveCurrent = async () => {
    if (!selectedFabric) return;
    if (patchIsEmpty(previewPatch)) {
      setStatus({ type: "error", message: "Nema validnih vrednosti za cuvanje." });
      return;
    }
    setStatus({ type: "loading", message: "Cuvam tuning..." });
    const result = await savePatchForFabric(selectedFabric, previewPatch);
    if (!result.ok) {
      setStatus({ type: "error", message: result.message });
      return;
    }
    bumpFabricsRevision();
    setStatus({ type: "success", message: "Tuning sacuvan." });
  };

  const saveBatch = async () => {
    if (!selectedBulkIds.length) {
      setStatus({ type: "error", message: "Izaberi tkanine za batch apply." });
      return;
    }
    if (patchIsEmpty(previewPatch)) {
      setStatus({ type: "error", message: "Patch je prazan." });
      return;
    }

    const selectedPatch: FabricPatch = {};
    const copyIfAllowed = <K extends keyof FabricPatch>(key: K, draftKey: DraftKey) => {
      if (!bulkMask[draftKey]) return;
      const value = previewPatch[key];
      if (value == null) return;
      selectedPatch[key] = value;
    };

    copyIfAllowed("textureScale", "textureScale");
    copyIfAllowed("textureStrength", "textureStrength");
    copyIfAllowed("textureContrast", "textureContrast");
    copyIfAllowed("textureBrightness", "textureBrightness");
    copyIfAllowed("stripeSpacingJacket", "stripeSpacingJacket");
    copyIfAllowed("stripeSpacingPants", "stripeSpacingPants");
    copyIfAllowed("pantsTextureRotation", "pantsTextureRotation");
    copyIfAllowed("photoVariant", "photoVariant");
    copyIfAllowed("renderMode", "renderMode");
    copyIfAllowed("renderBasePath", "renderBasePath");
    copyIfAllowed("colorHex", "colorHex");

    if (patchIsEmpty(selectedPatch)) {
      setStatus({ type: "error", message: "Nijedno validno polje nije selektovano." });
      return;
    }

    const targets = fabricList.filter((fabric: any) => selectedBulkIdSet.has(String(fabric.id)));
    let successCount = 0;
    const failed: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const fabric = targets[i];
      setStatus({ type: "loading", message: `Batch ${i + 1}/${targets.length}: ${fabric?.name || fabric?.id}` });
      const result = await savePatchForFabric(fabric, selectedPatch, bulkMask);
      if (result.ok) successCount += 1;
      else failed.push(String(fabric?.name || fabric?.id));
    }

    bumpFabricsRevision();
    if (!failed.length) {
      setStatus({ type: "success", message: `Batch sacuvan za ${successCount} tkanina.` });
      return;
    }
    setStatus({
      type: "error",
      message: `Sacuvano ${successCount}/${targets.length}. Fail: ${failed.slice(0, 2).join(", ")}`,
    });
  };

  const toggleLayer = (key: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleBulkMask = (key: DraftKey) => {
    setBulkMask((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFabricSelection = (id: string) => {
    setSelectedBulkIds((prev) => {
      const set = new Set(prev.map(String));
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  const nudgeNumber = (field: SliderDef["key"], delta: number) => {
    const meta = SLIDERS.find((item) => item.key === field);
    if (!meta) return;
    const current = parseNullableNumber(draft[field]) ?? meta.fallback;
    const next = clamp(current + delta, meta.min, meta.max);
    setDraftField(field, next.toFixed(meta.fixed));
  };

  const nudgeZoneNumber = (field: PantsZoneKey, delta: number) => {
    const meta = ZONE_SLIDERS.find((item) => item.key === field);
    if (!meta) return;
    const current = parseNullableNumber(zoneDraft[field]) ?? meta.fallback;
    const next = clamp(current + delta, meta.min, meta.max);
    setZoneField(field, next.toFixed(meta.fixed));
  };

  const savePreset = () => {
    const name = presetName.trim() || selectedFabric?.name || "Preset";
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `preset-${Date.now()}`;
    setPresets((prev) => [{ id, name, draft }, ...prev].slice(0, 40));
    setPresetName("");
  };

  const copyPatchJson = async () => {
    try {
      await navigator.clipboard.writeText(patchJsonPreview);
      setStatus({ type: "success", message: "Patch JSON kopiran." });
    } catch {
      setStatus({ type: "error", message: "Clipboard nije dostupan." });
    }
  };

  const applyJsonPatch = () => {
    try {
      const parsed = JSON.parse(jsonPatchInput);
      if (!parsed || typeof parsed !== "object") {
        setStatus({ type: "error", message: "JSON patch mora biti objekat." });
        return;
      }
      setDraft((prev) => ({ ...prev, ...patchToDraft(parsed as Record<string, unknown>) }));
      setStatus({ type: "success", message: "JSON patch primenjen." });
    } catch {
      setStatus({ type: "error", message: "Nevalidan JSON format." });
    }
  };

  const statusColor =
    status.type === "error"
      ? "text-red-600"
      : status.type === "success"
        ? "text-emerald-600"
        : "text-gray-600";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-6 px-4 py-8">
      <AdminNav />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Preview Tuning Workbench</h1>
        <p className="text-sm text-gray-600">
          Napredni panel: compare baseline/tuned, scene kontrole, batch apply i preset workflow.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_390px]">
        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Fabric Browser</h2>
              <span className="text-[11px] text-gray-500">{visibleFabrics.length} items</span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              placeholder="Pretraga: name / id / code"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={toneFilter}
                onChange={(e) =>
                  setToneFilter(e.target.value as "all" | "light" | "medium" | "dark")
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              >
                <option value="all">Svi tonovi</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="dark">Dark</option>
              </select>
              <button
                type="button"
                onClick={() => setSelectedBulkIds(Array.from(new Set(visibleFabrics.map((f: any) => String(f.id))))) }
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300"
              >
                Select visible
              </button>
            </div>

            <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {visibleFabrics.map((fabric: any) => {
                const id = String(fabric.id);
                const active = String(config.colorId) === id;
                const selected = selectedBulkIdSet.has(id);
                return (
                  <div
                    key={id}
                    className={`rounded-md border px-2 py-2 ${
                      active ? "border-gray-900 bg-gray-900/5" : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleFabricSelection(id)}
                        className="h-3.5 w-3.5 accent-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "SET_COLOR", payload: id })}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-semibold text-gray-900">
                          {fabric.name || `Fabric ${id}`}
                        </div>
                        <div className="text-[11px] text-gray-500">ID: {id}</div>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!visibleFabrics.length && <p className="px-2 py-1 text-xs text-gray-500">Nema rezultata.</p>}
            </div>
            {fabricsError && <p className="text-xs text-red-600">{fabricsError}</p>}
          </section>

          <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">Scene Controls</h3>

            <select
              value={config.styleId}
              onChange={(e) => dispatch({ type: "SET_STYLE", payload: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none"
            >
              {suits.map((style) => (
                <option key={style.id} value={style.id}>{style.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2">
              {(["both", "jacket", "pants"] as PreviewView[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPreviewView(item)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize ${
                    previewView === item
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as ContrastLevel[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPreviewLevel(item)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize ${
                    previewLevel === item
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(layerVisibility) as LayerKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={layerVisibility[key]}
                    onChange={() => toggleLayer(key)}
                    className="h-3.5 w-3.5 accent-gray-900"
                  />
                  <span className="capitalize">{key}</span>
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(config.showShirt)}
                onChange={() => dispatch({ type: "TOGGLE_SHIRT" })}
                className="h-3.5 w-3.5 accent-gray-900"
              />
              Show shirt
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(configWithVest.vestEnabled)}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  dispatchLoose({ type: "SET_VEST_ENABLED", payload: enabled });
                  if (enabled && !configWithVest.vestStyleId && vestStyles[0]?.id) {
                    dispatchLoose({ type: "SET_VEST_STYLE", payload: vestStyles[0].id });
                  }
                }}
                className="h-3.5 w-3.5 accent-gray-900"
              />
              Three-piece
            </label>

            {configWithVest.vestEnabled && (
              <select
                value={configWithVest.vestStyleId || vestStyles[0]?.id || ""}
                onChange={(e) =>
                  dispatchLoose({ type: "SET_VEST_STYLE", payload: e.target.value })
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"
              >
                {vestStyles.map((style) => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="h-3.5 w-3.5 accent-gray-900"
              />
              Compare baseline / tuned
            </label>
          </section>
        </aside>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                Baseline: {summarizeDebug(baselineDebug)}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                Tuned: {summarizeDebug(tunedDebug)}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                Fabric: {selectedFabric?.name || "n/a"}
              </span>
            </div>
          </div>

          {compareMode ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-[#efefef] p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">Baseline</h3>
                <SuitPreviewCompat
                  key={`baseline-${zoneSignature}-${config.styleId}-${String(config.colorId || "")}`}
                  config={config}
                  view={previewView}
                  level={previewLevel}
                  fabrics={fabricList}
                  fabricsLoading={fabricsLoading}
                  layerVisibility={layerVisibility}
                  onRenderDebug={setBaselineDebug}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#efefef] p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">Tuned</h3>
                <SuitPreviewCompat
                  key={`tuned-${zoneSignature}-${config.styleId}-${String(config.colorId || "")}`}
                  config={config}
                  view={previewView}
                  level={previewLevel}
                  fabrics={previewFabrics}
                  fabricsLoading={fabricsLoading}
                  layerVisibility={layerVisibility}
                  onRenderDebug={setTunedDebug}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-[#efefef] p-3">
              <SuitPreviewCompat
                key={`single-${zoneSignature}-${config.styleId}-${String(config.colorId || "")}`}
                config={config}
                view={previewView}
                level={previewLevel}
                fabrics={previewFabrics}
                fabricsLoading={fabricsLoading}
                layerVisibility={layerVisibility}
                onRenderDebug={setTunedDebug}
              />
            </div>
          )}
        </section>

        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Draft Controls</h2>
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {SLIDERS.map((meta) => {
                const current = clamp(parseNullableNumber(draft[meta.key]) ?? meta.fallback, meta.min, meta.max);
                return (
                  <div key={meta.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-gray-700">
                      <span className="font-semibold">{meta.label}</span>
                      <span>{`${current.toFixed(meta.fixed)} (${meta.min.toFixed(meta.fixed)}-${meta.max.toFixed(meta.fixed)})`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => nudgeNumber(meta.key, -meta.step)}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={meta.min}
                        max={meta.max}
                        step={meta.step}
                        value={current}
                        onChange={(e) => setDraftField(meta.key, e.target.value)}
                        className="h-2 flex-1 cursor-pointer accent-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => nudgeNumber(meta.key, meta.step)}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-700">
                  Pants Zone Tuning
                </h3>
                <button
                  type="button"
                  onClick={() => setZoneDraft(DEFAULT_ZONE_DRAFT)}
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700"
                >
                  Reset zones
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {ZONE_SLIDERS.map((meta) => {
                  const current = clamp(
                    parseNullableNumber(zoneDraft[meta.key]) ?? meta.fallback,
                    meta.min,
                    meta.max
                  );
                  return (
                    <div key={meta.key} className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-700">
                        <span className="font-semibold">{meta.label}</span>
                        <span>{`${current.toFixed(meta.fixed)} (${meta.min.toFixed(meta.fixed)}-${meta.max.toFixed(meta.fixed)})`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => nudgeZoneNumber(meta.key, -meta.step)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min={meta.min}
                          max={meta.max}
                          step={meta.step}
                          value={current}
                          onChange={(e) => setZoneField(meta.key, e.target.value)}
                          className="h-2 flex-1 cursor-pointer accent-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => nudgeZoneNumber(meta.key, meta.step)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500">
                Ovi slideri utiču samo na live preview u ovoj admin stranici (bez čuvanja u fabric CMS).
              </p>
            </div>

            <div className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={draft.photoVariant}
                  onChange={(e) => setDraftField("photoVariant", e.target.value)}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="">photoVariant: auto</option>
                  <option value="blue">blue</option>
                  <option value="black">black</option>
                  <option value="light">light</option>
                </select>
                <select
                  value={draft.renderMode}
                  onChange={(e) => setDraftField("renderMode", e.target.value)}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="">renderMode: auto</option>
                  <option value="photoVariant">photoVariant</option>
                  <option value="fabricSpecific">fabricSpecific</option>
                </select>
              </div>
              <input
                value={draft.colorHex}
                onChange={(e) => setDraftField("colorHex", e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                placeholder="colorHex (#2a3f6a)"
              />
              <input
                value={draft.renderBasePath}
                onChange={(e) => setDraftField("renderBasePath", e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                placeholder="renderBasePath (/assets/render/#fabricId#/#garment#/)"
              />
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">Batch Mask</h3>
              <button
                type="button"
                onClick={() => setSelectedBulkIds([])}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
              >
                Clear selected
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(bulkMask) as DraftKey[]).map((key) => (
                <label key={key} className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={bulkMask[key]}
                    onChange={() => toggleBulkMask(key)}
                    className="h-3 w-3 accent-gray-900"
                  />
                  <span className="truncate">{key}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveBatch}
              disabled={status.type === "loading" || !selectedBulkIds.length}
              className="w-full rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Apply patch to selected fabrics
            </button>
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveCurrent}
                disabled={!selectedFabric || status.type === "loading"}
                className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {status.type === "loading" ? "Saving..." : "Save selected fabric"}
              </button>
              <button
                type="button"
                onClick={resetDraft}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Reset draft
              </button>
              <button
                type="button"
                onClick={copyPatchJson}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Copy patch JSON
              </button>
            </div>
            {status.type !== "idle" && <p className={`text-xs ${statusColor}`}>{status.message}</p>}
            {isDirty && <p className="text-xs text-amber-700">Draft has unsaved changes.</p>}

            <div className="flex items-center gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                placeholder="Naziv preseta"
              />
              <button
                type="button"
                onClick={savePreset}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Save preset
              </button>
            </div>

            <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2">
              {presets.map((preset) => (
                <div key={preset.id} className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...DEFAULT_DRAFT, ...preset.draft })}
                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-gray-800"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresets((prev) => prev.filter((item) => item.id !== preset.id))}
                    className="text-[11px] font-semibold text-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!presets.length && <p className="text-xs text-gray-500">Nema sacuvanih preseta.</p>}
            </div>

            <textarea
              value={jsonPatchInput}
              onChange={(e) => setJsonPatchInput(e.target.value)}
              className="h-24 w-full rounded border border-gray-200 bg-white px-2 py-2 font-mono text-[11px]"
              placeholder='{"textureStrength":0.31,"photoVariant":"blue"}'
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyJsonPatch}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Apply JSON to draft
              </button>
              <button
                type="button"
                onClick={() => setJsonPatchInput(patchJsonPreview)}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Fill current patch
              </button>
            </div>
            <pre className="max-h-32 overflow-auto rounded border border-gray-200 bg-white p-2 text-[11px] text-gray-700">
              {patchJsonPreview}
            </pre>
          </section>
        </aside>
      </div>
    </div>
  );
}
