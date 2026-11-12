import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { duration, useMotion } from '#lib/motion/index.js';

// A lab piece, not part of the package (the user, 2026-11-10: decode-in reads
// as a gimmick in real apps, so no component uses it). It stays here, beside
// its /motion demo, as a reference.
//
// Decode-in (BRIEF, motion rule 6; da3-16, da3-17). A short fixed label or
// title resolves from coarse blocks through Geist Pixel Square glyph noise
// to its clean text, stepped like the reel, one `--decode-frame` per step:
//
//   frames 1-2  solid blocks in currentColor over the text, new each frame
//   frames 3-5  glyph noise: broken capitals and digits packed across each
//               word, some punctuation dropped, held for all three frames
//   frame 6     the clean text
//
// Each element starts after its own random offset of 0 to 2 frames, plus an
// optional fixed `delay`, so a group ripples in. All glyphs of an element
// change together. `--decode-frame` is read from the element when the decode
// starts, so a retuned token and the /motion slow motion apply.
//
//   const decode = useDecode();          // during component initialisation
//   <h1 class="hp-view-title" {@attach decode()}>{title}</h1>
//   <Button {@attach decode()}>Import</Button>
//
// It runs only when `useMotion().expressive` is true for the component that
// called `useDecode()`, only when the element first appears, and only on an
// element whose content is plain text. Everything else shows the text at
// once: the quiet tier, reduced motion, forced colours, an element inside a
// live region, an element with child elements (an icon beside a label, a
// <strong> in a title), and an element the server rendered, which was on
// screen before hydration. A text change after mount never decodes; a
// change during a decode ends it and shows the new text.
//
// The text stays in the DOM and in the accessibility tree the whole time.
// Its glyphs are painted transparent (`-webkit-text-fill-color`), so it
// keeps its box and nothing moves. Blocks and noise draw in an aria-hidden
// layer appended to the element: a 0x0 absolutely positioned anchor (class
// `hp-decode-layer`, `data-stage` wait | blocks | noise) and, inside it, a
// box over the text's line boxes, clipped to them and to any clipping
// parent, with pointer events off. The layer is removed when the decode
// ends.
//
// Crisp pixels: Geist Pixel Square draws on a module of 38 units in 1000,
// so its edges land on device pixels only when the font size is k x 26.32px
// divided by the device pixel ratio. The noise takes the smallest k whose
// cap height (19 modules) is at least the text's: a 12px label gets 26.32px
// noise at a ratio of 1, 13.16px at 2 and 17.54px at 3, so the noise is as
// tall as the text or taller, and the line box cuts what does not fit. It
// sits on the text's baseline snapped to a device pixel. Glyphs come from
// A-Z, 0-9 and _ - . : = and are packed edge to edge from each word's left
// edge, each on a device pixel, until the next one would pass the word's
// end, so the proportional face fits the reserved width and only the
// text's own gaps stay. Most glyphs are broken: cut to their top or bottom
// rows, to a middle slice, or with a band of rows knocked out, always on
// whole modules, so the edges stay on the device-pixel grid.
//
// If the face is not loaded when a decode starts, it loads during the block
// frames; if it is still missing at frame 3, the noise frames are skipped
// and the clean text shows. The noise never falls back to another face.

export interface DecodeOptions {
	/**
	 * Whole frames of `--decode-frame` to wait before this element's own
	 * clock starts, so a page can order its parts: the header first, the
	 * content one frame later. The text is hidden while it waits. Default 0.
	 * With the random offset of up to 2 frames, keep a group within about
	 * 300ms.
	 */
	delay?: number;
}

const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="log"], [role="alert"]';
const PIXEL = 'Geist Pixel Square';
/** The Geist Pixel Square size at which one module is one pixel: 26.32px. */
const PIXEL_STEP = 1000 / 38;
/** Cap height over font size: Geist and Geist Mono 0.710, Geist Pixel Square 0.722. */
const CAP = 0.72;
/** One reel frame at 24 fps, used when `--decode-frame` is not set. */
const DEFAULT_FRAME = 42;
const BLOCK_FRAMES = 2;
const NOISE_FRAMES = 3;
const MAX_OFFSET = 2;
/** Painted transparent while the decode runs, restored after. */
const HIDDEN = ['-webkit-text-fill-color', 'text-decoration-color'] as const;

