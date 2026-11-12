import type { LayoutLoad } from './$types';

// The specimen app fills the viewport with its own AppShell: the docs site's
// header and shell step aside for every page under /app.
export const load: LayoutLoad = () => ({ bare: true });

// Which views a tab has loaded lives in sessionStorage, so the app renders
// in the browser: a server render could not know whether a view is loading
// for the first time, and the page would not match its HTML when it hydrates.
export const ssr = false;
