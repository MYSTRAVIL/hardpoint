import { prefersReducedMotion } from 'svelte/motion';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

// Svelte transitions for conditionally rendered parts. Durations and the
// curve come from tokens.css on the element, so an app that retunes a token
// retunes the transition. Use with `transition:` — each returns a function
// of the direction, so exits run at their own, shorter duration.

// Svelte calls the returned function with { direction }, but its public
// types declare it with no parameters, so the parameter is optional here.
type Run = (options?: { direction?: 'in' | 'out' }) => TransitionConfig;

/** A duration token on the element, such as `--dur-pop`, in milliseconds. */
export function duration(node: Element, name: string): number {
	const value = getComputedStyle(node).getPropertyValue(name).trim();
	const n = parseFloat(value);
	if (Number.isNaN(n)) return 0;
	return value.endsWith('ms') ? n : value.endsWith('s') ? n * 1000 : n;
}

const curves = new Map<string, EasingFunction>();

/** A `cubic-bezier()` token on the element, such as `--settle`, as an easing function. */
export function curve(node: Element, name = '--settle'): EasingFunction {
	const value = getComputedStyle(node).getPropertyValue(name).trim();
	let fn = curves.get(value);
	if (!fn) {
		const m = value.match(/cubic-bezier\(([^)]+)\)/);
		const [x1, y1, x2, y2] = m ? m[1].split(',').map(Number) : [0.2, 0.7, 0.2, 1];
		fn = bezier(x1, y1, x2, y2);
		curves.set(value, fn);
	}
	return fn;
}

/** CSS cubic-bezier timing as a function of progress, solved for x by Newton steps, then bisection. */
function bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
	const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	return (x) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) {
			const err = sampleX(t) - x;
			if (Math.abs(err) < 1e-6) return sampleY(t);
			const d = slopeX(t);
			if (Math.abs(d) < 1e-6) break;
			t -= err / d;
		}
		let lo = 0;
		let hi = 1;
		t = x;
		while (hi - lo > 1e-6) {
			if (sampleX(t) < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return sampleY(t);
	};
}

/**
 * Menus, popovers, select lists and tooltips: fade with a 4px move away from
 * the trigger, `--dur-pop` in and `--dur-pop-exit` out. Reads Bits UI's
 * `data-side` to move the right way. Reduced motion: fade only.
 */
export function pop(node: Element, { distance = 4 }: { distance?: number } = {}): Run {
	return ({ direction } = {}) => {
		const side = node.getAttribute('data-side');
		const move = prefersReducedMotion.current ? 0 : distance;
		const [axis, sign] =
			side === 'top' ? ['Y', 1] : side === 'left' ? ['X', 1] : side === 'right' ? ['X', -1] : ['Y', -1];
		return {
			duration: duration(node, direction === 'out' ? '--dur-pop-exit' : '--dur-pop'),
			easing: curve(node),
			css: (t, u) => `opacity: ${t}; transform: translate${axis}(${sign * u * move}px)`
		};
	};
}

/**
 * Bottom sheets: slide up from the bottom edge, `--dur-sheet` in and
 * `--dur-sheet-exit` out. Reduced motion: fade only.
 */
export function sheet(node: Element): Run {
	return ({ direction } = {}) => ({
		duration: duration(node, direction === 'out' ? '--dur-sheet-exit' : '--dur-sheet'),
		easing: curve(node),
		css: prefersReducedMotion.current
			? (t) => `opacity: ${t}`
			: (_t, u) => `transform: translateY(${u * 100}%)`
	});
}

/**
 * Side drawers: slide in from the left edge at the sheet timing,
 * `--dur-sheet` in and `--dur-sheet-exit` out. Reduced motion: fade only.
 */
export function drawer(node: Element): Run {
	return ({ direction } = {}) => ({
		duration: duration(node, direction === 'out' ? '--dur-sheet-exit' : '--dur-sheet'),
		easing: curve(node),
		css: prefersReducedMotion.current
			? (t) => `opacity: ${t}`
			: (_t, u) => `transform: translateX(${-u * 100}%)`
	});
}

/** Scrims and other plain fades, timed with the overlay they belong to. */
export function fade(node: Element, { pace = 'sheet' }: { pace?: 'pop' | 'sheet' } = {}): Run {
	return ({ direction } = {}) => ({
		duration: duration(node, `--dur-${pace}${direction === 'out' ? '-exit' : ''}`),
		easing: curve(node),
		css: (t) => `opacity: ${t}`
	});
}
