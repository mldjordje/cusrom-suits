import { chromium, devices } from 'playwright';

const url = process.env.CUSTOM_SUIT_DEBUG_URL || 'http://localhost:3050/custom-suits/debug';

async function measureProfile(label, contextOptions) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="jacket-preview"]', { state: 'attached', timeout: 60000 });
  const preview = page.locator('[data-testid="jacket-preview"]');
  const box = await preview.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -150);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 10 });
    await page.mouse.up();
  }
  const fps = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      let frames = 0;
      let start = performance.now();
      function tick(now) {
        if (!start) start = now;
        frames++;
        if (now - start >= 1500) {
          resolve(Math.round((frames * 1000) / (now - start)));
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  });
  await browser.close();
  return { label, fps };
}

(async () => {
  const desktop = await measureProfile('desktop-1440', { viewport: { width: 1440, height: 900 } });
  const mobileDevice = devices['iPhone 12'];
  const mobile = await measureProfile('iphone-12', mobileDevice);
  console.log(JSON.stringify({ desktop, mobile }));
})();
