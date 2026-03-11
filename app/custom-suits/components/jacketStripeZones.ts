"use client";

import type { JacketStripeBoundaries } from "./jacketStripeTuning";

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type JacketStripeZoneStats = {
  unionPixels: number;
  bodyNoLapelPixels: number;
  lapelLeftPixels: number;
  lapelRightPixels: number;
  coverageRatio: number;
  valid: boolean;
  minLapelPixels: number;
  lapelBounds: Bounds;
};

export type JacketStripeZones = {
  bodyNoLapelUrl: string;
  lapelLeftUrl: string;
  lapelRightUrl: string;
  stats: JacketStripeZoneStats;
};

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
  featherPx: number
): string | null => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.putImageData(imgData, 0, 0);
  if (featherPx <= 0) return canvas.toDataURL("image/png");

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return canvas.toDataURL("image/png");
  blurCtx.filter = `blur(${featherPx}px)`;
  blurCtx.drawImage(canvas, 0, 0);
  blurCtx.filter = "none";
  blurCtx.drawImage(canvas, 0, 0);
  return blurCanvas.toDataURL("image/png");
};

const getMaskBounds = (raw: Uint8ClampedArray, width: number, height: number): Bounds | null => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (raw[idx + 3] < 10) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, maxX, minY, maxY };
};

export const buildJacketStripeZones = ({
  ctx,
  unionData,
  lapelData,
  width,
  height,
  config,
}: {
  ctx: CanvasRenderingContext2D;
  unionData: ImageData;
  lapelData: ImageData;
  width: number;
  height: number;
  config: JacketStripeBoundaries;
}): JacketStripeZones | null => {
  const unionRaw = unionData.data;
  const lapelRaw = lapelData.data;
  const lapelBounds = getMaskBounds(lapelRaw, width, height);
  if (!lapelBounds) return null;

  const bodyMask = createMask(ctx, width, height);
  const lapelLeftMask = createMask(ctx, width, height);
  const lapelRightMask = createMask(ctx, width, height);

  const spanX = Math.max(1, lapelBounds.maxX - lapelBounds.minX);
  const spanY = Math.max(1, lapelBounds.maxY - lapelBounds.minY);
  const centerX = Math.round((lapelBounds.minX + lapelBounds.maxX) * 0.5);
  const topY = Math.max(
    lapelBounds.minY,
    Math.min(lapelBounds.maxY, Math.round(lapelBounds.minY + spanY * config.topYRatio))
  );
  const bottomY = Math.max(
    topY,
    Math.min(lapelBounds.maxY, Math.round(lapelBounds.minY + spanY * config.bottomYRatio))
  );

  let unionPixels = 0;
  let bodyNoLapelPixels = 0;
  let lapelLeftPixels = 0;
  let lapelRightPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const unionAlpha = unionRaw[idx + 3];
      if (unionAlpha < 10) continue;
      unionPixels++;

      const lapelVisible = lapelRaw[idx + 3] >= 10;
      const yNorm = spanY > 0 ? Math.max(0, Math.min(1, (y - lapelBounds.minY) / spanY)) : 0;
      const innerDist = spanX * (config.innerTopXRatio + (config.innerBottomXRatio - config.innerTopXRatio) * yNorm);
      const outerDist = spanX * (config.outerTopXRatio + (config.outerBottomXRatio - config.outerTopXRatio) * yNorm);
      const leftInner = centerX - innerDist;
      const leftOuter = centerX - outerDist;
      const rightInner = centerX + innerDist;
      const rightOuter = centerX + outerDist;
      const inBand = y >= topY && y <= bottomY;
      if (lapelVisible && inBand) {
        if (x >= leftOuter && x <= leftInner) {
          paintPixel(lapelLeftMask, idx, unionAlpha);
          lapelLeftPixels++;
        } else if (x >= rightInner && x <= rightOuter) {
          paintPixel(lapelRightMask, idx, unionAlpha);
          lapelRightPixels++;
        } else {
          paintPixel(bodyMask, idx, unionAlpha);
          bodyNoLapelPixels++;
        }
      } else {
        paintPixel(bodyMask, idx, unionAlpha);
        bodyNoLapelPixels++;
      }
    }
  }

  const minLapelPixels = Math.max(1, config.minLapelPixels);
  const zonePixels = bodyNoLapelPixels + lapelLeftPixels + lapelRightPixels;
  const coverageRatio = unionPixels > 0 ? zonePixels / unionPixels : 0;
  const valid =
    unionPixels > 0 &&
    coverageRatio >= 0.995 &&
    lapelLeftPixels >= minLapelPixels &&
    lapelRightPixels >= minLapelPixels;

  const featherPx = Math.max(0, config.featherPx);
  const bodyNoLapelUrl = toDataUrl(bodyMask, width, height, featherPx * 0.5);
  const lapelLeftUrl = toDataUrl(lapelLeftMask, width, height, featherPx);
  const lapelRightUrl = toDataUrl(lapelRightMask, width, height, featherPx);
  if (!bodyNoLapelUrl || !lapelLeftUrl || !lapelRightUrl) return null;

  return {
    bodyNoLapelUrl,
    lapelLeftUrl,
    lapelRightUrl,
    stats: {
      unionPixels,
      bodyNoLapelPixels,
      lapelLeftPixels,
      lapelRightPixels,
      coverageRatio,
      valid,
      minLapelPixels,
      lapelBounds,
    },
  };
};
