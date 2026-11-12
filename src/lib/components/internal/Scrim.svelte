<script lang="ts" module>
	/**
	 * The z-index token an overlay sits on (tokens.css, layer scale).
	 * `dialog`: dialogs, their sheets and the shell drawer. `popover`:
	 * popovers, menus, select lists and comboboxes, and their sheets on
	 * compact widths, so they open over a dialog.
	 */
	export type OverlayLayer = 'dialog' | 'popover';

	export type ScrimProps = {
		/** Shown while true. Pass the Bits UI content's `open`. */
		open: boolean;
		layer: OverlayLayer;
	};
</script>

<script lang="ts">
	import { fade } from '../../motion/index.js';

	let { open, layer }: ScrimProps = $props();

	// A press on the scrim keeps focus where it is (on the trigger, or
	// inside a dialog). The press still reaches Bits UI as an outside
	// interaction, which closes the overlay.
	function keepFocus(e: PointerEvent) {
		e.preventDefault();
	}
</script>

<!--
	Dims the page behind a dialog or sheet. Render it just before the panel,
	on the same layer, so the panel paints over it. It fades with the panel's
	timing (--dur-sheet in, --dur-sheet-exit out).
-->
{#if open}
	<div class="hp-scrim" data-layer={layer} aria-hidden="true" onpointerdown={keepFocus} transition:fade></div>
{/if}

<style>
	/* While a floating list is open Bits UI sets pointer-events: none on
	   <body>; the scrim takes presses again, so a tap on it closes. */
	.hp-scrim {
		position: fixed;
		inset: 0;
		z-index: var(--layer-dialog);
		background: var(--scrim);
		pointer-events: auto;
	}
	.hp-scrim[data-layer='popover'] {
		z-index: var(--layer-popover);
	}
</style>
