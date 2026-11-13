// Drives every scene in src/scenes under the production CSP and records every
// securitypolicyviolation event and every console message about the policy.
//
//   node run.mjs                 all scenes, both viewports, both themes
//   node run.mjs dialogs menus   only these scenes
//   node run.mjs --keep-server   leave `vite preview` running afterwards
//
// It starts `vite preview` itself (policy header from vite.config.js) on port
// 4180, or CONSUMER_PORT when set, unless something already answers there. Exit 0: no violations, no failed
// steps. Exit 1: a violation. Exit 2: a step could not reach its state (a state
// that was not reached is not proven clean).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const BASE = `http://127.0.0.1:${process.env.CONSUMER_PORT || 4180}`;

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

// Counts animation frames over the next 1.5 s in which an element matching
// `selector`, or one inside it, animates: proof that an entrance played.
const recordEntrance = (page, selector = '[role=menu], .hp-sheet') =>
	page.evaluate((selector) => {
		window.__entrance = 0;
		const start = performance.now();
		const frame = () => {
			const moving = document
				.getAnimations()
				.some((a) => a.effect?.target instanceof Element && a.effect.target.closest(selector));
			if (moving) window.__entrance++;
			if (performance.now() - start < 1500) requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}, selector);

const assertEntrance = async (page) => {
	if (!(await page.evaluate(() => window.__entrance))) throw new Error('no entrance animation on the first open');
};

// Bits UI's portal mounts its own root into <body>; a closed overlay whose
// layers wait for the first open adds none.
const bodyNodes = (page) => page.evaluate(() => document.body.childNodes.length);

// The attributes `names` of the element `loc` finds, null where missing.
const attrs = (loc, names) => loc.evaluate((n, names) => names.map((a) => n.getAttribute(a)), names);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A Dialog, ImageViewer or AppShell drawer trigger's popup ARIA. While
// closed it is ['dialog', 'false', null]: aria-controls names the dialog
// only while it is open.
const DIALOG_POPUP = ['aria-haspopup', 'aria-expanded', 'aria-controls'];

// Presses `mount`, which mounts closed overlays (`what`) until `ready` is
// attached, and fails if they added a node to <body> or a dialog to the page.
async function assertClosedMountNothing(c, mount, ready, what) {
	const before = await bodyNodes(c.page);
	await c.press(mount);
	await ready.waitFor({ state: 'attached', timeout: 3000 });
	await wait(100);
	const added = (await bodyNodes(c.page)) - before;
	c.info(`${what}: ${added} nodes added to <body>`);
	if (added !== 0) throw new Error(`${what} added ${added} nodes to <body>`);
	if (await c.page.getByRole('dialog').count()) throw new Error(`${what}: a dialog is in the DOM`);
}

// The first open of a Dialog-family overlay from `trigger`: the entrance
// plays, the trigger points at the dialog, focus starts on its Close button,
// and Escape closes it, restores the closed ARIA and gives focus back.
async function assertFirstDialogOpen(c, trigger) {
	const { page } = c;
	await recordEntrance(page, '[role=dialog]');
	await c.press(trigger);
	const dialog = page.getByRole('dialog');
	await dialog.waitFor({ state: 'visible', timeout: 3000 });
	await wait(400);
	await assertEntrance(page);
	const [, expanded, controls] = await attrs(trigger, DIALOG_POPUP);
	const id = await dialog.getAttribute('id');
	if (expanded !== 'true' || !controls || controls !== id) {
		throw new Error(`open trigger: expanded=${expanded} controls=${controls}, dialog id=${id}`);
	}
	const close = dialog.getByRole('button', { name: 'Close', exact: true });
	if (!(await close.evaluate((n) => n === document.activeElement))) {
		throw new Error('focus after the first open: ' + (await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))));
	}
	await page.keyboard.press('Escape');
	await dialog.waitFor({ state: 'hidden', timeout: 3000 });
	const closed = await attrs(trigger, DIALOG_POPUP);
	if (!same(closed, ['dialog', 'false', null])) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
	if (!(await trigger.evaluate((n) => n === document.activeElement))) throw new Error('focus did not return to the trigger');
}

// The computed display of the browser's own cancel button inside the search
// input `selector` matches. It sits in the input's user-agent shadow root,
// which only the DevTools protocol reaches.
async function searchCancelDisplay(page, selector) {
	const cdp = await page.context().newCDPSession(page);
	try {
		await cdp.send('DOM.enable');
		await cdp.send('CSS.enable');
		const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
		const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
		const kids = (n) => [...(n.children ?? []), ...(n.shadowRoots ?? [])];
		const find = (n, test) => (test(n) ? n : kids(n).reduce((hit, k) => hit ?? find(k, test), undefined));
		const input = find(root, (n) => n.nodeId === nodeId);
		const cancel = find(input, (n) => {
			const a = n.attributes ?? [];
			for (let i = 0; i < a.length; i += 2) if (a[i] === 'pseudo' && a[i + 1] === '-webkit-search-cancel-button') return true;
			return false;
		});
		if (!cancel) return 'absent';
		const { computedStyle } = await cdp.send('CSS.getComputedStyleForNode', { nodeId: cancel.nodeId });
		return computedStyle.find((s) => s.name === 'display')?.value;
	} finally {
		await cdp.detach();
	}
}

