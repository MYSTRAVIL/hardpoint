import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [vn, vp] of [['d', { viewport: { width: 1440, height: 900 } }], ['p', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext(vp);
    const shot = async (scene, act, name) => {
      const p = await ctx.newPage();
      await p.goto(`http://127.0.0.1:4180/?theme=${theme}#${scene}`); await p.reload(); await wait(400);
      await act(p); await wait(900);
      writeFileSync(`${out}/${vn}-${theme}-${name}.png`, await p.screenshot());
      await p.close();
    };
    const click = (n) => (p) => p.getByRole('button', { name: n, exact: true }).click();
    await shot('popovers', click('Plain popover'), 'pop-plain');
    await shot('popovers', click('Style prop'), 'pop-style');
    await shot('toasts', async (p) => { await p.getByRole('button', { name: 'Wide', exact: true }).click(); }, 'toast-wide');
    await shot('toasts', click('Action toast'), 'toast-action');
    await shot('toasts-style', click('Wide'), 'toast-style');
    if (vn === 'd') {
      await shot('tooltips', async (p) => { await p.getByRole('button', { name: 'Plain', exact: true }).hover(); }, 'tip-plain');
      await shot('tooltips', async (p) => { await p.getByRole('button', { name: 'Style', exact: true }).focus(); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab'); }, 'tip-style');
    }
    await ctx.close();
  }
}
await b.close();
