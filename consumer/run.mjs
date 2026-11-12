// Drives every scene in src/scenes under the production CSP and records every
// securitypolicyviolation event and every console message about the policy.
//
//   node run.mjs                 all scenes, both viewports, both themes
//   node run.mjs dialogs menus   only these scenes
//   node run.mjs --keep-server   leave `vite preview` running afterwards
//
// It starts `vite preview` itself (policy header from vite.config.js) on port
// 4180 unless something already answers there. Exit 0: no violations, no failed
// steps. Exit 1: a violation. Exit 2: a step could not reach its state (a state
// that was not reached is not proven clean).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:4180';

const args = process.argv.slice(2);
const keepServer = args.includes('--keep-server');
const only = args.filter((a) => !a.startsWith('--'));
const allScenes = readdirSync(path.join(root, 'src/scenes'))
	.filter((f) => f.endsWith('.svelte'))
	.map((f) => f.replace(/\.svelte$/, ''));
// Scenes named _* are negative controls: run only when named.
const scenes = only.length ? only : allScenes.filter((s) => !s.startsWith('_'));

const VIEWPORTS = {
	desktop: { viewport: { width: 1440, height: 900 } },
	phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
};
const THEMES = ['dark', 'light'];

// ---- Scene drivers. Each gets a context object `c`:
//   c.page, c.touch (boolean), c.step(name, fn), c.press(locator), c.info(text)
// A step that throws is reported as a failed step, never as a pass.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const drivers = {
	async dialogs(c) {
		const { page } = c;
		await c.step('dialog opens', async () => {
			await c.press(page.getByRole('button', { name: 'Open dialog' }));
			await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 3000 });
			c.info('dialog form: ' + (await page.getByRole('dialog').getAttribute('data-form')));
			await wait(500);
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 });
		});
		await c.step('full-screen dialog with focused input, select inside', async () => {
			await c.press(page.getByRole('button', { name: 'Open full screen' }));
			await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 3000 });
			await wait(500);
			c.info('focused: ' + (await page.evaluate(() => document.activeElement?.tagName)));
			await page.getByLabel('Title').focus();
			await c.press(page.getByRole('combobox', { name: 'Assignee' }));
			await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await page.keyboard.press('Escape');
			await wait(400);
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 });
		});
	},

	async popovers(c) {
		const { page } = c;
		for (const [name, bodyId] of [
			['Plain popover', null],
			['Style prop', 'style-body'],
			['Class', 'class-body']
		]) {
			await c.step(`popover "${name}"`, async () => {
				await c.press(page.getByRole('button', { name, exact: true }));
				await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 3000 });
				await wait(500);
				const el = page.getByRole('dialog');
				c.info(
					`${name}: form=${await el.getAttribute('data-form')} --popover-width=${await el.evaluate(
						(n) => getComputedStyle(n).getPropertyValue('--popover-width').trim() || '(unset)'
					)} max-width=${await el.evaluate((n) => getComputedStyle(n).maxWidth)} width=${await el.evaluate((n) => Math.round(n.getBoundingClientRect().width))}`
				);
				if (bodyId && !c.touch) {
					const w = await el.evaluate((n) => Math.round(n.getBoundingClientRect().width));
					if (w !== 480) throw new Error(`${name}: popover is ${w}px wide, expected 480`);
				}
				await page.keyboard.press('Escape');
				await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 });
			});
		}
	},

	async selects(c) {
		const { page } = c;
		await c.step('select list/sheet, pick with pointer', async () => {
			await c.press(page.getByRole('combobox', { name: 'Language' }));
			await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await c.press(page.getByRole('listbox').getByRole('option', { name: 'Dansk' }));
			await page.getByRole('listbox').waitFor({ state: 'hidden', timeout: 3000 });
		});
		await c.step('select open and keyboard', async () => {
			await page.getByRole('combobox', { name: 'Language' }).focus();
			await page.keyboard.press('Enter');
			await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 3000 });
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('Escape');
			await page.getByRole('listbox').waitFor({ state: 'hidden', timeout: 3000 });
		});
		for (const [label, typed, expect] of [
			['Project', 'des', 'Design system'],
			['Project', 'zzz', 'No matches'],
			['Other', 'zzz', 'Nothing found']
		]) {
			await c.step(`combobox "${label}" type "${typed}"`, async () => {
				await c.press(page.getByRole('combobox', { name: label }).first());
				await wait(500);
				await page.keyboard.type(typed, { delay: 30 });
				await wait(300);
				const text = await page.evaluate(() => document.body.innerText);
				if (typed === 'des' && !text.includes(expect)) throw new Error('no "' + expect + '" after typing');
				if (typed === 'zzz') c.info(`${label} empty result shows "${expect}": ${text.includes(expect)}`);
				await page.keyboard.press('Escape');
				await wait(300);
				// Close a sheet that Escape left open (the sheet's own close button).
				const close = page.getByRole('button', { name: /^close$/i });
				if (await close.count()) await c.press(close.first());
				await wait(300);
			});
		}
	},

	async menus(c) {
		const { page } = c;
		await c.step('menu opens (list or sheet)', async () => {
			await c.press(page.getByRole('button', { name: 'View' }));
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
		});
		await c.step('checkbox and radio items', async () => {
			await c.press(page.getByRole('menuitemcheckbox', { name: 'Show hidden' }));
			await c.press(page.getByRole('menuitemcheckbox', { name: 'Show sizes' }));
			await wait(300);
			if (!c.touch) await page.getByRole('menuitem', { name: 'Cut' }).hover();
			await wait(200);
			await c.press(page.getByRole('menuitemradio', { name: 'Date' })); // closes the menu
			await wait(300);
		});
		await c.step('menu closes', async () => {
			await page.getByRole('menu').waitFor({ state: 'hidden', timeout: 3000 });
			await c.press(page.getByRole('button', { name: 'View' }));
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(300);
			await page.keyboard.press('Escape');
			await page.getByRole('menu').waitFor({ state: 'hidden', timeout: 3000 });
		});
	},

	async tooltips(c) {
		const { page } = c;
		await c.step('tooltip by pointer', async () => {
			if (c.touch) return; // a touch never opens a tooltip: keyboard only
			await page.getByRole('button', { name: 'Plain', exact: true }).hover();
			await page.getByRole('tooltip').last().waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await page.mouse.move(700, 600);
			await wait(400);
		});
		for (const name of ['Class', 'Style']) {
			await c.step(`tooltip by keyboard focus "${name}"`, async () => {
				await page.evaluate(() => document.activeElement?.blur());
				await page.keyboard.press('Tab');
				// Tab to the named button.
				for (let i = 0; i < 6; i++) {
					const label = await page.evaluate(() => document.activeElement?.textContent);
					if (label === name) break;
					await page.keyboard.press('Tab');
				}
				await page.getByRole('tooltip').last().waitFor({ state: 'visible', timeout: 3000 });
				await wait(400);
				const el = page.getByRole('tooltip').last();
				const tw = await el.evaluate((n) => Math.round(n.getBoundingClientRect().width));
				if (tw !== 360) throw new Error(`${name}: tooltip is ${tw}px wide, expected 360`);
				c.info(
					`${name}: --tooltip-width=${await el.evaluate((n) => getComputedStyle(n).getPropertyValue('--tooltip-width').trim() || '(unset)')} max-width=${await el.evaluate((n) => getComputedStyle(n).maxWidth)} width=${await el.evaluate((n) => Math.round(n.getBoundingClientRect().width))}`
				);
			});
		}
		await c.step('tooltip group', async () => {
			await page.getByRole('button', { name: 'G1' }).focus();
			await page.keyboard.press('Tab');
			await wait(600);
		});
	},

	async toasts(c) {
		const { page } = c;
		await c.step('toast, action, replacement', async () => {
			await c.press(page.getByRole('button', { name: 'Plain toast' }));
			await page.locator('.hp-toaster').waitFor({ state: 'visible', timeout: 3000 });
			await wait(500);
			await c.press(page.getByRole('button', { name: 'Action toast' }));
			await wait(500);
			await c.press(page.getByRole('button', { name: 'Replace' }));
			await wait(500);
			await c.press(page.getByRole('button', { name: 'Replace' }));
			await wait(500);
			await c.press(page.getByRole('button', { name: 'Action toast' }));
			await wait(500);
			await c.press(page.locator('.hp-toaster').getByRole('button', { name: 'Undo' }));
			await wait(600);
		});
		await c.step('wide toast cap and dismiss', async () => {
			await c.press(page.getByRole('button', { name: 'Wide', exact: true }));
			const t = page.locator('.hp-toaster');
			await t.waitFor({ state: 'visible', timeout: 3000 });
			await wait(500);
			c.info(
				`toast: --toast-width=${await t.evaluate((n) => getComputedStyle(n).getPropertyValue('--toast-width').trim() || '(unset)')} max-width=${await t.evaluate((n) => getComputedStyle(n).maxWidth)} width=${await t.evaluate((n) => Math.round(n.getBoundingClientRect().width))}`
			);
			if ((await t.evaluate((n) => getComputedStyle(n).maxWidth)) !== '576px') throw new Error('toast max-width is not 576px');
			if (c.touch) {
				const b = await t.boundingBox();
				await c.swipe(b.x + b.width / 2, b.y + b.height / 2, b.x + b.width + 120, b.y + b.height / 2);
				await t.waitFor({ state: 'hidden', timeout: 3000 });
			} else {
				await t.getByRole('button', { name: /dismiss|close/i }).click();
				await t.waitFor({ state: 'hidden', timeout: 3000 });
			}
		});
	},

	async 'toasts-style'(c) {
		const { page } = c;
		await c.step('toast given a style prop', async () => {
			await c.press(page.getByRole('button', { name: 'Wide' }));
			const t = page.locator('.hp-toaster');
			await t.waitFor({ state: 'visible', timeout: 3000 });
			await wait(500);
			c.info(
				`toast: --toast-width=${await t.evaluate((n) => getComputedStyle(n).getPropertyValue('--toast-width').trim() || '(unset)')} max-width=${await t.evaluate((n) => getComputedStyle(n).maxWidth)} width=${await t.evaluate((n) => Math.round(n.getBoundingClientRect().width))}`
			);
			if ((await t.evaluate((n) => getComputedStyle(n).maxWidth)) !== '576px') throw new Error('toast max-width is not 576px');
		});
	},

	async navigation(c) {
		const { page } = c;
		await c.step('tabs by pointer (panel fade) and keyboard', async () => {
			await c.press(page.getByRole('tab', { name: 'Activity' }));
			await wait(400);
			await page.keyboard.press('ArrowLeft');
			await wait(400);
		});
		await c.step('disclosure opens and closes', async () => {
			const b = page.getByRole('button', { name: 'Details' });
			await c.press(b);
			await wait(400);
			await c.press(b);
			await wait(300);
		});
		await c.step('pagination', async () => {
			await c.press(page.getByRole('button', { name: /next/i }).or(page.getByRole('link', { name: /next/i })).first());
			await wait(300);
		});
	},

	async expressive(c) {
		const { page } = c;
		await c.step('remount staggers (--i set while entering)', async () => {
			const n = await page.evaluate(async () => {
				const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Toggle');
				b.click();
				await new Promise((r) => setTimeout(r, 60));
				b.click();
				await new Promise((r) => setTimeout(r, 60));
				return [...document.querySelectorAll('*')].filter((e) => e.style.getPropertyValue('--i') !== '').length;
			});
			c.info(`elements with --i while entering: ${n}`);
			if (!n) throw new Error('no element carries --i');
			await wait(1500);
		});
		await c.step('remount twice', async () => {
			await c.press(page.getByRole('button', { name: 'Toggle' }));
			await wait(300);
			await c.press(page.getByRole('button', { name: 'Toggle' }));
			await wait(1500);
		});
	},

	async media(c) {
		const { page } = c;
		await c.step('images resolve, both tiers', async () => {
			await page.waitForFunction(() => [...document.images].every((i) => i.complete));
			await wait(1200);
		});
		await c.step('stat ticks', async () => {
			await c.press(page.getByRole('button', { name: 'Tick' }));
			await wait(150);
			await c.press(page.getByRole('button', { name: 'Tick' }));
			await wait(800);
		});
		await c.step('load region crossfades', async () => {
			await c.press(page.getByRole('button', { name: 'Load' }));
			await wait(800);
			await c.press(page.getByRole('button', { name: 'Load' }));
			await wait(500);
			await c.press(page.getByRole('button', { name: 'Load' }));
			await wait(800);
		});
	},

	async meter(c) {
		const { page } = c;
		await c.step('thresholds cross live, tone changes', async () => {
			const tones = [];
			for (let i = 0; i < 3; i++) {
				await wait(250);
				tones.push(await page.evaluate(() => { const m = document.querySelector('.hp-meter'); return m ? m.getAttribute('data-tone') : null; }));
				await c.press(page.getByRole('button', { name: 'Add 30' }));
			}
			await wait(400);
			c.info('tone as value crosses 30, 60, 90: ' + tones.join(', ') + ', then ' + (await page.evaluate(() => document.querySelector('.hp-meter')?.getAttribute('data-tone'))));
			await c.press(page.getByRole('button', { name: 'Reset' }));
			await wait(400);
		});
	},

	async notice(c) {
		const { page } = c;
		await c.step('actions, close button, live text change', async () => {
			await c.press(page.getByRole('button', { name: 'Retry' }));
			await c.press(page.getByRole('button', { name: 'Change text' }));
			await wait(300);
			await c.press(page.getByRole('button', { name: 'Change text' }));
			await wait(300);
			const n = await page.locator('.hp-notice').count();
			c.info('notices: ' + n);
			await c.press(page.getByRole('button', { name: /close|dismiss/i }).first());
			await wait(400);
			if ((await page.locator('.hp-notice').count()) !== n - 1) throw new Error('close button did not remove the notice');
		});
	},

	async textarea(c) {
		const { page } = c;
		await c.step('typing grows to its max and scrolls', async () => {
			const ta = page.getByLabel('Notes');
			await ta.click();
			const heights = [await ta.evaluate((n) => n.getBoundingClientRect().height)];
			for (let i = 0; i < 10; i++) {
				await page.keyboard.type('line ' + i);
				await page.keyboard.press('Enter');
				heights.push(await ta.evaluate((n) => Math.round(n.getBoundingClientRect().height)));
			}
			const sc = await ta.evaluate((n) => [n.scrollHeight, n.clientHeight]);
			c.info('heights while typing: ' + heights.join(',') + '; scrollHeight/clientHeight ' + sc.join('/'));
			if (heights[heights.length - 1] <= heights[0]) throw new Error('did not grow');
			if (sc[0] <= sc[1]) throw new Error('did not scroll at max');
		});
		await c.step('error appears and goes', async () => {
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(400);
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(300);
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(400);
		});
		await c.step('inside a full-screen dialog', async () => {
			await c.press(page.getByRole('button', { name: 'Open full screen' }));
			await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 3000 });
			await wait(500);
			const ta = page.getByRole('dialog').getByLabel('Body');
			await ta.click();
			for (let i = 0; i < 8; i++) { await page.keyboard.type('row ' + i); await page.keyboard.press('Enter'); }
			await wait(300);
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 });
		});
	},

	async radios(c) {
		const { page } = c;
		await c.step('pointer selection, arrow keys', async () => {
			await c.press(page.getByRole('radio', { name: /Weekly/ }).first());
			await wait(300);
			await page.keyboard.press('ArrowUp');
			await wait(300);
			await page.keyboard.press('ArrowDown');
			await wait(300);
		});
		await c.step('clear and error', async () => {
			await c.press(page.getByRole('button', { name: 'Clear', exact: true }));
			await wait(300);
			await page.keyboard.press('Tab');
			await c.press(page.getByRole('button', { name: 'Toggle error', exact: true }));
			await wait(400);
			await c.press(page.getByRole('radio', { name: /Daily/ }).first());
			await wait(300);
		});
		await c.step('checkbox group with tag, legend and error', async () => {
			await c.press(page.getByRole('checkbox', { name: /Push/ }).first());
			await c.press(page.getByRole('button', { name: 'Toggle group error' }));
			await wait(400);
			await c.press(page.getByRole('button', { name: 'Toggle group error' }));
			await wait(300);
			await c.press(page.getByRole('button', { name: 'Toggle group error' }));
			await wait(400);
		});
	},

	async listdetail(c) {
		const { page } = c;
		await c.step('open a document, back (stacked) or both panes (split)', async () => {
			const stackedAtStart = await page.getByRole('button', { name: 'Back' }).count();
			if (!c.touch) {
				await page.getByText('Nothing open').waitFor({ state: 'visible', timeout: 3000 });
				await c.press(page.getByRole('button', { name: 'Budget 2027' }));
				await page.getByText('Document body for Budget 2027.').waitFor({ state: 'visible', timeout: 3000 });
				const both = (await page.getByRole('button', { name: 'Roadmap' }).isVisible()) && (await page.getByRole('heading', { name: 'Budget 2027' }).isVisible());
				c.info('both panes visible at 1440: ' + both);
				if (!both || (await page.getByRole('button', { name: 'Back' }).count())) throw new Error('split layout wrong');
				await c.press(page.getByRole('button', { name: 'Roadmap' }));
				await page.getByText('Document body for Roadmap.').waitFor({ state: 'visible', timeout: 3000 });
			} else {
				await c.press(page.getByRole('button', { name: 'Roadmap' }));
				await page.getByText('Document body for Roadmap.').waitFor({ state: 'visible', timeout: 3000 });
				const listHidden = !(await page.getByRole('button', { name: 'Budget 2027' }).isVisible());
				c.info('stacked at 390: list hidden while detail shows: ' + listHidden);
				if (!listHidden) throw new Error('list still visible while stacked');
				await c.press(page.getByRole('button', { name: 'Back' }));
				await page.getByRole('button', { name: 'Budget 2027' }).waitFor({ state: 'visible', timeout: 3000 });
			}
			await wait(300);
		});
	},

	async grouped(c) {
		const { page } = c;
		await c.step('grouped Select (list or sheet)', async () => {
			await c.press(page.getByRole('combobox', { name: 'City' }));
			await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			const groups = await page.getByRole('listbox').getByRole('group').count();
			c.info('select groups: ' + groups);
			if (groups < 2) throw new Error('no group headings');
			await c.press(page.getByRole('listbox').getByRole('option', { name: 'Tokyo' }));
			await page.getByRole('listbox').waitFor({ state: 'hidden', timeout: 3000 });
		});
		for (const [typed, shows, hides] of [['asia', 'Tokyo', 'Berlin'], ['zzz', null, 'Tokyo']]) {
			await c.step('grouped Combobox, type "' + typed + '"', async () => {
				await c.press(page.getByRole('combobox', { name: 'Place' }).first());
				await wait(500);
				await page.keyboard.type(typed, { delay: 30 });
				await wait(300);
				const names = await page.getByRole('listbox').getByRole('option').allInnerTexts();
				c.info('options after "' + typed + '": ' + names.map((n) => n.replace(/\s+/g, ' ')).join(' | '));
				const bad = (shows && !names.some((n) => n.includes(shows))) || (typed === 'asia' && names.some((n) => n.includes(hides)));
				await page.keyboard.press('Escape');
				await wait(300);
				const close = page.getByRole('button', { name: /^close$/i });
				if (await close.count()) await c.press(close.first());
				await wait(300);
				if (bad) throw new Error('group-name filter wrong: ' + names.join(','));
			});
		}
		await c.step('NativeSelect with optgroups', async () => {
			const n = await page.locator('select optgroup').count();
			c.info('optgroups: ' + n);
			if (n < 2) throw new Error('no optgroup');
			await page.getByLabel('Native').selectOption('tokyo');
			await wait(200);
		});
	},

	async prose(c) {
		const { page } = c;
		await c.step('copy button, scroll area focus', async () => {
			await c.press(page.getByRole('button', { name: 'Copy code' }));
			await wait(300);
			if (!c.touch) await page.getByRole('button', { name: 'Copy code' }).hover();
			await page.locator('.hp-prose-scroll').focus();
			await wait(300);
			const sw = await page.locator('.hp-prose-scroll').evaluate((n) => [n.scrollWidth, n.clientWidth]);
			c.info('table scroll area scrollWidth/clientWidth: ' + sw.join('/'));
			if (c.touch && sw[0] <= sw[1]) throw new Error('wide table does not scroll at 390');
		});
	},

	async viewer(c) {
		const { page } = c;
		const stage = page.locator('.hp-image-viewer-stage');
		const zoomed = () => stage.evaluate((n) => n.hasAttribute('data-zoomed'));
		const centre = async () => {
			const b = await page.locator('.hp-image-viewer-image').boundingBox();
			return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
		};
		for (const [trigger, how] of [['Open same-origin', 'escape'], ['Open data URL', 'swipe']]) {
			await c.step(trigger + ': open, zoom, download, close by ' + how, async () => {
				await c.press(page.getByRole('button', { name: trigger }));
				await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 3000 });
				await page.locator('.hp-image-viewer-stage[data-state=loaded]').waitFor({ timeout: 5000 });
				await wait(500);
				const p = await centre();
				if (c.touch) {
					await c.dtap(p.x, p.y);
					await wait(500);
					if (!(await zoomed())) throw new Error('double-tap did not zoom');
					await c.dtap(p.x, p.y);
					await wait(500);
					if (await zoomed()) throw new Error('second double-tap did not reset');
					await c.pinch(p.x, p.y, 30, 110);
					await wait(300);
					if (!(await zoomed())) throw new Error('pinch did not zoom');
					await c.dtap(p.x, p.y);
					await wait(500);
					if (await zoomed()) await page.keyboard.press('0');
					await wait(400);
				} else {
					await page.mouse.dblclick(p.x, p.y);
					await wait(500);
					if (!(await zoomed())) throw new Error('double-click did not zoom');
					await page.mouse.dblclick(p.x, p.y);
					await wait(500);
					if (await zoomed()) throw new Error('second double-click did not reset');
					await page.mouse.move(p.x, p.y);
					await page.mouse.wheel(0, -400);
					await wait(300);
					if (!(await zoomed())) throw new Error('wheel did not zoom');
					await page.keyboard.press('0');
					await wait(500);
				}
				const [dl] = await Promise.all([
					page.waitForEvent('download', { timeout: 5000 }),
					c.press(page.getByRole('button', { name: /download/i }))
				]);
				c.info(trigger + ': download file name ' + dl.suggestedFilename());
				await wait(300);
				if (how === 'swipe' && c.touch) {
					await c.swipe(p.x, p.y, p.x, p.y + 360);
				} else {
					await page.keyboard.press('Escape');
				}
				await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3000 });
			});
		}
	},

	async feedback(c) {
		await c.step('class and style set the spinner delay', async () => {
			const delays = await c.page.evaluate(() =>
				[...document.querySelectorAll('.hp-spinner')].map((n) => getComputedStyle(n).getPropertyValue('--spinner-delay').trim())
			);
			c.info('--spinner-delay (default, class, style): ' + delays.join(', '));
			if (!(parseFloat(delays[0]) > 0 && parseFloat(delays[1]) === 0 && parseFloat(delays[2]) === 0)) throw new Error('spinner delay not applied: ' + delays.join());
			await wait(1000);
		});
	},

	async forms(c) {
		const { page } = c;
		await c.step('text field, error appears', async () => {
			await page.getByLabel('Name').first().fill('Mara');
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(400);
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(300);
			await c.press(page.getByRole('button', { name: 'Toggle error' }));
			await wait(400);
		});
		await c.step('checkbox, group, switch', async () => {
			await c.press(page.getByRole('checkbox', { name: 'Accept' }));
			await c.press(page.getByRole('checkbox', { name: 'B', exact: true }));
			await c.press(page.getByRole('switch', { name: 'Notifications' }));
			await wait(400);
		});
	},

	async shell(c) {
		const { page } = c;
		if (c.touch) {
			await c.step('drawer opens', async () => {
				if (c.variant !== 'drawer') return;
				await c.press(page.getByRole('button', { name: /menu|navigation/i }).first());
				await page.getByRole('dialog').or(page.locator('.hp-app-shell-drawer')).first().waitFor({ state: 'visible', timeout: 3000 });
				await wait(500);
				await page.keyboard.press('Escape');
				await wait(400);
			});
		} else {
			await c.step('rail or sidebar renders', async () => {
				await wait(500);
			});
		}
	}
};