// The noise glyphs: [glyph, advance, ink bottom, ink top] in modules, from
// the font's outlines. Capitals and digits run from the baseline to 19
// modules above it (Q 2 below); the punctuation is small and stays whole.
const GLYPHS: [string, number, number, number][] = [
	['A', 16, 0, 19], ['B', 17, 0, 19], ['C', 18, 0, 19], ['D', 18, 0, 19], ['E', 16, 0, 19],
	['F', 15, 0, 19], ['G', 18, 0, 19], ['H', 18, 0, 19], ['I', 6, 0, 19], ['J', 16, 0, 19],
	['K', 16, 0, 19], ['L', 15, 0, 19], ['M', 20, 0, 19], ['N', 17, 0, 19], ['O', 18, 0, 19],
	['P', 16, 0, 19], ['Q', 20, -2, 19], ['R', 17, 0, 19], ['S', 17, 0, 19], ['T', 16, 0, 19],
	['U', 18, 0, 19], ['V', 16, 0, 19], ['W', 24, 0, 19], ['X', 16, 0, 19], ['Y', 14, 0, 19],
	['Z', 18, 0, 19], ['0', 15, 0, 19], ['1', 13, 0, 19], ['2', 17, 0, 19], ['3', 16, 0, 19],
	['4', 18, 0, 19], ['5', 15, 0, 19], ['6', 17, 0, 19], ['7', 15, 0, 19], ['8', 17, 0, 19],
	['9', 17, 0, 19], ['_', 14, -2, 0], ['-', 10, 7, 9], ['.', 5, 0, 3], [':', 7, 0, 10],
	['=', 14, 4, 12]
];
/** Cap height in modules. */
const CAP_ROWS = 19;
const SPACE = /\s/;
const PUNCTUATION = /[\p{P}\p{S}]/u;

interface Run {
	el: HTMLElement;
	/** The 0x0 anchor appended to the element; carries `data-stage`. */
	layer: HTMLSpanElement;
	/** The box over the text that holds the blocks or the noise. */
	clip: HTMLSpanElement;
	/** Measures the baseline of the element's own font. */
	textProbe: HTMLSpanElement;
	/** Measures the baseline of a noise glyph. */
	noiseProbe: HTMLSpanElement;
	observer: MutationObserver;
	/** One frame, in ms. */
	frame: number;
	/** When frame 1 starts (performance.now() time). */
	start: number;
	/** The frame on screen, from 0; -1 while waiting. */
	shown: number;
	fontSize: number;
	/** The element's line height in px; NaN for `normal`, where the letters' box is the line. */
	lineHeight: number;
	/** The noise font, as CSS declarations, and its module, in CSS px. */
	font: string;
	module: number;
	/** The noise face is loaded: true, false, or undefined while it loads. */
	pixel: boolean | undefined;
	saved: [string, string][];
}

interface Glyph {
	ch: string;
	left: number;
	right: number;
	top: number;
	bottom: number;
}

interface Line {
	left: number;
	right: number;
	/** The letters' content area while measuring, then the line box. */
	top: number;
	bottom: number;
	baseline: number;
	glyphs: Glyph[];
}

/** Where to draw, measured in one read pass. Screen coordinates in CSS px. */
interface Geometry {
	dpr: number;
	/** The clip box, snapped to device pixels. */
	box: { left: number; top: number; right: number; bottom: number };
	/** The clip box relative to the anchor. */
	x: number;
	y: number;
	lines: Line[];
	/** Offset from a noise glyph's top to its baseline. */
	noiseBase: number;
}

const active = new Set<Run>();
let raf = 0;
let queued = false;
/** Elements that were in the document when the first `useDecode()` ran: server-rendered. */
let rendered: WeakSet<Element> | undefined;
/** Every element a decode attachment has seen. An element decodes once, on mount. */
const seen = new WeakSet<Element>();

