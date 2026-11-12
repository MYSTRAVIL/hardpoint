<script lang="ts" module>
	import { Button as BitsButton } from 'bits-ui';

	export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

	export type ButtonProps = BitsButton.RootProps & {
		/**
		 * `primary`: solid titanium block, for the view's one group of solid
		 * blocks. `secondary` (default): outlined. `tertiary`: caps label only.
		 */
		variant?: ButtonVariant;
		/** Ends the label in a small ▸: the button opens another view. */
		opens?: boolean;
		/**
		 * A square, icon-only button (height and width are `--control-height`).
		 * It has no visible label, so it needs an accessible name: pass
		 * `aria-label`.
		 */
		icon?: boolean;
	};
</script>

<script lang="ts">
	let {
		variant = 'secondary',
		opens = false,
		icon = false,
		class: className,
		ref = $bindable(null),
		children,
		...rest
	}: ButtonProps = $props();
</script>

<!--
	An <a> when `href` is set, a <button> otherwise (Bits UI Button.Root). A
	disabled link renders without href, with aria-disabled="true" and
	tabindex -1; a disabled <button> is not focusable.
-->
<BitsButton.Root
	bind:ref
	class={['hp-button', 'hp-label', className]}
	data-variant={variant}
	data-opens={opens || undefined}
	data-icon={icon || undefined}
	{...rest}
>
	{@render children?.()}
</BitsButton.Root>

<style>
	/* Bits UI renders the element, so the root class reaches it from the
	   outside: the rules are :global, keyed on .hp-button and its data-*. */
	:global(.hp-button) {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		box-sizing: border-box;
		height: var(--control-height);
		/* The visible box is the hit area: 36px fine, 44px coarse, and never
		   narrower than --hit-target for a short label. */
		min-width: var(--hit-target);
		padding: 0 var(--space-3);
		border: 0;
		background: transparent;
		color: var(--text);
		font-family: var(--sans);
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* ---- Variants ---------------------------------------------------- */

	/* Solid titanium block with a black label. */
	:global(.hp-button[data-variant='primary']) {
		background: var(--accent);
		color: var(--canvas);
	}
	/* Outlined: a 3:1 boundary, titanium label, black fill. */
	:global(.hp-button[data-variant='secondary']) {
		border: 1px solid var(--border-control);
		background: var(--canvas);
	}
	/* The label alone. */
	:global(.hp-button[data-variant='tertiary']) {
		background: transparent;
	}

	/* ---- Opens another view: a small ▸ drawn in CSS ------------------ */

	:global(.hp-button[data-opens]::after) {
		content: '';
		flex: none;
		width: 6px;
		height: 8px;
		background: currentColor;
		clip-path: polygon(0 0, 100% 50%, 0 100%);
	}

	/* ---- Icon only: a square ----------------------------------------- */

	:global(.hp-button[data-icon]) {
		justify-content: center;
		width: var(--control-height);
		padding: 0;
	}
	/* The icon is the consumer's inline <svg>; it draws in currentColor. */
	:global(.hp-button svg) {
		flex: none;
	}
	:global(.hp-button[data-icon] svg) {
		width: var(--space-4);
		height: var(--space-4);
	}

	/* ---- Hover: fine pointers only ----------------------------------- */

	@media (hover: hover) and (pointer: fine) {
		:global(.hp-button) {
			transition:
				background-color var(--dur-hover) var(--settle),
				color var(--dur-hover) var(--settle);
		}
		:global(.hp-button:active:not(:disabled):not([aria-disabled='true'])) {
			transition-duration: var(--dur-press);
		}
		:global(.hp-button[data-variant='primary']:hover:not(:disabled):not([aria-disabled='true'])) {
			background: var(--muted);
		}
		:global(.hp-button[data-variant='secondary']:hover:not(:disabled):not([aria-disabled='true'])),
		:global(.hp-button[data-variant='tertiary']:hover:not(:disabled):not([aria-disabled='true'])) {
			background: var(--surface-hover);
		}
		/* The tint alone barely shows (1.03:1), so the label also underlines. */
		:global(.hp-button[data-variant='tertiary']:hover:not(:disabled):not([aria-disabled='true'])) {
			text-decoration: underline;
			text-decoration-thickness: 1px;
			text-underline-offset: 0.3em;
		}
	}

	/* ---- Press: after hover, so it wins while the pointer is down ----- */

	:global(.hp-button[data-variant='primary']:active:not(:disabled):not([aria-disabled='true'])) {
		background: var(--muted);
	}
	/* One step past the hover tint, so a press reads on a phone too. */
	:global(.hp-button[data-variant='secondary']:active:not(:disabled):not([aria-disabled='true'])),
	:global(.hp-button[data-variant='tertiary']:active:not(:disabled):not([aria-disabled='true'])) {
		background: var(--surface-raised);
	}

	/* ---- Disabled: muted ink. A <button> is not focusable; a link has
	   no href. -------------------------------------------------------- */

	:global(.hp-button:disabled),
	:global(.hp-button[aria-disabled='true']) {
		color: var(--muted);
		cursor: not-allowed;
	}
	:global(.hp-button[data-variant='primary']:disabled),
	:global(.hp-button[data-variant='primary'][aria-disabled='true']) {
		/* --muted is 4.9:1 on the band. */
		background: var(--surface-band);
	}
	:global(.hp-button[data-variant='secondary']:disabled),
	:global(.hp-button[data-variant='secondary'][aria-disabled='true']) {
		/* An off control needs no 3:1 boundary. */
		border-color: var(--border);
	}
</style>
