<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Dialog as BitsDialog } from 'bits-ui';

	export type DialogTriggerSnippetProps = {
		/** Spread onto the button that opens the dialog. */
		props: Record<string, unknown>;
	};

	export type DialogActionsSnippetProps = {
		/** Closes the dialog; focus returns to what had it before. */
		close: () => void;
	};

	/**
	 * Attributes and handlers not listed here go to the dialog element (Bits
	 * UI `Dialog.Content`), among them `onOpenAutoFocus`, `onCloseAutoFocus`,
	 * `onEscapeKeydown` and `onInteractOutside`. An app's `onOpenAutoFocus`
	 * runs before `initialFocus` is applied.
	 */
	export type DialogProps = Omit<
		BitsDialog.ContentProps,
		'child' | 'children' | 'forceMount' | 'ref' | 'title'
	> & {
		open?: boolean;
		/** The caps title and the dialog's accessible name. */
		title: string;
		/** A line in `--muted` under the title, and the accessible description. */
		description?: string;
		/**
		 * Below 600px, a full-screen dialog instead of a bottom sheet: for long
		 * or complex forms. While the on-screen keyboard is up, it fills the
		 * space above it. From 600px the dialog is centred either way. In
		 * every form a press outside does not close it, so typed input is not
		 * lost by accident; Escape and the close button still do.
		 */
		fullscreen?: boolean;
		/** The button that opens the dialog: spread `props` onto it. */
		trigger?: Snippet<[DialogTriggerSnippetProps]>;
		/** The body, under the title and description. */
		children?: Snippet;
		/** The action row at the bottom, primary action last. */
		actions?: Snippet<[DialogActionsSnippetProps]>;
		/**
		 * Where focus starts when the dialog opens, in place of the close
		 * button: an element inside the dialog, or a function that returns one,
		 * called as the dialog opens. When it gives no element, focus starts on
		 * the close button. An app's own `onOpenAutoFocus` runs first; when it
		 * calls `preventDefault()`, the dialog leaves focus alone.
		 */
		initialFocus?: HTMLElement | null | (() => HTMLElement | null | undefined);
		/** The close button's accessible name. */
		closeLabel?: string;
		/** The dialog element. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { fade, sheet } from '../motion/index.js';
	import { mountOnFirstOpen } from './internal/first-open.svelte.js';
	import Scrim from './internal/Scrim.svelte';
	import Sheet from './internal/Sheet.svelte';
	import { followVisualViewport } from './internal/visual-viewport.svelte.js';

	const uid = $props.id();

	let {
		open = $bindable(false),
		title,
		description,
		fullscreen = false,
		trigger,
		children,
		actions,
		initialFocus,
		closeLabel = 'Close',
		ref = $bindable(null),
		onOpenAutoFocus,
		class: className,
		...rest
	}: DialogProps = $props();

	const titleId = `${uid}-title`;
	const descriptionId = `${uid}-description`;

	// The form follows the width (BRIEF, Apps and phones: Overlays): a bottom
	// sheet below 600px, or a full-screen dialog when asked; centred from
	// 600px.
	const wide = new MediaQuery('min-width: 600px', true);
	const form = $derived(wide.current ? 'centred' : fullscreen ? 'fullscreen' : 'sheet');

	let bodyNode = $state<HTMLElement | null>(null);

	// The full-screen form follows the visual viewport while it is open, as
	// the Sheet does (decided 2026-11-10; internal/visual-viewport.svelte.ts):
	// while the on-screen keyboard shortens it, the panel's top sits on its
	// top and the panel takes its height, so the title row, the body and the
	// action row stay above the keyboard, and the focused field in the body
	// stays in sight. A form that changes while open drops the keyboard line.
	const viewport = followVisualViewport(
		() => open && form === 'fullscreen',
		() => (form === 'fullscreen' ? bodyNode : null)
	);
	const lifted = $derived(form === 'fullscreen' ? viewport.current : null);

	// A fullscreen form ignores presses outside, so typed input is not lost;
	// an app can override it through rest props. Bits UI also hands the
	// option on in the content snippet's props; the snippet drops it there,
	// because it is not an HTML attribute.

	// Bits UI's portal and content mount on the first open, so a closed
	// dialog costs only its trigger.
	const layers = mountOnFirstOpen(() => open);

	function close() {
		open = false;
	}

	// Focus starts on the close button, the first control Bits UI finds,
	// unless `initialFocus` names another element. An app's own
	// onOpenAutoFocus runs first and may take over by calling
	// preventDefault().
	function openAutoFocus(e: Event) {
		onOpenAutoFocus?.(e);
		if (e.defaultPrevented) return;
		const target = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
		if (!target) return;
		e.preventDefault();
		target.focus();
	}

	// The centred dialog fades in place; the full-screen one slides up like
	// a sheet. Both at the dialog timing; reduced motion fades both.
	function panel(node: Element) {
		return form === 'fullscreen' ? sheet(node) : fade(node);
	}
</script>

<BitsDialog.Root bind:open={() => layers.open, (value) => (open = value)}>
	{#if trigger}
		<BitsDialog.Trigger>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</BitsDialog.Trigger>
	{/if}

	{#if layers.mounted}
		<BitsDialog.Portal>
			<BitsDialog.Content
				forceMount
				bind:ref
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				interactOutsideBehavior={fullscreen ? 'ignore' : 'close'}
				onOpenAutoFocus={openAutoFocus}
				{...rest}
			>
				{#snippet child({ props: { interactOutsideBehavior: _, ...props }, open: shown })}
					{#if form === 'sheet'}
						<Sheet
							{...props}
							class={['hp-dialog', className]}
							data-form="sheet"
							open={shown}
							layer="dialog"
							{title}
							{titleId}
							titleTag="h2"
							{closeLabel}
							onclose={close}
							footer={actions ? actionRow : undefined}
						>
							{@render body()}
						</Sheet>
					{:else}
						<Scrim open={shown} layer="dialog" />
						{#if shown}
							<div
								{...props}
								class={['hp-dialog', className]}
								data-form={form}
								style:top={lifted ? `${lifted.top}px` : undefined}
								style:bottom={lifted ? 'auto' : undefined}
								style:height={lifted ? `${lifted.height}px` : undefined}
								style:padding-bottom={lifted ? '0px' : undefined}
								transition:panel
							>
								<div class="hp-dialog-head" data-form={form}>
									<h2 id={titleId} class="hp-dialog-title hp-view-title">{title}</h2>
									<button type="button" class="hp-dialog-close" aria-label={closeLabel} onclick={close}>
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
								{@render body()}
								{#if actions}
									{@render actionRow()}
								{/if}
							</div>
						{/if}
					{/if}
				{/snippet}
			</BitsDialog.Content>
		</BitsDialog.Portal>
	{/if}
</BitsDialog.Root>

{#snippet body()}
	<div
		class="hp-dialog-body"
		data-form={form}
		data-end={actions ? undefined : ''}
		bind:this={bodyNode}
	>
		{#if description}
			<p id={descriptionId} class="hp-dialog-description">{description}</p>
		{/if}
		{@render children?.()}
	</div>
{/snippet}

{#snippet actionRow()}
	<div class="hp-dialog-actions" data-form={form}>
		{@render actions?.({ close })}
	</div>
{/snippet}

<style>
	/* ---- Centred (600px and up) and full screen (compact) --------------- */

	.hp-dialog[data-form='centred'],
	.hp-dialog[data-form='fullscreen'] {
		position: fixed;
		z-index: var(--layer-dialog);
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		background: var(--canvas);
		color: var(--text);
		overscroll-behavior: contain;
		/* Bits UI may have turned pointer events off on <body>. */
		pointer-events: auto;
	}

	/* A square black panel with a 3:1 boundary, centred in the safe area. */
	.hp-dialog[data-form='centred'] {
		inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
			env(safe-area-inset-left);
		width: min(560px, 100% - 2 * var(--gutter));
		height: fit-content;
		max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2 * var(--space-8));
		margin: auto;
		border: 1px solid var(--border-control);
	}

	/* The whole screen, inside the safe areas. While the on-screen keyboard
	   is up, the visual viewport above it, without the bottom safe area,
	   which the keyboard covers (set inline). */
	.hp-dialog[data-form='fullscreen'] {
		inset: 0;
		padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
			env(safe-area-inset-left);
	}

	/* Title row: the caps title, then the close button at the end. A long
	   title wraps (200 percent zoom) and the button stays on its first line:
	   the title's padding centres that line on the button, so a single line
	   sits where the row centred it before. The title's clip stays: it keeps
	   the first glyph's antialiasing inside the text edge, as before. */
	.hp-dialog-head {
		flex: none;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: var(--space-2);
	}
	.hp-dialog-head[data-form='centred'] {
		padding: var(--space-4) var(--space-4) 0 var(--space-6);
	}
	/* The shell header's height, so the form reads as its own view. */
	.hp-dialog-head[data-form='fullscreen'] {
		min-height: var(--header-height);
		padding: 0 var(--space-1) 0 var(--gutter);
	}
	.hp-dialog-title {
		overflow: hidden;
		padding-block: calc((var(--control-height) - 1lh) / 2);
		overflow-wrap: anywhere;
	}
	.hp-dialog-head[data-form='fullscreen'] .hp-dialog-title {
		padding-block: calc((var(--header-height) - 1lh) / 2);
	}
	.hp-dialog-head[data-form='fullscreen'] .hp-dialog-close {
		margin-block: calc((var(--header-height) - var(--control-height)) / 2);
	}

	.hp-dialog-close {
		display: grid;
		place-items: center;
		/* 36px on fine pointers, 44px on coarse. */
		width: var(--control-height);
		height: var(--control-height);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.hp-dialog-close svg {
		width: var(--space-4);
		height: var(--space-4);
	}
	.hp-dialog-close:active {
		background: var(--surface-raised);
	}
	@media (hover: hover) and (pointer: fine) {
		.hp-dialog-close {
			transition: background-color var(--dur-hover) var(--settle);
		}
		.hp-dialog-close:hover {
			background: var(--surface-hover);
		}
		.hp-dialog-close:active {
			background: var(--surface-raised);
			transition-duration: var(--dur-press);
		}
	}

	/* ---- Body and actions, in every form -------------------------------- */

	/* The top padding keeps a first field's focus contour (4px out, 2px
	   wide) inside the scrolling box. The scroll padding keeps a focused
	   field's caret 8px clear of the action row when the browser reveals it,
	   as when a TextArea grows while someone types. */
	.hp-dialog-body {
		display: grid;
		align-content: start;
		gap: var(--space-4);
		min-width: 0;
		padding: var(--space-2) var(--gutter);
		scroll-padding-block: var(--space-2);
		font-size: var(--type-body);
		line-height: 24px;
	}
	/* The sheet's body scrolls itself; these scroll inside the panel. */
	.hp-dialog-body[data-form='centred'],
	.hp-dialog-body[data-form='fullscreen'] {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.hp-dialog-body[data-form='centred'] {
		padding-inline: var(--space-6);
	}
	/* Without an action row the body ends the panel. */
	.hp-dialog-body[data-end] {
		padding-bottom: var(--space-4);
	}
	.hp-dialog-body[data-form='centred'][data-end] {
		padding-bottom: var(--space-6);
	}
	.hp-dialog-description {
		color: var(--muted);
	}

	/* Actions sit at the end, primary last, 8px apart. */
	.hp-dialog-actions {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
		padding: var(--space-4) var(--gutter);
	}
	.hp-dialog-actions[data-form='centred'] {
		padding: var(--space-6);
	}
</style>