// Extra variants of a scene: [query string, label].
const variants = {
	shell: [
		['?compact=bar&wide=sidebar', 'bar-sidebar'],
		['?compact=drawer&wide=rail', 'drawer-rail']
	]
};

// ---- Runner

const policy = [];
const info = [];
const failed = [];
const seen = new Set();

async function serverUp() {
	try {
		const r = await fetch(BASE + '/');
		return r.ok;
	} catch {
		return false;
	}
}

let server;
if (!(await serverUp())) {
	server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview'], { cwd: root, stdio: 'ignore' });
	for (let i = 0; i < 60 && !(await serverUp()); i++) await wait(250);
	if (!(await serverUp())) {
		console.error('vite preview did not start (run `npm run build` first)');
		process.exit(2);
	}
}
const head = await fetch(BASE + '/').then((r) => r.headers.get('content-security-policy'));
console.log('CSP header:', head);

const browser = await chromium.launch();
try {
	for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
		for (const theme of THEMES) {
			const context = await browser.newContext(vp);
			for (const scene of scenes) {
				for (const [query, vlabel] of variants[scene] ?? [['', '']]) {
					const label = `${scene}${vlabel ? ':' + vlabel : ''} ${vpName} ${theme}`;
					const page = await context.newPage();
					const messages = [];
					await page.addInitScript(() => {
						window.__csp = [];
						document.addEventListener(
							'securitypolicyviolation',
							(e) => {
								const t = e.target;
								window.__csp.push({
									directive: e.violatedDirective,
									blocked: e.blockedURI,
									sample: e.sample,
									source: `${e.sourceFile}:${e.lineNumber}`,
									target: t && t.outerHTML ? t.outerHTML.slice(0, 160) : String(t)
								});
							},
							true
						);
					});
					page.on('console', (m) => {
						const t = m.text();
						if (/content security policy|Refused to/i.test(t)) messages.push('console: ' + t);
						else if (m.type() === 'error') messages.push('console error (not CSP): ' + t);
					});
					page.on('pageerror', (e) => messages.push('pageerror: ' + e.message));
					const cdp = await context.newCDPSession(page);
					const c = {
						label,
						page,
						touch: !!vp.hasTouch,
						variant: vlabel.split('-')[0],
						info: (t) => info.push(`  [${label}] ${t}`),
						press: (loc) => (vp.hasTouch ? loc.tap({ timeout: 4000 }) : loc.click({ timeout: 4000 })),
						swipe: async (x0, y0, x1, y1) => {
							const touch = (type, x, y) =>
								cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
							await touch('touchStart', x0, y0);
							for (let i = 1; i <= 8; i++) {
								await touch('touchMove', x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
								await wait(16);
							}
							await touch('touchEnd');
						},
						dtap: async (x, y) => {
							for (let i = 0; i < 2; i++) {
								await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
								await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
								await wait(60);
							}
						},
						pinch: async (cx, cy, r0, r1) => {
							const pts = (r) => [{ x: cx - r, y: cy, id: 0 }, { x: cx + r, y: cy, id: 1 }];
							await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(r0) });
							for (let i = 1; i <= 10; i++) {
								await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(r0 + ((r1 - r0) * i) / 10) });
								await wait(16);
							}
							await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
						},
						step: async (name, fn) => {
							try {
								await fn();
							} catch (e) {
								failed.push(`[${label}] step "${name}": ${String(e.message).split('\n')[0]}`);
							}
						}
					};
					try {
						await page.goto(`${BASE}/${query}${query ? '&' : '?'}theme=${theme}#${scene}`, { waitUntil: 'load' });
						await page.reload({ waitUntil: 'load' }); // hash change alone does not reload
						await page.locator('#app > *').first().waitFor({ state: 'attached', timeout: 5000 });
						await wait(300);
						await (drivers[scene] ?? (async () => {}))(c);
					} catch (e) {
						failed.push(`[${label}] scene: ${String(e.message).split('\n')[0]}`);
					}
					const events = await page.evaluate(() => window.__csp).catch(() => []);
					for (const e of events) {
						const key = [scene, e.directive, e.blocked, e.sample, e.target].join('|');
						if (seen.has(key)) continue;
						seen.add(key);
						policy.push({ label, ...e });
					}
					for (const m of messages) {
						const key = scene + '|' + m;
						if (seen.has(key)) continue;
						seen.add(key);
						policy.push({ label, message: m });
					}
					await page.close();
				}
			}
			await context.close();
		}
	}
} finally {
	await browser.close();
	if (server && !keepServer) server.kill();
}

console.log('\nInfo');
for (const line of info) console.log(line);
console.log(`\nScenes run: ${scenes.join(', ')}`);
console.log(`Violations and policy console messages: ${policy.length}`);
for (const p of policy) console.log(JSON.stringify(p));
console.log(`Failed steps: ${failed.length}`);
for (const f of failed) console.log('  ' + f);
process.exit(policy.length ? 1 : failed.length ? 2 : 0);
