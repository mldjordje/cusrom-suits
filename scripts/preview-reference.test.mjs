import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.PREVIEW_TUNING_URL || "http://localhost:3000/admin/preview-tuning";
const desiredRefPath = path.resolve(process.cwd(), "pantsdesired.png");
const stripeRefPath = path.resolve(process.cwd(), "stripe reference.png");
const outDir = path.resolve(process.cwd(), ".tmp", "preview-reference");
const actualPath = path.join(outDir, "actual-preview.png");
const jacketPath = path.join(outDir, "actual-jacket.png");
const diffThresholdPercent = Number(process.env.PREVIEW_REF_DIFF_THRESHOLD || "100");
const zoneAngleToleranceDeg = Number(process.env.PREVIEW_REF_ANGLE_TOLERANCE || "14");
const silhouetteMinIou = Number(process.env.PREVIEW_REF_MIN_IOU || "0.88");
const stripeFabricName = process.env.PREVIEW_REF_FABRIC || "blue line";
const lapelMinDeltaDeg = Number(process.env.PREVIEW_REF_LAPEL_MIN_DELTA || "10");
const pocketEdgeMinStrength = Number(process.env.PREVIEW_REF_POCKET_EDGE_MIN || "0.8");
const pocketEdgeMinRatio = Number(process.env.PREVIEW_REF_POCKET_EDGE_RATIO || "1.08");
const assertLapelAngles = process.env.PREVIEW_REF_ASSERT_LAPEL === "1";

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lineAngleDelta = (a, b) => {
  const raw = Math.abs(a - b) % 180;
  return Math.min(raw, 180 - raw);
};

const buildForegroundMask = (raw, width, height, threshold = 18) => {
  const bg = [raw[0], raw[1], raw[2]];
  const mask = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const d =
        Math.abs(raw[i] - bg[0]) + Math.abs(raw[i + 1] - bg[1]) + Math.abs(raw[i + 2] - bg[2]);
      if (d > threshold) {
        const idx = y * width + x;
        mask[idx] = 1;
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bbox =
    count > 0
      ? { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : { left: 0, top: 0, width, height };
  return { mask, bbox };
};

const buildAnnotationMask = (raw, width, height) => {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      const isRed = r > 170 && r - g > 70 && r - b > 70;
      const isBlue = b > 160 && b - r > 40 && b - g > 40;
      if (isRed || isBlue) mask[y * width + x] = 1;
    }
  }
  return mask;
};

const dominantLineAngleFromRoi = (raw, width, height, roi, ignoreMask = null) => {
  const bins = 180;
  const hist = new Float64Array(bins);
  const x0 = clamp(Math.floor(roi.x), 1, width - 2);
  const y0 = clamp(Math.floor(roi.y), 1, height - 2);
  const x1 = clamp(Math.ceil(roi.x + roi.w), 2, width - 1);
  const y1 = clamp(Math.ceil(roi.y + roi.h), 2, height - 1);
  const gray = (x, y) => {
    const i = (y * width + x) * 4;
    return raw[i] * 0.2126 + raw[i + 1] * 0.7152 + raw[i + 2] * 0.0722;
  };

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * width + x;
      if (ignoreMask?.[idx]) continue;
      const gx =
        -gray(x - 1, y - 1) +
        gray(x + 1, y - 1) -
        2 * gray(x - 1, y) +
        2 * gray(x + 1, y) -
        gray(x - 1, y + 1) +
        gray(x + 1, y + 1);
      const gy =
        -gray(x - 1, y - 1) -
        2 * gray(x, y - 1) -
        gray(x + 1, y - 1) +
        gray(x - 1, y + 1) +
        2 * gray(x, y + 1) +
        gray(x + 1, y + 1);
      const mag = Math.hypot(gx, gy);
      if (mag < 18) continue;
      let lineDeg = (Math.atan2(gy, gx) * 180) / Math.PI + 90;
      while (lineDeg < -90) lineDeg += 180;
      while (lineDeg >= 90) lineDeg -= 180;
      const bin = clamp(Math.floor(lineDeg + 90), 0, bins - 1);
      hist[bin] += mag;
    }
  }
  let best = 0;
  let bestIdx = 90;
  for (let i = 0; i < bins; i++) {
    if (hist[i] > best) {
      best = hist[i];
      bestIdx = i;
    }
  }
  return best > 0 ? bestIdx - 90 : 0;
};

