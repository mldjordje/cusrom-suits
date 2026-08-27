import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3001", { waitUntil: "load" });
  await page.waitForTimeout(2000);

  try {
    const cookieBtn = await page.$("button:has-text('PRIHVATAM'), button:has-text('Prihvatam')");
    if (cookieBtn) await cookieBtn.click();
  } catch (e) {}

  for (let i = 1; i <= 6; i++) {
    await page.evaluate((step) => window.scrollTo(0, 10000 + (step - 1) * 750), i);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `tmp/verify/lux-tail-${i}.png` });
  }

  await browser.close();
  console.log("Captured 8 desktop luxury views");
}

main().catch(console.error);