/**
 * Returns `decode(options?)`, which makes a decode-in attachment for an
 * element whose content is plain text. Call it during component
 * initialisation, like `useMotion()`: the tier is the one around the
 * calling component.
 */
export function useDecode(): (options?: DecodeOptions) => Attachment<HTMLElement> {
	const motion = useMotion();
	if (typeof document !== 'undefined' && !rendered) {
		rendered = new WeakSet(document.getElementsByTagName('*'));
	}
	const made = new Map<number, Attachment<HTMLElement>>();
	return ({ delay = 0 } = {}) => {
		// The same attachment for the same options, so a template that
		// evaluates `decode()` again does not restart anything.
		let attach = made.get(delay);
		if (!attach) {
			attach = (el) => {
				if (!untrack(() => motion.expressive)) return void seen.add(el);
				return begin(el, delay);
			};
			made.set(delay, attach);
		}
		return attach;
	};
}

function begin(el: HTMLElement, delay: number): (() => void) | undefined {
	if (seen.has(el)) return;
	seen.add(el);
	if (rendered?.has(el) || el.closest(LIVE) || matchMedia('(forced-colors: active)').matches) return;
	let text = '';
	for (const node of el.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data;
		else if (node.nodeType !== Node.COMMENT_NODE) return;
	}
	if (!text.trim()) return;
	// --decode-frame is not in tokens.css; /motion's tuning may set it on <html>.
	const set = getComputedStyle(el).getPropertyValue('--decode-frame').trim() !== '';
	const frame = set ? duration(el, '--decode-frame') : DEFAULT_FRAME;
	if (!(frame > 0)) return;

	const style = getComputedStyle(el);
	const fontSize = parseFloat(style.fontSize) || 16;
	const dpr = devicePixelRatio || 1;
	// The smallest whole k whose 19-module capitals are as tall as the text's.
	const k = Math.max(1, Math.ceil((CAP * fontSize * dpr) / CAP_ROWS - 0.01));
	const size = (k * PIXEL_STEP) / dpr;

	const layer = span(
		'position:absolute;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;' +
			'pointer-events:none;user-select:none;-webkit-user-select:none;' +
			'-webkit-text-fill-color:currentColor;text-decoration:none;text-shadow:none;' +
			'text-transform:none;letter-spacing:0;word-spacing:0;text-indent:0;white-space:pre;' +
			'font-feature-settings:normal;font-variation-settings:normal;font-synthesis:none'
	);
	layer.className = 'hp-decode-layer';
	layer.setAttribute('aria-hidden', 'true');
	layer.dataset.stage = 'wait';
	const clip = span('position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;contain:strict');
	// Both probes and the noise share these, so the probes measure what the
	// noise draws.
	const font = `font:400 ${size}px/normal "${PIXEL}";white-space:pre;`;
	const probeStyle = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;';
	const textProbe = span(probeStyle);
	const noiseProbe = span(probeStyle + font);
	for (const probe of [textProbe, noiseProbe]) {
		probe.append('H', span('display:inline-block;width:0;height:0'));
	}
	layer.append(textProbe, noiseProbe, clip);

	// This element's own clock: 0 to 2 frames late.
	const offset = Math.floor(Math.random() * (MAX_OFFSET + 1));
	const run: Run = {
		el,
		layer,
		clip,
		textProbe,
		noiseProbe,
		observer: new MutationObserver((records) => {
			for (const record of records) {
				if (layer.contains(record.target)) continue;
				if (record.type !== 'attributes') return end(run); // new text: show it at once
				// An inline style rewrite dropped the transparent paint.
				if (el.style.getPropertyValue(HIDDEN[0]) !== 'transparent') {
					for (const name of HIDDEN) el.style.setProperty(name, 'transparent', 'important');
				}
			}
		}),
		frame,
		start: performance.now() + (Math.max(0, delay) + offset) * frame,
		shown: -1,
		fontSize,
		lineHeight: parseFloat(style.lineHeight),
		font,
		module: k / dpr,
		pixel: pixelLoaded() || undefined,
		saved: HIDDEN.map((name) => [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)])
	};
	if (run.pixel === undefined) {
		document.fonts
			.load(`${size}px "${PIXEL}"`, 'H')
			.then((faces) => (run.pixel = faces.length > 0))
			.catch(() => (run.pixel = false));
	}

	for (const name of HIDDEN) el.style.setProperty(name, 'transparent', 'important');
	el.append(layer);
	run.observer.observe(el, {
		childList: true,
		characterData: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style']
	});
	active.add(run);
	// Before the first paint, so the element never shows its text first.
	if (!queued) {
		queued = true;
		queueMicrotask(() => {
			queued = false;
			step(performance.now());
		});
	}
	return () => end(run);
}

