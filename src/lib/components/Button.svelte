<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

	type ButtonOwnProps = {
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
		/** The `<button>`, or the `<a>` when `href` is set. */
		ref?: HTMLElement | null;
		children?: Snippet;
	};

	/**
	 * An `<a>` when `href` is set, a `<button>` otherwise. Attributes and
	 * handlers not listed here go to the element.
	 */
	export type ButtonProps =
		| (ButtonOwnProps &
				Omit<HTMLButtonAttributes, 'children' | 'type' | 'href'> & {
					type?: HTMLButtonAttributes['type'];
					href?: never;
				})
		| (ButtonOwnProps &
				Omit<HTMLAnchorAttributes, 'children' | 'type' | 'href'> & {
					href: HTMLAnchorAttributes['href'];
					type?: never;
					disabled?: HTMLButtonAttributes['disabled'];
				});
</script>

<script lang="ts">
	let {
		variant = 'secondary',
		opens = false,
		icon = false,
		class: className,
		ref = $bindable(null),
		href,
		disabled,
		children,
		...rest
	}: ButtonProps = $props();

	// `rest` holds one element's attributes; each branch reads it as its own.
	const asButton = (attributes: typeof rest) => attributes as HTMLButtonAttributes;
	const asLink = (attributes: typeof rest) => attributes as HTMLAnchorAttributes;
</script>

<!--
	A plain <button> without `href`, an <a> with it, with no component layer
	between: a transcript may draw hundreds. A disabled link renders without
	href, with role="link", aria-disabled="true" and tabindex -1; a disabled
	<button> is not focusable.
-->
{#if !href}
	<button
		bind:this={ref}
		class={['hp-button', 'hp-label', className]}
		data-variant={variant}
		data-opens={opens || undefined}
		data-icon={icon || undefined}
		{disabled}
		{...asButton(rest)}
	>
		{@render children?.()}
	</button>
{:else}
	<a
		bind:this={ref}
		class={['hp-button', 'hp-label', className]}
		data-variant={variant}
		data-opens={opens || undefined}
		data-icon={icon || undefined}
		href={disabled ? undefined : href}
		role={disabled ? 'link' : undefined}
		aria-disabled={disabled ? 'true' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...asLink(rest)}
	>
		{@render children?.()}
	</a>
{/if}

<style>
	/* Global rules keyed on .hp-button and its data-*, at one class of
	   specificity as when Bits UI rendered the element, so an app's rules
	   that override them still apply. */
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
