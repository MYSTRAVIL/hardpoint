import { tick } from 'svelte';

/**
 * Mounts an overlay's Bits UI content layers on its first open instead of
 * with its trigger. The layers (the portal, positioning, focus and dismiss
 * handling) cost far more than the trigger, and an app may draw many closed
 * menus, popovers, selects, comboboxes, tooltips, dialogs and image viewers
 * per view. Until the first open only the trigger and its ARIA exist. Call
 * this while the component initialises with its own open state; render the
 * portal while `mounted` is true, and give Bits UI `open` in its place.
 *
 * The layers mount closed, and `open` turns true one update later, so the
 * first entrance plays as every later one does. They stay mounted after
 * that, and `open` then follows `isOpen()` at once.
 */
export function mountOnFirstOpen(isOpen: () => boolean): { readonly mounted: boolean; readonly open: boolean } {
	let mounted = $state(false);
	let ready = $state(false);

	$effect(() => {
		if (!isOpen() || mounted) return;
		mounted = true;
		tick().then(() => (ready = true));
	});

	return {
		get mounted() {
			return mounted;
		},
		get open() {
			return isOpen() && ready;
		}
	};
}
