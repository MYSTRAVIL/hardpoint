<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Popover as BitsPopover } from 'bits-ui';

	export type PopoverTriggerSnippetProps = {
		/** Spread onto the button that opens the popover. */
		props: Record<string, unknown>;
	};

	export type PopoverActionsSnippetProps = {
		/** Closes the popover; focus returns to the trigger. */
		close: () => void;
	};

	/**
	 * Attributes and handlers not listed here go to the panel (Bits UI
	 * `Popover.Content`), among them `side` (default `bottom`), `align`
	 * (default `start`), `sideOffset`, `onOpenAutoFocus`, `onCloseAutoFocus`,
	 * `onEscapeKeydown` and `onInteractOutside`. The placement props apply
	 * from 600px only; below it the panel is a bottom sheet.
	 */
	export type PopoverProps = Omit<
		BitsPopover.ContentProps,
		'child' | 'children' | 'forceMount' | 'ref' | 'title'
	> & {
		open?: boolean;
		/** The caps title, and the panel's accessible name. */
		title: string;
		/** The button the panel is anchored to: spread `props` onto it. */
		trigger: Snippet<[PopoverTriggerSnippetProps]>;
		/** The body, under the title. */
		children: Snippet;
		/** The action row at the bottom, primary action last. */
		actions?: Snippet<[PopoverActionsSnippetProps]>;
		/** The sheet's close button's accessible name (below 600px). */
		closeLabel?: string;
		/** The panel element. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { pop } from '../motion/index.js';
	import { mountOnFirstOpen } from './internal/first-open.svelte.js';
	import Sheet from './internal/Sheet.svelte';

	const uid = $props.id();

	let {
		open = $bindable(false),
		title,
		trigger,
		children,
		actions,
		closeLabel = 'Close',
		ref = $bindable(null),
		class: className,
		...rest
	}: PopoverProps = $props();

	const titleId = `${uid}-title`;

	// The form follows the width (BRIEF, Apps and phones: Overlays): a panel
	// anchored to the trigger from 600px, the shared bottom sheet below it.
	const wide = new MediaQuery('min-width: 600px', true);
	const form = $derived(wide.current ? 'popover' : 'sheet');

	// Bits UI's portal and content mount on the first open, so a closed
	// popover costs only its trigger.
	const layers = mountOnFirstOpen(() => open);

	function close() {
		open = false;
	}
</script>

<!--
	Bits UI gives the trigger aria-haspopup="dialog", aria-expanded and,
	while open, aria-controls; the panel takes role="dialog" and its title
	as its name. Focus moves into the panel on open (to the sheet's close
	button on compact) and returns to the trigger on close. Escape, a press
	outside, the trigger and, on compact, the close button and a swipe down
	close it.
-->
<BitsPopover.Root bind:open={() => layers.open, (value) => (open = value)}>
	<BitsPopover.Trigger>
		{#snippet child({ props })}
			{@render trigger({ props })}
		{/snippet}
	</BitsPopover.Trigger>

	{#if layers.mounted}
		<BitsPopover.Portal>
			{#if wide.current}
				<BitsPopover.Content
					forceMount
					bind:ref
					role="dialog"
					aria-labelledby={titleId}
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={8}
					{...rest}
				>
					{#snippet child({ wrapperProps, props, open: shown })}
						{#if shown}
							<div {...wrapperProps}>
								<div {...props} class={['hp-popover', className]} data-form="popover" transition:pop>
									<p id={titleId} class="hp-popover-title hp-label">{title}</p>
									{@render body()}
									{#if actions}
										{@render actionRow()}
									{/if}
								</div>
							</div>
						{/if}
					{/snippet}
				</BitsPopover.Content>
			{:else}
				<BitsPopover.ContentStatic forceMount preventScroll bind:ref role="dialog" aria-labelledby={titleId} {...rest}>
					{#snippet child({ props, open: shown })}
						<Sheet
							{...props}
							class={['hp-popover', className]}
							data-form="sheet"
							open={shown}
							layer="popover"
							{title}
							{titleId}
							{closeLabel}
							onclose={close}
							footer={actions ? actionRow : undefined}
						>
							{@render body()}
						</Sheet>
					{/snippet}
				</BitsPopover.ContentStatic>
			{/if}
		</BitsPopover.Portal>
	{/if}
</BitsPopover.Root>

{#snippet body()}
	<div class="hp-popover-body" data-form={form} data-end={actions ? undefined : ''}>
		{@render children()}
	</div>
{/snippet}

{#snippet actionRow()}
	<div class="hp-popover-actions" data-form={form}>
		{@render actions?.({ close })}
	</div>
{/snippet}

<style>
	/* ---- Popover (600px and up): a black panel under its trigger --------- */

	/* On the popover layer (tokens.css), over the shell and over an open
	   dialog. Bits UI copies the z-index to the positioned wrapper. As wide
	   as its content up to --popover-width, 360px unless set (an app sets it
	   with a class on the Popover and a rule in its stylesheet; the default
	   is the var() fallback, so any rule wins whatever its specificity; the
	   sheet ignores it), and as tall as the space beside the trigger; the
	   body scrolls inside. */
	.hp-popover {
		position: relative;
		z-index: var(--layer-popover);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: max-content;
		max-width: min(var(--popover-width, 360px), var(--bits-popover-content-available-width));
		max-height: var(--bits-popover-content-available-height);
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		overscroll-behavior: contain;
	}

	/* A caps label names the panel, in the main ink, so the muted caps
	   labels of fields inside it read as one level down. */
	.hp-popover-title {
		flex: none;
		margin: 0;
		padding: var(--space-3) var(--space-4) 0;
	}

	/* ---- Body and actions, in both forms -------------------------------- */

	/* The top padding keeps a first control's focus contour (4px out, 2px
	   wide) inside the scrolling box. */
	.hp-popover-body {
		display: grid;
		align-content: start;
		gap: var(--space-4);
		min-width: 0;
		font-size: var(--type-body);
		line-height: 24px;
	}
	.hp-popover-body[data-form='popover'] {
		flex: 1 1 auto;
		min-height: 0;
		padding: var(--space-3) var(--space-4);
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	/* The sheet's body scrolls itself. */
	.hp-popover-body[data-form='sheet'] {
		padding: var(--space-2) var(--gutter);
	}
	/* Without an action row the body ends the panel. */
	.hp-popover-body[data-end] {
		padding-bottom: var(--space-4);
	}

	/* Actions sit at the end, primary last, 8px apart. */
	.hp-popover-actions {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
		padding: var(--space-4) var(--gutter);
	}
	.hp-popover-actions[data-form='popover'] {
		padding: var(--space-1) var(--space-4) var(--space-4);
	}
</style>
