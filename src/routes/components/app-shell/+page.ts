import type { PageLoad } from './$types';

// A full-viewport demo: the docs site's own header and shell step aside.
export const load: PageLoad = () => ({ bare: true });
