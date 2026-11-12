<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** `ok`, `warn` or `danger`; absent means neutral information. The tone sets the mark's glyph and colour, never the text's. */
	export type NoticeTone = 'ok' | 'warn' | 'danger';

	/** The title's element: `p` by default, a heading where the notice names a region of the page. */
	export type NoticeTitleElement = 'p' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	export type NoticeProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
		tone?: NoticeTone;
		/** A short line, as written, never transformed. A notice has a title, text, or both. */
		title?: string;
		/** The title's element. Defaults to `p`. */
		titleAs?: NoticeTitleElement;
		/** The text, in the muted ink. It may hold links and inline code. */
		children?: Snippet;
		/**
		 * The app's `Button`s: at most two, the primary one last, and at most one
		 * primary. A notice in a view that already shows its solid group uses
		 * secondary or tertiary buttons.
		 */
		actions?: Snippet;
		/** Adds a close button that calls this. The app removes the notice. */
		onclose?: () => void;
		/** The close button's accessible name. Defaults to `Dismiss`. */
		closeLabel?: string;
		/** The root `div`. */
		ref?: HTMLDivElement | null;
	};
</script>

<script lang="ts">
	import Button from './Button.svelte';

	let {
		tone,
		title,
		titleAs = 'p',
		children,
		actions,
		onclose,
		closeLabel = 'Dismiss',
		ref = $bindable(null),
		class: className,
		...rest
	}: NoticeProps = $props();
</script>

<!--
	A persistent message in the page flow: something the user should know or
	act on, which stays until the app removes it (the app renders it while
	it applies and gives it `onclose` when the user may dismiss it). A
	confirmation is a Toast and a failed view is an ErrorState.

	The Toaster's box in the flow: black, the control boundary, square, as
	wide as its container. A 16px outlined square before the first line
	carries the tone: "i" (neutral, muted), a check (ok), "!" (warn, danger).
	It is decorative, so the words carry the status. The title is 16px
	weight 500 in the text ink, never caps; the text below it is muted, 16px
	on touch and 14px with a mouse. The actions sit 12px under the text. A
	notice with a title and actions but no text puts the actions at the end
	of the title row, and wraps them under it when they do not fit. The close
	button is at the top end.

	It is not a live region. Pass `role="status"` for a notice that appears
	while the user is on the page, `role="alert"` for an urgent one and
	`role="note"` for supplementary content present from the start. It has
	no motion: it appears and goes at once. Extra attributes and `class` go
	to the root `div.hp-notice`.
-->
<div
	bind:this={ref}
	{...rest}
	class={['hp-notice', className]}
	data-tone={tone}
	data-titled={title ? '' : undefined}
	data-row={title && !children && actions ? '' : undefined}
>
	<span class="hp-notice-mark" aria-hidden="true">
		<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor">
			<path d="M1.5 1.5h13v13h-13z" />
			{#if tone === 'ok'}
				<path d="M4.5 8.2l2.7 2.7 4.3-5" stroke-width="2" />
			{:else if tone}
				<path d="M8 4v4M8 10v2" stroke-width="2" />
			{:else}
				<path d="M8 4v2M8 8v4" stroke-width="2" />
			{/if}
		</svg>
	</span>
	<div class="hp-notice-main">
		{#if title || children}
			<div class="hp-notice-content">
				{#if title}
					<svelte:element this={titleAs} class="hp-notice-title">{title}</svelte:element>
				{/if}
				{#if children}
					<div class="hp-notice-body">{@render children()}</div>
				{/if}
			</div>
		{/if}
		{#if actions}
			<div class="hp-notice-actions" data-after={children ? '' : undefined}>{@render actions()}</div>
		{/if}
	</div>
	{#if onclose}
		<Button
			type="button"
			variant="tertiary"
			icon
			class="hp-notice-close"
			aria-label={closeLabel}
			onclick={() => onclose()}
		>
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="square"
				aria-hidden="true"
			>
				<path d="M3 3l10 10M13 3L3 13" />
			</svg>
		</Button>
	{/if}
</div>

<style>
	/* The Toaster's box in the flow: black, the control boundary, square.
	   --notice-line is the first line's height (the title's 24px, or the
	   text's line when there is no title); --notice-lift is how far a
	   control is taller than that line, halved. */
	.hp-notice {
		--notice-line: 24px;
		--notice-text-line: 24px;
		--notice-lift: calc((var(--control-height) - var(--notice-line)) / 2);

		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		box-sizing: border-box;
		min-width: 0;
		padding: var(--space-3);
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
		font-size: var(--type-body);
		line-height: var(--notice-text-line);
	}

	/* 16px where a coarse pointer reads it, the dense 14px on fine pointers. */
	@media (pointer: fine) {
		.hp-notice {
			--notice-text-line: 20px;

			font-size: var(--type-dense);
		}
	}

	.hp-notice:not([data-titled]) {
		--notice-line: var(--notice-text-line);
	}

	/* ---- The mark: an outlined square on the first line --------------- */

	.hp-notice-mark {
		display: flex;
		flex: none;
		align-items: center;
		height: var(--notice-line);
		color: var(--muted);
	}
	.hp-notice-mark svg {
		display: block;
	}
	.hp-notice[data-tone='ok'] .hp-notice-mark {
		color: var(--ok);
	}
	.hp-notice[data-tone='warn'] .hp-notice-mark {
		color: var(--warn);
	}
	.hp-notice[data-tone='danger'] .hp-notice-mark {
		color: var(--danger);
	}

	/* ---- Title, text and actions -------------------------------------- */

	/* Wraps the actions under the content when they do not fit beside it. */
	.hp-notice-main {
		display: flex;
		flex: 1 1 auto;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-3) var(--space-4);
		min-width: 0;
	}

	.hp-notice-content {
		display: grid;
		flex: 1 1 auto;
		gap: var(--space-1);
		min-width: 0;
	}

	.hp-notice-title {
		max-width: 100%;
		color: var(--text);
		font-size: var(--type-body);
		font-weight: 500;
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	.hp-notice-body {
		max-width: var(--measure);
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.hp-notice-body :global(a) {
		color: var(--text);
	}
	.hp-notice-body :global(p + p) {
		margin-top: var(--space-2);
	}

	.hp-notice-actions {
		display: flex;
		flex: none;
		flex-wrap: wrap;
		gap: var(--space-2);
		max-width: 100%;
	}
	/* Text above them: they take their own row. */
	.hp-notice-actions[data-after] {
		flex-basis: 100%;
	}

	/* ---- The close button: the Toaster's, at the top end -------------- */

	/* Centred on the first line; the tertiary button has no edge, so it
	   reaches into the padding. */
	.hp-notice :global(.hp-notice-close) {
		flex: none;
		margin: calc(-1 * var(--notice-lift)) calc(-1 * var(--space-2)) 0 0;
	}

	/* A title row with actions is a control high, so the mark, the title and
	   the close button centre on it. */
	.hp-notice[data-row] .hp-notice-mark {
		margin-top: var(--notice-lift);
	}
	.hp-notice[data-row] .hp-notice-content {
		padding-top: var(--notice-lift);
	}
	.hp-notice[data-row] :global(.hp-notice-close) {
		margin-top: 0;
	}
</style>
