// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			/** Render without the docs site's header and shell (see +layout.svelte). */
			bare?: boolean;
		}
		interface PageState {
			/** The document open in the list-detail demos; its history entry closes it on Back. */
			listDetail?: string;
		}
		// interface Platform {}
	}
}

export {};
