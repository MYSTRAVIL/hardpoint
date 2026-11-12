<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { OverlayLayer } from './Scrim.svelte';

	/** Attributes and handlers not listed here go to the panel. */
	export type SheetProps = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		/**
		 * Shown while true. Pass the `open` that the Bits UI content's
		 * `child` snippet receives (render the content with `forceMount`), so
		 * the sheet and its scrim slide and fade out before they unmount.
		 */
		open: boolean;
		/** The title row's text, in tracked caps. */
		title: string;
		/** The title element's `id`, so the content can be labelled by it. */
		titleId?: string;
		/** The title element: `p`, or `h2` when the sheet is a dialog. */
		titleTag?: 'p' | 'h2';
		/** The z-index token: `dialog` for dialogs, `popover` for everything else. */
		layer: OverlayLayer;
		/**
		 * Called by the close button and by a swipe down. A tap on the scrim
		 * and Escape close through Bits UI.
		 */
		onclose: () => void;
		/** The close button's accessible name. */
		closeLabel?: string;
		/** The panel element. */
		ref?: HTMLElement | null;
		/** The body, under the title row. It scrolls if it does not fit. */
		children: Snippet;
		/** A row pinned under the body, such as a dialog's actions. */
		footer?: Snippet;
	};
</script>

<script lang="ts">
	import { sheet } from '../../motion/index.js';
	import Scrim from './Scrim.svelte';
	import { swipeDismiss } from './swipe-dismiss.js';
	import { followVisualViewport } from './visual-viewport.svelte.js';

	let {
		open,
		title,
		titleId,
		titleTag = 'p',
		layer,
		onclose,
		closeLabel = 'Close',
		ref = $bindable(null),
		children,
		footer,
		class: className,
		...rest
	}: SheetProps = $props();

	let body = $state<HTMLElement | null>(null);

	// The sheet follows the visual viewport while it is open (decided
	// 2026-11-10; internal/visual-viewport.svelte.ts): while the on-screen
	// keyboard shortens it, the sheet's bottom edge sits on its bottom edge
	// and the sheet may grow to its height less the header row's
	// (--header-height and the top safe area), where it was half the screen.
	// The focused field in the body stays in sight.
	const viewport = followVisualViewport(() => open, () => body);

	// The press that opened the sheet never acts on what the sheet now shows
	// under the finger (decided 2026-11-10). On touch, Bits UI's Menu and
	// Select triggers open on pointerup, and the click that follows lands on
	// the sheet, which under reduced motion fades in where it ends up; a
	// mouse opens them on pointerdown, and its pointerup on an item counts
	// as a choice. So until a press starts inside the sheet, a pointerup or a
	// pointer's click inside it stops here. A click from Enter, Space or
	// element.click() has detail 0 and always passes.
	function ignoreOpeningPress(node: HTMLElement) {
		let pressed = false;
		const press = () => (pressed = true);
		const guard = (e: MouseEvent) => {
			if (pressed || (e.type === 'click' && e.detail === 0)) return;
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		const capture = { capture: true };
		node.addEventListener('pointerdown', press, capture);
		node.addEventListener('pointerup', guard, capture);
		node.addEventListener('click', guard, capture);
		return () => {
			node.removeEventListener('pointerdown', press, capture);
			node.removeEventListener('pointerup', guard, capture);
			node.removeEventListener('click', guard, capture);
		};
	}
</script>

<!--
	The bottom sheet every overlay uses on compact widths (BRIEF, Apps and
	phones: Overlays): a scrim, then a panel at the bottom edge with a handle,
	a caps title, a close button, the body and an optional footer. It opens at
	half the screen at most, with no drag to expand; the body scrolls inside.
	A swipe down dismisses it (internal/swipe-dismiss.ts). While the visual
	viewport is shorter than the layout viewport (the on-screen keyboard), it
	sits on top of it and may fill the space above it. The press that opened
	it does not act inside it.

	Render it inside the Bits UI content's `child` snippet and spread the
	snippet's `props` onto it when the panel is the content element (a
	dialog), or onto an element in the body when the content is a list (a
	menu, a select): then pass `onInteractOutside` to the content and call
	`preventDefault()` for presses inside `ref`, so the title row does not
	count as outside.