/**
 * Advances every running decode to its frame due at `now`. All measuring
 * happens before any drawing, so the page lays out once per step.
 */
function step(now: number): void {
	const due: [Run, number, Geometry | null][] = [];
	for (const run of active) {
		const n = now < run.start ? -1 : Math.max(run.shown, Math.floor((now - run.start) / run.frame));
		if (n === run.shown) continue;
		const noise = n >= BLOCK_FRAMES;
		const over = n >= BLOCK_FRAMES + NOISE_FRAMES || (noise && run.pixel !== true);
		// Blocks change every frame; the noise is drawn once and held.
		const fresh = !over && (!noise || run.shown < BLOCK_FRAMES);
		due.push([run, over ? Infinity : n, fresh ? measure(run) : null]);
	}
	for (const [run, n, geometry] of due) {
		run.shown = n;
		if (geometry) draw(run, n, geometry);
		// Done, the noise face is missing, or the text has no box to draw on.
		else if (n === Infinity || run.layer.dataset.stage === 'wait') end(run);
	}
	if (active.size && !raf) raf = requestAnimationFrame(tick);
}

function tick(now: number): void {
	raf = 0;
	step(now);
}

function end(run: Run): void {
	if (!active.delete(run)) return;
	run.observer.disconnect();
	run.layer.remove();
	HIDDEN.forEach((name, i) => {
		const [value, priority] = run.saved[i];
		if (value) run.el.style.setProperty(name, value, priority);
		else run.el.style.removeProperty(name);
	});
	if (run.el.getAttribute('style') === '') run.el.removeAttribute('style');
}

// ---- Measuring -------------------------------------------------------------

let range: Range | undefined;

/** The text's letters, grouped into lines, and the clip box. Null when the text has no box. */
function measure(run: Run): Geometry | null {
	const r = (range ??= document.createRange());
	const dpr = devicePixelRatio || 1;
	const snap = (v: number) => Math.round(v * dpr) / dpr;

	// From a letter's top (the top of its font's content area) to its baseline.
	const textBase = baseline(run.textProbe, r, true);
	const lines: Line[] = [];
	for (const node of run.el.childNodes) {
		if (node.nodeType !== Node.TEXT_NODE) continue;
		const data = (node as Text).data;
		let i = 0;
		for (const ch of data) {
			r.setStart(node, i);
			r.setEnd(node, (i += ch.length));
			const b = r.getBoundingClientRect();
			if (b.width <= 0 || b.height <= 0) continue;
			let line = lines.find((l) => Math.abs(l.top - b.top) < (l.bottom - l.top) / 2);
			if (!line) {
				line = {
					left: Infinity,
					right: -Infinity,
					top: b.top,
					bottom: b.bottom,
					baseline: snap(b.top + textBase),
					glyphs: []
				};
				lines.push(line);
			}
			line.glyphs.push({ ch, left: b.left, right: b.right, top: b.top, bottom: b.bottom });
			if (!SPACE.test(ch)) {
				line.left = Math.min(line.left, b.left);
				line.right = Math.max(line.right, b.right);
			}
		}
	}
	const drawn = lines.filter((l) => l.right > l.left);
	if (!drawn.length) return null;
	// From the letters' content area to the line box, which the clip keeps.
	if (run.lineHeight > 0) {
		for (const l of drawn) {
			const half = (run.lineHeight - (l.bottom - l.top)) / 2;
			l.top -= half;
			l.bottom += half;
		}
	}

	let box = {
		left: snap(Math.min(...drawn.map((l) => l.left))),
		top: snap(Math.min(...drawn.map((l) => l.top))),
		right: snap(Math.max(...drawn.map((l) => l.right))),
		bottom: snap(Math.max(...drawn.map((l) => l.bottom)))
	};
	// An absolutely positioned layer escapes the clipping of parents below
	// its containing block, such as a title that truncates: clip to them.
	// Overflow does not apply to inline boxes and display: contents.
	const container = run.layer.offsetParent;
	for (let p: Element | null = run.el; p && p !== container; p = p.parentElement) {
		const s = getComputedStyle(p);
		if (s.display === 'inline' || s.display === 'contents') continue;
		if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
		const c = p.getBoundingClientRect();
		const left = snap(c.left + p.clientLeft);
		const top = snap(c.top + p.clientTop);
		box = {
			left: Math.max(box.left, left),
			top: Math.max(box.top, top),
			right: Math.min(box.right, snap(left + p.clientWidth)),
			bottom: Math.min(box.bottom, snap(top + p.clientHeight))
		};
	}
	if (box.right <= box.left || box.bottom <= box.top) return null;

	const anchor = run.layer.getBoundingClientRect();
	return {
		dpr,
		box,
		x: box.left - anchor.left,
		y: box.top - anchor.top,
		lines: drawn,
		noiseBase: baseline(run.noiseProbe, r, false)
	};
}

