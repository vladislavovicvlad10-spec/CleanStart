// Captures redesign screenshots from the web dev server (npm run dev:web).
// Browser mode has no Tauri backend, so screens show their honest empty /
// degraded states — the visual system is what we are capturing. Theme is
// seeded via localStorage before the app boots. SwiftShader flags let the
// hero's WebGL gem render under headless Chromium.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:1420";
const OUT = "docs/screenshots";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

async function withPage(theme, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("cleanstart.theme", t);
    } catch {}
  }, theme);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  // Give the gem time to finish its intro and settle on a nice frame.
  await page.waitForTimeout(1700);
  await fn(page);
  await context.close();
}

async function fullShot({ theme, nav, file }) {
  await withPage(theme, async (page) => {
    if (nav) {
      await page.getByTestId(nav).click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${OUT}/${file}`, animations: "disabled", timeout: 60000 });
    console.log(`captured ${file} (${theme})`);
  });
}

async function heroShot({ theme, file }) {
  await withPage(theme, async (page) => {
    const hero = await page.$(".hero-panel");
    if (hero) {
      await hero.screenshot({ path: `${OUT}/${file}`, timeout: 60000 });
      console.log(`captured ${file} (${theme})`);
    } else {
      console.log("hero panel not found");
    }
  });
}

await fullShot({ theme: "light", nav: null, file: "redesign-dashboard.png" });
await fullShot({ theme: "dark", nav: null, file: "redesign-dashboard-dark.png" });
await fullShot({ theme: "light", nav: "nav-temp", file: "redesign-temp-cleaner.png" });
await heroShot({ theme: "dark", file: "cleanstart-v1.0.0-hero-gem.png" });

await browser.close();
