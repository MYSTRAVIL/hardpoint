import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { duration, useMotion } from '#lib/motion/index.js';
import { reelFrame } from './frame';

// A lab piece, not part of the package: no component uses it. The user
// kept it in the lab on 2026-11-11, so it stays beside its /motion demo, as
// decode.ts does.
//
// Flicker-on (BRIEF, motion rule 8; da3-11). An element switches on with
// a single off frame when it first appears: visible for one reel frame,
// hidden for one, then visible for good. That is the reel's on, off, on of
// labels switching on (da3-11, 14.29 to 14.92) and of its pop-ins: the big
// identifier is on at frame 476, blank at 477 and stable from 478, and the
// status word on at 480 and blank at 481 (measurements §4.7, content
// pop-ins). One frame is `reelFrame()`, 42ms unless the /motion tuning
// changes it.
//
//   const flicker = useFlicker();   // during component initialisation
//   <div {@attach flicker}>…</div>
//
// The off frame is opacity 0 from `element.animate()`, so the element keeps
// its box and stays in the accessibility tree. It runs only when
// `useMotion().expressive` is true for the calling component, only when the
// element first appears, and never on an element the server rendered
// (it was on screen before hydration) or inside a live region. Reduced
// motion and the quiet tier show the element at once.
//
// Never more than three flashes a second (rule 8; WCAG 2.3.1): a flicker
// is one flash, one change to hidden and one back, and a flicker that would
// start less than a second after the last one is skipped, so the page
// shows at most one a second, wherever the elements are.
//
// `useFadeIn()` gives the comparison on /motion: the element fades in from
// opacity 0 over `--dur-reveal` on `--settle`, both read from the element
// when it appears, in every tier and under reduced motion, as LoadRegion's
// crossfade does (it is only opacity).

const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="log"], [role="alert"]';
/** The shortest time between the starts of two flickers. */
const GAP = 1000;

/** Elements that were in the document when the first hook ran: server-rendered. */
let rendered: WeakSet<Element> | undefined;
/** When the last flicker started. */
let last = -Infinity;

function snapshot(): void {
	if (typeof document !== 'undefined' && !rendered) {
		rendered = new WeakSet(document.getElementsByTagName('*'));
	}
}

/**
 * Returns a flicker-on attachment. Call it during component
 * initialisation, like `useMotion()`: the tier is the one around the
 * calling component.
 */
export function useFlicker(): Attachment<HTMLElement> {
	const motion = useMotion();
	snapshot();
	return (el) => {
		if (!untrack(() => motion.expressive) || rendered?.has(el) || el.closest(LIVE)) return;
		const now = performance.now();
		if (now - last < GAP) return;
		const frame = reelFrame(el);
		if (!(frame > 0)) return;
		last = now;
		// Opacity 0 for the second frame; before and after, the element's own.
		const off = el.animate({ opacity: [0, 0] }, { delay: frame, duration: frame });
		return () => off.cancel();
	};
}

/** Returns a fade-in attachment for the comparison. Call it during component initialisation. */
export function useFadeIn(): Attachment<HTMLElement> {
	snapshot();
	return (el) => {
		if (rendered?.has(el) || el.closest(LIVE)) return;
		const ms = duration(el, '--dur-reveal');
		if (!(ms > 0)) return;
		const settle = getComputedStyle(el).getPropertyValue('--settle').trim();
		const easing = CSS.supports('transition-timing-function', settle) ? settle : 'ease-out';
		const fade = el.animate({ opacity: [0, 1] }, { duration: ms, easing });
		return () => fade.cancel();
	};
}
