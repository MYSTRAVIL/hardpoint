<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Collapsible } from 'bits-ui';

	export type DisclosureTitleElement = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	/**
	 * Attributes and handlers not listed here (`id`, `aria-*`, `data-*`,
	 * `onOpenChange`) go to the root element.
	 */
	export type DisclosureProps = Omit<Collapsible.RootProps, 'child' | 'children' | 'open' | 'ref' | 'title'> & {
		/** The trigger's text, as written. It never takes caps. */
		title: string;
		/** Whether the content shows. Bindable. */
		open?: boolean;
		/**
		 * Wraps the trigger in a heading of this level, so the section shows
		 * in a screen reader's heading list. Pick the level that fits the
		 * page's outline. Without it the trigger stands alone.
		 */
		titleAs?: DisclosureTitleElement;
		disabled?: boolean;
		/** The root element. */
		ref?: HTMLDivElement | null;
		/** The content. */
		children?: Snippet;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { Collapsible as BitsCollapsible } from 'bits-ui';
	import { duration } from '../motion/transitions.js';

	let {
		title,
		open = $bindable(false),
		titleAs,
		disabled = false,
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: DisclosureProps = $props();

	let body = $state<HTMLDivElement>();
	/** The last `open` this component saw, so only a change fades. */
	let was = untrack(() => open);

	// Height snaps: the content is there at its full size on the first
	// frame, and its text fades in. Opacity only, so it also runs under
	// reduced motion. Never on first render: `was` starts at the first
	// value of `open`. The duration and the curve are read now, so a token
	// retuned on <html> applies. A fade that is still running when the
	// section closes is cancelled, so closing is a cut.
	$effect(() => {
		const now = open;
		if (now === was) return;
		was = now;
		untrack(() => {
			if (!body) return;
			for (const a of body.getAnimations()) a.cancel();
			if (!now) return;
			const ms = duration(body, '--dur-expand');
			if (ms <= 0) return;
			const settle = getComputedStyle(body).getPropertyValue('--settle').trim();
			body.animate(
				{ opacity: [0, 1] },
				{ duration: ms, easing: CSS.supports('transition-timing-function', settle) ? settle : 'ease-out' }
			);
		});
	});
</script>

{#snippet trigger()}
	<BitsCollapsible.Trigger class="hp-disclosure-trigger hp-dense">{title}</BitsCollapsible.Trigger>
{/snippet}

<!--
	One expandable section on Bits UI Collapsible. The trigger is a button
	with aria-expanded and aria-controls (the WAI disclosure pattern); with
	`titleAs` it sits inside a heading. Opening snaps the height and fades
	the content in over --dur-expand; closing cuts. Closed content stays in
	the document as hidden="until-found", so a browser that supports it finds
	text in it and opens the section (Bits UI's beforematch handler). A browser
	without it treats the attribute as plain hidden: the closed content is
	not searchable, and the trigger is the only way in. The attribute is set
	here, not by Bits UI, so closing hides the content in the same frame.
-->
<BitsCollapsible.Root bind:open bind:ref {disabled} class={['hp-disclosure', className]} {...rest}>
	{#if titleAs}
		<svelte:element this={titleAs} class="heading">{@render trigger()}</svelte:element>
	{:else}
		{@render trigger()}
	{/if}
	<BitsCollapsible.Content hiddenUntilFound>
		{#snippet child({ props })}
			<div {...props} hidden={open ? undefined : 'until-found'} class="hp-disclosure-content">
				<div class="body" bind:this={body}>
					{@render children?.()}
				</div>
			</div>
		{/snippet}
	</BitsCollapsible.Content>
</BitsCollapsible.Root>

<style>
	/* Stacked disclosures sit 8px apart. No dividers: structure from
	   alignment. */
	:global(.hp-disclosure + .hp-disclosure) {
		margin-top: var(--space-2);
	}

	.heading {
		margin: 0;
		font: inherit;
	}

	/* A full-width row, title at the start, chevron at the end. The hover
	   tint and the focus contour reach --bleed past the text edge, as table
	   bands do, and the padding keeps the title on the page edge. It wraps
	   a long title; it never truncates. */
	:global(.hp-disclosure-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		box-sizing: border-box;
		width: calc(100% + 2 * var(--bleed));
		min-height: var(--control-height);
		margin: 0 calc(-1 * var(--bleed));
		padding: var(--space-2) var(--bleed);
		border: 0;
		background: transparent;
		color: var(--text);
		font-family: var(--sans);
		font-weight: 500;
		text-align: start;
		overflow-wrap: anywhere;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	/* The select well's chevron: the same mask, 16px, --muted; it points up
	   while open, with the list's timing (--dur-pop opening, --dur-pop-exit
	   closing) and no turn under reduced motion. */
	:global(.hp-disclosure-trigger::after) {
		content: '';
		flex: none;
		width: 16px;
		height: 16px;
		background-color: var(--muted);
		mask: var(--select-chevron) center / 16px 16px no-repeat;
		transition: transform var(--dur-pop-exit) var(--settle);
	}
	:global(.hp-disclosure-trigger[aria-expanded='true']::after) {
		transform: rotate(180deg);
		transition-duration: var(--dur-pop);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.hp-disclosure-trigger::after) {
			transition: none;
		}
	}

	/* Hover: fine pointers only. The tint alone barely shows (1.03:1), so the
	   title also underlines, as a tertiary Button's does. */
	@media (hover: hover) and (pointer: fine) {
		:global(.hp-disclosure-trigger) {
			transition: background-color var(--dur-hover) var(--settle);
		}
		:global(.hp-disclosure-trigger:active:not(:disabled)) {
			transition-duration: var(--dur-press);
		}
		:global(.hp-disclosure-trigger:hover:not(:disabled)) {
			background-color: var(--surface-hover);
			text-decoration: underline;
			text-decoration-thickness: 1px;
			text-underline-offset: 0.3em;
		}
	}
	/* One step past the hover tint, so a press reads on a phone too. */
	:global(.hp-disclosure-trigger:active:not(:disabled)) {
		background-color: var(--surface-raised);
	}

	:global(.hp-disclosure-trigger:disabled) {
		color: var(--muted);
		cursor: not-allowed;
	}
	:global(.hp-disclosure-trigger:disabled::after) {
		background-color: var(--border);
	}

	/* The padding sits on the inner box: closed content is hidden, and a
	   hidden box still shows its own padding. */
	.body {
		padding: var(--space-1) 0 var(--space-3);
	}
</style>
