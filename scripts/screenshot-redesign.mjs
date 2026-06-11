// Captures redesign screenshots from the web dev server (npm run dev:web).
// Browser mode has no Tauri backend, so screens show their honest empty /
// degraded states — the visual system is what we are capturing.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:1420";
const OUT = "docs/screenshots";

const SHOTS = [
  { nav: null, file: "redesign-dashboard.png" },
  { nav: "nav-temp", file: "redesign-temp-cleaner.png" },
  { nav: "nav-startup", file: "redesign-startup-analyzer.png" },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

for (const shot of SHOTS) {
  if (shot.nav) {
    await page.getByTestId(shot.nav).click();
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `${OUT}/${shot.file}` });
  console.log(`captured ${shot.file}`);
}

await browser.close();