-->
<Scrim {open} {layer} />
{#if open}
	{@const lifted = viewport.current}
	<div
		bind:this={ref}
		{...rest}
		class={['hp-sheet', className]}
		data-layer={layer}
		style:bottom={lifted ? `calc(100% - ${lifted.bottom}px)` : undefined}
		style:padding-bottom={lifted ? '0px' : undefined}
		style:--sheet-max-height={lifted
			? `calc(${lifted.height}px - var(--header-height) - env(safe-area-inset-top))`
			: undefined}
		transition:sheet
		{@attach ignoreOpeningPress}
		{@attach swipeDismiss(() => onclose())}
	>
		<div class="hp-sheet-head">
			<span class="hp-sheet-handle" aria-hidden="true"></span>
			<svelte:element this={titleTag} id={titleId} class="hp-sheet-title">{title}</svelte:element>
			<button type="button" class="hp-sheet-close" aria-label={closeLabel} onclick={() => onclose()}>
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
			</button>
		</div>
		<div class="hp-sheet-body" bind:this={body}>
			{@render children()}
		</div>
		{#if footer}
			<div class="hp-sheet-footer">
				{@render footer()}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* While a floating list is open Bits UI sets pointer-events: none on
	   <body>; the panel takes presses again. */
	.hp-sheet {
		/* The height cap: half the screen, or the room above the on-screen
		   keyboard while it is up (set inline). A list that must keep its
		   height while it filters asks for this. */
		--sheet-max-height: 50dvh;

		position: fixed;
		inset: auto 0 0;
		z-index: var(--layer-dialog);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		/* Opens at half the screen at most; the body scrolls inside. */
		max-height: var(--sheet-max-height);
		padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
		border-top: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		overscroll-behavior: contain;
		pointer-events: auto;
	}
	.hp-sheet[data-layer='popover'] {
		z-index: var(--layer-popover);
	}

	/* The grab area: handle, title and close button. The swipe owns touches
	   here; the body below keeps its scroll until it reaches the top. */
	.hp-sheet-head {
		flex: none;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		padding: 0 var(--space-1) 0 var(--gutter);
		touch-action: none;
	}
	.hp-sheet-handle {
		grid-column: 1 / -1;
		justify-self: center;
		width: var(--space-8);
		height: var(--space-1);
		margin-top: var(--space-2);
		background: var(--border-control);
	}
	/* Tracked caps at the compact view-title size. A long title wraps (200
	   percent zoom); the padding centres its first line on the 44px close
	   button, so a single line sits where it always did. The clip stays: it
	   keeps the first glyph's antialiasing inside the text edge, as before. */
	.hp-sheet-title {
		overflow: hidden;
		padding-block: calc((44px - 1lh) / 2);
		font-size: var(--type-body);
		font-weight: 500;
		line-height: 24px;
		letter-spacing: var(--label-tracking);
		text-transform: var(--label-transform);
		overflow-wrap: anywhere;
	}
	.hp-sheet-close {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-sheet-close svg {
		width: var(--space-4);
		height: var(--space-4);
	}
	.hp-sheet-close:active {
		background: var(--surface-raised);
	}
	@media (hover: hover) and (pointer: fine) {
		.hp-sheet-close {
			transition: background-color var(--dur-hover) var(--settle);
		}
		.hp-sheet-close:hover {
			background: var(--surface-hover);
		}
		.hp-sheet-close:active {
			background: var(--surface-raised);
			transition-duration: var(--dur-press);
		}
	}

	/* A flex column, so a list inside can take the rest of the height
	   (flex: 1 1 auto; min-height: 0) and scroll on its own. */
	.hp-sheet-body {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.hp-sheet-footer {
		flex: none;
	}
</style>
