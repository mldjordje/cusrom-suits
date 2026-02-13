import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PARITY_CAPTURE_URL || "http://localhost:3001/custom-suits/debug";
const outDir = path.resolve(process.cwd(), "golden", "parity-regression");

const FABRICS = [
  { name: process.env.PARITY_BLUE_LINE || "blue line", slug: "blue-line" },
  { name: process.env.PARITY_STRIPES_BROWN || "stripes brown", slug: "stripes-brown" },
  { name: process.env.PARITY_SIVE_STRIPES || "sive stripes", slug: "sive-stripes" },
  { name: process.env.PARITY_STRIPES || "stripes", slug: "stripes" },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

async function capture(page, fabric, destinationPath) {
  await selectFabric(page, fabric.name);
  await page.waitForTimeout(900);

  const previewCard = page.locator("div.rounded-lg.bg-white.p-4").first();
  await previewCard.waitFor({ state: "visible", timeout: 30_000 });
  await previewCard.screenshot({ path: destinationPath });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 980 } });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="jacket-preview"]', {
    state: "visible",
    timeout: 60_000,
  });

  const outputs = [];
  for (const fabric of FABRICS) {
    const filePath = path.join(outDir, `${fabric.slug}.png`);
    await capture(page, fabric, filePath);
    outputs.push(path.relative(process.cwd(), filePath));
  }

  await browser.close();
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        outDir,
        files: outputs,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
