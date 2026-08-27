import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3001", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  try {
    const cookieBtn = await page.$("button:has-text('PRIHVATAM'), button:has-text('Prihvatam')");
    if (cookieBtn) await cookieBtn.click();
  } catch (e) {}

  for (let i = 1; i <= 6; i++) {
    await page.evaluate((step) => window.scrollTo(0, step * 700), i);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `tmp/verify/mobile-scroll-${i}.png` });
  }

  await browser.close();
  console.log("Captured mobile scroll views");
}

main().catch(console.error);
