"use client";

type PantsMaskStats = {
  union: number;
  left: number;
  right: number;
  leftMain: number;
  leftUnder: number;
  rightFly: number;
  rightUnder: number;
  main: number;
  waist: number;
  overlap?: number;
  unassigned?: number;
  zoneUnion?: number;
  coverage?: number;
};

type DeterministicStripeZoneConfig = {
  coverageMinRatio: number;
  minPixelThreshold: number;
  waistXRatio: number;
  boundaryTopXRatio: number;
  boundaryBottomXRatio: number;
  rightLowerStartYRatio: number;
  rightLowerSlopeRatio: number;
  beltStartXRatio?: number;
  beltTopYRatio?: number;
  beltBottomYRatio?: number;
  boundaryFeatherPx?: number;
  seamGuidanceWeight?: number;
  seamGuidanceBlendPx?: number;
  seamFallbackWeight?: number;
};

type ZoneBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type PantsStripeZoneBounds = {
  leftMain: ZoneBounds | null;
  rightUpper: ZoneBounds | null;
  rightLower: ZoneBounds | null;
  waist: ZoneBounds | null;
};

export type PantsStripeAutoPhaseOffsets = {
  leftMain: { x: number; y: number };
  leftUnderlap: { x: number; y: number };
  rightFly: { x: number; y: number };
  rightUnder: { x: number; y: number };
  waist: { x: number; y: number };
};

export type DeterministicPantsZoneAngles = {
  leftMain: number;
  rightUpper: number;
  rightLower: number;
  waist: number;
};

export type DeterministicPantsStripeZones = {
  leftMaskUrl: string;
  rightMaskUrl: string;
  leftMainUrl: string;
  leftUnderUrl: string | null;
  rightUpperUrl: string;
  rightLowerUrl: string | null;
  waistMaskUrl: string | null;
  mainMaskUrl: string;
  maskStats: PantsMaskStats;
  zoneBounds: PantsStripeZoneBounds;
  validation: {
    valid: boolean;
    coverageRatio: number;
    overlapPixels: number;
    unassignedPixels: number;
    zoneUnionPixels: number;
  };
};

type RowRange = { minX: number; maxX: number };
type RawZoneAnalysis = {
  width: number;
  height: number;
  zoneMap: Uint8Array;
  maskStats: PantsMaskStats;
  zoneBounds: PantsStripeZoneBounds;
  validation: {
    valid: boolean;
    coverageRatio: number;
    overlapPixels: number;
    unassignedPixels: number;
    zoneUnionPixels: number;
  };
};

const ZONE_NONE = 0;
const ZONE_LEFT_MAIN = 1;
const ZONE_RIGHT_UPPER = 2;
const ZONE_RIGHT_LOWER = 3;
const ZONE_WAIST = 4;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createMask = (ctx: CanvasRenderingContext2D, width: number, height: number) =>
  ctx.createImageData(width, height);

const paintPixel = (mask: ImageData, index: number, alpha: number) => {
  mask.data[index] = 255;
  mask.data[index + 1] = 255;
  mask.data[index + 2] = 255;
  mask.data[index + 3] = alpha;
};

const toDataUrl = (
  imgData: ImageData,
  width: number,
  height: number,
  featherPx = 0
): string | null => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const cctx = canvas.getContext("2d");
  if (!cctx) return null;
  cctx.putImageData(imgData, 0, 0);
  if (featherPx > 0) {
    const softCanvas = document.createElement("canvas");
    softCanvas.width = width;
    softCanvas.height = height;
    const sctx = softCanvas.getContext("2d");
    if (!sctx) return canvas.toDataURL("image/png");
    sctx.filter = `blur(${featherPx}px)`;
    sctx.drawImage(canvas, 0, 0);
    sctx.filter = "none";
    sctx.drawImage(canvas, 0, 0);
    return softCanvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/png");
};

