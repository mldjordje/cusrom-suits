import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  
  // Desktop
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto("http://localhost:3001", { waitUntil: "domcontentloaded", timeout: 60000 });
  await desktopPage.waitForTimeout(3000);
  try {
    const cookieBtn = await desktopPage.$("button:has-text('PRIHVATAM'), button:has-text('Prihvatam')");
    if (cookieBtn) await cookieBtn.click();
  } catch (e) {}
  await desktopPage.screenshot({ path: "tmp/verify/full-desktop.png", fullPage: true });

  // Mobile
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto("http://localhost:3001", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mobilePage.waitForTimeout(3000);
  try {
    const cookieBtn = await mobilePage.$("button:has-text('PRIHVATAM'), button:has-text('Prihvatam')");
    if (cookieBtn) await cookieBtn.click();
  } catch (e) {}
  await mobilePage.screenshot({ path: "tmp/verify/full-mobile.png", fullPage: true });

  await browser.close();
  console.log("Captured full desktop and mobile screenshots successfully!");
}

main().catch(console.error);