const drivers = {
	async dialogs(c) {
		const { page } = c;
		await c.step('closed dialogs mount no layers; trigger ARIA', async () => {
			const aria = await attrs(page.getByRole('button', { name: 'Open dialog', exact: true }), DIALOG_POPUP);
			if (!same(aria, ['dialog', 'false', null])) throw new Error('closed trigger ARIA: ' + JSON.stringify(aria));
			await assertClosedMountNothing(
				c,
				page.getByRole('button', { name: 'Mount three dialogs' }),
				page.getByRole('button', { name: 'Confirm 3' }),
				'three closed dialogs'
			);
		});
		await c.step('dialog first open: entrance, focus on Close, aria-controls names the dialog', () =>
			assertFirstDialogOpen(c, page.getByRole('button', { name: 'Confirm 1' }))
		);
		await c.step('initialFocus (an element, a function) places focus; an app onOpenAutoFocus that prevents wins', async () => {
			for (const [trigger, target] of [
				['Delete item', page.getByRole('button', { name: 'Keep', exact: true })],
				['Delete item', page.getByRole('button', { name: 'Keep', exact: true })],
				['Rename item', page.getByLabel('Item name')],
				['Own focus', page.getByLabel('Second field')]
			]) {
				await c.press(page.getByRole('button', { name: trigger, exact: true }));
				const dialog = page.getByRole('dialog', { name: trigger });
				await dialog.waitFor({ state: 'visible', timeout: 3000 });
				await wait(400);
				if (!(await target.evaluate((n) => n === document.activeElement))) {
					throw new Error(`${trigger}: focus on ` + (await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))));
				}
				await page.keyboard.press('Escape');
				await dialog.waitFor({ state: 'hidden', timeout: 3000 });
			}
		});
		await c.step('a dialog mounted with open set opens', async () => {
			await c.press(page.getByRole('button', { name: 'Mount an open dialog' }));
			const dialog = page.getByRole('dialog', { name: 'Opened at mount' });
			await dialog.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await page.keyboard.press('Escape');
			await dialog.waitFor({ state: 'hidden', timeout: 3000 });
		});
		await c.step('dialog opens', async () => {
			await c.press(page.getByRole('button', { name: 'Open dialog', exact: true }));
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
		const POPUP = ['aria-haspopup', 'aria-expanded', 'aria-controls'];
		await c.step('closed popovers mount no layers; trigger ARIA', async () => {
			const aria = await attrs(page.getByRole('button', { name: 'Plain popover', exact: true }), POPUP);
			if (!same(aria, ['dialog', 'false', null])) throw new Error('closed trigger ARIA: ' + JSON.stringify(aria));
			const before = await bodyNodes(page);
			await c.press(page.getByRole('button', { name: 'Mount three popovers' }));
			await page.getByRole('button', { name: 'Filter 3' }).waitFor({ timeout: 3000 });
			const added = (await bodyNodes(page)) - before;
			if (added !== 0) throw new Error(`three closed popovers added ${added} nodes to <body>`);
			if (await page.getByRole('dialog').count()) throw new Error('a closed popover is in the DOM');
		});
		await c.step('first open plays the entrance and moves focus in; aria-controls names the panel', async () => {
			const trigger = page.getByRole('button', { name: 'Filter 1' });
			await recordEntrance(page, '[role=dialog], .hp-sheet');
			await c.press(trigger);
			const panel = page.getByRole('dialog');
			await panel.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const [, expanded, controls] = await attrs(trigger, POPUP);
			const id = await panel.getAttribute('id');
			if (expanded !== 'true' || !controls || controls !== id) {
				throw new Error(`open trigger: expanded=${expanded} controls=${controls}, panel id=${id}`);
			}
			if (!(await panel.evaluate((n) => n.contains(document.activeElement)))) {
				throw new Error('focus after the first open: ' + (await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))));
			}
			await page.keyboard.press('Escape');
			await panel.waitFor({ state: 'hidden', timeout: 3000 });
			const closed = await attrs(trigger, POPUP);
			if (!same(closed, ['dialog', 'false', null])) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
			if (!(await trigger.evaluate((n) => n === document.activeElement))) throw new Error('focus did not return to the trigger');
		});
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
		const POPUP = ['role', 'aria-haspopup', 'aria-expanded', 'aria-controls'];
		const size = page.getByRole('combobox', { name: 'Size' });
		await c.step('closed select and comboboxes mount no layers; trigger ARIA and value', async () => {
			const before = await bodyNodes(page);
			await c.press(page.getByRole('button', { name: 'Mount closed fields' }));
			await size.waitFor({ timeout: 3000 });
			await wait(100);
			const added = (await bodyNodes(page)) - before;
			if (added !== 0) throw new Error(`a closed select and two comboboxes added ${added} nodes to <body>`);
			if (await page.getByRole('listbox').count()) throw new Error('a closed list is in the DOM');
			const sizeAria = await attrs(size, POPUP);
			if (!same(sizeAria, ['combobox', 'listbox', 'false', null])) throw new Error('closed Select ARIA: ' + JSON.stringify(sizeAria));
			const sizeText = (await size.textContent()).trim();
			if (sizeText !== 'Medium') throw new Error('closed Select shows ' + sizeText);
			// From 600px the field is Bits UI's input; below it, Hardpoint's button that opens the sheet.
			const tag = page.getByRole('combobox', { name: 'Tag 2' });
			const tagAria = await attrs(tag, POPUP);
			const want = ['combobox', c.touch ? 'dialog' : null, 'false', null];
			if (!same(tagAria, want)) throw new Error('closed Combobox ARIA: ' + JSON.stringify(tagAria));
			const tagText = c.touch ? (await tag.textContent()).trim() : await tag.inputValue();
			if (tagText !== 'Docs site') throw new Error('closed Combobox shows ' + tagText);
		});
		await c.step('select typeahead on the closed trigger before the first open', async () => {
			const before = await bodyNodes(page);
			await size.focus();
			await page.keyboard.press('l');
			await wait(200);
			const text = (await size.textContent()).trim();
			if (text !== 'Large') throw new Error('typeahead chose ' + text);
			if ((await bodyNodes(page)) !== before || (await page.getByRole('listbox').count())) throw new Error('typeahead mounted the list');
		});
		await c.step('select first open by keys plays the entrance and highlights the chosen option', async () => {
			await size.focus();
			await recordEntrance(page, '[role=listbox], .hp-sheet');
			await page.keyboard.press('Enter');
			const list = page.getByRole('listbox');
			await list.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const [, , expanded, controls] = await attrs(size, POPUP);
			const id = await list.getAttribute('id');
			if (expanded !== 'true' || !controls || controls !== id) {
				throw new Error(`open trigger: expanded=${expanded} controls=${controls}, list id=${id}`);
			}
			const highlighted = (await list.locator('[data-highlighted]').textContent())?.trim();
			if (highlighted !== 'Large') throw new Error('highlighted on the first open: ' + highlighted);
			await page.keyboard.press('Escape');
			await list.waitFor({ state: 'hidden', timeout: 3000 });
			const closed = await attrs(size, POPUP);
			if (!same(closed, ['combobox', 'listbox', 'false', null])) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
		});
		await c.step('combobox first open: entrance, ARIA, and typing filters', async () => {
			if (c.touch) {
				// Below 600px a press opens the sheet with the search input focused.
				// The input in the sheet is a combobox named by the same title, so
				// the field is the first.
				const tag = page.getByRole('combobox', { name: 'Tag 1' }).first();
				await recordEntrance(page, '.hp-sheet');
				await c.press(tag);
				const sheet = page.getByRole('dialog', { name: 'Tag 1' });
				await sheet.waitFor({ state: 'visible', timeout: 3000 });
				await wait(400);
				await assertEntrance(page);
				const [, , expanded, controls] = await attrs(tag, POPUP);
				if (expanded !== 'true' || controls !== (await sheet.getAttribute('id'))) {
					throw new Error(`open trigger: expanded=${expanded} controls=${controls}`);
				}
				await page.keyboard.type('des', { delay: 30 });
				await wait(300);
				const highlighted = await page.getByRole('listbox').locator('[data-highlighted]').textContent();
				if (!highlighted?.startsWith('Design system')) throw new Error('highlighted after typing: ' + highlighted);
				await c.press(sheet.getByRole('button', { name: /^close$/i }));
				await sheet.waitFor({ state: 'hidden', timeout: 3000 });
				return;
			}
			// From 600px the first key typed in the closed field opens the list,
			// replaces the chosen label and filters.
			for (const [name, typed, match, label] of [
				['Tag 1', 'des', 'Design system', ''],
				['Tag 2', 'web', 'Web app', 'Docs site']
			]) {
				const field = page.getByRole('combobox', { name });
				await field.focus();
				await recordEntrance(page, '.hp-combobox-panel');
				await page.keyboard.type(typed, { delay: 30 });
				const list = page.getByRole('listbox');
				await list.waitFor({ state: 'visible', timeout: 3000 });
				await wait(400);
				await assertEntrance(page);
				const value = await field.inputValue();
				if (value !== typed) throw new Error(`${name}: field holds "${value}" after typing "${typed}"`);
				const options = (await list.getByRole('option').allTextContents()).map((t) => t.trim());
				if (options.length !== 1 || !options[0].startsWith(match)) throw new Error(`${name}: options ${JSON.stringify(options)}`);
				const highlightedId = await list.locator('[data-highlighted]').getAttribute('id');
				const [expanded, controls, active] = await attrs(field, ['aria-expanded', 'aria-controls', 'aria-activedescendant']);
				if (expanded !== 'true' || controls !== (await list.getAttribute('id')) || !highlightedId || active !== highlightedId) {
					throw new Error(`${name}: expanded=${expanded} controls=${controls} activedescendant=${active} highlighted=${highlightedId}`);
				}
				await page.keyboard.press('Escape');
				await list.waitFor({ state: 'hidden', timeout: 3000 });
				const after = await attrs(field, ['aria-expanded', 'aria-controls']);
				if (!same(after, ['false', null])) throw new Error(`${name}: ARIA after closing ${JSON.stringify(after)}`);
				if ((await field.inputValue()) !== label) throw new Error(`${name}: field shows "${await field.inputValue()}" after Escape`);
			}
		});
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
		await c.step('combobox status region: mounted with the field, holds emptyText only while open and empty', async () => {
			// "Other" is closed here (fresh page), emptyText "Nothing found".
			const root = page.locator('.hp-combobox').filter({ has: page.locator('label', { hasText: /^Other$/ }) });
			const status = root.locator('[role=status]');
			const text = async (loc) => ((await loc.textContent()) ?? '').trim();
			if ((await status.count()) !== 1) throw new Error('a closed combobox has ' + (await status.count()) + ' status regions');
			if (await text(status)) throw new Error('the closed status region holds "' + (await text(status)) + '"');
			const filled = () => page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((n) => n.textContent.trim()).filter((t) => t === 'Nothing found').length);
			if (c.touch) {
				await c.press(page.getByRole('combobox', { name: 'Other' }));
				const sheet = page.getByRole('dialog', { name: 'Other' });
				await sheet.waitFor({ state: 'visible', timeout: 3000 });
				await wait(400);
				const search = sheet.getByRole('combobox');
				const placeholder = await search.getAttribute('placeholder');
				if (placeholder !== 'Search') throw new Error('the sheet search input placeholder is ' + JSON.stringify(placeholder));
				if ((await sheet.locator('[role=status]').count()) !== 1) throw new Error('the open sheet holds no single status region');
				await page.keyboard.type('zzz', { delay: 30 });
				await wait(300);
				if ((await text(sheet.locator('[role=status]'))) !== 'Nothing found') throw new Error('the sheet status region does not hold the empty text');
				if ((await filled()) !== 1) throw new Error('the empty text sits in ' + (await filled()) + ' status regions');
				await c.press(sheet.getByRole('button', { name: /^close$/i }));
				await sheet.waitFor({ state: 'hidden', timeout: 3000 });
				await wait(300);
				if ((await status.count()) !== 1 || (await text(status))) throw new Error('the status region is not back, empty, after the sheet closed');
				return;
			}
			// A key that matches nothing, typed into the closed field: the list opens
			// and the text arrives in a region that was already there.
			const field = page.getByRole('combobox', { name: 'Other' });
			await field.focus();
			await page.keyboard.press('z');
			await wait(400);
			if ((await text(status)) !== 'Nothing found') throw new Error('the status region holds "' + (await text(status)) + '" after a key that matches nothing');
			if ((await filled()) !== 1) throw new Error('the empty text sits in ' + (await filled()) + ' status regions');
			if ((await page.locator('.hp-combobox-empty').getAttribute('aria-hidden')) !== 'true') throw new Error('the visible empty line is not aria-hidden');
			await page.keyboard.press('Escape');
			await wait(300);
			if ((await status.count()) !== 1 || (await text(status))) throw new Error('the status region is not empty after closing');
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
		const triggerAria = (name) =>
			attrs(page.getByRole('button', { name, exact: true }), ['aria-haspopup', 'aria-expanded', 'aria-controls']);
		await c.step('closed menus mount no layers; trigger ARIA', async () => {
			const aria = await triggerAria('View');
			if (!same(aria, ['menu', 'false', null])) {
				throw new Error('closed trigger ARIA (haspopup, expanded, controls): ' + JSON.stringify(aria));
			}
			const before = await bodyNodes(page);
			await c.press(page.getByRole('button', { name: 'Mount three menus' }));
			await page.getByRole('button', { name: 'More 3' }).waitFor({ timeout: 3000 });
			const added = (await bodyNodes(page)) - before;
			if (added !== 0) throw new Error(`three closed menus added ${added} nodes to <body>`);
			if (await page.getByRole('menu').count()) throw new Error('a closed menu is in the DOM');
		});
		await c.step('first open plays the entrance; aria-controls names the menu', async () => {
			await recordEntrance(page);
			await c.press(page.getByRole('button', { name: 'More 1' }));
			const menu = page.getByRole('menu');
			await menu.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const [, expanded, controls] = await triggerAria('More 1');
			const id = await menu.getAttribute('id');
			if (expanded !== 'true' || !controls || controls !== id) {
				throw new Error(`open trigger: expanded=${expanded} controls=${controls}, menu id=${id}`);
			}
			await page.keyboard.press('Escape');
			await menu.waitFor({ state: 'hidden', timeout: 3000 });
			const closed = await triggerAria('More 1');
			if (closed[1] !== 'false' || closed[2] !== null) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
		});
		await c.step('first open by keys focuses the first item', async () => {
			await page.getByRole('button', { name: 'More 2' }).focus();
			await page.keyboard.press('Enter');
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(300);
			const focused = await page.evaluate(
				() => `${document.activeElement?.getAttribute('role')}:${document.activeElement?.textContent?.trim()}`
			);
			if (focused !== 'menuitem:First') throw new Error('focus after Enter: ' + focused);
			await page.keyboard.press('Escape');
			await page.getByRole('menu').waitFor({ state: 'hidden', timeout: 3000 });
		});
		await c.step('menu opens (list or sheet)', async () => {
			await c.press(page.getByRole('button', { name: 'View' }));
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
		});
		await c.step('MenuItem tone: data-tone and the danger label; no tone, no attribute', async () => {
			const read = (name) =>
				page.getByRole('menuitem', { name, exact: true }).evaluate((n) => ({ tone: n.getAttribute('data-tone'), variant: n.getAttribute('data-variant'), color: getComputedStyle(n).color }));
			const del = await read('Delete');
			const cut = await read('Cut');
			if (del.tone !== 'danger' || del.variant !== null) throw new Error('danger item attributes: ' + JSON.stringify(del));
			if (cut.tone !== null) throw new Error('neutral item has data-tone: ' + JSON.stringify(cut));
			if (del.color === cut.color) throw new Error('danger item has the neutral label colour ' + del.color);
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

	async search(c) {
		const { page } = c;
		const field = page.getByRole('searchbox', { name: 'Search this page' });
		const clear = page.getByRole('search').getByRole('button', { name: 'Clear', exact: true });
		const state = () => page.locator('#search-state').textContent();
		const inField = () => field.evaluate((n) => n === document.activeElement);
		const control = c.touch ? 44 : 36;
		await c.step('hidden label names the field; 16px text in the well', async () => {
			const label = await page.locator('label', { hasText: 'Search this page' }).boundingBox();
			if (!label || label.width > 1 || label.height > 1) throw new Error('label shows: ' + JSON.stringify(label));
			const [size, height] = await field.evaluate((n) => [getComputedStyle(n).fontSize, n.getBoundingClientRect().height]);
			if (size !== '16px' || height !== control) throw new Error(`well: font ${size}, height ${height}`);
		});
		await c.step('the browser cancel button never shows', async () => {
			await field.fill('abc');
			const plain = await searchCancelDisplay(page, '#plain-search');
			if (plain === 'none' || plain === 'absent') throw new Error(`control: the plain search input's cancel button is ${plain}`);
			for (const selector of ['#page-search', '.hp-text-field input[type=search]:disabled']) {
				const display = await searchCancelDisplay(page, selector);
				if (display !== 'none') throw new Error(`${selector}: cancel button display ${display}`);
			}
		});
		await c.step('clear by pointer keeps focus in the field', async () => {
			await field.fill('abc');
			const box = await clear.boundingBox();
			if (!box || box.width < control || box.height < control) throw new Error('clear button box ' + JSON.stringify(box));
			await field.evaluate((n) => {
				window.__blurs = 0;
				n.addEventListener('blur', () => window.__blurs++);
			});
			const before = await state();
			await c.press(clear);
			const inputs = Number(before.match(/inputs=(\d+)/)[1]);
			const after = await state();
			if (after !== `value=[] inputs=${inputs + 1}`) throw new Error(`after clear: "${after}", before "${before}"`);
			if (!(await inField())) throw new Error('focus left the field');
			const blurs = await page.evaluate(() => window.__blurs);
			if (blurs) throw new Error(`the field blurred ${blurs} times`);
			if (await clear.count()) throw new Error('clear button still shows on an empty field');
		});
		await c.step('clear by keys: Tab, then Enter or Space', async () => {
			for (const key of ['Enter', 'Space']) {
				await field.focus();
				await page.keyboard.type('xy');
				await page.keyboard.press('Tab');
				const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
				if (name !== 'Clear') throw new Error(`Tab reached "${name}", not the clear button`);
				await page.keyboard.press(key);
				if (!(await state()).startsWith('value=[] ')) throw new Error(`${key} did not clear: ${await state()}`);
				if (!(await inField())) throw new Error(`focus after ${key} is not in the field`);
			}
		});
		await c.step('clearLabel names the button; a disabled field has none', async () => {
			if ((await page.getByRole('button', { name: 'Clear search' }).count()) !== 1) throw new Error('no "Clear search" button');
			if ((await page.getByRole('button', { name: /^Clear/ }).count()) !== 1) throw new Error('a disabled or empty field shows a clear button');
		});
	},

	async buttons(c) {
		const { page } = c;
		const control = c.touch ? 44 : 36;
		const read = (id) =>
			page.evaluate((id) => {
				const n = document.getElementById(id);
				return {
					tag: n.tagName,
					parent: n.parentElement.id,
					classes: n.className,
					variant: n.getAttribute('data-variant'),
					tone: n.getAttribute('data-tone'),
					color: getComputedStyle(n).color,
					borderColor: getComputedStyle(n).borderTopColor,
					icon: n.hasAttribute('data-icon'),
					opens: n.hasAttribute('data-opens'),
					type: n.getAttribute('type'),
					href: n.getAttribute('href'),
					role: n.getAttribute('role'),
					ariaDisabled: n.getAttribute('aria-disabled') === 'true',
					tabIndex: n.tabIndex,
					disabled: n.disabled ?? null,
					size: [n.getBoundingClientRect().width, n.getBoundingClientRect().height]
				};
			}, id);
		const expect = (what, got, want) => {
			for (const [k, v] of Object.entries(want)) {
				if (JSON.stringify(got[k]) !== JSON.stringify(v)) throw new Error(`${what}: ${k} is ${JSON.stringify(got[k])}, expected ${JSON.stringify(v)}`);
			}
		};
		await c.step('icon button: a plain <button>, attributes, ref, click', async () => {
			const b = await read('b-icon');
			expect('icon button', b, { tag: 'BUTTON', parent: 'icon-host', variant: 'tertiary', icon: true, type: 'button', size: [control, control] });
			if (!/\bhp-button\b/.test(b.classes) || !/\bhp-label\b/.test(b.classes)) throw new Error('classes: ' + b.classes);
			await c.press(page.locator('#b-icon'));
			const s = await page.locator('#button-state').textContent();
			if (s !== 'clicks=1 ref=BUTTON') throw new Error('after click: ' + s);
		});
		await c.step('variants, disabled button, links', async () => {
			expect('primary', await read('b-primary'), { tag: 'BUTTON', variant: 'primary', type: null });
			expect('opens', await read('b-opens'), { variant: 'secondary', opens: true });
			expect('disabled', await read('b-disabled'), { tag: 'BUTTON', disabled: true });
			expect('link', await read('b-link'), { tag: 'A', href: '#buttons', role: null, ariaDisabled: false, tabIndex: 0 });
			expect('disabled link', await read('b-link-disabled'), {
				tag: 'A',
				href: null,
				role: 'link',
				ariaDisabled: true,
				tabIndex: -1
			});
		});
		await c.step('danger tone: data-tone on the element, ink changes, disabled ignores it', async () => {
			const normal = await read('b-opens');
			const secondary = await read('b-danger');
			const tertiary = await read('b-danger-tertiary');
			const disabled = await read('b-danger-disabled');
			const icon = await read('b-danger-icon');
			const link = await read('b-danger-link');
			expect('danger secondary', secondary, { tag: 'BUTTON', variant: 'secondary', tone: 'danger' });
			expect('danger tertiary', tertiary, { tag: 'BUTTON', variant: 'tertiary', tone: 'danger' });
			expect('danger disabled', disabled, { tone: 'danger', disabled: true });
			expect('danger icon', icon, { tone: 'danger', icon: true, size: [control, control] });
			expect('danger link', link, { tag: 'A', tone: 'danger', href: '#buttons' });
			expect('no tone', await read('b-primary'), { tone: null });
			expect('no tone', normal, { tone: null });
			const danger = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--danger').trim());
			// The tokens hold hex values; compare as the browser reports them.
			const probe = await page.evaluate((v) => {
				const e = document.createElement('i');
				e.style.color = v;
				document.body.append(e);
				const c = getComputedStyle(e).color;
				e.remove();
				return c;
			}, danger);
			for (const [what, got] of [['secondary', secondary.color], ['tertiary', tertiary.color], ['icon', icon.color], ['link', link.color]]) {
				if (got !== probe) throw new Error(`danger ${what} label is ${got}, expected --danger ${probe}`);
			}
			if (secondary.borderColor !== probe) throw new Error(`danger secondary border is ${secondary.borderColor}, expected ${probe}`);
			if (normal.color === probe) throw new Error('a button without a tone has the danger label');
			// Disabled keeps the normal disabled look: muted ink, the quiet border.
			const plain = await page.evaluate(() => {
				const b = document.getElementById('b-disabled');
				return { color: getComputedStyle(b).color };
			});
			if (disabled.color !== plain.color) throw new Error(`danger disabled label is ${disabled.color}, a plain disabled button's is ${plain.color}`);
			if (disabled.borderColor === probe) throw new Error('danger disabled button keeps the danger border');
		});
		if (!c.touch) {
			await c.step('danger tone: hover and focus keep their normal look', async () => {
				const fill = (id) => page.evaluate((id) => getComputedStyle(document.getElementById(id)).backgroundColor, id);
				const rest = await fill('b-danger');
				await page.locator('#b-danger').hover();
				await wait(300);
				const hover = await fill('b-danger');
				if (hover === rest) throw new Error('danger secondary shows no hover fill');
				await page.locator('#b-danger-tertiary').hover();
				await wait(300);
				const deco = await page.evaluate(() => {
					const s = getComputedStyle(document.getElementById('b-danger-tertiary'));
					return { line: s.textDecorationLine, color: s.textDecorationColor, ink: s.color };
				});
				if (deco.line !== 'underline' || deco.color !== deco.ink) throw new Error('danger tertiary hover underline: ' + JSON.stringify(deco));
			});
		}
	},

	async tooltips(c) {
		const { page } = c;
		const tip = (text) => page.getByRole('tooltip').filter({ hasText: text });
		await c.step('closed tooltips mount no layers; no description while closed', async () => {
			const before = await bodyNodes(page);
			await c.press(page.getByRole('button', { name: 'Mount three tooltips' }));
			await page.getByRole('button', { name: 'T3' }).waitFor({ timeout: 3000 });
			await wait(100);
			const added = (await bodyNodes(page)) - before;
			if (added !== 0) throw new Error(`three closed tooltips added ${added} nodes to <body>`);
			if (await page.getByRole('tooltip').count()) throw new Error('a closed tooltip is in the DOM');
			const described = await page.getByRole('button', { name: 'T1' }).getAttribute('aria-describedby');
			if (described !== null) throw new Error('closed trigger has aria-describedby=' + described);
		});
		await c.step('first open by keyboard focus: entrance; the trigger is described by the tooltip', async () => {
			const trigger = page.getByRole('button', { name: 'T1' });
			await page.getByRole('button', { name: 'Mount three tooltips' }).focus();
			await recordEntrance(page, '[role=tooltip]');
			await page.keyboard.press('Tab');
			await tip('Upload 1').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const described = await trigger.getAttribute('aria-describedby');
			const id = await tip('Upload 1').getAttribute('id');
			if (!described || described !== id) throw new Error(`open trigger: aria-describedby=${described}, tooltip id=${id}`);
			await page.keyboard.press('Escape');
			await tip('Upload 1').waitFor({ state: 'hidden', timeout: 3000 });
			const after = await trigger.getAttribute('aria-describedby');
			if (after !== null) throw new Error('aria-describedby after closing: ' + after);
		});
		await c.step('first open by pointer: entrance; the trigger is described by the tooltip', async () => {
			if (c.touch) return; // a touch never opens a tooltip
			await recordEntrance(page, '[role=tooltip]');
			await page.getByRole('button', { name: 'T2' }).hover();
			await tip('Upload 2').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const described = await page.getByRole('button', { name: 'T2' }).getAttribute('aria-describedby');
			if (!described || described !== (await tip('Upload 2').getAttribute('id'))) throw new Error('hovered trigger: aria-describedby=' + described);
			await page.mouse.move(700, 600);
			await tip('Upload 2').waitFor({ state: 'hidden', timeout: 3000 });
		});
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
		const warnings = [];
		page.on('console', (m) => {
			if (m.type() === 'warning' && /Toaster/.test(m.text())) warnings.push(m.text());
		});
		if (c.variant === 'bare') {
			await c.step('toast() without a Toaster warns once, names the fix, and returns a handle', async () => {
				await c.press(page.getByRole('button', { name: 'Plain toast' }));
				await wait(200);
				await c.press(page.getByRole('button', { name: 'Action toast' }));
				await wait(200);
				if (warnings.length !== 1) throw new Error(`expected one warning after two toast() calls, got ${warnings.length}`);
				if (!/<Toaster \/>/.test(warnings[0])) throw new Error('the warning does not name the fix: ' + warnings[0]);
				if (await page.locator('.hp-toaster').count()) throw new Error('a toast rendered without a Toaster');
				if ((await page.locator('#handle').textContent()) !== 'handle') throw new Error('toast() returned no dismiss handle');
			});
			return;
		}
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
		await c.step('a mounted Toaster means no warning', async () => {
			if (warnings.length) throw new Error('toast() warned although a Toaster is mounted: ' + warnings[0]);
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

	async selected(c) {
		const { page } = c;
		await c.step('.hp-selected draws the edge and tint; an app rule outranks it', async () => {
			const style = (sel) => page.locator(sel).evaluate((n) => { const s = getComputedStyle(n); return { bg: s.backgroundColor, shadow: s.boxShadow }; });
			const [plain, picked, rtl, own, inherit, island] = await Promise.all(['#plain', '#picked', '#rtl', '#own', '#inherit', '#island'].map(style));
			c.info('selected: ' + JSON.stringify({ plain, picked, rtl, own, inherit, island }));
			const start = (s) => / 3px 0px 0px 0px inset/.test(s);
			const end = (s) => / -3px 0px 0px 0px inset/.test(s);
			if (plain.shadow !== 'none' || plain.bg === picked.bg) throw new Error('a selected row looks like a plain one: ' + picked.bg);
			if (!start(picked.shadow)) throw new Error('no 3px edge on the inline start: ' + picked.shadow);
			if (!end(rtl.shadow)) throw new Error('dir="rtl" on the row keeps the edge on the left: ' + rtl.shadow);
			if (!end(inherit.shadow)) throw new Error('dir="rtl" on the list keeps the edge on the left: ' + inherit.shadow);
			if (!start(island.shadow)) throw new Error('dir="ltr" inside a right-to-left list has the edge on the right: ' + island.shadow);
			if (own.bg !== 'rgb(10, 20, 30)') throw new Error('an app rule does not outrank .hp-selected: ' + own.bg);
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
		await c.step('closed viewers mount no layers; trigger ARIA', async () => {
			const aria = await attrs(page.getByRole('button', { name: 'Open same-origin' }), DIALOG_POPUP);
			if (!same(aria, ['dialog', 'false', null])) throw new Error('closed trigger ARIA: ' + JSON.stringify(aria));
			await assertClosedMountNothing(
				c,
				page.getByRole('button', { name: 'Mount three viewers' }),
				page.getByRole('button', { name: 'Photo 3' }),
				'three closed viewers'
			);
		});
		await c.step('viewer first open: entrance, focus on Close, aria-controls names the viewer', () =>
			assertFirstDialogOpen(c, page.getByRole('button', { name: 'Photo 1' }))
		);
		await c.step('a viewer mounted with open set opens', async () => {
			await c.press(page.getByRole('button', { name: 'Mount an open viewer' }));
			const viewer = page.getByRole('dialog', { name: 'Opened at mount' });
			await viewer.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await page.keyboard.press('Escape');
			await viewer.waitFor({ state: 'hidden', timeout: 3000 });
		});
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
		await c.step('MenuItem tone, EmptyState and ErrorState actions render', async () => {
			const n = await c.page.evaluate(() => ({
				empty: document.querySelectorAll('.hp-empty-state-actions button').length,
				error: [...document.querySelector('.hp-error-state-actions').querySelectorAll('button')].map((b) => b.textContent.trim())
			}));
			if (n.empty !== 1) throw new Error('EmptyState actions: ' + JSON.stringify(n));
			if (n.error.join() !== 'Try again,Sign in') throw new Error('ErrorState actions, after the retry button: ' + JSON.stringify(n));
		});
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
		// Select, NativeSelect, Checkbox and Switch take `error` and `hint` as
		// TextField does. A form relies on these: the control says it is invalid,
		// its description starts with the error, then the hint, then the app's
		// own id, and its boundary turns the colour of the message.
		const fields = [
			['NativeSelect', page.getByLabel('Native', { exact: true }), 'Native needs a choice', ['Native hint']],
			['Select', page.getByRole('combobox', { name: 'Plan' }), 'Plan needs a choice', ['Plan hint']],
			['Checkbox', page.getByRole('checkbox', { name: 'Terms' }), 'Terms needs a choice', ['Terms hint', 'Extra description']],
			['Switch', page.getByRole('switch', { name: 'Backups' }), 'Backups needs a choice', ['Backups hint']],
			['Switch without a visible label', page.getByRole('switch', { name: 'Row switch' }), 'Row needs a choice', []]
		];
		const state = (loc) =>
			loc.evaluate((n) => {
				const texts = (n.getAttribute('aria-describedby') || '')
					.split(' ')
					.filter(Boolean)
					.map((id) => document.getElementById(id));
				return {
					invalid: n.getAttribute('aria-invalid'),
					described: texts.map((e) => e?.textContent.trim() ?? null),
					edge: getComputedStyle(n).borderTopColor,
					messageColor: texts[0] ? getComputedStyle(texts[0]).color : null,
					messageOpacity: texts[0] ? getComputedStyle(texts[0]).opacity : null
				};
			});
		await c.step('Select, NativeSelect, Checkbox and Switch: no error until one is given', async () => {
			for (const [kind, loc, , rest] of fields) {
				const s = await state(loc);
				if (s.invalid !== null || !same(s.described, rest)) throw new Error(`${kind} before an error: ${JSON.stringify(s)}`);
			}
		});
		await c.step('an error sets aria-invalid, comes first in aria-describedby and reddens the boundary', async () => {
			await c.press(page.getByRole('button', { name: 'Toggle field errors' }));
			await wait(500);
			for (const [kind, loc, message, rest] of fields) {
				const s = await state(loc);
				if (s.invalid !== 'true') throw new Error(`${kind}: aria-invalid is ${s.invalid}`);
				if (!same(s.described, [message, ...rest])) throw new Error(`${kind}: aria-describedby reads ${JSON.stringify(s.described)}`);
				if (s.edge !== s.messageColor) throw new Error(`${kind}: boundary ${s.edge} is not the message colour ${s.messageColor}`);
				if (s.messageOpacity !== '1') throw new Error(`${kind}: the error stays at opacity ${s.messageOpacity}`);
			}
		});
		await c.step('a cleared error takes aria-invalid, the message and the red boundary with it', async () => {
			const reds = await Promise.all(fields.map(([, loc]) => state(loc).then((s) => s.messageColor)));
			await c.press(page.getByRole('button', { name: 'Toggle field errors' }));
			await wait(300);
			for (const [i, [kind, loc, , rest]] of fields.entries()) {
				const s = await state(loc);
				if (s.invalid !== null || !same(s.described, rest)) throw new Error(`${kind} after the error cleared: ${JSON.stringify(s)}`);
				if (s.edge === reds[i]) throw new Error(`${kind}: the boundary stayed red`);
			}
		});
		await c.step('NativeSelect ref is the <select>', async () => {
			await c.press(page.getByRole('button', { name: 'Read native ref' }));
			await wait(100);
			const tag = (await page.locator('#native-ref').textContent())?.trim();
			if (tag !== 'SELECT') throw new Error('ref is ' + tag);
			await c.press(page.getByRole('button', { name: 'Focus native ref' }));
			await wait(100);
			const focused = await page.evaluate(() => {
				const a = document.activeElement;
				return a?.tagName + ':' + document.querySelector(`label[for="${a?.id}"]`)?.textContent?.trim();
			});
			if (focused !== 'SELECT:Native') throw new Error('the ref focused ' + focused);
		});
		if (c.touch) {
			await c.step('Select closeLabel names the sheet close button', async () => {
				await c.press(page.getByRole('combobox', { name: 'Plan' }));
				const close = page.getByRole('button', { name: 'Dismiss plans' });
				await close.waitFor({ state: 'visible', timeout: 3000 });
				if (await page.getByRole('button', { name: 'Close', exact: true }).count()) throw new Error('the default Close name is still there');
				await c.press(close);
				await close.waitFor({ state: 'hidden', timeout: 3000 });
			});
		}
	},

	async shell(c) {
		const { page } = c;
		if (c.variant === 'drawer') {
			// From 600px the menu button is hidden, and the drawer never opens.
			const menu = page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true });
			await c.step('closed drawer mounts no layers; menu button ARIA', async () => {
				await assertClosedMountNothing(
					c,
					page.getByRole('button', { name: 'Mount shell' }),
					page.locator('.hp-app-shell'),
					'a shell with a closed drawer'
				);
				const aria = await attrs(menu, DIALOG_POPUP);
				if (!same(aria, ['dialog', 'false', null])) throw new Error('closed menu button ARIA: ' + JSON.stringify(aria));
			});
			if (c.touch) {
				await c.step('drawer first open: entrance, focus on Close, aria-controls names the drawer', () =>
					assertFirstDialogOpen(c, menu)
				);
			}
		}
		if (!c.touch) {
			await c.step('rail or sidebar renders', async () => {
				await wait(500);
			});
		}
	}
};

// Extra variants of a scene: [query string, label].
const variants = {
	// Without a Toaster: toast() has nowhere to show and warns once.
	toasts: [
		['', ''],
		['?toaster=none', 'bare']
	],
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