const getAlpha = (raw: Uint8ClampedArray, width: number, height: number, x: number, y: number) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0;
  const idx = (y * width + x) * 4;
  return raw[idx + 3] ?? 0;
};

const getImageDataRaw = (
  source: ImageData | Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Uint8ClampedArray => {
  if (typeof ImageData !== "undefined" && source instanceof ImageData) return source.data;
  if (source instanceof Uint8ClampedArray) return source;
  if (source instanceof Uint8Array) return new Uint8ClampedArray(source);
  return new Uint8ClampedArray(width * height * 4);
};

const pushBounds = (bounds: ZoneBounds | null, x: number, y: number): ZoneBounds => {
  if (!bounds) return { minX: x, maxX: x, minY: y, maxY: y };
  return {
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y),
    maxY: Math.max(bounds.maxY, y),
  };
};

const scanUnionRows = (raw: Uint8ClampedArray, width: number, height: number) => {
  const rows: RowRange[] = Array.from({ length: height }, () => ({ minX: width, maxX: -1 }));
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let unionPixels = 0;
  for (let y = 0; y < height; y++) {
    let rowMin = width;
    let rowMax = -1;
    for (let x = 0; x < width; x++) {
      if (getAlpha(raw, width, height, x, y) < 10) continue;
      unionPixels++;
      if (x < rowMin) rowMin = x;
      if (x > rowMax) rowMax = x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    rows[y] = { minX: rowMin, maxX: rowMax };
  }
  return { rows, minX, maxX, minY, maxY, unionPixels };
};

const sampleSeamByRow = ({
  seamRaw,
  rows,
  width,
  height,
  minX,
  maxX,
}: {
  seamRaw: Uint8ClampedArray | null;
  rows: RowRange[];
  width: number;
  height: number;
  minX: number;
  maxX: number;
}) => {
  const seam = new Array<number | null>(height).fill(null);
  if (!seamRaw) return seam;

  const centerX = Math.round((minX + maxX) * 0.5);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row.maxX < row.minX) continue;
    const searchMin = clamp(row.minX, 0, width - 1);
    const searchMax = clamp(row.maxX, 0, width - 1);
    let bestDist = Number.POSITIVE_INFINITY;
    let bestX: number | null = null;
    for (let x = searchMin; x <= searchMax; x++) {
      if (getAlpha(seamRaw, width, height, x, y) < 10) continue;
      const dist = Math.abs(x - centerX);
      if (dist < bestDist) {
        bestDist = dist;
        bestX = x;
      }
    }
    seam[y] = bestX;
  }

  let lastKnown: number | null = null;
  for (let y = 0; y < height; y++) {
    if (seam[y] !== null) lastKnown = seam[y];
    else if (lastKnown !== null) seam[y] = lastKnown;
  }
  lastKnown = null;
  for (let y = height - 1; y >= 0; y--) {
    if (seam[y] !== null) lastKnown = seam[y];
    else if (lastKnown !== null) seam[y] = lastKnown;
  }
  return seam;
};

const smoothSeam = (seam: Array<number | null>, rows: RowRange[], radius: number) => {
  if (radius <= 0) return seam;
  const smoothed = seam.slice();
  for (let y = 0; y < seam.length; y++) {
    if (seam[y] === null) continue;
    const row = rows[y];
    if (row.maxX < row.minX) continue;
    let sum = 0;
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= seam.length) continue;
      const value = seam[yy];
      if (value === null) continue;
      sum += value;
      count++;
    }
    if (!count) continue;
    const rowPad = Math.max(6, Math.round((row.maxX - row.minX + 1) * 0.06));
    const minBoundary = clamp(row.minX + rowPad, row.minX, row.maxX);
    const maxBoundary = clamp(row.maxX - rowPad, row.minX, row.maxX);
    smoothed[y] = clamp(Math.round(sum / count), minBoundary, maxBoundary);
  }
  return smoothed;
};