const directionalEdgeStrengthFromRoi = (raw, width, height, roi, axis = "y") => {
  const x0 = clamp(Math.floor(roi.x), 1, width - 2);
  const y0 = clamp(Math.floor(roi.y), 1, height - 2);
  const x1 = clamp(Math.ceil(roi.x + roi.w), 2, width - 1);
  const y1 = clamp(Math.ceil(roi.y + roi.h), 2, height - 1);
  const gray = (x, y) => {
    const i = (y * width + x) * 4;
    return raw[i] * 0.2126 + raw[i + 1] * 0.7152 + raw[i + 2] * 0.0722;
  };
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const g0 = gray(x, y);
      const g1 = axis === "x" ? gray(x + 1, y) : gray(x, y + 1);
      sum += Math.abs(g1 - g0);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
};

const clickViewMode = async (page, label) => {
  const exact = page
    .locator("button")
    .filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, "i") })
    .first();
  assert.ok((await exact.count()) > 0, `View button not found: ${label}`);
  await exact.click();
};

const cropByForeground = async (inputPath, outputPath) => {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { bbox } = buildForegroundMask(data, info.width, info.height, 18);
  const crop = await sharp(inputPath)
    .extract({
      left: bbox.left,
      top: bbox.top,
      width: bbox.width,
      height: bbox.height,
    })
    .png()
    .toBuffer();
  await fs.writeFile(outputPath, crop);
};

const diffPercentMasked = async (referencePath, actualPath, annotationMask = null) => {
  const refMeta = await sharp(referencePath).ensureAlpha().metadata();
  assert.ok(refMeta.width && refMeta.height, `Invalid reference image: ${referencePath}`);
  const width = refMeta.width;
  const height = refMeta.height;
  const refRaw = await sharp(referencePath).ensureAlpha().raw().toBuffer();
  const actRaw = await sharp(actualPath).ensureAlpha().resize(width, height).raw().toBuffer();
  const tolerance = 16;
  let pixels = 0;
  let diff = 0;

  for (let i = 0, p = 0; i < refRaw.length; i += 4, p++) {
    if (annotationMask?.[p]) continue;
    pixels++;
    const dr = Math.abs(refRaw[i] - actRaw[i]);
    const dg = Math.abs(refRaw[i + 1] - actRaw[i + 1]);
    const db = Math.abs(refRaw[i + 2] - actRaw[i + 2]);
    const da = Math.abs(refRaw[i + 3] - actRaw[i + 3]);
    if (Math.max(dr, dg, db, da) > tolerance) diff++;
  }
  return pixels > 0 ? (diff / pixels) * 100 : 100;
};

const silhouetteIou = async (aPath, bPath) => {
  const aMeta = await sharp(aPath).ensureAlpha().metadata();
  assert.ok(aMeta.width && aMeta.height, `Invalid image: ${aPath}`);
  const w = aMeta.width;
  const h = aMeta.height;
  const aRaw = await sharp(aPath).ensureAlpha().raw().toBuffer();
  const bRaw = await sharp(bPath).ensureAlpha().resize(w, h).raw().toBuffer();
  let inter = 0;
  let union = 0;
  for (let i = 0; i < aRaw.length; i += 4) {
    const af = aRaw[i + 3] > 12;
    const bf = bRaw[i + 3] > 12;
    if (af || bf) union++;
    if (af && bf) inter++;
  }
  return union > 0 ? inter / union : 0;
};

