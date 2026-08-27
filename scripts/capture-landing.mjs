/**
 * Screenshot the landing page at successive scroll positions.
 *
 * Design work on this page cannot be done from the source alone — three CSS
 * layers overlap and the lux layer overrides the template in ways that are
 * only obvious on screen. The in-app preview pane does not composite frames in
 * this repo, so this is how the page gets looked at.
 *
 *   node scripts/capture-landing.mjs [url] [--mobile]
 *
 * Writes tmp/landing/<viewport>-<index>.png.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000/";
const mobile = process.argv.includes("--mobile");
const shots = Number(process.env.LANDING_SHOTS || 7);

const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const label = mobile ? "mobile" : "desktop";
const outDir = path.resolve(process.cwd(), "tmp", "landing");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
const page = await context.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await fs.mkdir(outDir, { recursive: true });
await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });

// Past the preloader curtain and the hero's entrance before anything is judged.
await page.waitForTimeout(5000);

const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const step = Math.max(1, Math.floor(viewport.height * 0.9));

for (let i = 0; i < shots; i += 1) {
  const y = Math.min(i * step, Math.max(0, pageHeight - viewport.height));
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  // Lenis eases toward the target and scrub tweens settle a frame later.
  await page.waitForTimeout(1100);
  const file = path.join(outDir, `${label}-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  console.log(`${file}  y=${y}`);
}

console.log(JSON.stringify({ url, label, pageHeight, errors }, null, 2));
await browser.close();