export const computeDeterministicPantsZoneAnalysis = ({
  unionData,
  seamData,
  width,
  height,
  config,
}: {
  unionData: ImageData | Uint8ClampedArray | Uint8Array;
  seamData?: ImageData | Uint8ClampedArray | Uint8Array | null;
  width: number;
  height: number;
  config: DeterministicStripeZoneConfig;
}): RawZoneAnalysis | null => {
  const unionRaw = getImageDataRaw(unionData, width, height);
  const seamRaw = seamData ? getImageDataRaw(seamData, width, height) : null;
  const scan = scanUnionRows(unionRaw, width, height);
  if (scan.unionPixels <= 0 || scan.maxX < scan.minX || scan.maxY < scan.minY) return null;

  const spanY = Math.max(1, scan.maxY - scan.minY);
  const beltMinY = clamp(
    Math.round(scan.minY + spanY * (config.beltTopYRatio ?? 0.02)),
    scan.minY,
    scan.maxY
  );
  const beltMaxY = clamp(
    Math.round(scan.minY + spanY * (config.beltBottomYRatio ?? 0.98)),
    beltMinY,
    scan.maxY
  );
  const seamGuidanceWeight = Math.max(0, config.seamGuidanceWeight ?? 1);
  const seamFallbackWeight = Math.max(0, config.seamFallbackWeight ?? 0.2);
  const seamRows = smoothSeam(
    sampleSeamByRow({
      seamRaw,
      rows: scan.rows,
      width,
      height,
      minX: scan.minX,
      maxX: scan.maxX,
    }),
    scan.rows,
    clamp(Math.round((config.seamGuidanceBlendPx ?? 16) / 8), 0, 6)
  );

  const zoneMap = new Uint8Array(width * height);

  let leftMainCount = 0;
  let rightUpperCount = 0;
  let rightLowerCount = 0;
  let waistCount = 0;
  let zoneUnionPixels = 0;

  let leftMainBounds: ZoneBounds | null = null;
  let rightUpperBounds: ZoneBounds | null = null;
  let rightLowerBounds: ZoneBounds | null = null;
  let waistBounds: ZoneBounds | null = null;

  for (let y = 0; y < height; y++) {
    const row = scan.rows[y];
    if (row.maxX < row.minX) continue;
    const rowSpan = Math.max(1, row.maxX - row.minX + 1);
    const yNorm = spanY > 0 ? (y - scan.minY) / spanY : 0;
    const fallbackBoundary = clamp(
      Math.round(
        row.minX +
          rowSpan *
            (config.boundaryTopXRatio +
              (config.boundaryBottomXRatio - config.boundaryTopXRatio) * yNorm)
      ),
      row.minX,
      row.maxX
    );
    const seamCandidate = seamRows[y];
    const blendedBoundary =
      seamCandidate === null
        ? fallbackBoundary
        : Math.round(
            (seamCandidate * seamGuidanceWeight + fallbackBoundary * seamFallbackWeight) /
              Math.max(0.0001, seamGuidanceWeight + seamFallbackWeight)
          );

    const waistX = clamp(
      Math.round(row.minX + rowSpan * config.waistXRatio),
      row.minX + 2,
      row.maxX + 1
    );
    const maxBoundary = Math.max(row.minX, waistX - 1);
    const boundaryX = clamp(blendedBoundary, row.minX, maxBoundary);
    const beltStartX = clamp(
      Math.round(row.minX + rowSpan * (config.beltStartXRatio ?? 0.94)),
      row.minX,
      row.maxX
    );

    for (let x = row.minX; x <= row.maxX; x++) {
      const alpha = getAlpha(unionRaw, width, height, x, y);
      if (alpha < 10) continue;
      const pixel = y * width + x;

      const inWaist = x >= waistX || (x >= beltStartX && y >= beltMinY && y <= beltMaxY);
      if (inWaist) {
        zoneMap[pixel] = ZONE_WAIST;
        waistCount++;
        waistBounds = pushBounds(waistBounds, x, y);
        zoneUnionPixels++;
        continue;
      }

      if (x <= boundaryX) {
        zoneMap[pixel] = ZONE_LEFT_MAIN;
        leftMainCount++;
        leftMainBounds = pushBounds(leftMainBounds, x, y);
        zoneUnionPixels++;
        continue;
      }

      const rightSpan = Math.max(1, waistX - boundaryX);
      const rightProgress = clamp((x - boundaryX) / rightSpan, 0, 1);
      const splitY =
        scan.minY + spanY * (config.rightLowerStartYRatio + config.rightLowerSlopeRatio * rightProgress);
      if (y >= splitY) {
        zoneMap[pixel] = ZONE_RIGHT_LOWER;
        rightLowerCount++;
        rightLowerBounds = pushBounds(rightLowerBounds, x, y);
      } else {
        zoneMap[pixel] = ZONE_RIGHT_UPPER;
        rightUpperCount++;
        rightUpperBounds = pushBounds(rightUpperBounds, x, y);
      }
      zoneUnionPixels++;
    }
  }

  const unassignedPixels = Math.max(0, scan.unionPixels - zoneUnionPixels);
  const coverageRatio = scan.unionPixels > 0 ? zoneUnionPixels / scan.unionPixels : 0;
  const minPixels = Math.max(1, config.minPixelThreshold);
  const keyZonesOk = leftMainCount >= minPixels && rightUpperCount >= minPixels;
  const valid =
    coverageRatio >= config.coverageMinRatio &&
    unassignedPixels === 0 &&
    keyZonesOk;

  const maskStats: PantsMaskStats = {
    union: scan.unionPixels,
    left: leftMainCount,
    right: rightUpperCount + rightLowerCount,
    leftMain: leftMainCount,
    leftUnder: 0,
    rightFly: rightUpperCount,
    rightUnder: rightLowerCount,
    main: leftMainCount + rightUpperCount + rightLowerCount,
    waist: waistCount,
    overlap: 0,
    unassigned: unassignedPixels,
    zoneUnion: zoneUnionPixels,
    coverage: coverageRatio,
  };

  return {
    width,
    height,
    zoneMap,
    maskStats,
    zoneBounds: {
      leftMain: leftMainBounds,
      rightUpper: rightUpperBounds,
      rightLower: rightLowerBounds,
      waist: waistBounds,
    },
    validation: {
      valid,
      coverageRatio,
      overlapPixels: 0,
      unassignedPixels,
      zoneUnionPixels,
    },
  };
};

