// The specimen app's record of which views this browser tab has loaded.
//
// The first load of a view in a session is an infrequent moment, so the app
// renders it in the expressive tier (BRIEF, Motion tiers). The record is one
// sessionStorage key: a tab has its own, closing the tab drops it, and a
// fresh browser starts with none. Route-local: the library never decides
// when a moment is expressive, the app does.

export type View = 'list' | 'project' | 'settings';

const KEY = 'hardpoint:app-first-loads';

// Where storage is blocked the record lives in memory, for this page load.
let memory: View[] = [];

function read(): View[] {
	try {
		const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
		return Array.isArray(saved) ? (saved as View[]) : [];
	} catch {
		return memory;
	}
}

function write(seen: View[]): void {
	memory = seen;
	try {
		sessionStorage.setItem(KEY, JSON.stringify(seen));
	} catch {
		// Storage is off: the in-memory record still holds until the page reloads.
	}
}

/**
 * True the first time `view` loads in this tab, and records it. Call once
 * while the page initialises and keep the answer for the life of the page:
 * the tier is decided per mount, so a filter, a sort or an edit after the
 * first load never animates. The app is client-rendered (`ssr = false` in
 * `+layout.ts`), so the server never has to guess.
 */
export function firstLoad(view: View): boolean {
	const seen = read();
	if (seen.includes(view)) return false;
	write([...seen, view]);
	return true;
}

/** Forgets every view: each one loads as a first load again. */
export function replayFirstLoads(): void {
	memory = [];
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// Nothing to clear.
	}
}
