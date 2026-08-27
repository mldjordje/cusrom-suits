/**
 * Report the computed state of the landing page's motion hooks.
 *
 * Exists because "the section titles are missing" is not something the source
 * can answer: the element is in the SSR HTML either way, and what matters is
 * whether SplitText's mask ended up with height, whether the reveal tween ran,
 * and what the box actually measures after layout.
 *
 *   node scripts/probe-landing.mjs [url]
 */
import { chromium } from "playwright";

const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000/";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(5000);

// Walk the whole page so triggers below the fold actually fire.
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < height; y += 700) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(120);
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(800);

const report = await page.evaluate(() => {
  const describe = (el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || "").trim().slice(0, 34),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      overflow: cs.overflow,
      transform: cs.transform === "none" ? "none" : "set",
    };
  };

  const headings = Array.from(document.querySelectorAll("[data-m-heading]")).map((el) => {
    const lines = Array.from(el.querySelectorAll("div, span")).filter((n) =>
      /line/i.test(n.className || ""),
    );
    return {
      ...describe(el),
      childCount: el.children.length,
      lineNodes: lines.length,
      firstLine: lines[0] ? describe(lines[0]) : null,
      maskParent: lines[0]?.parentElement ? describe(lines[0].parentElement) : null,
    };
  });

  const rises = Array.from(document.querySelectorAll("[data-m-rise]")).map(describe);
  const cards = Array.from(document.querySelectorAll("[data-m-card]")).slice(0, 4).map(describe);

  return {
    motionReady: document.documentElement.classList.contains("motion-ready"),
    luxReady: Boolean(document.querySelector(".ss-lux.lux-fx-ready")),
    lenisClasses: document.documentElement.className.split(/\s+/).filter((c) => c.startsWith("lenis")),
    headings,
    hiddenRises: rises.filter((r) => Number(r.opacity) < 0.99).length,
    riseCount: rises.length,
    hiddenCards: cards.filter((c) => Number(c.opacity) < 0.99),
    cardSample: cards,
  };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
