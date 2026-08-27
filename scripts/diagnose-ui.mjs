import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:3001", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  // Scroll down and test performance
  const fpsData = await page.evaluate(async () => {
    let frameTimes = [];
    let lastTime = performance.now();
    let scrolling = true;

    function recordFrame(now) {
      frameTimes.push(now - lastTime);
      lastTime = now;
      if (scrolling) requestAnimationFrame(recordFrame);
    }
    requestAnimationFrame(recordFrame);

    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 300);
      await new Promise((r) => setTimeout(r, 100));
    }
    scrolling = false;

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / (frameTimes.length || 1);
    return { frameCount: frameTimes.length, avgFrameTime, fps: Math.round(1000 / avgFrameTime) };
  });

  console.log("Errors:", errors);
  console.log("FPS data:", fpsData);

  await page.screenshot({ path: "tmp/verify/diagnose-1.png", fullPage: false });
  await browser.close();
}

main().catch(console.error);
