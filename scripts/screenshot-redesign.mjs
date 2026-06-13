// Captures redesign screenshots from the web dev server (npm run dev:web).
// Browser mode has no Tauri backend, so screens show their honest empty /
// degraded states — the visual system is what we are capturing. Theme is
// seeded via localStorage before the app boots.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:1420";
const OUT = "docs/screenshots";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot({ theme, nav, file }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("cleanstart.theme", t);
    } catch {}
  }, theme);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  if (nav) {
    await page.getByTestId(nav).click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log(`captured ${file} (${theme})`);
  await context.close();
}

await shoot({ theme: "light", nav: null, file: "redesign-dashboard.png" });
await shoot({ theme: "dark", nav: null, file: "redesign-dashboard-dark.png" });
await shoot({ theme: "light", nav: "nav-temp", file: "redesign-temp-cleaner.png" });

await browser.close();
