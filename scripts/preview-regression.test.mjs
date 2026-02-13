import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.PARITY_TEST_URL || "http://localhost:3001/custom-suits/debug";
const baselineDir = path.resolve(process.cwd(), "golden", "parity-regression");
const actualDir = path.resolve(process.cwd(), ".tmp", "parity-regression");
const updateGolden = process.env.UPDATE_PARITY_GOLDEN === "1";
const diffThresholdPercent = Number(process.env.PARITY_DIFF_THRESHOLD || "2.5");

const FABRICS = [
  { name: process.env.PARITY_BLUE_LINE || "blue line", slug: "blue-line" },
  { name: process.env.PARITY_STRIPES_BROWN || "stripes brown", slug: "stripes-brown" },
  { name: process.env.PARITY_SIVE_STRIPES || "sive stripes", slug: "sive-stripes" },
  { name: process.env.PARITY_STRIPES || "stripes", slug: "stripes" },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

async function selectFabric(page, fabricName) {
  const exactButton = page
    .locator("aside button")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(fabricName)}\\s*$`, "i") })
    .first();
  if ((await exactButton.count()) > 0) {
    await exactButton.click();
    return;
  }

  const looseButton = page
    .locator("aside button")
    .filter({ hasText: new RegExp(escapeRegExp(fabricName), "i") })
    .first();
  if ((await looseButton.count()) > 0) {
    await looseButton.click();
    return;
  }

  const input = page.getByPlaceholder("npr. blue");
  await input.fill(fabricName);
  await input.dispatchEvent("change");
}

const parseVariantFromRenderSection = (text) => {
  const match = text.match(/variant:\s*([a-z]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
};

async function collectVariantSamples(page, count = 5, delayMs = 200) {
  const section = page.locator("aside section").filter({ hasText: "Render mode" }).first();
  const samples = [];
  for (let i = 0; i < count; i++) {
    samples.push(await section.innerText());
    await page.waitForTimeout(delayMs);
  }
  return samples.map(parseVariantFromRenderSection).filter(Boolean);
}

async function countSyntheticStripeGradients(page) {
  const previewCard = page.locator("div.rounded-lg.bg-white.p-4").first();
  return previewCard.evaluate((node) => {
    const elements = [node, ...Array.from(node.querySelectorAll("*"))];
    let count = 0;
    for (const el of elements) {
      const bgImage = window.getComputedStyle(el).backgroundImage || "";
      if (bgImage.includes("repeating-linear-gradient")) count++;
    }
    return count;
  });
}

async function diffPercent(expectedPath, actualPath) {
  const expected = sharp(expectedPath).ensureAlpha();
  const meta = await expected.metadata();
  assert.ok(meta.width && meta.height, `Unable to read baseline metadata: ${expectedPath}`);

  const width = meta.width;
  const height = meta.height;
  const expectedRaw = await expected.raw().toBuffer();
  const actualRaw = await sharp(actualPath).ensureAlpha().resize(width, height).raw().toBuffer();

  let diffPixels = 0;
  const tolerance = 16;
  for (let i = 0; i < expectedRaw.length; i += 4) {
    const dr = Math.abs(expectedRaw[i] - actualRaw[i]);
    const dg = Math.abs(expectedRaw[i + 1] - actualRaw[i + 1]);
    const db = Math.abs(expectedRaw[i + 2] - actualRaw[i + 2]);
    const da = Math.abs(expectedRaw[i + 3] - actualRaw[i + 3]);
    if (Math.max(dr, dg, db, da) > tolerance) diffPixels++;
  }

  return (diffPixels / (width * height)) * 100;
}

test("stripe parity regression snapshots and synthetic-stripe guard", { timeout: 300_000 }, async () => {
  await fs.mkdir(actualDir, { recursive: true });
  await fs.mkdir(baselineDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1536, height: 980 } });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector('[data-testid="jacket-preview"]', {
      state: "visible",
      timeout: 60_000,
    });

    const previewCard = page.locator("div.rounded-lg.bg-white.p-4").first();
    await previewCard.waitFor({ state: "visible", timeout: 30_000 });

    for (const fabric of FABRICS) {
      await selectFabric(page, fabric.name);
      await page.waitForTimeout(1000);

      const variantSamples = await collectVariantSamples(page);
      const uniqueVariants = new Set(variantSamples);
      assert.ok(
        uniqueVariants.size <= 1,
        `Variant thrash detected for "${fabric.name}": ${variantSamples.join(", ")}`
      );

      const syntheticGradientCount = await countSyntheticStripeGradients(page);
      assert.equal(
        syntheticGradientCount,
        0,
        `Synthetic repeating-linear-gradient detected for "${fabric.name}".`
      );

      const actualPath = path.join(actualDir, `${fabric.slug}.png`);
      const baselinePath = path.join(baselineDir, `${fabric.slug}.png`);
      await previewCard.screenshot({ path: actualPath });

      if (updateGolden) {
        await fs.copyFile(actualPath, baselinePath);
        continue;
      }

      const hasBaseline = await fileExists(baselinePath);
      assert.ok(
        hasBaseline,
        `Missing baseline image: ${path.relative(process.cwd(), baselinePath)} (run with UPDATE_PARITY_GOLDEN=1)`
      );

      const diff = await diffPercent(baselinePath, actualPath);
      assert.ok(
        diff <= diffThresholdPercent,
        `Diff for "${fabric.name}" is ${diff.toFixed(2)}% (allowed <= ${diffThresholdPercent}%)`
      );
    }

    await context.close();
  } finally {
    await browser.close();
  }
});
