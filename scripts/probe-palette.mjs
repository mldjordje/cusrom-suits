/**
 * Report the actual painted palette of the landing page.
 *
 * The lux layer is written for a dark ground and the template underneath is
 * light. Which one is winning where cannot be read off the source with any
 * confidence — three stylesheets and `:has()` selectors decide it at runtime.
 */
import { chromium } from "playwright";

const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000/";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(4000);

const report = await page.evaluate(() => {
  const effectiveBg = (start) => {
    let el = start;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        return { color: bg, from: el.tagName.toLowerCase() + "." + String(el.className).split(/\s+/)[0] };
      }
      el = el.parentElement;
    }
    return { color: "none", from: "none" };
  };

  const headings = Array.from(document.querySelectorAll("[data-m-heading]")).slice(0, 5).map((el) => ({
    text: (el.textContent || "").trim().slice(0, 24),
    color: getComputedStyle(el).color,
    fontFamily: getComputedStyle(el).fontFamily.split(",")[0],
    fontSize: getComputedStyle(el).fontSize,
    textTransform: getComputedStyle(el).textTransform,
    behind: effectiveBg(el),
  }));

  const header = document.querySelector("#header");
  const nav = document.querySelector("#header .navigation");
  const logo = document.querySelector("#header .logo");

  const cards = Array.from(document.querySelectorAll(".pc__img")).slice(0, 6).map((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / (r.height || 1)).toFixed(2), fit: getComputedStyle(el).objectFit };
  });

  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    mainBg: effectiveBg(document.querySelector("main")),
    pageWrapperBg: getComputedStyle(document.querySelector(".ss-home-page") || document.body).background.slice(0, 120),
    headings,
    header: header
      ? {
          bg: getComputedStyle(header).backgroundColor,
          position: getComputedStyle(header).position,
          height: Math.round(header.getBoundingClientRect().height),
          navBox: nav ? nav.getBoundingClientRect().toJSON() : null,
          logoBox: logo ? logo.getBoundingClientRect().toJSON() : null,
        }
      : null,
    cards,
  };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