/**
 * The baseline in a probe: an "H" and a 0x0 inline-block, whose top is the
 * baseline. From the top of the letter's content area, or from the top of
 * the probe's line.
 */
function baseline(probe: HTMLSpanElement, r: Range, fromLetter: boolean): number {
	const mark = (probe.lastChild as HTMLElement).getBoundingClientRect().top;
	if (!fromLetter) return mark - probe.getBoundingClientRect().top;
	r.selectNodeContents(probe.firstChild!);
	return mark - r.getBoundingClientRect().top;
}

// ---- Drawing ---------------------------------------------------------------

function draw(run: Run, n: number, g: Geometry): void {
	const { clip } = run;
	clip.style.left = `${g.x}px`;
	clip.style.top = `${g.y}px`;
	clip.style.width = `${g.box.right - g.box.left}px`;
	clip.style.height = `${g.box.bottom - g.box.top}px`;
	const parts = n < BLOCK_FRAMES ? blocks(run, n, g) : noise(run, g);
	clip.replaceChildren(...parts);
	run.layer.dataset.stage = n < BLOCK_FRAMES ? 'blocks' : 'noise';
}

/**
 * Frame 1: one to three long bars per line. Frame 2: a mosaic of cells half
 * the cap height tall. Both fill the cap band, in currentColor.
 */
function blocks(run: Run, n: number, g: Geometry): HTMLSpanElement[] {
	const { dpr, box } = g;
	const snap = (v: number) => Math.round(v * dpr) / dpr;
	const one = 1 / dpr;
	const cap = Math.max(2 * one, snap(CAP * run.fontSize));
	const out: HTMLSpanElement[] = [];
	const rect = (left: number, top: number, right: number, bottom: number) => {
		if (right - left < one || bottom - top < one) return;
		out.push(
			span(
				`position:absolute;left:${left - box.left}px;top:${top - box.top}px;` +
					`width:${right - left}px;height:${bottom - top}px;background:currentColor`
			)
		);
	};
	for (const line of g.lines) {
		const left = snap(line.left);
		const right = snap(line.right);
		const bottom = line.baseline;
		const top = bottom - cap;
		const width = right - left;
		if (n === 0) {
			const bars = Math.max(1, Math.min(3, Math.round(width / (4 * cap))));
			const slot = width / bars;
			for (let i = 0; i < bars; i++) {
				const from = left + i * slot;
				rect(
					snap(from + Math.random() * 0.2 * slot),
					top,
					snap(from + slot - (i === bars - 1 ? Math.random() * 0.3 : 0.1 + Math.random() * 0.2) * slot),
					bottom
				);
			}
		} else {
			const cell = Math.max(2 * one, snap(cap * 0.75));
			const half = snap(cap / 2);
			for (const [rowTop, rowBottom] of [
				[top, top + half],
				[top + half, bottom]
			]) {
				let from: number | null = null;
				for (let x = left; x < right; x += cell) {
					const on = Math.random() < 0.5;
					if (on && from === null) from = x;
					if (!on && from !== null) {
						rect(from, rowTop, x, rowBottom);
						from = null;
					}
				}
				if (from !== null) rect(from, rowTop, right, rowBottom);
			}
		}
	}
	return out;
}