export const buildDeterministicPantsStripeZones = ({
  ctx,
  unionData,
  seamData,
  width,
  height,
  config,
}: {
  ctx: CanvasRenderingContext2D;
  unionData: ImageData;
  seamData?: ImageData | Uint8ClampedArray | Uint8Array | null;
  width: number;
  height: number;
  config: DeterministicStripeZoneConfig;
}): DeterministicPantsStripeZones | null => {
  const analysis = computeDeterministicPantsZoneAnalysis({
    unionData,
    seamData,
    width,
    height,
    config,
  });
  if (!analysis) return null;

  const leftMask = createMask(ctx, width, height);
  const rightMask = createMask(ctx, width, height);
  const leftMain = createMask(ctx, width, height);
  const rightUpper = createMask(ctx, width, height);
  const rightLower = createMask(ctx, width, height);
  const waist = createMask(ctx, width, height);
  const main = createMask(ctx, width, height);

  const unionRaw = unionData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const zone = analysis.zoneMap[pixel];
      if (!zone) continue;
      const idx = pixel * 4;
      const alpha = unionRaw[idx + 3];
      if (alpha < 10) continue;
      if (zone === ZONE_LEFT_MAIN) {
        paintPixel(leftMask, idx, alpha);
        paintPixel(leftMain, idx, alpha);
        paintPixel(main, idx, alpha);
      } else if (zone === ZONE_RIGHT_UPPER) {
        paintPixel(rightMask, idx, alpha);
        paintPixel(rightUpper, idx, alpha);
        paintPixel(main, idx, alpha);
      } else if (zone === ZONE_RIGHT_LOWER) {
        paintPixel(rightMask, idx, alpha);
        paintPixel(rightLower, idx, alpha);
        paintPixel(main, idx, alpha);
      } else if (zone === ZONE_WAIST) {
        paintPixel(waist, idx, alpha);
      }
    }
  }

  const featherPx = Math.max(0, config.boundaryFeatherPx ?? 0);
  const leftMaskUrl = toDataUrl(leftMask, width, height, featherPx);
  const rightMaskUrl = toDataUrl(rightMask, width, height, featherPx);
  const leftMainUrl = toDataUrl(leftMain, width, height, featherPx);
  const rightUpperUrl = toDataUrl(rightUpper, width, height, featherPx);
  const rightLowerUrl =
    analysis.maskStats.rightUnder > 0 ? toDataUrl(rightLower, width, height, featherPx) : null;
  const waistMaskUrl = analysis.maskStats.waist > 0 ? toDataUrl(waist, width, height, featherPx) : null;
  const mainMaskUrl = toDataUrl(main, width, height, 0);

  if (!leftMaskUrl || !rightMaskUrl || !leftMainUrl || !rightUpperUrl || !mainMaskUrl) return null;

  return {
    leftMaskUrl,
    rightMaskUrl,
    leftMainUrl,
    leftUnderUrl: null,
    rightUpperUrl,
    rightLowerUrl,
    waistMaskUrl,
    mainMaskUrl,
    maskStats: analysis.maskStats,
    zoneBounds: analysis.zoneBounds,
    validation: analysis.validation,
  };
};

