import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.PREVIEW_LINING_URL || "http://localhost:3000/custom-suits";
const liningsApiUrl = process.env.PREVIEW_LINING_API_URL || "http://localhost:3000/api/linings";
const outDir = path.resolve(process.cwd(), ".tmp", "preview-lining");
const firstPath = path.join(outDir, "lining-a.png");
const secondPath = path.join(outDir, "lining-b.png");
const minInteriorDiffPercent = Number(process.env.PREVIEW_LINING_MIN_DIFF || "0.4");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const diffPercentInRoi = async (aPath, bPath, roiRatio) => {
  const aMeta = await sharp(aPath).ensureAlpha().metadata();
  assert.ok(aMeta.width && aMeta.height, `Invalid screenshot: ${aPath}`);
  const width = aMeta.width;
  const height = aMeta.height;
  const aRaw = await sharp(aPath).ensureAlpha().raw().toBuffer();
  const bRaw = await sharp(bPath).ensureAlpha().resize(width, height).raw().toBuffer();
  const x0 = clamp(Math.floor(width * roiRatio.x), 0, width - 1);
  const y0 = clamp(Math.floor(height * roiRatio.y), 0, height - 1);
  const x1 = clamp(Math.ceil(width * (roiRatio.x + roiRatio.w)), x0 + 1, width);
  const y1 = clamp(Math.ceil(height * (roiRatio.y + roiRatio.h)), y0 + 1, height);
  let total = 0;
  let diff = 0;
  const tolerance = 8;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      total++;
      const dr = Math.abs(aRaw[i] - bRaw[i]);
      const dg = Math.abs(aRaw[i + 1] - bRaw[i + 1]);
      const db = Math.abs(aRaw[i + 2] - bRaw[i + 2]);
      const da = Math.abs(aRaw[i + 3] - bRaw[i + 3]);
      if (Math.max(dr, dg, db, da) > tolerance) diff++;
    }
  }
  return total > 0 ? (diff / total) * 100 : 0;
};

const fetchLinings = async () => {
  const response = await fetch(liningsApiUrl);
  assert.ok(response.ok, `Unable to fetch linings from ${liningsApiUrl}`);
  const json = await response.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((item, index) => ({
      id: String(item?.id ?? index),
      name: String(item?.name ?? item?.id ?? "").trim(),
      texture: typeof item?.texture === "string" ? item.texture.trim() : "",
    }))
    .filter((item) => item.name.length > 0);
};

const pickLiningPair = (linings) => {
  if (linings.length < 2) return null;
  const withTexture = linings.find((item) => item.texture.length > 0);
  const withoutTexture = linings.find((item) => item.texture.length === 0);
  if (withTexture && withoutTexture && withTexture.id !== withoutTexture.id) {
    return [withTexture, withoutTexture];
  }
  return [linings[0], linings[1]];
};

const clickDetailsSection = async (page) => {
  const detailsBtn = page.getByRole("button", { name: /Detalji/i }).first();
  if ((await detailsBtn.count()) === 0) return;
  await detailsBtn.click();
  await page.waitForTimeout(600);
};

const clickLiningByName = async (page, name) => {
  const exact = page
    .locator("button")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`, "i") })
    .first();
  if ((await exact.count()) > 0) {
    await exact.click();
    return;
  }
  const loose = page
    .locator("button")
    .filter({ hasText: new RegExp(escapeRegExp(name), "i") })
    .first();
  assert.ok((await loose.count()) > 0, `Lining button not found: ${name}`);
  await loose.click();
};

test("changing lining updates jacket interior pixels", { timeout: 180_000 }, async () => {
  await fs.mkdir(outDir, { recursive: true });
  const linings = await fetchLinings();
  const pair = pickLiningPair(linings);
  assert.ok(pair, "Need at least two linings from API for preview lining test.");
  const [firstLining, secondLining] = pair;
  assert.notEqual(firstLining.id, secondLining.id, "Two distinct linings are required.");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForSelector('[data-testid="jacket-preview"]', { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1800);

    await clickDetailsSection(page);
    await clickLiningByName(page, firstLining.name);
    await page.waitForTimeout(1000);
    await page.getByTestId("jacket-preview").first().screenshot({ path: firstPath });

    await clickLiningByName(page, secondLining.name);
    await page.waitForTimeout(1000);
    await page.getByTestId("jacket-preview").first().screenshot({ path: secondPath });

    const interiorDiff = await diffPercentInRoi(firstPath, secondPath, {
      x: 0.35,
      y: 0.06,
      w: 0.3,
      h: 0.56,
    });
    assert.ok(
      interiorDiff >= minInteriorDiffPercent,
      `Interior ROI diff too low: ${interiorDiff.toFixed(3)}% (required >= ${minInteriorDiffPercent}%)`
    );
  } finally {
    await browser.close();
  }
});
