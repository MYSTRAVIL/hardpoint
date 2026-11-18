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
// input `selector` matches, or of another user-agent part (`pseudo`). It sits
// in the input's user-agent shadow root, which only the DevTools protocol
// reaches.
async function searchCancelDisplay(page, selector, pseudo = '-webkit-search-cancel-button') {
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
			for (let i = 0; i < a.length; i += 2) if (a[i] === 'pseudo' && a[i + 1] === pseudo) return true;
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
		await c.step('NativeSelect labelHidden: the label is the select\'s name, hidden from sight, and overrides labelBeside', async () => {
			const select = page.getByRole('combobox', { name: 'Order', exact: true });
			if ((await select.count()) !== 1) throw new Error('no select named Order');
			const got = await select.evaluate((n) => {
				const root = n.closest('.hp-native-select');
				const label = root.querySelector('label');
				const box = label.getBoundingClientRect();
				const well = n.getBoundingClientRect();
				const rootBox = root.getBoundingClientRect();
				return {
					hiddenClass: label.classList.contains('hp-visually-hidden'),
					labelFor: label.htmlFor === n.id,
					beside: root.getAttribute('data-label-beside'),
					labelSize: Math.round(box.width) + 'x' + Math.round(box.height),
					clip: getComputedStyle(label).clipPath,
					wellFromStart: Math.round(well.left - rootBox.left)
				};
			});
			c.info('hidden native label: ' + JSON.stringify(got));
			if (!got.hiddenClass || !got.labelFor || got.beside !== null || got.labelSize !== '1x1' || got.clip === 'none') throw new Error('label: ' + JSON.stringify(got));
			if (got.wellFromStart !== 0) throw new Error('the well sits beside a hidden label: ' + JSON.stringify(got));
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

	async multiselect(c) {
		const { page } = c;
		const POPUP = ['role', 'aria-haspopup', 'aria-expanded', 'aria-controls'];
		const text = async (loc) => ((await loc.textContent()) ?? '').trim();
		const focused = (loc) => loc.evaluate((n) => n === document.activeElement);
		const type = page.getByRole('combobox', { name: 'Type', exact: true });
		// The trigger comes before the search box, which is named by the same label.
		const city = page.getByRole('combobox', { name: 'City', exact: true }).first();
		await c.step('closed multi-selects mount no layers; trigger ARIA and summary', async () => {
			await assertClosedMountNothing(
				c,
				page.getByRole('button', { name: 'Mount closed fields' }),
				page.getByRole('combobox', { name: 'Closed long', exact: true }),
				'two closed multi-selects'
			);
			if (await page.getByRole('listbox').count()) throw new Error('a closed list is in the DOM');
			const short = page.getByRole('combobox', { name: 'Closed short', exact: true });
			const long = page.getByRole('combobox', { name: 'Closed long', exact: true });
			// Up to eight options Bits UI's Select trigger over a listbox; more open a panel with a search box.
			const shortAria = await attrs(short, POPUP);
			if (!same(shortAria, ['combobox', 'listbox', 'false', null])) throw new Error('closed short ARIA: ' + JSON.stringify(shortAria));
			const longAria = await attrs(long, POPUP);
			if (!same(longAria, ['combobox', 'dialog', 'false', null])) throw new Error('closed long ARIA: ' + JSON.stringify(longAria));
			const summaries = [await text(short), await text(long), await text(type)];
			if (!same(summaries, ['2 selected', 'Tokyo', 'PDF'])) throw new Error('closed summaries: ' + JSON.stringify(summaries));
		});
		await c.step('short list: first open, multiselectable listbox, counts in option names, toggles, focus back', async () => {
			await recordEntrance(page, '.hp-multi-select-list, .hp-sheet');
			if (c.touch) await c.press(type);
			else {
				await type.focus();
				await page.keyboard.press('Enter');
			}
			const list = page.getByRole('listbox');
			await list.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			if ((await list.getAttribute('aria-multiselectable')) !== 'true') throw new Error('the listbox is not multiselectable');
			const [, , expanded, controls] = await attrs(type, POPUP);
			if (expanded !== 'true' || !controls || controls !== (await list.getAttribute('id'))) {
				throw new Error(`open trigger: expanded=${expanded} controls=${controls}`);
			}
			const tree = await list.ariaSnapshot();
			if (!/option "PDF\W+124" \[selected\]/.test(tree) || !/option "Archive\W+9" \[disabled\]/.test(tree)) {
				throw new Error('option names or states: ' + tree.replace(/\n/g, ' | '));
			}
			if (c.touch) {
				const h = await list.getByRole('option').first().evaluate((n) => n.getBoundingClientRect().height);
				c.info(`multi-select sheet row: ${h}px`);
				if (h < 44) throw new Error(`a sheet row is ${h}px high`);
				await c.press(list.getByRole('option', { name: /^Spreadsheet/ }));
				await wait(200);
				if ((await text(page.locator('#type-value'))) !== 'pdf,sheet') throw new Error('a tap did not toggle: ' + (await text(page.locator('#type-value'))));
				await c.press(page.locator('.hp-sheet').getByRole('button', { name: 'Close', exact: true }));
				await list.waitFor({ state: 'hidden', timeout: 3000 });
				return;
			}
			// The highlight opens on the first chosen option, PDF.
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('Space');
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('Enter');
			await wait(200);
			if ((await text(page.locator('#type-value'))) !== 'pdf,sheet,image') throw new Error('Space and Enter: ' + (await text(page.locator('#type-value'))));
			if ((await text(type)) !== '3 selected') throw new Error('summary after toggles: ' + (await text(type)));
			await page.keyboard.press('Escape');
			await list.waitFor({ state: 'hidden', timeout: 3000 });
			if (!(await focused(type))) throw new Error('focus did not return to the trigger');
			const closed = await attrs(type, POPUP);
			if (!same(closed, ['combobox', 'listbox', 'false', null])) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
		});
		await c.step('long list: search box keeps the keys, a value not in items stays listed, focus back', async () => {
			await recordEntrance(page, '.hp-multi-select-panel, .hp-sheet');
			await c.press(city);
			const dialog = page.getByRole('dialog', { name: 'City' });
			await dialog.waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
			await assertEntrance(page);
			const [, , expanded, controls] = await attrs(city, POPUP);
			if (expanded !== 'true' || !controls || controls !== (await dialog.getAttribute('id'))) {
				throw new Error(`open trigger: expanded=${expanded} controls=${controls}`);
			}
			const search = dialog.getByRole('combobox');
			const list = dialog.getByRole('listbox');
			if ((await list.getAttribute('aria-multiselectable')) !== 'true') throw new Error('the listbox is not multiselectable');
			const first = list.getByRole('option').first();
			if (!(await text(first)).startsWith('atlantis') || (await first.getAttribute('aria-selected')) !== 'true') {
				throw new Error('the value not in items is not listed first and chosen: ' + (await text(first)));
			}
			if (c.touch) {
				// A touch opens it without the on-screen keyboard; a tap on the box brings it up.
				if (await focused(search)) throw new Error('a touch focused the search box');
				const size = await search.evaluate((n) => getComputedStyle(n).fontSize);
				if (size !== '16px') throw new Error('search box text is ' + size);
				await c.press(search);
				if (!(await focused(search))) throw new Error('a tap did not focus the search box');
			} else if (!(await focused(search))) throw new Error('the search box has no focus after the open');
			await page.keyboard.type('asi', { delay: 30 });
			await wait(300);
			const shown = (await list.getByRole('option').allTextContents()).map((t) => t.trim());
			if (shown.length !== 3 || !shown[0].startsWith('Tokyo')) throw new Error('search "asi": ' + JSON.stringify(shown));
			const [active] = await attrs(search, ['aria-activedescendant']);
			const highlighted = await list.locator('[data-highlighted]').getAttribute('id');
			if (!highlighted || active !== highlighted) throw new Error(`activedescendant=${active} highlighted=${highlighted}`);
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('Enter');
			await wait(200);
			if ((await search.inputValue()) !== 'asi') throw new Error('the search box holds "' + (await search.inputValue()) + '" after Enter');
			if ((await text(page.locator('#city-value'))) !== 'lisbon,atlantis,seoul') throw new Error('Enter while typing: ' + (await text(page.locator('#city-value'))));
			if (c.touch) await c.press(dialog.getByRole('button', { name: 'Close', exact: true }));
			else await page.keyboard.press('Escape');
			await dialog.waitFor({ state: 'hidden', timeout: 3000 });
			if (!(await focused(city))) throw new Error('focus did not return to the trigger');
			const closed = await attrs(city, POPUP);
			if (!same(closed, ['combobox', 'dialog', 'false', null])) throw new Error('trigger ARIA after closing: ' + JSON.stringify(closed));
		});
		await c.step('Clear removes every value and puts focus on the trigger', async () => {
			const clear = page.getByRole('button', { name: 'Clear City', exact: true });
			await c.press(clear);
			await wait(200);
			if ((await text(page.locator('#city-value'))) !== '') throw new Error('values left: ' + (await text(page.locator('#city-value'))));
			if ((await text(city)) !== 'Any') throw new Error('summary after Clear: ' + (await text(city)));
			if (!(await focused(city))) throw new Error('focus is not on the trigger after Clear');
			if (await clear.count()) throw new Error('the clear button stays with nothing chosen');
		});
		await c.step('forms: one input per value; required stops a native submit and focuses the trigger', async () => {
			const want = (await text(page.locator('#type-value')))
				.split(',')
				.map((v) => 'type=' + v)
				.join('&');
			await c.press(page.getByRole('button', { name: 'Send', exact: true }));
			await wait(200);
			if ((await text(page.locator('#submitted'))) !== want) throw new Error(`submitted "${await text(page.locator('#submitted'))}", expected "${want}"`);
			await c.press(page.getByRole('button', { name: 'Check', exact: true }));
			await wait(300);
			if (await text(page.locator('#checked'))) throw new Error('an empty required field let its form submit');
			const needed = page.getByRole('combobox', { name: 'Needed', exact: true });
			if ((await needed.getAttribute('aria-required')) !== 'true') throw new Error('no aria-required on the trigger');
			if (!(await focused(needed))) throw new Error('the browser did not land on the required trigger');
		});
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

	async menulinks(c) {
		const { page } = c;
		const trigger = page.getByRole('button', { name: 'Go to', exact: true });
		const state = () => page.locator('#link-state').textContent();
		const hash = () => page.evaluate(() => location.hash);
		const open = async () => {
			await c.press(trigger);
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(400);
		};
		const closed = () => page.getByRole('menu').waitFor({ state: 'hidden', timeout: 3000 });
		await c.step('a link item is an <a href> with the menuitem role', async () => {
			await open();
			const read = (name) =>
				page.getByRole('menuitem', { name, exact: true }).evaluate((n) => ({
					tag: n.tagName,
					href: n.getAttribute('href'),
					target: n.getAttribute('target'),
					rel: n.getAttribute('rel'),
					download: n.getAttribute('download'),
					tone: n.getAttribute('data-tone'),
					disabled: n.getAttribute('aria-disabled'),
					color: getComputedStyle(n).color,
					decoration: getComputedStyle(n).textDecorationLine
				}));
			const next = await read('Next page');
			if (next.tag !== 'A' || next.href !== '#next-page') throw new Error('link item: ' + JSON.stringify(next));
			if (next.decoration !== 'none') throw new Error('link item is underlined: ' + next.decoration);
			const plain = await read('A plain action');
			if (plain.tag !== 'DIV' || plain.href !== null) throw new Error('plain item: ' + JSON.stringify(plain));
			if (next.color !== plain.color) throw new Error(`link colour ${next.color} differs from the row's ${plain.color}`);
			const docs = await read('Docs in a new tab');
			if (docs.target !== '_blank' || docs.rel !== 'noreferrer') throw new Error('target and rel: ' + JSON.stringify(docs));
			const file = await read('Download export');
			if (file.download !== 'export.csv') throw new Error('download: ' + JSON.stringify(file));
			const danger = await read('Removal page');
			if (danger.tone !== 'danger' || danger.href !== '#removal-page' || danger.color === next.color) {
				throw new Error('danger link: ' + JSON.stringify(danger));
			}
			if ((await state()) !== 'selected=[] ref=A') throw new Error('ref of a link item: ' + (await state()));
		});
		await c.step('a disabled link item has no address and is not a link', async () => {
			const off = await page.getByRole('menuitem', { name: 'Unavailable page', exact: true }).evaluate((n) => ({
				tag: n.tagName,
				href: n.getAttribute('href'),
				disabled: n.getAttribute('aria-disabled')
			}));
			if (off.tag !== 'DIV' || off.href !== null || off.disabled !== 'true') throw new Error(JSON.stringify(off));
			// Playwright will not act on an aria-disabled element, so press at its centre.
			const at = await page.getByRole('menuitem', { name: 'Unavailable page', exact: true }).boundingBox();
			if (c.touch) await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
			else await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
			await wait(300);
			if ((await hash()) === '#unavailable-page') throw new Error('a disabled item followed its link');
			if (!(await page.getByRole('menu').isVisible())) throw new Error('a disabled item closed the menu');
		});
		await c.step('a press follows the link, runs onSelect and closes the menu', async () => {
			await c.press(page.getByRole('menuitem', { name: 'Next page', exact: true }));
			await closed();
			if ((await hash()) !== '#next-page') throw new Error('hash after the press: ' + (await hash()));
			if (!(await state()).includes('selected=[next]')) throw new Error('state: ' + (await state()));
		});
		await c.step('Enter on the highlighted link follows it and closes the menu', async () => {
			await page.evaluate(() => history.replaceState(null, '', '#'));
			await trigger.focus();
			await page.keyboard.press('Enter');
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(300);
			const focused = await page.evaluate(() => `${document.activeElement?.tagName}:${document.activeElement?.getAttribute('role')}:${document.activeElement?.textContent?.trim()}`);
			if (focused !== 'A:menuitem:Next page') throw new Error('focus after Enter on the trigger: ' + focused);
			await page.keyboard.press('ArrowDown'); // the disabled item is skipped
			const second = await page.evaluate(() => document.activeElement?.textContent?.trim());
			if (second !== 'Docs in a new tab') throw new Error('the arrow keys landed on ' + second);
			await page.keyboard.press('ArrowUp');
			await page.keyboard.press('Enter');
			await closed();
			if ((await hash()) !== '#next-page') throw new Error('hash after Enter: ' + (await hash()));
			if (!(await trigger.evaluate((n) => n === document.activeElement))) throw new Error('focus did not return to the trigger');
		});
		await c.step('Space follows the link too', async () => {
			await page.evaluate(() => history.replaceState(null, '', '#'));
			await trigger.focus();
			await page.keyboard.press('Enter');
			await page.getByRole('menu').waitFor({ state: 'visible', timeout: 3000 });
			await wait(300);
			await page.keyboard.press('Space');
			await closed();
			if ((await hash()) !== '#next-page') throw new Error('hash after Space: ' + (await hash()));
		});
		if (c.touch) {
			await c.step('the press that opened the sheet never follows a link under it', async () => {
				await page.evaluate(() => history.replaceState(null, '', '#'));
				await open();
				const item = page.getByRole('menuitem', { name: 'Next page', exact: true });
				// A click with no press inside the sheet: the opening tap's click.
				const notCancelled = await item.evaluate((n) => n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
				await wait(200);
				if (notCancelled || (await hash()) === '#next-page') throw new Error('the click followed the link (cancelled=' + !notCancelled + ')');
				if (!(await page.getByRole('menu').isVisible())) throw new Error('the click closed the sheet');
				await c.press(item);
				await closed();
				if ((await hash()) !== '#next-page') throw new Error('a real tap did not follow the link: ' + (await hash()));
			});
		}
	},

	async slider(c) {
		const { page } = c;
		const state = () => page.locator('#slider-state').textContent();
		const field = (name) => page.getByRole('slider', { name, exact: true });
		const box = (name) => page.locator('.hp-slider', { has: page.getByRole('slider', { name, exact: true }) }).locator('.hp-slider-control');
		const now = async (name) => Number(await field(name).getAttribute('aria-valuenow'));
		await c.step('role, range, value text, name and description', async () => {
			const thumb = field('Opacity');
			const a = await attrs(thumb, ['role', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-orientation', 'tabindex']);
			if (!same(a, ['slider', '0', '100', '60', '60%', 'horizontal', '0'])) throw new Error('opacity thumb: ' + JSON.stringify(a));
			const text = await attrs(field('Quality'), ['aria-valuetext']);
			if (text[0] !== 'Level 3 of 10') throw new Error('valueText: ' + JSON.stringify(text));
			const described = await thumb.evaluate((n) => document.getElementById(n.getAttribute('aria-describedby') ?? '')?.textContent);
			if (described !== 'How much of the image shows.') throw new Error('hint is not the description: ' + described);
			const shown = (await page.locator('.hp-slider-value').allTextContents()).slice(0, 4);
			if (shown.join('|') !== '60%|0.40|3|20%') throw new Error('shown values ' + shown.join('|'));
		});
		await c.step('the thumb and the range sit where Bits UI puts them (CSSOM styles under the policy)', async () => {
			const control = await box('Opacity').boundingBox();
			const thumb = await field('Opacity').boundingBox();
			const centre = thumb.x + thumb.width / 2;
			const want = control.x + control.width * 0.6;
			if (Math.abs(centre - want) > 1.5) throw new Error(`thumb centre ${centre}, wanted ${want}`);
			const range = await box('Opacity').locator('.hp-slider-range').boundingBox();
			if (Math.abs(range.x + range.width - centre) > 1.5) throw new Error(`range ends at ${range.x + range.width}, thumb centre ${centre}`);
			const styleAttrs = await page.evaluate(() => [...document.querySelectorAll('.hp-slider [style]')].map((n) => n.className));
			c.info('elements with a style attribute set through the CSSOM: ' + styleAttrs.join(', '));
		});
		await c.step('size, hit areas and a square thumb', async () => {
			const control = await box('Opacity').boundingBox();
			const thumb = await field('Opacity').boundingBox();
			c.info(`control ${control.width}x${control.height}, thumb ${thumb.width}x${thumb.height}`);
			const hit = c.touch ? 44 : 24;
			if (control.height < hit) throw new Error('track area is ' + control.height + 'px high');
			const radius = await field('Opacity').evaluate((n) => getComputedStyle(n).borderRadius);
			if (radius !== '0px') throw new Error('thumb radius ' + radius);
			// The thumb's own hit area: points a little off its body still reach it.
			const cx = thumb.x + thumb.width / 2;
			const cy = thumb.y + thumb.height / 2;
			const reach = hit / 2 - 2;
			for (const [dx, dy] of [[-reach, 0], [reach, 0], [0, -reach], [0, reach]]) {
				const hitTag = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('role'), [cx + dx, cy + dy]);
				if (hitTag !== 'slider') throw new Error(`point ${dx},${dy} off the thumb hits ${hitTag}`);
			}
		});
		await c.step('keys: arrows, Home and End; the shown value is live', async () => {
			await field('Opacity').focus();
			await page.keyboard.press('ArrowRight');
			await page.keyboard.press('ArrowRight');
			if ((await now('Opacity')) !== 62) throw new Error('after two ArrowRight: ' + (await now('Opacity')));
			await page.keyboard.press('ArrowLeft');
			await page.keyboard.press('Home');
			if ((await now('Opacity')) !== 0) throw new Error('Home: ' + (await now('Opacity')));
			await page.keyboard.press('End');
			if ((await now('Opacity')) !== 100) throw new Error('End: ' + (await now('Opacity')));
			const live = await page.locator('.hp-slider-value').first().textContent();
			if (live !== '100%') throw new Error('shown value ' + live);
			if (!(await state()).includes('opacity=100')) throw new Error('bound value ' + (await state()));
			const commits = Number((await state()).match(/commits=(\d+)/)[1]);
			if (commits < 4) throw new Error('onValueCommit ran ' + commits + ' times for four key presses');
			await field('Match threshold').focus();
			await page.keyboard.press('ArrowRight');
			const t = await attrs(field('Match threshold'), ['aria-valuenow', 'aria-valuetext']);
			if (t[0] !== '0.45' || t[1] !== '0.45') throw new Error('a fractional step: ' + JSON.stringify(t));
		});
		await c.step('a press on the track moves the thumb under the pointer', async () => {
			const control = await box('Opacity').boundingBox();
			const y = control.y + control.height / 2;
			const x = control.x + control.width * 0.25;
			if (c.touch) await page.touchscreen.tap(x, y);
			else await page.mouse.click(x, y);
			await wait(100);
			const v = await now('Opacity');
			if (Math.abs(v - 25) > 1) throw new Error('after a press at 25%: ' + v);
			if (!(await field('Opacity').evaluate((n) => n === document.activeElement))) throw new Error('the thumb did not take focus');
		});
		await c.step('a drag moves it and commits once', async () => {
			const control = await box('Opacity').boundingBox();
			const thumb = await field('Opacity').boundingBox();
			const y = control.y + control.height / 2;
			const x0 = thumb.x + thumb.width / 2;
			const x1 = control.x + control.width * 0.8;
			const before = Number((await state()).match(/commits=(\d+)/)[1]);
			if (c.touch) {
				await c.swipe(x0, y, x1, y);
			} else {
				await page.mouse.move(x0, y);
				await page.mouse.down();
				await page.mouse.move(x1, y, { steps: 8 });
				await page.mouse.up();
			}
			await wait(150);
			const v = await now('Opacity');
			if (Math.abs(v - 80) > 2) throw new Error('after a drag to 80%: ' + v);
			const after = Number((await state()).match(/commits=(\d+)/)[1]);
			if (after !== before + 1) throw new Error(`commits went from ${before} to ${after} for one drag`);
		});
		await c.step('the track lets the page scroll vertically (touch-action)', async () => {
			const ta = await box('Opacity').evaluate((n) => getComputedStyle(n).touchAction);
			if (ta !== 'pan-y') throw new Error('touch-action ' + ta);
		});
		await c.step('disabled: no tab stop, no change', async () => {
			const off = await attrs(field('Locked'), ['aria-disabled', 'tabindex']);
			if (!same(off, ['true', '-1'])) throw new Error('disabled thumb: ' + JSON.stringify(off));
			const control = await box('Locked').boundingBox();
			const y = control.y + control.height / 2;
			if (c.touch) await page.touchscreen.tap(control.x + control.width * 0.9, y);
			else await page.mouse.click(control.x + control.width * 0.9, y);
			await wait(100);
			if ((await now('Locked')) !== 20) throw new Error('a disabled slider changed to ' + (await now('Locked')));
		});
		await c.step('label beside: label, track and value on one row, a control high, the value width held', async () => {
			const root = page.locator('.hp-slider', { has: field('Min score') });
			const label = await root.locator('.hp-slider-label').boundingBox();
			const control = await box('Min score').boundingBox();
			const value = await root.locator('.hp-slider-value').boundingBox();
			const row = await root.boundingBox();
			const mid = (b) => b.y + b.height / 2;
			if (Math.abs(mid(label) - mid(control)) > 2 || Math.abs(mid(value) - mid(control)) > 2) {
				throw new Error(`not one row: label ${mid(label)}, control ${mid(control)}, value ${mid(value)}`);
			}
			if (!(label.x + label.width <= control.x && control.x + control.width <= value.x)) throw new Error('order is not label, track, value');
			const controlHeight = c.touch ? 44 : 36;
			if (row.height < controlHeight - 0.5) throw new Error('row is ' + row.height + 'px high');
			const well = await page.getByRole('spinbutton', { name: 'Min count', exact: true }).boundingBox();
			if (Math.abs(well.y - row.y) < 1 && Math.abs(mid(well) - mid(control)) > 2) throw new Error(`well centre ${mid(well)}, slider centre ${mid(control)}`);
			c.info(`beside: row ${row.width}x${row.height}, value ${value.width}px`);
			const before = control.width;
			await field('Min score').focus();
			await page.keyboard.press('Home');
			await page.keyboard.press('End');
			if ((await box('Min score').boundingBox()).width !== before) throw new Error('the track changed length with the value');
		});
		await c.step('label hidden: no visible label, the name stays, track and value on one row', async () => {
			const thumb = field('Zoom');
			if ((await thumb.count()) !== 1) throw new Error('no slider named Zoom');
			const root = page.locator('.hp-slider', { has: thumb });
			const label = await root.locator('.hp-slider-label').boundingBox();
			if (label && label.width > 1) throw new Error('the hidden label is ' + label.width + 'px wide');
			const control = await box('Zoom').boundingBox();
			const value = await root.locator('.hp-slider-value').boundingBox();
			if (Math.abs(value.y + value.height / 2 - (control.y + control.height / 2)) > 2) throw new Error('value is not beside the track');
			const before = control.width;
			await thumb.focus();
			await page.keyboard.press('Home');
			const shown = await root.locator('.hp-slider-value').textContent();
			if (shown !== '50%') throw new Error('shown ' + shown);
			if ((await box('Zoom').boundingBox()).width !== before) throw new Error('the track changed length with the value');
		});
		await c.step("the app's aria-describedby reaches the thumb, after the hint", async () => {
			const texts = (name) =>
				field(name).evaluate((n) => (n.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '?' + id));
			const beside = await texts('Min score');
			if (!same(beside, ['Rows below both limits are hidden.'])) throw new Error('Min score described by ' + JSON.stringify(beside));
			const hinted = await texts('Hinted');
			if (!same(hinted, ['A hint of its own.', 'Rows below both limits are hidden.'])) throw new Error('Hinted described by ' + JSON.stringify(hinted));
			const track = await box('Min score').getAttribute('aria-describedby');
			if (track !== null) throw new Error('the track area also carries aria-describedby: ' + track);
		});
	},

	async tabnav(c) {
		const { page } = c;
		const nav = page.getByRole('navigation', { name: 'Settings pages', exact: true });
		const state = () => page.locator('#nav-state').textContent();
		const currents = () => nav.getByRole('link').evaluateAll((els) => els.filter((n) => n.getAttribute('aria-current') === 'page').map((n) => n.textContent));
		const inView = () =>
			nav.evaluate((n) => {
				const tab = n.querySelector('[aria-current="page"]');
				if (!tab) return null;
				const a = n.getBoundingClientRect();
				const b = tab.getBoundingClientRect();
				return b.left >= a.left - 0.5 && b.right <= a.right + 0.5;
			});
		await c.step('a nav of links; the current tab has aria-current="page" and the selected look', async () => {
			const links = await nav.getByRole('link').count();
			if (links !== 8) throw new Error(links + ' links');
			const now = await currents();
			if (!same(now, ['Security'])) throw new Error('aria-current on ' + JSON.stringify(now));
			const look = await nav.evaluate((n) => {
				const cur = getComputedStyle(n.querySelector('[aria-current="page"]'));
				const other = getComputedStyle(n.querySelector('a:not([aria-current])'));
				return { curBg: cur.backgroundColor, otherBg: other.backgroundColor, curShadow: cur.boxShadow, otherShadow: other.boxShadow, deco: cur.textDecorationLine, color: cur.color, strip: n.classList.contains('hp-tab-strip'), cls: n.className };
			});
			if (look.curBg === look.otherBg || look.curShadow === 'none' || look.otherShadow !== 'none') throw new Error('selected look: ' + JSON.stringify(look));
			if (look.deco !== 'none') throw new Error('tabs are underlined: ' + look.deco);
			if (!look.cls.includes('settings-nav')) throw new Error('class is not merged: ' + look.cls);
			c.info('selected edge: ' + look.curShadow);
			if (!/ -3px /.test(look.curShadow)) throw new Error('no 3px edge on the side facing the content: ' + look.curShadow);
		});
		await c.step('the strip scrolls and shows the current tab; the page does not scroll sideways', async () => {
			const m = await nav.evaluate((n) => ({ sw: n.scrollWidth, cw: n.clientWidth, left: n.scrollLeft, page: document.documentElement.scrollWidth - innerWidth }));
			c.info('strip ' + JSON.stringify(m));
			if (m.page > 0) throw new Error('the page scrolls sideways by ' + m.page);
			if (c.touch && m.sw <= m.cw) throw new Error('eight tabs fit a phone');
			if (!(await inView())) throw new Error('the current tab is not in view');
		});
		await c.step('a new current reveals its tab and moves the mark', async () => {
			await c.press(page.getByRole('button', { name: 'Show general', exact: true }));
			await wait(200);
			if (!same(await currents(), ['General'])) throw new Error('now ' + JSON.stringify(await currents()));
			if (!(await inView())) throw new Error('General is not in view');
			await c.press(page.getByRole('button', { name: 'Show advanced', exact: true }));
			await wait(200);
			if (!same(await currents(), ['Advanced'])) throw new Error('now ' + JSON.stringify(await currents()));
			if (!(await inView())) throw new Error('Advanced is not in view');
			await c.press(page.getByRole('button', { name: 'Show none', exact: true }));
			await wait(200);
			if ((await currents()).length) throw new Error('a page with no tab left a mark on ' + JSON.stringify(await currents()));
		});
		await c.step('links: Tab moves between them, Enter follows, a press follows', async () => {
			await page.evaluate(() => history.replaceState(null, '', '#'));
			await nav.getByRole('link', { name: 'General', exact: true }).focus();
			await page.keyboard.press('Tab');
			const focused = await page.evaluate(() => document.activeElement?.textContent);
			if (focused !== 'Members') throw new Error('Tab went to ' + focused);
			await page.keyboard.press('Enter');
			await wait(100);
			if ((await page.evaluate(() => location.hash)) !== '#members') throw new Error('Enter: hash ' + (await page.evaluate(() => location.hash)));
			await c.press(nav.getByRole('link', { name: 'General', exact: true }));
			await wait(100);
			if ((await page.evaluate(() => location.hash)) !== '#general') throw new Error('press: hash ' + (await page.evaluate(() => location.hash)));
		});
		await c.step('the nav is a ref and a second nav keeps its own mark', async () => {
			if (!(await state()).includes('ref=NAV')) throw new Error('ref: ' + (await state()));
			const short = page.getByRole('navigation', { name: 'Short list', exact: true });
			const cur = await short.getByRole('link').evaluateAll((els) => els.filter((n) => n.getAttribute('aria-current') === 'page').map((n) => n.textContent));
			if (!same(cur, ['Members'])) throw new Error('short list: ' + JSON.stringify(cur));
		});
		await c.step('the tab is a 44px target on touch', async () => {
			const h = await nav.getByRole('link').first().evaluate((n) => n.getBoundingClientRect().height);
			c.info('tab height ' + h);
			if (h < (c.touch ? 44 : 32)) throw new Error('tab height ' + h);
		});
	},

	async typedfields(c) {
		const { page } = c;
		const state = () => page.locator('#typed-state').textContent();
		const field = (label) => page.getByLabel(label, { exact: true });
		await c.step('types, pass-through attributes and the inputmode a number field picks', async () => {
			const rows = {
				Seats: ['number', '1', '500', 'numeric'],
				Weight: ['number', '0', null, 'decimal'],
				Offset: ['number', null, null, null],
				'Forced mode': ['number', '0', null, 'text'],
				Day: ['date', '2026-01-01', '2026-12-31', null],
				At: ['time', null, null, null],
				Until: ['datetime-local', null, null, null]
			};
			for (const [label, want] of Object.entries(rows)) {
				const got = await attrs(field(label), ['type', 'min', 'max', 'inputmode']);
				if (!same(got, want)) throw new Error(`${label}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
			}
			const step = await attrs(field('At'), ['step']);
			if (step[0] !== '900') throw new Error('step ' + step);
		});
		await c.step('a number is a string: "1.5" while typing, the typed text is never reset', async () => {
			const weight = field('Weight');
			await weight.click();
			await page.keyboard.type('1.');
			await wait(100);
			await page.keyboard.type('5');
			await wait(100);
			const shown = await weight.inputValue();
			if (shown !== '1.5') throw new Error('the box shows ' + JSON.stringify(shown));
			if (!(await state()).includes('weight=[1.5]')) throw new Error('bound value: ' + (await state()));
			await page.keyboard.type('0');
			if ((await weight.inputValue()) !== '1.50' || !(await state()).includes('weight=[1.50]')) throw new Error('trailing zero lost: ' + (await state()));
			await weight.fill('');
			await page.keyboard.type('-');
			if (!(await state()).includes('weight=[]')) throw new Error('a lone minus is not an empty value: ' + (await state()));
		});
		await c.step('oninput still runs; the app can set and clear the value', async () => {
			const seats = field('Seats');
			await seats.fill('7');
			if (!(await state()).includes('seats=[7]') || /heard=0/.test(await state())) throw new Error('state ' + (await state()));
			await c.press(page.getByRole('button', { name: 'Set seats', exact: true }));
			await wait(100);
			if ((await seats.inputValue()) !== '42') throw new Error('the box shows ' + (await seats.inputValue()));
			await field('Weight').fill('3');
			await c.press(page.getByRole('button', { name: 'Clear weight', exact: true }));
			await wait(100);
			if ((await field('Weight').inputValue()) !== '') throw new Error('weight not cleared: ' + (await field('Weight').inputValue()));
		});
		await c.step('a form reset empties the number box and the bound value', async () => {
			await field('In a form').fill('9');
			if ((await page.locator('#form-state').textContent()) !== 'inForm=[9]') throw new Error('before the reset: ' + (await page.locator('#form-state').textContent()));
			await c.press(page.getByRole('button', { name: 'Reset form', exact: true }));
			await wait(200);
			const after = await page.locator('#form-state').textContent();
			if (after !== 'inForm=[]' || (await field('In a form').inputValue()) !== '') throw new Error('after the reset: ' + after);
		});
		await c.step('date, time and date and time hold the browser string', async () => {
			await field('Day').fill('2026-11-18');
			await field('At').fill('14:30');
			await field('Until').fill('2026-11-18T14:30');
			const s = await state();
			if (!s.includes('day=[2026-11-18]') || !s.includes('at=[14:30]') || !s.includes('until=[2026-11-18T14:30]')) throw new Error(s);
		});
		await c.step('the well keeps its height and 16px text; spin buttons are hidden; the picker icon is a token mask', async () => {
			const plain = await field('Plain').evaluate((n) => ({ h: n.getBoundingClientRect().height, fs: getComputedStyle(n).fontSize }));
			for (const label of ['Seats', 'Day', 'At', 'Until']) {
				const got = await field(label).evaluate((n) => ({ h: n.getBoundingClientRect().height, fs: getComputedStyle(n).fontSize, tnum: getComputedStyle(n).fontVariantNumeric }));
				if (got.h !== plain.h || got.fs !== '16px') throw new Error(`${label}: ${JSON.stringify(got)}, plain ${JSON.stringify(plain)}`);
				if (!got.tnum.includes('tabular-nums')) throw new Error(label + ' has no tabular figures: ' + got.tnum);
			}
			const appearance = await field('Seats').evaluate((n) => getComputedStyle(n).appearance);
			if (appearance !== 'textfield') throw new Error('number appearance ' + appearance);
			// The picker icon is a mask over a --muted fill, so the end of the box holds
			// --muted pixels. (A pseudo-element's computed style cannot be read.)
			const mutedAtEnd = async (label) => {
				const loc = field(label);
				const png = (await loc.screenshot()).toString('base64');
				const width = (await loc.boundingBox()).width;
				return page.evaluate(async ([b64, cssWidth]) => {
					const img = new Image();
					img.src = 'data:image/png;base64,' + b64;
					await img.decode();
					const cv = document.createElement('canvas');
					cv.width = img.width;
					cv.height = img.height;
					const cx = cv.getContext('2d');
					cx.drawImage(img, 0, 0);
					const scale = img.width / cssWidth;
					const x0 = Math.floor(img.width - 36 * scale);
					const d = cx.getImageData(x0, 0, img.width - x0, img.height).data;
					const hex = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
					const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
					let n = 0;
					for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - bl) < 30) n++;
					return n;
				}, [png, width]);
			};
			for (const label of ['Day', 'At', 'Until']) {
				const n = await mutedAtEnd(label);
				c.info(label + ': ' + n + ' --muted pixels where the picker icon is');
				if (n < 10) throw new Error(label + ' shows no --muted picker icon (' + n + ' pixels)');
			}
			const locked = await mutedAtEnd('Locked day');
			if (locked > 0) throw new Error('a disabled date shows a picker icon (' + locked + ' pixels)');
		});
		await c.step('a field with a datalist: no --muted block where Chromium draws its arrow', async () => {
			// The arrow shows on hover and focus. Before the picker-icon rule was scoped to
			// the date and time types it became a solid --muted block.
			const mutedAtEnd = async (loc) => {
				await loc.focus();
				if (!c.touch) await loc.hover();
				await wait(150);
				const png = (await loc.screenshot()).toString('base64');
				const width = (await loc.boundingBox()).width;
				return page.evaluate(async ([b64, cssWidth]) => {
					const img = new Image();
					img.src = 'data:image/png;base64,' + b64;
					await img.decode();
					const cv = document.createElement('canvas');
					cv.width = img.width;
					cv.height = img.height;
					const cx = cv.getContext('2d');
					cx.drawImage(img, 0, 0);
					const scale = img.width / cssWidth;
					const x0 = Math.floor(img.width - 36 * scale);
					const d = cx.getImageData(x0, 0, img.width - x0, img.height).data;
					const hex = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
					const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
					let n = 0;
					for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - bl) < 30) n++;
					return n;
				}, [png, width]);
			};
			const n = await mutedAtEnd(field('Suggested'));
			c.info('Suggested (datalist): ' + n + ' --muted pixels where the arrow is');
			if (n > 0) throw new Error('a field with a datalist shows a --muted block at its end (' + n + ' pixels)');
			const plain = await searchCancelDisplay(page, '#plain-datalist', '-webkit-calendar-picker-indicator');
			if (plain === 'none' || plain === 'absent') throw new Error('control: the plain input\'s arrow is ' + plain);
			const ours = await searchCancelDisplay(page, '.hp-text-field input[list]', '-webkit-calendar-picker-indicator');
			if (ours !== 'none') throw new Error('the datalist arrow shows: display ' + ours);
		});
		await c.step('an error reaches a typed field', async () => {
			const d = await attrs(field('Until'), ['aria-invalid']);
			if (d[0] !== 'true') throw new Error('aria-invalid ' + d);
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
				// Every `input` and `change` the field fires, with the value it holds then.
				window.__events = [];
				for (const type of ['input', 'change']) n.addEventListener(type, () => window.__events.push(`${type}:${n.value}`));
			});
			const before = await state();
			await c.press(clear);
			const inputs = Number(before.match(/inputs=(\d+)/)[1]);
			const after = await state();
			if (after !== `value=[] inputs=${inputs + 1}`) throw new Error(`after clear: "${after}", before "${before}"`);
			const events = await page.evaluate(() => window.__events.join());
			if (events !== 'input:,change:') throw new Error(`the clear fired "${events}", not "input:,change:" (an empty value, input then change)`);
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
				await page.evaluate(() => (window.__events.length = 0));
				await page.keyboard.press(key);
				if (!(await state()).startsWith('value=[] ')) throw new Error(`${key} did not clear: ${await state()}`);
				const events = await page.evaluate(() => window.__events.join());
				if (events !== 'input:,change:') throw new Error(`${key} fired "${events}", not "input:,change:"`);
				if (!(await inField())) throw new Error(`focus after ${key} is not in the field`);
			}
		});
		await c.step('clearLabel names the button; a disabled field has none', async () => {
			if ((await page.getByRole('button', { name: 'Clear search' }).count()) !== 1) throw new Error('no "Clear search" button');
			if ((await page.getByRole('button', { name: /^Clear/ }).count()) !== 1) throw new Error('a disabled or empty field shows a clear button');
		});
	},

	async chips(c) {
		const { page } = c;
		const target = c.touch ? 44 : 24;
		const state = () => page.locator('#chips-state').textContent();
		const focused = () =>
			page.evaluate(() => {
				const a = document.activeElement;
				return a?.getAttribute('aria-label') || a?.id || a?.tagName || null;
			});
		const field = page.getByRole('combobox', { name: 'Tags', exact: true });
		const inField = () => field.evaluate((n) => n === document.activeElement);
		const status = page.locator('.hp-chip-field', { has: field }).locator('[role=status]');
		// Misses among nine points of the target-sized square centred on the element.
		const misses = (loc) =>
			loc.evaluate((n, size) => {
				n.scrollIntoView({ block: 'center' });
				const r = n.getBoundingClientRect();
				const w = Math.max(r.width, size);
				const h = Math.max(r.height, size);
				let miss = 0;
				for (const dy of [-1, 0, 1]) {
					for (const dx of [-1, 0, 1]) {
						const hit = document.elementFromPoint(r.left + r.width / 2 + dx * (w / 2 - 1.5), r.top + r.height / 2 + dy * (h / 2 - 1.5));
						if (!hit || !(hit === n || n.contains(hit))) miss++;
					}
				}
				return miss;
			}, target);
		await c.step('Geist as written; count and tentative words in the link name; dashed edge', async () => {
			if ((await page.locator('#link-chip').evaluate((n) => n.tagName)) !== 'A') throw new Error('a chip with href is not a link');
			if (!(await page.getByRole('link', { name: /^Design ?42$/ }).count())) throw new Error('no link named "Design 42"');
			if (!(await page.getByRole('link', { name: /^Maybe ?, tentative$/ }).count())) throw new Error('no link named "Maybe, tentative"');
			const [font, transform, edge] = await page.locator('#tentative-chip').evaluate((n) => {
				const root = getComputedStyle(n.parentElement);
				return [root.fontFamily, root.textTransform, root.borderTopStyle];
			});
			if (!font.startsWith('Geist') || transform !== 'none' || edge !== 'dashed') throw new Error(`font ${font}, transform ${transform}, edge ${edge}`);
		});
		await c.step('category: a 3px start edge in --category-3', async () => {
			const [color, token, width, left] = await page.locator('#category-chip').evaluate((n) => {
				const root = n.parentElement;
				const after = getComputedStyle(root, '::after');
				const probe = document.createElement('i');
				probe.style.color = 'var(--category-3)';
				root.append(probe);
				const token = getComputedStyle(probe).color;
				probe.remove();
				return [after.backgroundColor, token, after.width, after.left];
			});
			if (color !== token || width !== '3px' || left !== '-1px') throw new Error(`edge ${color} (token ${token}), width ${width}, left ${left}`);
		});
		await c.step('remove buttons: named, outside the link, full targets that never overlap', async () => {
			const unlink = page.getByRole('button', { name: 'Unlink Linked doc', exact: true });
			if (await unlink.evaluate((n) => !!n.closest('a'))) throw new Error('the remove button is inside the link');
			if ((await page.getByRole('button', { name: /^Remove / }).count()) !== 6) throw new Error('expected 6 default "Remove …" names');
			const parts = [unlink, page.locator('#unlink-chip'), page.locator('#link-chip'), ...(await page.getByRole('button', { name: /^Remove / }).all())];
			for (const loc of parts) {
				const miss = await misses(loc);
				const name = await loc.evaluate((n) => n.getAttribute('aria-label') || n.textContent.trim());
				if (miss) throw new Error(`${name}: ${miss}/9 points of its ${target}px area miss it`);
			}
		});
		await c.step('keys: a removal moves focus to the next chip, after the last to the previous', async () => {
			await page.getByRole('button', { name: 'Remove Status: Open' }).focus();
			await page.keyboard.press('Enter');
			await wait(100);
			if ((await focused()) !== 'Remove Label: Web') throw new Error('after Enter focus is on ' + (await focused()));
			await page.getByRole('button', { name: 'Remove Size: Large' }).focus();
			await page.keyboard.press('Delete');
			await wait(100);
			if ((await focused()) !== 'Remove Label: Web') throw new Error('after Delete on the last focus is on ' + (await focused()));
			// Beside a link, focus goes to the next chip's remove button, not its link.
			await page.getByRole('button', { name: 'Unlink Doc A' }).focus();
			await page.keyboard.press('Space');
			await wait(100);
			if ((await focused()) !== 'Unlink Doc B') throw new Error('after unlinking, focus is on ' + (await focused()));
		});
		await c.step('a pointer removal leaves focus where it was', async () => {
			await page.locator('#outside').focus();
			await c.press(page.getByRole('button', { name: 'Remove Owner: Ada' }));
			await wait(100);
			if (await page.getByRole('button', { name: 'Remove Owner: Ada' }).count()) throw new Error('the chip stayed');
			if ((await focused()) !== 'outside') throw new Error('focus moved to ' + (await focused()));
		});
		await c.step('ChipField: Enter adds the trimmed text, comma included; a repeat is not added', async () => {
			await field.focus();
			await page.keyboard.type('  Berlin, Germany  ');
			await page.keyboard.press('Enter');
			if (!(await state()).startsWith('value=["alpha","beta","Berlin, Germany"] ')) throw new Error(await state());
			if ((await field.inputValue()) !== '' || !(await inField())) throw new Error('the field kept its text or lost focus');
			await wait(50);
			if ((await status.textContent()) !== 'Added Berlin, Germany') throw new Error('status: ' + (await status.textContent()));
			await page.keyboard.type('alpha');
			await page.keyboard.press('Enter');
			await wait(50);
			if (!(await state()).startsWith('value=["alpha","beta","Berlin, Germany"] ')) throw new Error('a repeat was added: ' + (await state()));
			if ((await status.textContent()) !== 'alpha is already added') throw new Error('status: ' + (await status.textContent()));
		});
		await c.step('Chromium’s datalist triangle is hidden while suggestions remain', async () => {
			const plain = await searchCancelDisplay(page, '#plain-list', '-webkit-calendar-picker-indicator');
			if (plain === 'none' || plain === 'absent') throw new Error(`control: the plain field's triangle is ${plain}`);
			const ours = await searchCancelDisplay(page, '#tags-field', '-webkit-calendar-picker-indicator');
			if (ours !== 'none') throw new Error('the triangle shows: display ' + ours);
		});
		await c.step('suggestions: chosen ones leave the list; a pick adds at once; a pick right after Enter replaces the text', async () => {
			const options = await page.locator('#tags-field-suggestions option').evaluateAll((o) => o.map((x) => x.value));
			if (!same(options, ['gamma', 'delta'])) throw new Error('datalist: ' + JSON.stringify(options));
			await field.evaluate((n) => {
				n.value = 'gamma';
				n.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
			});
			await field.evaluate((n) => {
				n.value = 'de';
				n.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'de' }));
			});
			await field.evaluate((n) => {
				n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
				n.value = 'delta';
				n.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
			});
			await wait(50);
			const want = 'value=["alpha","beta","Berlin, Germany","gamma","delta"] ';
			if (!(await state()).startsWith(want)) throw new Error(await state());
			if ((await field.inputValue()) !== '') throw new Error('the field kept ' + (await field.inputValue()));
		});
		await c.step('every suggestion chosen: still a combobox with its list', async () => {
			if ((await page.locator('#tags-field').getAttribute('list')) !== 'tags-field-suggestions') throw new Error('the field lost its list');
			if (!(await field.count())) throw new Error('the field is no longer a combobox named Tags');
		});
		await c.step('Backspace in the empty field moves to the last remove button, not when held; again removes', async () => {
			await field.focus();
			await field.evaluate((n) => n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', repeat: true, bubbles: true, cancelable: true })));
			if (!(await inField())) throw new Error('a held Backspace left the field');
			await page.keyboard.press('Backspace');
			if ((await focused()) !== 'Remove delta') throw new Error('Backspace moved to ' + (await focused()));
			await page.keyboard.press('Backspace');
			await wait(100);
			if (!(await state()).startsWith('value=["alpha","beta","Berlin, Germany","gamma"] ')) throw new Error(await state());
			if ((await focused()) !== 'Remove gamma') throw new Error('after the removal focus is on ' + (await focused()));
			if ((await status.textContent()) !== 'Removed delta') throw new Error('status: ' + (await status.textContent()));
		});
		await c.step('name posts each value; the typed text and a disabled field do not', async () => {
			await field.focus();
			await page.keyboard.type('unsent');
			await c.press(page.getByRole('button', { name: 'Send', exact: true }));
			await wait(100);
			const posted = (await state()).split(' posted=')[1];
			if (posted !== JSON.stringify({ tags: ['alpha', 'beta', 'Berlin, Germany', 'gamma'], frozen: [] })) throw new Error('posted ' + posted);
		});
		await c.step('removing the last chip by keys returns focus to the field', async () => {
			await field.fill('');
			for (let i = 0; i < 4; i++) {
				await field.focus();
				await page.keyboard.press('Backspace');
				await page.keyboard.press('Enter');
				await wait(100);
			}
			if (!(await state()).startsWith('value=[] ')) throw new Error(await state());
			if (!(await inField())) throw new Error('focus is on ' + (await focused()));
		});
		await c.step('repeats show once; read-only and disabled chips have no remove button', async () => {
			const repeats = await page.getByRole('list', { name: 'Repeats' }).getByRole('listitem').count();
			if (repeats !== 2) throw new Error(`${repeats} chips for ["x","x","y"]`);
			if (await page.getByRole('button', { name: /^Remove (x|y|one|two)$/ }).count()) throw new Error('a read-only or disabled chip has a remove button');
		});
		await c.step('action chip: a button with the value as written, applied by a press and by keys, remove beside it', async () => {
			const list = page.getByRole('list', { name: 'Saved views', exact: true });
			const views = () => page.locator('#views-state').textContent();
			const action = list.getByRole('button', { name: 'design reviews (old)', exact: true });
			const shape = await action.evaluate((n) => ({
				tag: n.tagName,
				type: n.getAttribute('type'),
				transform: getComputedStyle(n).textTransform,
				nested: !!n.querySelector('button, a'),
				root: n.closest('.hp-chip')?.hasAttribute('data-action')
			}));
			if (!same([shape.tag, shape.type, shape.transform, shape.nested, shape.root], ['BUTTON', 'button', 'none', false, true])) throw new Error('action body: ' + JSON.stringify(shape));
			if ((await misses(action)) > 0) throw new Error('the action is not a full target');
			if (c.touch) await action.tap();
			else await action.click();
			if (!(await views()).includes('applied=design reviews (old)')) throw new Error('a press: ' + (await views()));
			const first = list.getByRole('button', { name: 'Waiting on me', exact: true });
			await first.focus();
			await page.keyboard.press('Enter');
			if (!(await views()).includes('applied=Waiting on me')) throw new Error('Enter: ' + (await views()));
			const remove = list.getByRole('button', { name: 'Delete view Waiting on me', exact: true });
			if ((await misses(remove)) > 0) throw new Error('the remove button is not a full target');
			const a = await first.boundingBox();
			const r = await remove.boundingBox();
			if (a.x + a.width > r.x + 0.5) throw new Error('the action and the remove button overlap');
			await remove.focus();
			await page.keyboard.press('Enter');
			await wait(50);
			if (!(await views()).includes('views=1')) throw new Error('remove: ' + (await views()));
			const now = await focused();
			if (now !== 'Delete view design reviews (old)') throw new Error('focus after removing went to ' + now);
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
		await c.step('current page: the selection look on secondary and tertiary; none on primary or aria-current="false"; a Menu trigger takes it', async () => {
			await wait(300);
			const resolve = (prop, value) =>
				page.evaluate(
					([prop, value]) => {
						const e = document.createElement('i');
						e.style[prop] = value;
						document.body.append(e);
						const r = getComputedStyle(e)[prop];
						e.remove();
						return r;
					},
					[prop, value]
				);
			const look = (selector) =>
				page.evaluate((selector) => {
					const s = getComputedStyle(document.querySelector(selector));
					return { bg: s.backgroundColor, shadow: s.boxShadow };
				}, selector);
			const selected = await resolve('backgroundColor', 'var(--surface-selected)');
			const canvas = await resolve('backgroundColor', 'var(--canvas)');
			const accentBg = await resolve('backgroundColor', 'var(--accent)');
			const edge = `${await resolve('color', 'var(--accent)')} 0px -3px 0px 0px inset`;
			const same = (what, got, want) => {
				if (got.bg !== want.bg || got.shadow !== want.shadow) throw new Error(`${what}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
			};
			const current = { bg: selected, shadow: edge };
			same('secondary aria-current="page"', await look('#b-current'), current);
			same('tertiary aria-current="true"', await look('#b-current-tertiary'), { bg: selected, shadow: edge });
			same('primary aria-current="page" (no current look)', await look('#b-current-primary'), { bg: accentBg, shadow: 'none' });
			same('secondary aria-current="false"', await look('#b-current-false'), { bg: canvas, shadow: 'none' });
			same('Menu trigger with aria-current="page" spread after the trigger props', await look('#current-menu button'), current);
			const trigger = await page.locator('#current-menu button').evaluate((n) => [n.getAttribute('aria-current'), n.getAttribute('aria-haspopup'), n.getAttribute('aria-expanded')]);
			if (trigger.join() !== 'page,menu,false') throw new Error('Menu trigger attributes: ' + trigger);
		});
		if (!c.touch) {
			await c.step('current page: hover keeps the tint and the edge stays', async () => {
				const resolve = (value) =>
					page.evaluate((value) => {
						const e = document.createElement('i');
						e.style.backgroundColor = value;
						document.body.append(e);
						const r = getComputedStyle(e).backgroundColor;
						e.remove();
						return r;
					}, value);
				const hoverTint = await resolve('var(--surface-hover)');
				for (const id of ['b-current', 'b-current-tertiary']) {
					await page.locator('#' + id).hover();
					await wait(300);
					const s = await page.evaluate((id) => {
						const e = getComputedStyle(document.getElementById(id));
						return { bg: e.backgroundColor, shadow: e.boxShadow };
					}, id);
					if (s.bg !== hoverTint) throw new Error(`${id} hover fill ${s.bg}, expected --surface-hover ${hoverTint}`);
					if (!/ 0px -3px 0px 0px inset$/.test(s.shadow)) throw new Error(`${id} hover lost the edge: ${s.shadow}`);
				}
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

	// Table's opt-in parts from the shipped package: a sortable header reports
	// through bind:sort and carries aria-sort while the app reorders; a wide
	// table scrolls inside a named group that takes focus (no landmark), with a sticky
	// first column, scroll edges and a row link across what shows; a row's
	// detail opens with a fade and closes in the same frame; a column
	// description opens from a named button; on the phone the stacked list
	// sorts with a select and lists its field descriptions.
	async table(c) {
		const { page } = c;
		const grid = page.getByRole('table', { name: 'Assets', exact: true });
		const region = page.getByRole('group', { name: 'Assets', exact: true });
		const state = async (sel) => (await page.locator(sel).textContent()).trim();
		const sizes = () =>
			grid.evaluate((t) => [...t.querySelectorAll(':scope > tbody > tr:not(.detail) > td:last-child')].map((td) => Number(td.textContent.trim())));
		const sorted = (list, sign) => list.every((v, i) => i === 0 || sign * (v - list[i - 1]) >= 0);

		await c.step('sortable header: a button, aria-sort on its th, bind:sort; the app reorders', async () => {
			const size = grid.getByRole('button', { name: 'Size', exact: true });
			const th = grid.locator('th').filter({ has: page.getByRole('button', { name: 'Size', exact: true }) });
			if ((await grid.locator('th[aria-sort]').count()) !== 0) throw new Error('aria-sort before any sort');
			await c.press(size);
			await wait(100);
			let s = await state('#wide-state');
			if ((await th.getAttribute('aria-sort')) !== 'descending' || !s.startsWith('size descending')) throw new Error('first press (sortFirst descending): ' + s);
			if (!sorted(await sizes(), -1)) throw new Error('rows not in descending order: ' + (await sizes()));
			await c.press(size);
			await wait(100);
			s = await state('#wide-state');
			if ((await th.getAttribute('aria-sort')) !== 'ascending' || !s.startsWith('size ascending')) throw new Error('second press: ' + s);
			if (!sorted(await sizes(), 1)) throw new Error('rows not in ascending order: ' + (await sizes()));
			if ((await grid.locator('th[aria-sort]').count()) !== 1) throw new Error('more than one th carries aria-sort');
		});

		await c.step('wide: the scroll container is a group, never a region, so a Section of the same name is the only landmark', async () => {
			if ((await page.getByRole('region', { name: 'Assets', exact: true }).count()) !== 0) throw new Error('the wide table is a region');
			if ((await region.count()) !== 1) throw new Error('groups named Assets: ' + (await region.count()));
			const role = await region.getAttribute('role');
			if (role !== 'group') throw new Error('scroll container role ' + role);
		});

		// ---- Muted rows and live marks (the Jobs table) ----------------------
		const token = (name) =>
			page.evaluate((t) => {
				const s = document.createElement('span');
				s.style.color = `var(${t})`;
				document.body.append(s);
				const v = getComputedStyle(s).color;
				s.remove();
				return v;
			}, name);
		// The live marks that show (the grid on a desktop, the stacked list on a phone).
		const liveMarks = () =>
			page.evaluate(() =>
				[...document.querySelectorAll('#jobs .marked[data-live]')]
					.filter((n) => n.offsetParent !== null)
					.map((n) => {
						const s = getComputedStyle(n, '::before');
						return { paused: n.hasAttribute('data-paused'), animation: s.animationName, duration: s.animationDuration, opacity: parseFloat(s.opacity) };
					})
			);
		// Opacity of the first visible live mark, sampled every frame for `ms`.
		const sample = (ms) =>
			page.evaluate(
				(ms) =>
					new Promise((resolve) => {
						const mark = [...document.querySelectorAll('#jobs .marked[data-live]')].find((n) => n.offsetParent !== null);
						const seen = [];
						const start = performance.now();
						const frame = () => {
							seen.push(parseFloat(getComputedStyle(mark, '::before').opacity));
							if (performance.now() - start < ms) requestAnimationFrame(frame);
							else resolve({ min: Math.min(...seen), max: Math.max(...seen) });
						};
						requestAnimationFrame(frame);
					}),
				ms
			);

		await c.step('muted rows: data-muted, the row and a Chip, a Status label or a link in it draw in --muted; focus and selection tokens are untouched', async () => {
			const muted = await token('--muted');
			const text = await token('--text');
			const got = await page.evaluate(() => {
				const shown = (sel) => [...document.querySelectorAll(sel)].filter((n) => n.offsetParent !== null);
				const chips = shown('#jobs .hp-chip').map((n) => ({ color: getComputedStyle(n).color, muted: !!n.closest('[data-muted]') }));
				const rows = shown('#jobs tbody tr[data-muted], #jobs .stack li[data-muted]').map((n) => getComputedStyle(n.querySelector('.hp-chip')?.closest('td, .item') ?? n).color);
				const root = getComputedStyle(document.documentElement);
				const row = shown('#jobs tbody tr[data-muted], #jobs .stack li[data-muted]')[0];
				const cs = getComputedStyle(row);
				return {
					chips,
					rows,
					mutedRows: shown('#jobs tbody tr[data-muted], #jobs .stack li[data-muted]').length,
					plainRows: shown('#jobs tbody tr:not([data-muted]), #jobs .stack li:not([data-muted])').length,
					accent: cs.getPropertyValue('--accent') === root.getPropertyValue('--accent'),
					focus: cs.getPropertyValue('--focus') === root.getPropertyValue('--focus')
				};
			});
			c.info('muted rows: ' + JSON.stringify(got));
			if (got.mutedRows !== 2 || got.plainRows !== 1) throw new Error('muted/plain rows: ' + JSON.stringify(got));
			if (got.chips.length !== 3) throw new Error('chips: ' + JSON.stringify(got.chips));
			for (const chip of got.chips) {
				const want = chip.muted ? muted : text;
				if (chip.color !== want) throw new Error(`a ${chip.muted ? 'muted' : 'plain'} row's Chip is ${chip.color}, want ${want}`);
			}
			if (got.rows.some((r) => r !== muted)) throw new Error('muted row text: ' + JSON.stringify(got.rows));
			if (!got.accent || !got.focus) throw new Error('a muted row changed --accent or --focus');
		});

		await c.step('live mark: the shipped CSS pulses opacity from 1 to 0.4 over --dur-pulse, ease-in-out, on live rows only', async () => {
			const marks = await liveMarks();
			if (marks.length !== 2) throw new Error('live marks that show: ' + JSON.stringify(marks));
			const s = parseFloat(marks[0].duration) * (marks[0].duration.endsWith('ms') ? 1 : 1000);
			const seen = await sample(2600);
			c.info(`live mark: ${marks[0].animation}, ${marks[0].duration}, opacity ${seen.min.toFixed(2)} to ${seen.max.toFixed(2)}`);
			if (marks[0].animation === 'none' || !(s >= 2000)) throw new Error('no slow pulse: ' + JSON.stringify(marks));
			if (!(seen.min < 0.5 && seen.min >= 0.39 && seen.max > 0.95)) throw new Error('opacity did not cycle 1 to 0.4: ' + JSON.stringify(seen));
			const unlit = await page.evaluate(() =>
				[...document.querySelectorAll('#jobs .marked[data-tone]:not([data-live])')].filter((n) => n.offsetParent !== null).map((n) => getComputedStyle(n, '::before').animationName)
			);
			if (unlit.length !== 1 || unlit[0] !== 'none') throw new Error('the failed row pulses: ' + unlit);
		});

		await c.step('<Motion paused> holds a live mark still and lit; resuming starts the pulse again', async () => {
			await c.press(page.getByRole('button', { name: 'Pause jobs' }));
			await wait(150);
			const all = await liveMarks();
			const seen = await sample(1200);
			if (all.some((m) => !m.paused || m.animation !== 'none')) throw new Error('paused marks: ' + JSON.stringify(all));
			if (seen.min !== 1 || seen.max !== 1) throw new Error('a paused mark moved: ' + JSON.stringify(seen));
			await c.press(page.getByRole('button', { name: 'Resume jobs' }));
			await wait(150);
			const again = await liveMarks();
			const cycled = await sample(2600);
			if (again.some((m) => m.paused || m.animation === 'none') || !(cycled.min < 0.5)) throw new Error('no pulse after resume: ' + JSON.stringify([again, cycled]));
		});

		await c.step('reduced motion stops the live mark with no help from the app', async () => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			try {
				await wait(150);
				const all = await liveMarks();
				const seen = await sample(1200);
				if (all.some((m) => m.animation !== 'none')) throw new Error('animated under reduced motion: ' + JSON.stringify(all));
				if (seen.min !== 1 || seen.max !== 1) throw new Error('a mark moved under reduced motion: ' + JSON.stringify(seen));
			} finally {
				await page.emulateMedia({ reducedMotion: 'no-preference' });
			}
		});

		await c.step('column description button: 16px in the layout, a --hit-target square by ::before, never over a neighbouring control', async () => {
			const th = grid.locator('th').filter({ has: page.getByRole('button', { name: 'About Size', exact: true }) });
			const about = th.getByRole('button', { name: 'About Size', exact: true });
			await about.scrollIntoViewIfNeeded();
			const got = await about.evaluate((a) => {
				const sort = a.closest('th').querySelector('.sort');
				const target = parseFloat(getComputedStyle(a, '::before').height);
				const ar = a.getBoundingClientRect();
				const sr = sort.getBoundingClientRect();
				const y = ar.top + ar.height / 2;
				// Which control answers at each half pixel along the row, from well before the pair to well after.
				const lo = Math.floor(Math.min(ar.left, sr.left) - 60);
				const hi = Math.ceil(Math.max(ar.right, sr.right) + 60);
				const owner = (x) => {
					const el = document.elementFromPoint(x, y);
					return el === a ? 'about' : sort.contains(el) ? 'sort' : 'other';
				};
				let aboutFrom = null, aboutTo = null, sortOverlap = 0, sortMissing = 0;
				for (let x = lo; x <= hi; x += 0.5) {
					const o = owner(x);
					if (o === 'about') { aboutFrom ??= x; aboutTo = x; }
					if (o === 'about' && x >= sr.left && x < sr.right) sortOverlap++;
					if (x >= sr.left + 0.5 && x < sr.right - 0.5 && o !== 'sort') sortMissing++;
				}
				// Up and down from the centre: the height of the answer.
				let top = 0, bottom = 0;
				const cx = ar.left + ar.width / 2;
				for (let d = 0; d < 40; d += 0.5) {
					if (document.elementFromPoint(cx, y - d) === a) top = d;
					if (document.elementFromPoint(cx, y + d) === a) bottom = d;
				}
				return { w: ar.width, h: ar.height, hitW: aboutTo - aboutFrom + 0.5, hitH: top + bottom + 0.5, sortOverlap, sortMissing };
			});
			const hit = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hit-target')));
			c.info('about hit area: ' + JSON.stringify(got) + ', --hit-target ' + hit);
			if (got.w !== 16 || got.h !== 16) throw new Error('the button is not its 16px icon: ' + JSON.stringify(got));
			if (got.hitW < hit - 1 || got.hitH < hit - 1) throw new Error('hit area under --hit-target: ' + JSON.stringify(got));
			if (got.sortOverlap || got.sortMissing) throw new Error('the description overlaps the sort button: ' + JSON.stringify(got));
		});

		await c.step('stacked list: a mark clears the field label by 8px or more (the mark hangs 16px, the gap is 24px)', async () => {
			const got = await page.evaluate(() =>
				[...document.querySelectorAll('#jobs .stack .item-fields > div')]
					.filter((div) => div.offsetParent !== null && div.querySelector('.marked'))
					.map((div) => {
						const label = document.createRange();
						label.selectNodeContents(div.querySelector('dt'));
						const text = document.createRange();
						text.selectNodeContents(div.querySelector('.marked'));
						const before = getComputedStyle(div.querySelector('.marked'), '::before');
						// The mark ends margin-right before the text and is width wide.
						const markLeft = text.getBoundingClientRect().left - parseFloat(before.marginRight) - parseFloat(before.width);
						const labelRight = label.getBoundingClientRect().right;
						return { labelRight, markLeft, clear: markLeft - labelRight, marked: div.closest('.item-fields').hasAttribute('data-marked') };
					})
			);
			c.info('stacked mark clearance: ' + JSON.stringify(got));
			if (c.touch && got.length === 0) throw new Error('no marked field in the stacked list');
			if (got.some((g) => !g.marked || g.clear < 7.5)) throw new Error('the mark touches the label: ' + JSON.stringify(got));
		});

		await c.step('wide: a named group, focusable while it scrolls; keys scroll it; the first column stays; edges show', async () => {
			await region.evaluate((n) => (n.scrollLeft = 0));
			await wait(200);
			const info = await region.evaluate((n) => ({ tabindex: n.getAttribute('tabindex'), sw: n.scrollWidth, cw: n.clientWidth }));
			c.info(`region scrollWidth/clientWidth ${info.sw}/${info.cw}, tabindex ${info.tabindex}`);
			if (info.sw <= info.cw) throw new Error('the wide table does not overflow its region');
			if (info.tabindex !== '0') throw new Error('a scrolling region is not focusable');
			const edges = () => region.evaluate((n) => [n.parentElement.hasAttribute('data-overflow-start'), n.parentElement.hasAttribute('data-overflow-end')]);
			if (!same(await edges(), [false, true])) throw new Error('edges at the start: ' + (await edges()));
			const first = grid.locator(':scope > tbody > tr:not(.detail)').first().locator('td').first();
			const x0 = (await first.boundingBox()).x;
			await region.focus();
			for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
			await wait(400);
			const left = await region.evaluate((n) => n.scrollLeft);
			c.info('scrollLeft after ArrowRight x8: ' + left);
			if (left <= 0) throw new Error('arrow keys did not scroll the region');
			if (Math.abs((await first.boundingBox()).x - x0) > 0.5) throw new Error('the first column moved');
			if (!(await edges())[0]) throw new Error('no start edge while scrolled');
			await region.evaluate((n) => (n.scrollLeft = 0));
			await wait(200);
		});

		await c.step('expand: aria-expanded and aria-controls, a nested Table, a fade on open, a cut on close; the row link covers the rest', async () => {
			const button = grid.getByRole('button', { name: 'Details quarterly-report.pdf', exact: true });
			if ((await button.getAttribute('aria-expanded')) !== 'false' || (await button.getAttribute('aria-controls')) !== null) throw new Error('closed button ARIA');
			await recordEntrance(page, '.detail-body');
			await c.press(button);
			await wait(50);
			if (await page.evaluate(() => location.hash) !== '#table') throw new Error('the expand button followed the row link');
			const [expanded, controls] = await attrs(button, ['aria-expanded', 'aria-controls']);
			if (expanded !== 'true' || !controls) throw new Error(`open button: expanded=${expanded} controls=${controls}`);
			const panel = page.locator(`[id="${controls}"]`);
			// The nested Table stacks on the phone, so its <table> is there but hidden.
			await panel.locator('table[aria-label="Members of quarterly-report.pdf"]').waitFor({ state: 'attached', timeout: 2000 });
			await wait(1500);
			if (!(await page.evaluate(() => window.__entrance))) throw new Error('the detail did not fade in');
			if (!(await state('#wide-state')).endsWith('| A-1')) throw new Error('bind:expanded: ' + (await state('#wide-state')));
			await c.press(button);
			if (await panel.count()) throw new Error('the detail stayed after closing');
			if ((await button.getAttribute('aria-expanded')) !== 'false') throw new Error('aria-expanded after closing');
			// The row link's cover lies over the other cells, so press the point, as a person would.
			const owner = grid.locator(':scope > tbody > tr:not(.detail)').first().locator('td').nth(1);
			const box = await owner.boundingBox();
			const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
			if (c.touch) await page.touchscreen.tap(x, y);
			else await page.mouse.click(x, y);
			await wait(200);
			const hash = await page.evaluate(() => location.hash);
			await page.evaluate(() => history.replaceState(null, '', '#table'));
			if (!hash.startsWith('#table-A-')) throw new Error('a press beside the first cell did not follow the row link: ' + hash);
		});

		await c.step('column description: a named button opens it in a popover or a sheet', async () => {
			await c.press(grid.getByRole('button', { name: 'About Size', exact: true }));
			const dialog = page.getByRole('dialog', { name: 'Size' });
			await dialog.waitFor({ state: 'visible', timeout: 3000 });
			if (!(await dialog.textContent()).includes('Size on disk in kilobytes')) throw new Error('the description is missing');
			await page.keyboard.press('Escape');
			await dialog.waitFor({ state: 'hidden', timeout: 3000 });
		});

		if (c.touch) {
			const list = page.getByRole('list', { name: 'Stacked assets' });
			await c.step('stacked list: the sort select sets bind:sort', async () => {
				const select = page.getByLabel('Order', { exact: true });
				if (!(await select.locator('option').allTextContents()).includes('Unsorted')) throw new Error('no unsorted choice before a sort');
				await select.selectOption({ label: 'Size, descending' });
				await wait(100);
				if (!(await state('#stack-state')).startsWith('size descending')) throw new Error('select: ' + (await state('#stack-state')));
				if ((await select.locator('option').allTextContents()).includes('Unsorted')) throw new Error('the unsorted choice stayed');
			});
			await c.step('stacked list: one button lists the stacked fields\' descriptions', async () => {
				await c.press(page.getByRole('button', { name: 'Field notes' }));
				const dialog = page.getByRole('dialog', { name: 'Field notes' });
				await dialog.waitFor({ state: 'visible', timeout: 3000 });
				if (!(await dialog.textContent()).includes('Size on disk in kilobytes')) throw new Error('the description is missing');
				await page.keyboard.press('Escape');
				await dialog.waitFor({ state: 'hidden', timeout: 3000 });
			});
			await c.step('stacked list: an item expands and collapses', async () => {
				const button = list.getByRole('button', { name: /^Details / }).first();
				await c.press(button);
				await wait(200);
				const controls = await button.getAttribute('aria-controls');
				if ((await button.getAttribute('aria-expanded')) !== 'true' || !controls) throw new Error('open item button ARIA');
				if (!(await page.locator(`[id="${controls}"]`).textContent()).includes('Stored at')) throw new Error('no detail');
				await c.press(button);
				await wait(100);
				if (await page.locator(`[id="${controls}"]`).count()) throw new Error('the item detail stayed');
			});
			// Last: after an emulated swipe, Chromium drops the click of the next tap.
			await c.step('wide: a swipe scrolls the region', async () => {
				await region.evaluate((n) => (n.scrollLeft = 0));
				await wait(200);
				const box = await region.boundingBox();
				const y = box.y + box.height / 2;
				await c.swipe(box.x + box.width - 40, y, box.x + 60, y);
				await wait(800);
				const swiped = await region.evaluate((n) => n.scrollLeft);
				c.info('scrollLeft after a swipe: ' + swiped);
				if (swiped <= 0) throw new Error('a swipe did not scroll the region');
			});
		}
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

	// Section and Status: what only the shipped package proves (the compiled CSS in dist/, the
	// context that <Motion paused> sets, the shipped types). Colours are compared with a token read
	// through a probe element whose colour is set through the CSSOM, which the policy allows.
	async section(c) {
		const { page } = c;
		const token = (name) =>
			page.evaluate((t) => {
				const s = document.createElement('span');
				s.style.color = `var(${t})`;
				document.body.append(s);
				const v = getComputedStyle(s).color;
				s.remove();
				return v;
			}, name);
		await c.step('each section is a region named by its heading; titleAs, id and the title role', async () => {
			const got = await page.evaluate(() =>
				[...document.querySelectorAll('#wide section.hp-section, #narrow section.hp-section')].map((s) => {
					const h = document.getElementById(s.getAttribute('aria-labelledby') || '');
					return { id: s.id, name: h?.textContent, tag: h?.tagName, role: !!h?.classList.contains('hp-section-title'), size: h && getComputedStyle(h).fontSize };
				})
			);
			const want = [
				{ id: 'files', name: 'Files', tag: 'H2' },
				{ id: '', name: 'Plan', tag: 'H3' },
				{ id: '', name: 'A long title that needs more than one line in a narrow column', tag: 'H2' },
				{ id: '', name: 'Notes', tag: 'H2' }
			];
			if (got.length !== want.length) throw new Error('sections: ' + JSON.stringify(got));
			want.forEach((w, i) => {
				const g = got[i];
				if (g.id !== w.id || g.name !== w.name || g.tag !== w.tag || !g.role || g.size !== '20px') throw new Error(`section ${i}: ${JSON.stringify(g)}`);
			});
		});
		await c.step('no frame, fill, rule or shadow on any part', async () => {
			const bad = await page.evaluate(() =>
				[...document.querySelectorAll('section.hp-section, section.hp-section > header, section.hp-section > footer, section.hp-section > div')].flatMap((n) => {
					const s = getComputedStyle(n);
					const sides = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none');
					const out = [];
					if (sides) out.push('border');
					if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') out.push('fill ' + s.backgroundColor);
					if (s.boxShadow !== 'none') out.push('shadow');
					if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) out.push('outline');
					return out.length ? [n.tagName + ': ' + out.join(', ')] : [];
				})
			);
			if (bad.length) throw new Error(bad.join('; '));
		});
		await c.step('head row: meta after the title, actions at the end; 12px under the head, 48px between sections', async () => {
			const g = await page.evaluate(() => {
				const r = (n) => n.getBoundingClientRect();
				const [s1, s2] = document.querySelectorAll('#wide > section');
				const title = s1.querySelector('.hp-section-title');
				const meta = s1.querySelector('.meta');
				const actions = s1.querySelector('.actions');
				return {
					metaAfterTitle: r(meta).left >= r(title).right - 1 && Math.abs(r(meta).top + r(meta).height / 2 - (r(title).top + r(title).height / 2)) < 12,
					actionsAtEnd: Math.abs(r(actions).right - r(s1).right) <= 1,
					actionsOnRow: r(actions).top < r(title).bottom,
					headToBody: Math.round(r(s1.querySelector('.body')).top - r(s1.querySelector('header')).bottom),
					between: Math.round(r(s2).top - r(s1).bottom)
				};
			});
			c.info('section head: ' + JSON.stringify(g));
			if (!g.metaAfterTitle || !g.actionsAtEnd || !g.actionsOnRow) throw new Error('head layout: ' + JSON.stringify(g));
			if (g.headToBody !== 12 || g.between < 2 * g.headToBody) throw new Error('spacing: ' + JSON.stringify(g));
		});
		await c.step('meta and foot are --muted; a Table in the body bleeds past the text edge', async () => {
			const muted = await token('--muted');
			const got = await page.evaluate(() => {
				const s1 = document.querySelector('#wide > section');
				const shown = [...s1.querySelectorAll('.hp-table .grid, .hp-table .stack')].find((n) => getComputedStyle(n).display !== 'none');
				return {
					meta: getComputedStyle(s1.querySelector('.meta')).color,
					foot: getComputedStyle(s1.querySelector('footer')).color,
					bleed: shown ? s1.getBoundingClientRect().left - shown.getBoundingClientRect().left : null,
					footAfterBody: s1.querySelector('footer').getBoundingClientRect().top >= s1.querySelector('.body').getBoundingClientRect().bottom
				};
			});
			if (got.meta !== muted || got.foot !== muted) throw new Error(`ink ${JSON.stringify(got)} vs ${muted}`);
			if (!(got.bleed >= 8) || !got.footAfterBody) throw new Error('body: ' + JSON.stringify(got));
		});
		await c.step('narrow column: the head wraps; actions go under the title, beside a short meta or at the start of their own line under a long one; no overflow', async () => {
			const g = await page.evaluate(() => {
				const r = (n) => n.getBoundingClientRect();
				const read = (s) => {
					const title = s.querySelector('.hp-section-title');
					const meta = s.querySelector('.meta');
					const actions = s.querySelector('.actions');
					return {
						titleLines: Math.round(r(title).height / parseFloat(getComputedStyle(title).lineHeight)),
						metaUnder: r(meta).top >= r(title).bottom - 1,
						actionsUnder: r(actions).top >= r(title).bottom - 1,
						actionsInside: r(actions).left >= r(s).left - 1 && r(actions).right <= r(s).right + 1,
						actionsBelowMeta: r(actions).top >= r(meta).bottom - 1,
						actionsAtStart: Math.abs(r(actions).left - r(s).left) <= 1
					};
				};
				const [short, long] = document.querySelectorAll('#narrow > section');
				return { short: read(short), long: read(long), overflow: document.scrollingElement.scrollWidth > innerWidth };
			});
			c.info('narrow head: ' + JSON.stringify(g));
			const { short, long } = g;
			if (short.titleLines < 2 || !short.metaUnder || !short.actionsUnder || !short.actionsInside || g.overflow) throw new Error('wrap, short meta: ' + JSON.stringify(g));
			if (!long.metaUnder || !long.actionsBelowMeta || !long.actionsAtStart) throw new Error('wrap, long meta: ' + JSON.stringify(g));
		});
		await c.step('role none or presentation: no landmark and no name on the section, the heading stays', async () => {
			for (const [title, role] of [['Plain group', 'none'], ['Presentational group', 'presentation']]) {
				const sec = page.locator('#roles > section', { has: page.getByRole('heading', { name: title, exact: true }) });
				const got = await sec.evaluate((n) => ({ role: n.getAttribute('role'), labelledby: n.hasAttribute('aria-labelledby'), name: n.hasAttribute('aria-label') }));
				if (got.role !== role || got.labelledby || got.name) throw new Error(`${title}: ${JSON.stringify(got)}`);
				if ((await page.getByRole('region', { name: title, exact: true }).count()) !== 0) throw new Error(`${title} is still a region`);
				if ((await page.getByRole('heading', { name: title, exact: true }).count()) !== 1) throw new Error(`${title}: the heading is gone`);
			}
			// The accessibility snapshot lists the two sections' headings but no region for them.
			const snapshot = await page.locator('#roles').ariaSnapshot();
			c.info('roles snapshot: ' + snapshot.replace(/\n/g, ' | '));
			if (/region "(Plain|Presentational) group"/.test(snapshot)) throw new Error('region in the snapshot: ' + snapshot);
		});
		await c.step('a wide Table inside a Section of the same name shows once in the landmark list', async () => {
			const regions = await page.getByRole('region', { name: 'Wide files', exact: true }).count();
			const groups = await page.getByRole('group', { name: 'Wide files', exact: true }).count();
			if (regions !== 1 || groups !== 1) throw new Error(`regions ${regions}, groups ${groups}`);
		});
	},

	async status(c) {
		const { page } = c;
		const token = (name) =>
			page.evaluate((t) => {
				const s = document.createElement('span');
				s.style.color = `var(${t})`;
				document.body.append(s);
				const v = getComputedStyle(s).color;
				s.remove();
				return v;
			}, name);
		// Opacity of the mark of the first live status, sampled every frame for `ms`.
		const sample = (ms) =>
			page.evaluate(
				(ms) =>
					new Promise((resolve) => {
						const mark = document.querySelector('#live .hp-status .mark');
						const seen = [];
						const start = performance.now();
						const frame = () => {
							seen.push(parseFloat(getComputedStyle(mark).opacity));
							if (performance.now() - start < ms) requestAnimationFrame(frame);
							else resolve({ min: Math.min(...seen), max: Math.max(...seen) });
						};
						requestAnimationFrame(frame);
					}),
				ms
			);
		const marks = () =>
			page.evaluate(() =>
				[...document.querySelectorAll('#live .hp-status, #nested .hp-status')].map((n) => {
					const s = getComputedStyle(n.querySelector('.mark'));
					return { live: n.hasAttribute('data-live'), paused: n.hasAttribute('data-paused'), animation: s.animationName, duration: s.animationDuration };
				})
			);
		await c.step('tones: the mark takes the status hue, no tone takes --muted; the mark is hidden from assistive technology', async () => {
			const want = [await token('--ok'), await token('--warn'), await token('--danger'), await token('--muted')];
			const got = await page.evaluate(() =>
				[...document.querySelectorAll('#static .hp-status')].map((n) => ({
					bg: getComputedStyle(n.querySelector('.mark')).backgroundColor,
					hidden: n.querySelector('.mark').getAttribute('aria-hidden'),
					size: n.querySelector('.mark').getBoundingClientRect().width + 'x' + n.querySelector('.mark').getBoundingClientRect().height,
					text: n.textContent.trim(),
					live: n.hasAttribute('data-live') || n.hasAttribute('data-paused')
				}))
			);
			if (got.map((g) => g.bg).join() !== want.join()) throw new Error(`marks ${got.map((g) => g.bg)} vs ${want}`);
			if (got.some((g) => g.hidden !== 'true' || g.size !== '8x8' || g.live)) throw new Error('mark: ' + JSON.stringify(got));
			if (got.map((g) => g.text).join() !== 'Online,Behind,Down,Idle') throw new Error('labels: ' + got.map((g) => g.text));
		});
		await c.step('a Stat with children: the Status renders inside the value dd at the value font size; the unit and the delta still show; no tick markup', async () => {
			const got = await page.evaluate(() =>
				[...document.querySelectorAll('#stats .hp-stat')].map((n) => {
					const dd = n.querySelector('dd.hp-stat-value');
					const status = dd.querySelector('.hp-status');
					return {
						label: n.querySelector('dt').textContent,
						inside: !!status && dd.contains(status),
						font: status ? getComputedStyle(status).fontSize : null,
						ddFont: getComputedStyle(dd).fontSize,
						figure: !!dd.querySelector('.hp-stat-figure'),
						unit: dd.querySelector('.hp-stat-unit')?.textContent ?? null,
						delta: n.querySelector('dd.hp-stat-delta')?.textContent.trim() ?? null,
						display: dd.classList.contains('hp-display')
					};
				})
			);
			const [standard, display, number] = got;
			if (!standard.inside || standard.figure) throw new Error('standard: ' + JSON.stringify(standard));
			if (!display.inside || display.figure || !display.display) throw new Error('display: ' + JSON.stringify(display));
			if (standard.font !== standard.ddFont) throw new Error(`the Status is ${standard.font}, the value's size is ${standard.ddFont}`);
			if (display.font !== display.ddFont) throw new Error(`the display Status is ${display.font}, the value's size is ${display.ddFont}`);
			// The display size is larger than the standard one, and a number value has the same font as the display Status.
			if (!(parseFloat(display.font) > parseFloat(standard.font))) throw new Error('display not larger: ' + JSON.stringify([standard.font, display.font]));
			if (display.font !== number.ddFont) throw new Error(`display Status ${display.font} differs from a display number's ${number.ddFont}`);
			if (standard.unit !== 'jobs' || !standard.delta?.startsWith('+2')) throw new Error('unit and delta: ' + JSON.stringify(standard));
			c.info(`Stat children: standard ${standard.font}, display ${display.font}`);
		});
		await c.step('live: the shipped CSS pulses opacity slowly (cycle of 2s or more, 0.4 at the low point)', async () => {
			const [first] = await marks();
			const s = parseFloat(first.duration) * (first.duration.endsWith('ms') ? 1 : 1000);
			const seen = await sample(2600);
			c.info(`live pulse: ${first.animation}, ${first.duration}, opacity ${seen.min.toFixed(2)} to ${seen.max.toFixed(2)}`);
			if (first.animation === 'none' || !(s >= 2000)) throw new Error('no slow pulse: ' + JSON.stringify(first));
			if (!(seen.min < 0.5 && seen.max > 0.95)) throw new Error('opacity did not cycle: ' + JSON.stringify(seen));
		});
		await c.step('<Motion paused> holds every live mark still and lit, a nested <Motion tier> inherits it', async () => {
			await c.press(c.page.getByRole('button', { name: 'Pause animations' }));
			await wait(150);
			const all = await marks();
			const seen = await sample(1200);
			if (all.length !== 3 || all.some((m) => !m.live || !m.paused || m.animation !== 'none')) throw new Error('paused marks: ' + JSON.stringify(all));
			if (seen.min !== 1 || seen.max !== 1) throw new Error('a paused mark moved: ' + JSON.stringify(seen));
		});
		await c.step('resuming starts the pulse again', async () => {
			await c.press(c.page.getByRole('button', { name: 'Resume animations' }));
			await wait(150);
			const all = await marks();
			const seen = await sample(2600);
			if (all.some((m) => m.paused || m.animation === 'none')) throw new Error('resumed marks: ' + JSON.stringify(all));
			if (!(seen.min < 0.5)) throw new Error('no pulse after resume: ' + JSON.stringify(seen));
		});
		await c.step('reduced motion stops the pulse with no help from the app', async () => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			try {
				await wait(150);
				const all = await marks();
				const seen = await sample(1200);
				if (all.some((m) => m.animation !== 'none')) throw new Error('animated under reduced motion: ' + JSON.stringify(all));
				if (seen.min !== 1 || seen.max !== 1) throw new Error('a mark moved under reduced motion: ' + JSON.stringify(seen));
			} finally {
				await page.emulateMedia({ reducedMotion: 'no-preference' });
			}
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

	async charts(c) {
		const { page } = c;
		const chart = page.locator('#stacked');
		const plot = chart.locator('.hp-bar-chart-plot');
		const readout = () => chart.locator('.hp-bar-chart-readout-label').textContent();
		const active = () => chart.getAttribute('data-active');
		// The middle of the third of twelve bars.
		const third = async () => {
			await plot.scrollIntoViewIfNeeded();
			const box = await plot.boundingBox();
			return [box.x + box.width * (2.5 / 12), box.y + box.height / 2];
		};
		const expect = async (what, label, index) => {
			const [l, a] = [(await readout())?.trim(), await active()];
			if (l !== label || a !== index) throw new Error(`${what}: readout ${l}, data-active ${a}; expected ${label}, ${index}`);
		};
		await c.step('category, ink and status colours come through the shipped CSS', async () => {
			const paint = await page.evaluate(() => {
				const root = getComputedStyle(document.documentElement);
				const rgb = (token) => {
					const n = root.getPropertyValue(token).trim().replace('#', '');
					return `rgb(${[0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).join(', ')})`;
				};
				const fill = (key) => {
					const el = document.querySelector(`#stacked .hp-bar-chart-part[data-series="${key}"]`);
					return el ? getComputedStyle(el).fill : null;
				};
				const swatch = document.querySelector('#stacked .hp-bar-chart-swatch');
				return {
					a: [fill('a'), rgb('--category-1')],
					b: [fill('b'), rgb('--muted')],
					c: [fill('c'), rgb('--danger')],
					swatch: [swatch ? getComputedStyle(swatch).backgroundColor : null, rgb('--category-1')]
				};
			});
			c.info('bar chart paint [computed, token]: ' + JSON.stringify(paint));
			for (const [k, [got, want]] of Object.entries(paint)) if (got !== want) throw new Error(`${k}: ${got}, not ${want}`);
		});
		await c.step('at rest the readout shows the last bar, unmarked; the hidden table holds every bar', async () => {
			await expect('at rest', 'Bar 12', null);
			const rows = await chart.locator('table tbody tr').count();
			const caption = (await chart.locator('table caption').textContent())?.trim();
			if (rows !== 12 || caption !== 'Stacked bars') throw new Error(`table: ${rows} rows, caption ${caption}`);
			const name = await plot.getAttribute('aria-label');
			if (name !== 'Stacked bars') throw new Error('plot name: ' + name);
		});
		if (c.touch) {
			await c.step('a tap shows and marks a bar; a tap outside lets it go', async () => {
				const [x, y] = await third();
				await page.touchscreen.tap(x, y);
				await wait(100);
				await expect('after a tap', 'Bar 3', '2');
				await c.press(page.locator('#away'));
				await wait(100);
				await expect('after a tap outside', 'Bar 12', null);
			});
		} else {
			await c.step('pointing shows and marks a bar; leaving lets it go', async () => {
				const [x, y] = await third();
				await page.mouse.move(x, y);
				await wait(100);
				await expect('pointing', 'Bar 3', '2');
				await page.mouse.move(2, 2);
				await wait(100);
				await expect('after leaving', 'Bar 12', null);
			});
		}
		await c.step('keys: one tab stop, arrows, Home and End move the mark; the status line says the bar', async () => {
			await page.locator('#before').focus();
			await page.keyboard.press('Tab');
			if (!(await plot.evaluate((n) => n === document.activeElement))) throw new Error('Tab did not reach the plot');
			await expect('keyboard focus', 'Bar 12', '11');
			await page.keyboard.press('ArrowLeft');
			await expect('ArrowLeft', 'Bar 11', '10');
			const said = (await chart.locator('[role=status]').textContent())?.trim();
			if (said !== 'Bar 11: Alpha 4, Beta 3, Gamma 0, Total 7') throw new Error('status line: ' + said);
			await page.keyboard.press('Home');
			await expect('Home', 'Bar 1', '0');
			await page.keyboard.press('End');
			await expect('End', 'Bar 12', '11');
			await page.keyboard.press('Tab');
			await expect('after Tab away', 'Bar 12', null);
		});
		await c.step('new data draws at once, with no animation', async () => {
			await c.press(page.getByRole('button', { name: 'Shift' }));
			await wait(50);
			const running = await page.evaluate(
				() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.hp-bar-chart')).length
			);
			if (running) throw new Error(`${running} animations in the chart`);
			await expect('after new data', 'Bar 13', null);
		});
		await c.step('negative values draw below zero; an app class sets --bar-chart-height', async () => {
			const low = page.locator('#negative');
			const height = await low.locator('.hp-bar-chart-plot').evaluate((n) => n.getBoundingClientRect().height);
			if (height !== 96) throw new Error('plot height ' + height);
			const [up, down] = await low.locator('.hp-bar-chart-part').evaluateAll((ns) => ns.map((n) => [+n.getAttribute('y'), +n.getAttribute('height')]));
			if (!(down[0] > up[0] + up[1])) throw new Error(`the negative bar is not below zero: ${JSON.stringify([up, down])}`);
		});
		await c.step('sparkline: the name says the last reading; an app class sets the size; the end stays square', async () => {
			if ((await page.getByRole('img', { name: 'Trend: 6 units', exact: true }).count()) !== 1) throw new Error('no image named "Trend: 6 units"');
			if ((await page.getByRole('img', { name: 'Failures: 5', exact: true }).count()) !== 1) throw new Error('no image named "Failures: 5"');
			const box = await page.locator('#spark-tone').boundingBox();
			const end = await page.locator('#spark-tone .hp-sparkline-end').boundingBox();
			c.info(`sparkline ${box.width}x${box.height}, end ${end.width}x${end.height}`);
			if (box.width !== 300 || box.height !== 48) throw new Error(`sparkline ${box.width}x${box.height}`);
			if (end.width !== 6 || end.height !== 6) throw new Error(`end square ${end.width}x${end.height}`);
			const [stroke, danger] = await page.locator('#spark-tone .hp-sparkline-line').evaluate((n) => {
				const hex = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim().replace('#', '');
				return [getComputedStyle(n).stroke, `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`];
			});
			if (stroke !== danger) throw new Error(`sparkline stroke ${stroke}, not --danger ${danger}`);
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
		if (c.variant === 'long' || c.variant === 'wide') {
			const wide = c.variant === 'wide';
			await c.step('long labels without icons wrap to two lines at spaces, balanced; one word wider than the cell ends in an ellipsis; a label with an icon keeps one line', async () => {
				await wait(300);
				const cells = await page.evaluate(() =>
					[...document.querySelectorAll('.hp-app-shell-bar .link, .hp-app-shell-side .link')]
						.filter((n) => n.offsetParent)
						.map((n) => {
							const t = n.querySelector('.text');
							const lh = parseFloat(getComputedStyle(t).lineHeight);
							const r = n.getBoundingClientRect();
							return {
								text: t.textContent,
								icon: !!n.querySelector('.icon'),
								lines: Math.round(t.getBoundingClientRect().height / lh),
								cut: t.scrollWidth > t.clientWidth,
								cell: [Math.round(r.width), Math.round(r.height)],
								align: getComputedStyle(t).textAlign,
								wrap: getComputedStyle(t).textWrapStyle
							};
						})
				);
				c.info('shell labels: ' + JSON.stringify(cells.map((x) => [x.text, x.lines, x.cut, x.cell.join('x')])));
				const by = Object.fromEntries(cells.map((x) => [x.text, x]));
				// In the 128px rail (desktop) "Breaking now" and "Recent files" fit on one line; elsewhere they wrap to two.
				const fits = wide && !c.touch;
				for (const name of ['Breaking now', 'Saved searches', 'Recent files']) {
					const want = fits && name !== 'Saved searches' ? [1] : fits ? [1, 2] : [2];
					if (!by[name] || !want.includes(by[name].lines) || by[name].cut) throw new Error(name + ': ' + JSON.stringify(by[name]));
					if (by[name].align !== 'center' || by[name].wrap !== 'balance') throw new Error(name + ' is not centred and balanced: ' + JSON.stringify(by[name]));
				}
				if (wide) {
					// A single word that fits the wider rail needs no ellipsis, and the whole cell is wider than 80px.
					if (c.touch) return;
					if (by.Opportunities.cut || by.Opportunities.lines !== 1) throw new Error('Opportunities in the wide rail: ' + JSON.stringify(by.Opportunities));
					if (by.Opportunities.cell[0] !== 128) throw new Error('rail cell width ' + by.Opportunities.cell);
				} else if (!by.Opportunities.cut || by.Opportunities.lines !== 1) {
					throw new Error('a word wider than the cell must end in an ellipsis on one line: ' + JSON.stringify(by.Opportunities));
				}
				if (by['Account settings'].lines !== 1 || !by['Account settings'].icon) throw new Error('with an icon: ' + JSON.stringify(by['Account settings']));
				for (const x of cells) if (x.cell[1] < 56) throw new Error(x.text + ' cell is shorter than the header: ' + x.cell);
			});
			if (wide && !c.touch) {
				await c.step('--rail-width moves the rail, the controls row and main together', async () => {
					const g = await page.evaluate(() => {
						const w = (sel) => document.querySelector(sel).getBoundingClientRect();
						return { rail: w('.hp-app-shell-side').width, controls: getComputedStyle(document.querySelector('.hp-app-shell-controls')).marginLeft, main: getComputedStyle(document.querySelector('.hp-app-shell-main')).marginLeft };
					});
					// The controls row sits in the header from 1200px and takes no margin; main follows the rail.
					if (g.rail !== 128 || g.main !== '128px') throw new Error('rail and main: ' + JSON.stringify(g));
				});
			}
			return;
		}
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
		['?compact=drawer&wide=rail', 'drawer-rail'],
		['?compact=bar&wide=rail&labels=long', 'long-rail'],
		['?compact=bar&wide=rail&labels=long&rail=wide', 'wide-rail']
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