/**
 * Broken capitals, digits and _ - . : = in Geist Pixel Square on the
 * text's baseline. Each word of the text gets glyphs packed edge to edge
 * from its left edge, each on a device pixel, until the next one would pass
 * the word's end. Spaces stay, and half the punctuation drops out as a gap.
 * Most glyphs keep only some of their rows (see `rows`); each band of rows
 * is its own clipped box, cut on whole modules, so its edges stay on the
 * device-pixel grid. The line box clips whatever does not fit.
 */
function noise(run: Run, g: Geometry): HTMLSpanElement[] {
	const { dpr, box } = g;
	const m = run.module;
	const holder = span(`position:absolute;left:0;top:0;${run.font}`);
	for (const line of g.lines) {
		const words: Glyph[][] = [[]];
		for (const glyph of [...line.glyphs].sort((a, b) => a.left - b.left)) {
			if (SPACE.test(glyph.ch) || (PUNCTUATION.test(glyph.ch) && Math.random() < 0.5)) words.push([]);
			else words[words.length - 1].push(glyph);
		}
		for (const letters of words) {
			if (!letters.length) continue;
			const end = Math.max(...letters.map((l) => l.right));
			for (let x = Math.round(letters[0].left * dpr) / dpr; ; ) {
				const fits = GLYPHS.filter(([, advance]) => advance * m <= end - x + m / 2);
				if (!fits.length) break;
				const [c, advance, bottom, top] = fits[Math.floor(Math.random() * fits.length)];
				for (const [from, to] of rows(bottom, top)) {
					const bandTop = line.baseline - to * m;
					holder.append(
						span(
							`position:absolute;left:${x - box.left}px;top:${bandTop - box.top}px;` +
								`width:${advance * m}px;height:${(to - from) * m}px;overflow:hidden`,
							span(`position:absolute;left:0;top:${line.baseline - g.noiseBase - bandTop}px`, c)
						)
					);
				}
				x += advance * m;
			}
		}
	}
	return [holder];
}

/**
 * The bands of rows, in modules above the baseline, that one noise glyph
 * keeps: a fifth stay whole; the rest keep their top part, their bottom
 * part or a middle slice, or lose a band of rows in the middle. The small
 * punctuation always stays whole.
 */
function rows(bottom: number, top: number): [number, number][] {
	if (top - bottom < CAP_ROWS) return [[bottom, top]];
	const pick = (from: number, to: number) => from + Math.floor(Math.random() * (to - from + 1));
	const r = Math.random();
	if (r < 0.2) return [[bottom, top]];
	if (r < 0.45) return [[pick(6, 12), top]];
	if (r < 0.7) return [[bottom, pick(7, 13)]];
	if (r < 0.85) {
		const from = pick(3, 7);
		return [[from, from + pick(5, 9)]];
	}
	const gap = pick(5, 9);
	return [
		[bottom, gap],
		[gap + pick(2, 5), top]
	];
}

// ---- Helpers ---------------------------------------------------------------

function span(css: string, ...children: (Node | string)[]): HTMLSpanElement {
	const s = document.createElement('span');
	s.style.cssText = css;
	s.append(...children);
	return s;
}

function pixelLoaded(): boolean {
	let loaded = false;
	document.fonts.forEach((face) => {
		if (face.status === 'loaded' && face.family.replace(/["']/g, '') === PIXEL) loaded = true;
	});
	return loaded;
}
