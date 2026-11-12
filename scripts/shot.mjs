// Screenshot a page and report console errors. Exit code 1 on any console error.
// Usage: node scripts/shot.mjs <path-or-url> <out.png> [--wait ms] [--w 1440] [--h 900] [--touch] [--full] [--serve]
//                              [--theme dark|light|system] [--scheme light|dark]
//   --touch  emulate a phone: coarse pointer, touch events, no hover
//   --full   capture the full scrollable page, not just the viewport
//   --theme  the saved theme (localStorage "hardpoint:theme"), set before the page loads; default: none saved,
//            so the site is dark
//   --scheme the device's colour scheme (Playwright colorScheme); with --theme system it picks the look
//   --serve  start a private Vite dev server on a free port for this shot (no running server needed;
//            always safe to pass — it is what unattended runs use)
// Without --serve it targets SHOT_BASE (default http://localhost:5173), e.g. your own `npm run dev`.
// Examples: node scripts/shot.mjs / shots/home.png --serve
//           node scripts/shot.mjs / shots/home-phone.png --w 390 --h 844 --serve
//           node scripts/shot.mjs /app/settings shots/system-light.png --theme system --scheme light --serve
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launchChromium } from './lib/browser.mjs';
import { normalizeTarget, resolveBase } from './lib/server.mjs';

const args = process.argv.slice(2);
const target = normalizeTarget(args[0]);
const out = args[1] ?? 'shot.png';
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const str = (name, allowed) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (!allowed.includes(v)) {
    console.error(`${name} takes ${allowed.join(', ')}`);
    process.exit(2);
  }
  return v;
};
const wait = opt('--wait', 1500);
const width = opt('--w', 1440);
const height = opt('--h', 900);
const serve = args.includes('--serve');
const touch = args.includes('--touch');
const full = args.includes('--full');
const theme = str('--theme', ['dark', 'light', 'system']);
const scheme = str('--scheme', ['light', 'dark']);

const { base, server } = await resolveBase(serve);
const url = target.startsWith('http') ? target : base + target;

mkdirSync(dirname(out), { recursive: true });
const browser = await launchChromium();
const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, colorScheme: scheme });
// The key is the one src/app.html reads before first paint.
if (theme) await context.addInitScript((t) => localStorage.setItem('hardpoint:theme', t), theme);
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  if (full && touch) {
    // Chromium's fullPage capture lays the page out without the mobile emulation, so coarse-pointer
    // styles (44px controls) vanish from the image. Grow the viewport to the page instead.
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: Math.max(height, pageHeight) });
    await page.waitForTimeout(100);
    await page.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: full });
  }
  console.log(`saved ${out}`);
} catch (e) {
  errors.push(String(e));
}
await browser.close();
if (server) server.kill();
if (errors.length) {
  console.log('CONSOLE ERRORS:');
  for (const e of errors) console.log('  ' + e.slice(0, 300));
  process.exit(1);
}
console.log('no console errors');
