// Motion tuning for the docs site. The /motion page retunes the timing
// tokens for one browser tab: the overrides live in sessionStorage under one
// key and apply as inline custom properties on <html>, so every page in the
// tab (the specimen pages, /app) runs on them, closing the tab drops them,
// and a fresh browser sees none. Route-local: the library ships no tuning.

export interface DurationToken {
	/** The custom property in tokens.css. */
	name: string;
	/** What it times, in a few words. */
	role: string;
	/** Its tokens.css value, in ms. */
	default: number;
	/** One press of − or +, in ms. */
	step: number;
}

export const durationTokens = [
	{ name: '--dur-press', role: 'Press feedback', default: 80, step: 10 },
	{ name: '--dur-hover', role: 'Hover, fine pointers only', default: 120, step: 10 },
	{ name: '--dur-mark', role: 'Selection marks fading in', default: 80, step: 10 },
	{ name: '--dur-panel', role: 'A tab panel a pointer chose', default: 100, step: 10 },
	{ name: '--dur-segment', role: 'Progress and steps colour', default: 120, step: 10 },
	{ name: '--dur-message', role: 'A field error appearing', default: 120, step: 10 },
	{ name: '--dur-pop', role: 'Menus, popovers, lists, tooltips opening', default: 160, step: 10 },
	{ name: '--dur-pop-exit', role: 'The same, closing', default: 110, step: 10 },
	{ name: '--dur-sheet', role: 'Dialogs and sheets opening', default: 240, step: 10 },
	{ name: '--dur-sheet-exit', role: 'The same, closing', default: 170, step: 10 },
	{ name: '--dur-enter', role: 'One item of the stagger entering', default: 150, step: 10 },
	{ name: '--stagger-step', role: 'The gap between staggered items', default: 30, step: 5 },
	{ name: '--dur-reveal', role: 'Content replacing skeletons', default: 150, step: 10 },
	{ name: '--dur-expand', role: 'A disclosure’s content fading in', default: 120, step: 10 },
	{ name: '--dur-tick', role: 'A number ticking to a new value', default: 400, step: 10 },
	{ name: '--resolve-step', role: 'One step of an image resolve', default: 42, step: 2 },
	{ name: '--decode-frame', role: 'One frame of the lab effects', default: 42, step: 2 }
] as const satisfies readonly DurationToken[];

export type TunedToken = (typeof durationTokens)[number];
export type DurationName = TunedToken['name'];

/** Slow motion multiplies every listed duration on top of the overrides. */
export const SLOW_FACTOR = 5;

export interface Tuning {
	/** Overrides in ms. A token at its default has no entry. */
	durations: Partial<Record<DurationName, number>>;
	/** Slow motion: a viewing aid, never part of the copied CSS. */
	slow: boolean;
}

const KEY = 'hardpoint:motion-tuning';

export function untuned(): Tuning {
	return { durations: {}, slow: false };
}

export function isUntuned(t: Tuning): boolean {
	return Object.keys(t.durations).length === 0 && !t.slow;
}

/** The token's value in this tab without slow motion: its override or its default. */
export function current(t: Tuning, token: TunedToken): number {
	return t.durations[token.name] ?? token.default;
}

/** Moves a token by `steps` of its step, never below 0. Mutates `t`; a `$state` proxy tracks it. */
export function nudge(t: Tuning, token: TunedToken, steps: number): void {
	const ms = Math.max(0, current(t, token) + steps * token.step);
	if (ms === token.default) delete t.durations[token.name];
	else t.durations[token.name] = ms;
}

/**
 * The saved tuning of this tab, or none. Anything malformed is dropped, and
 * so are fields this version does not know, such as the `tick` curve choice
 * of earlier versions.
 */
export function loadTuning(): Tuning {
	const t = untuned();
	let saved: Partial<Record<keyof Tuning, unknown>> | null = null;
	try {
		saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
	} catch {
		return t;
	}
	if (!saved || typeof saved !== 'object') return t;
	const durations = (saved.durations ?? {}) as Record<string, unknown>;
	for (const token of durationTokens) {
		const ms = durations[token.name];
		if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 && ms !== token.default) {
			t.durations[token.name] = ms;
		}
	}
	t.slow = saved.slow === true;
	return t;
}

export function saveTuning(t: Tuning): void {
	try {
		if (isUntuned(t)) sessionStorage.removeItem(KEY);
		else sessionStorage.setItem(KEY, JSON.stringify(t));
	} catch {
		// Storage is off: the tuning still applies until the page reloads.
	}
}

/**
 * Sets the overrides as inline custom properties on <html> and removes the
 * rest, so the stylesheet values return. Slow motion sets every listed
 * duration, overridden or not, to SLOW_FACTOR times its value.
 */
export function applyTuning(t: Tuning, root: HTMLElement = document.documentElement): void {
	for (const token of durationTokens) {
		if (t.durations[token.name] === undefined && !t.slow) root.style.removeProperty(token.name);
		else root.style.setProperty(token.name, `${current(t, token) * (t.slow ? SLOW_FACTOR : 1)}ms`);
	}
	if (root.style.length === 0) root.removeAttribute('style');
}

/** Applies this tab's saved tuning. The root layout calls it once, in the browser. */
export function applySavedTuning(): void {
	const t = loadTuning();
	if (!isUntuned(t)) applyTuning(t);
}

/** The changed tokens as CSS declarations, one per line; empty when nothing changed. Slow motion is left out. */
export function tuningCss(t: Tuning): string {
	const lines: string[] = [];
	for (const token of durationTokens) {
		const ms = t.durations[token.name];
		if (ms !== undefined) lines.push(`${token.name}: ${ms}ms;`);
	}
	return lines.join('\n');
}