test("preview tuning matches stripe references", { timeout: 300_000 }, async () => {
  assert.ok(await fileExists(desiredRefPath), "Missing pantsdesired.png in project root");
  assert.ok(await fileExists(stripeRefPath), "Missing stripe reference.png in project root");
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(3200);

    const compare = page.getByLabel("Compare baseline / tuned");
    if ((await compare.count()) > 0 && (await compare.isChecked())) await compare.uncheck();
    await clickViewMode(page, "pants");
    await page.waitForTimeout(900);

    const fabricButton = page
      .locator("button")
      .filter({ hasText: new RegExp(`^\\s*${stripeFabricName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*ID:`, "i") })
      .first();
    assert.ok((await fabricButton.count()) > 0, `Stripe fabric not found in list: ${stripeFabricName}`);
    await fabricButton.click();
    await page.waitForTimeout(1400);

    const pantsCard = page.locator('xpath=//div[contains(@class,"max-w-[560px]")]').first();
    await pantsCard.screenshot({ path: actualPath });

    await clickViewMode(page, "jacket");
    await page.waitForTimeout(1000);
    const jacketPreview = page.getByTestId("jacket-preview").first();
    await jacketPreview.screenshot({ path: jacketPath });

    const actualCropPath = path.join(outDir, "actual-crop.png");
    const desiredCropPath = path.join(outDir, "desired-crop.png");
    const stripeCropPath = path.join(outDir, "stripe-ref-crop.png");
    await cropByForeground(actualPath, actualCropPath);
    await cropByForeground(desiredRefPath, desiredCropPath);
    await cropByForeground(stripeRefPath, stripeCropPath);

    const iou = await silhouetteIou(desiredCropPath, actualCropPath);

    const stripeRawObj = await sharp(stripeCropPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const stripeAnnotationMask = buildAnnotationMask(
      stripeRawObj.data,
      stripeRawObj.info.width,
      stripeRawObj.info.height
    );
    const stripeDiff = await diffPercentMasked(stripeCropPath, actualCropPath, stripeAnnotationMask);

    const desiredMeta = await sharp(desiredCropPath).ensureAlpha().metadata();
    const actualResizedRaw = await sharp(actualCropPath)
      .ensureAlpha()
      .resize(desiredMeta.width, desiredMeta.height)
      .raw()
      .toBuffer();
    const w = desiredMeta.width ?? 1;
    const h = desiredMeta.height ?? 1;
    const rois = {
      left: { x: w * 0.06, y: h * 0.14, w: w * 0.46, h: h * 0.74 },
      rightUpper: { x: w * 0.52, y: h * 0.1, w: w * 0.4, h: h * 0.42 },
      waist: { x: w * 0.9, y: h * 0.04, w: w * 0.09, h: h * 0.9 },
    };

    const actualAngles = {
      left: dominantLineAngleFromRoi(actualResizedRaw, w, h, rois.left),
      rightUpper: dominantLineAngleFromRoi(actualResizedRaw, w, h, rois.rightUpper),
      waist: dominantLineAngleFromRoi(actualResizedRaw, w, h, rois.waist),
    };
    const stripeRefRaw = await sharp(stripeCropPath)
      .ensureAlpha()
      .resize(w, h)
      .raw()
      .toBuffer();
    const stripeRefAnnMask = buildAnnotationMask(stripeRefRaw, w, h);
    const stripeAngles = {
      left: dominantLineAngleFromRoi(stripeRefRaw, w, h, rois.left, stripeRefAnnMask),
      rightUpper: dominantLineAngleFromRoi(stripeRefRaw, w, h, rois.rightUpper, stripeRefAnnMask),
      waist: dominantLineAngleFromRoi(stripeRefRaw, w, h, rois.waist, stripeRefAnnMask),
    };
    const jacketRawObj = await sharp(jacketPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const jw = jacketRawObj.info.width;
    const jh = jacketRawObj.info.height;
    const jacketBodyRoi = { x: jw * 0.45, y: jh * 0.2, w: jw * 0.12, h: jh * 0.42 };
    const jacketLapelLeftRoi = { x: jw * 0.24, y: jh * 0.1, w: jw * 0.14, h: jh * 0.14 };
    const jacketLapelRightRoi = { x: jw * 0.62, y: jh * 0.1, w: jw * 0.14, h: jh * 0.14 };
    const jacketAngles = {
      body: dominantLineAngleFromRoi(jacketRawObj.data, jw, jh, jacketBodyRoi),
      lapelLeft: dominantLineAngleFromRoi(jacketRawObj.data, jw, jh, jacketLapelLeftRoi),
      lapelRight: dominantLineAngleFromRoi(jacketRawObj.data, jw, jh, jacketLapelRightRoi),
    };
    const lapelAngleDelta = {
      left: lineAngleDelta(jacketAngles.body, jacketAngles.lapelLeft),
      right: lineAngleDelta(jacketAngles.body, jacketAngles.lapelRight),
    };
    const jacketPocketLeftRoi = { x: jw * 0.24, y: jh * 0.47, w: jw * 0.19, h: jh * 0.11 };
    const jacketPocketRightRoi = { x: jw * 0.57, y: jh * 0.47, w: jw * 0.19, h: jh * 0.11 };
    const jacketPocketLeftControlRoi = { x: jw * 0.24, y: jh * 0.38, w: jw * 0.19, h: jh * 0.11 };
    const jacketPocketRightControlRoi = { x: jw * 0.57, y: jh * 0.38, w: jw * 0.19, h: jh * 0.11 };
    const pocketEdges = {
      left: directionalEdgeStrengthFromRoi(jacketRawObj.data, jw, jh, jacketPocketLeftRoi, "x"),
      leftControl: directionalEdgeStrengthFromRoi(jacketRawObj.data, jw, jh, jacketPocketLeftControlRoi, "x"),
      right: directionalEdgeStrengthFromRoi(jacketRawObj.data, jw, jh, jacketPocketRightRoi, "x"),
      rightControl: directionalEdgeStrengthFromRoi(
        jacketRawObj.data,
        jw,
        jh,
        jacketPocketRightControlRoi,
        "x"
      ),
    };

    assert.ok(
      iou >= silhouetteMinIou,
      `Silhouette IoU too low: ${(iou * 100).toFixed(2)}% (required >= ${(silhouetteMinIou * 100).toFixed(2)}%)`
    );
    if (diffThresholdPercent < 100) {
      const desiredDiff = await diffPercentMasked(desiredCropPath, actualCropPath);
      assert.ok(
        desiredDiff <= diffThresholdPercent,
        `Desired reference diff too high: ${desiredDiff.toFixed(2)}% (required <= ${diffThresholdPercent.toFixed(2)}%)`
      );
      assert.ok(
        stripeDiff <= diffThresholdPercent,
        `Stripe reference diff too high: ${stripeDiff.toFixed(2)}% (required <= ${diffThresholdPercent.toFixed(2)}%)`
      );
    }
    const stripeAngleDiff = {
      left: lineAngleDelta(actualAngles.left, stripeAngles.left),
      rightUpper: lineAngleDelta(actualAngles.rightUpper, stripeAngles.rightUpper),
      waist: lineAngleDelta(actualAngles.waist, stripeAngles.waist),
    };
    assert.ok(
      stripeAngleDiff.left <= zoneAngleToleranceDeg + 6,
      `left zone angle vs stripe-reference mismatch: got ${actualAngles.left.toFixed(1)} vs stripe-ref ${stripeAngles.left.toFixed(1)}`
    );
    assert.ok(
      stripeAngleDiff.rightUpper <= zoneAngleToleranceDeg + 6,
      `right-upper angle vs stripe-reference mismatch: got ${actualAngles.rightUpper.toFixed(1)} vs stripe-ref ${stripeAngles.rightUpper.toFixed(1)}`
    );
    assert.ok(
      stripeAngleDiff.waist <= zoneAngleToleranceDeg + 8,
      `waist angle vs stripe-reference mismatch: got ${actualAngles.waist.toFixed(1)} vs stripe-ref ${stripeAngles.waist.toFixed(1)}`
    );
    if (assertLapelAngles) {
      assert.ok(
        lapelAngleDelta.left >= lapelMinDeltaDeg,
        `left lapel stripe angle too close to body: body ${jacketAngles.body.toFixed(1)} / lapel ${jacketAngles.lapelLeft.toFixed(1)}`
      );
      assert.ok(
        lapelAngleDelta.right >= lapelMinDeltaDeg,
        `right lapel stripe angle too close to body: body ${jacketAngles.body.toFixed(1)} / lapel ${jacketAngles.lapelRight.toFixed(1)}`
      );
    }
    assert.ok(
      pocketEdges.left - pocketEdges.leftControl >= pocketEdgeMinStrength &&
        pocketEdges.left / Math.max(0.001, pocketEdges.leftControl) >= pocketEdgeMinRatio,
      `left pocket edge contrast too low: pocket=${pocketEdges.left.toFixed(2)} control=${pocketEdges.leftControl.toFixed(
        2
      )}`
    );
    assert.ok(
      pocketEdges.right - pocketEdges.rightControl >= pocketEdgeMinStrength &&
        pocketEdges.right / Math.max(0.001, pocketEdges.rightControl) >= pocketEdgeMinRatio,
      `right pocket edge contrast too low: pocket=${pocketEdges.right.toFixed(2)} control=${pocketEdges.rightControl.toFixed(
        2
      )}`
    );
    void stripeDiff;
  } finally {
    await browser.close();
  }
});
