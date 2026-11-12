// The theme choice for the docs site and the specimen app: read, write and
// apply. Route-local: the library ships tokens only, and an app picks its theme
// with `data-theme` on <html> ('dark', 'light' or 'system'; none means dark).
//
// src/app.html runs a small inline script before first paint that cannot
// import this file. It repeats the storage key and the colour pair below, and
// keeps the meta in step with the device while the theme is 'system'. Change
// them in both places together.

export type Theme = 'system' | 'dark' | 'light';

/** localStorage key; missing or invalid means dark. Same key as src/app.html. */
export const THEME_KEY = 'hardpoint:theme';

/** The <meta name="theme-color"> colour for each look: --canvas. Same pair as src/app.html. */
const META_DARK = '#000000';
const META_LIGHT = '#f7f5f0';

export const themeOptions: { value: Theme; label: string }[] = [
	{ value: 'system', label: 'System' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'light', label: 'Light' }
];

function isTheme(value: unknown): value is Theme {
	return value === 'system' || value === 'dark' || value === 'light';
}

/** The saved choice, or 'dark' when there is none, it is invalid, or storage is blocked. */
export function readTheme(): Theme {
	try {
		const saved = localStorage.getItem(THEME_KEY);
		return isTheme(saved) ? saved : 'dark';
	} catch {
		return 'dark';
	}
}

/** Put the theme on <html> and set the browser chrome colour to match. */
export function applyTheme(theme: Theme) {
	const light = theme === 'light' || (theme === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
	document.documentElement.dataset.theme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? META_LIGHT : META_DARK);
}

/** Apply the theme and remember it. A blocked store only loses the memory. */
export function setTheme(theme: Theme) {
	applyTheme(theme);
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {
		// The choice still holds for this page.
	}
}