const angleToVector = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
};

const phaseFromPoint = (x: number, y: number, angleDeg: number) => {
  const vec = angleToVector(angleDeg);
  return x * vec.x + y * vec.y;
};

const normalizePhaseShift = (value: number, period: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(period) || period <= 0) return 0;
  let wrapped = value % period;
  if (wrapped > period / 2) wrapped -= period;
  if (wrapped < -period / 2) wrapped += period;
  return wrapped;
};

const anchorFromBounds = (bounds: ZoneBounds | null, side: "left" | "right") => {
  if (!bounds) return null;
  return {
    x: side === "left" ? bounds.minX : bounds.maxX,
    y: Math.round((bounds.minY + bounds.maxY) * 0.5),
  };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const computePantsStripeAutoPhaseOffsets = ({
  zoneBounds,
  rotations,
  tileSizePx = 84,
}: {
  zoneBounds: PantsStripeZoneBounds;
  rotations: DeterministicPantsZoneAngles;
  tileSizePx?: number;
}): PantsStripeAutoPhaseOffsets => {
  const zero = { x: 0, y: 0 };
  const leftAnchor = anchorFromBounds(zoneBounds.leftMain, "right");
  if (!leftAnchor) {
    return {
      leftMain: zero,
      leftUnderlap: zero,
      rightFly: zero,
      rightUnder: zero,
      waist: zero,
    };
  }

  const referencePhase = phaseFromPoint(leftAnchor.x, leftAnchor.y, rotations.leftMain);
  const buildOffset = (bounds: ZoneBounds | null, angleDeg: number, side: "left" | "right") => {
    const anchor = anchorFromBounds(bounds, side);
    if (!anchor) return zero;
    const targetPhase = phaseFromPoint(anchor.x, anchor.y, angleDeg);
    const shift = normalizePhaseShift(referencePhase - targetPhase, tileSizePx);
    const dir = angleToVector(angleDeg);
    return { x: round2(dir.x * shift), y: round2(dir.y * shift) };
  };

  return {
    leftMain: zero,
    leftUnderlap: zero,
    rightFly: buildOffset(zoneBounds.rightUpper, rotations.rightUpper, "left"),
    rightUnder: buildOffset(zoneBounds.rightLower, rotations.rightLower, "left"),
    waist: buildOffset(zoneBounds.waist, rotations.waist, "left"),
  };
};
