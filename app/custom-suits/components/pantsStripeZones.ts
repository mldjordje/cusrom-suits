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
  validation: {
    valid: boolean;
    coverageRatio: number;
    overlapPixels: number;
    unassignedPixels: number;
    zoneUnionPixels: number;
  };
};

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
  ctx: CanvasRenderingContext2D,
  imgData: ImageData,
  width: number,
  height: number,
  featherPx = 0
) => {
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
    // Keep center fully opaque while preserving feathered edges.
    sctx.drawImage(canvas, 0, 0);
    return softCanvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/png");
};

export const buildDeterministicPantsStripeZones = ({
  ctx,
  unionData,
  width,
  height,
  config,
}: {
  ctx: CanvasRenderingContext2D;
  unionData: ImageData;
  width: number;
  height: number;
  config: DeterministicStripeZoneConfig;
}): DeterministicPantsStripeZones | null => {
  const data = unionData.data;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let unionCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 10) continue;
      unionCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (unionCount <= 0 || maxX < minX || maxY < minY) return null;

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const minPixels = Math.max(1, config.minPixelThreshold);

  const waistX = clamp(Math.round(width * config.waistXRatio), minX + 1, maxX + 1);
  const beltStartX = clamp(
    Math.round(minX + spanX * (config.beltStartXRatio ?? 0.93)),
    minX,
    maxX
  );
  const beltMinY = clamp(
    Math.round(minY + spanY * (config.beltTopYRatio ?? 0.02)),
    minY,
    maxY
  );
  const beltMaxY = clamp(
    Math.round(minY + spanY * (config.beltBottomYRatio ?? 0.98)),
    beltMinY,
    maxY
  );
  const boundaryTopX = clamp(
    Math.round(minX + spanX * config.boundaryTopXRatio),
    minX,
    Math.max(minX, waistX - 1)
  );
  const boundaryBottomX = clamp(
    Math.round(minX + spanX * config.boundaryBottomXRatio),
    minX,
    Math.max(minX, waistX - 1)
  );

  const leftMask = createMask(ctx, width, height);
  const rightMask = createMask(ctx, width, height);
  const leftMain = createMask(ctx, width, height);
  const leftUnder = createMask(ctx, width, height);
  const rightUpper = createMask(ctx, width, height);
  const rightLower = createMask(ctx, width, height);
  const waist = createMask(ctx, width, height);
  const main = createMask(ctx, width, height);

  let leftCount = 0;
  let rightCount = 0;
  let leftMainCount = 0;
  let leftUnderCount = 0;
  let rightUpperCount = 0;
  let rightLowerCount = 0;
  let waistCount = 0;
  let mainCount = 0;

  let overlapPixels = 0;
  let unassignedPixels = 0;
  let zoneUnionPixels = 0;

  for (let y = 0; y < height; y++) {
    const yNorm = spanY > 0 ? (y - minY) / spanY : 0;
    const boundaryX = clamp(
      Math.round(boundaryTopX + (boundaryBottomX - boundaryTopX) * yNorm),
      minX,
      Math.max(minX, waistX - 1)
    );

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 10) continue;

      let assigned = 0;

      const inBelt = x >= beltStartX && y >= beltMinY && y <= beltMaxY;

      if (inBelt) {
        paintPixel(waist, idx, alpha);
        waistCount++;
        assigned++;
      } else if (x >= waistX) {
        paintPixel(waist, idx, alpha);
        waistCount++;
        assigned++;
      } else {
        paintPixel(main, idx, alpha);
        mainCount++;
        if (x >= boundaryX) {
          paintPixel(rightMask, idx, alpha);
          rightCount++;
          const rightSpan = Math.max(1, waistX - boundaryX);
          const rightProgress = clamp((x - boundaryX) / rightSpan, 0, 1);
          const splitY =
            minY + spanY * (config.rightLowerStartYRatio + config.rightLowerSlopeRatio * rightProgress);
          if (y >= splitY) {
            paintPixel(rightLower, idx, alpha);
            rightLowerCount++;
          } else {
            paintPixel(rightUpper, idx, alpha);
            rightUpperCount++;
          }
          assigned++;
        } else {
          paintPixel(leftMask, idx, alpha);
          paintPixel(leftMain, idx, alpha);
          leftCount++;
          leftMainCount++;
          assigned++;
        }
      }

      if (assigned === 0) {
        unassignedPixels++;
      } else {
        zoneUnionPixels++;
      }
      if (assigned > 1) overlapPixels++;
    }
  }

  const coverageRatio = unionCount > 0 ? zoneUnionPixels / unionCount : 0;
  const keyZonesOk = leftMainCount >= minPixels && rightUpperCount >= minPixels;
  const valid =
    coverageRatio >= config.coverageMinRatio &&
    overlapPixels === 0 &&
    unassignedPixels === 0 &&
    keyZonesOk;

  const featherPx = Math.max(0, config.boundaryFeatherPx ?? 0);
  const leftMaskUrl = toDataUrl(ctx, leftMask, width, height, featherPx);
  const rightMaskUrl = toDataUrl(ctx, rightMask, width, height, featherPx);
  const leftMainUrl = toDataUrl(ctx, leftMain, width, height, featherPx);
  const leftUnderUrl = leftUnderCount > 0 ? toDataUrl(ctx, leftUnder, width, height, featherPx) : null;
  const rightUpperUrl = toDataUrl(ctx, rightUpper, width, height, featherPx);
  const rightLowerUrl =
    rightLowerCount > 0 ? toDataUrl(ctx, rightLower, width, height, featherPx) : null;
  const waistMaskUrl = waistCount > 0 ? toDataUrl(ctx, waist, width, height, featherPx) : null;
  const mainMaskUrl = toDataUrl(ctx, main, width, height);

  if (!leftMaskUrl || !rightMaskUrl || !leftMainUrl || !rightUpperUrl || !mainMaskUrl) return null;

  const maskStats: PantsMaskStats = {
    union: unionCount,
    left: leftCount,
    right: rightCount,
    leftMain: leftMainCount,
    leftUnder: leftUnderCount,
    rightFly: rightUpperCount,
    rightUnder: rightLowerCount,
    main: mainCount,
    waist: waistCount,
    overlap: overlapPixels,
    unassigned: unassignedPixels,
    zoneUnion: zoneUnionPixels,
    coverage: coverageRatio,
  };

  return {
    leftMaskUrl,
    rightMaskUrl,
    leftMainUrl,
    leftUnderUrl,
    rightUpperUrl,
    rightLowerUrl,
    waistMaskUrl,
    mainMaskUrl,
    maskStats,
    validation: {
      valid,
      coverageRatio,
      overlapPixels,
      unassignedPixels,
      zoneUnionPixels,
    },
  };
};
