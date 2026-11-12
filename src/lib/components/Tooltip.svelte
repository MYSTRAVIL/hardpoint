<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Tooltip as BitsTooltip } from 'bits-ui';

	export type TooltipTriggerSnippetProps = {
		/**
		 * Spread onto the control the tooltip belongs to. Its own handlers may
		 * come before or after. A control with its own description writes
		 * `aria-describedby={[props['aria-describedby'], ownId].filter(Boolean).join(' ')}`
		 * after the spread, so it keeps both.
		 */
		props: Record<string, unknown>;
	};

	/**
	 * Attributes and handlers not listed here go to the tooltip element (Bits
	 * UI `Tooltip.Content`), among them `side` (default `top`), `align`
	 * (default `center`), `sideOffset` (default 8) and `onEscapeKeydown`.
	 */
	export type TooltipProps = Omit<BitsTooltip.ContentProps, 'child' | 'children' | 'forceMount' | 'ref'> & {
		open?: boolean;
		/**
		 * The tooltip, as written. It never opens on touch, so it is never the
		 * only path to its text: the control shows the same text, or carries it
		 * in `aria-label`.
		 */
		text: string;
		/** The control the tooltip belongs to: spread `props` onto it. */
		trigger: Snippet<[TooltipTriggerSnippetProps]>;
		/**
		 * Milliseconds a pointer rests on the trigger before the tooltip opens
		 * (default 700, Bits UI's, or the TooltipGroup's). Keyboard focus opens
		 * it at once.
		 */
		delayDuration?: number;
		/** The tooltip element. */
		ref?: HTMLElement | null;
	};

	// Bits UI keeps one tooltip open at a time per provider, and each Tooltip
	// outside a TooltipGroup has its own provider, so the rule spans them here:
	// the close function of the open tooltip, if any.
	let closeOpen: (() => void) | null = null;
</script>

<script lang="ts">
	import { createAttachmentKey } from 'svelte/attachments';
	import { pop } from '../motion/index.js';
	import { inTooltipGroup } from './TooltipGroup.svelte';

	let {
		open = $bindable(false),
		text,
		trigger,
		delayDuration,
		ref = $bindable(null),
		class: className,
		...rest
	}: TooltipProps = $props();

	const listen = createAttachmentKey();
	const capture = createAttachmentKey();

	// Inside a TooltipGroup the group's provider is shared, so the next
	// tooltip in the row skips the delay; outside one, the tooltip has its own.
	const grouped = inTooltipGroup();

	// Opening this tooltip closes any other one, for example one a resting
	// pointer opened when keyboard focus opens this.
	const close = () => {
		open = false;
	};
	$effect(() => {
		if (!open) return;
		if (closeOpen !== close) closeOpen?.();
		closeOpen = close;
		return () => {
			if (closeOpen === close) closeOpen = null;
		};
	});

	// The control, kept to compare its name with the text.
	let control = $state<Element | null>(null);
	const captureControl = (node: Element) => {
		control = node;
	};

	// The usual tooltip repeats the control's name: an icon button's
	// aria-label, or the whole of a shortened name. Describing the control by
	// the same text would make screen readers read it twice.
	function repeatsName(node: Element | null): boolean {
		if (!node) return false;
		const name = node.getAttribute('aria-label') ?? node.textContent ?? '';
		return name.trim() === text.trim();
	}

	// A tooltip's control has its own action, so the app passes its own
	// onclick beside the spread. Bits UI's handlers move into an attachment,
	// so the spread order cannot drop either set: the control's onclick still
	// runs, and the tooltip still closes on a press and opens on hover and
	// focus. Bits UI's `disabled: false` and `tabindex: 0` are left out, so
	// they never undo a disabled control (a disabled link Button keeps
	// tabindex -1); the control is focusable on its own.
	function triggerProps(props: Record<string, unknown>): Record<string, unknown> {
		const { disabled: _disabled, tabindex: _tabindex, 'aria-describedby': describedBy, ...attrs } = props;
		const listeners: [string, EventListener][] = [];
		for (const [key, value] of Object.entries(attrs)) {
			if (key.startsWith('on') && typeof value === 'function') {
				listeners.push([key.slice(2), value as EventListener]);
				delete attrs[key];
			}
		}
		if (describedBy && !repeatsName(control)) attrs['aria-describedby'] = describedBy;
		return {
			...attrs,
			[capture]: captureControl,
			[listen]: (node: Element) => {
				for (const [type, fn] of listeners) node.addEventListener(type, fn);
				return () => {
					for (const [type, fn] of listeners) node.removeEventListener(type, fn);
				};
			}
		};
	}
</script>

<!--
	Each tooltip outside a TooltipGroup has its own Bits UI provider, so an app
	needs no shared wrapper. A resting mouse pointer opens it after the delay;
	keyboard focus opens it at once, but only focus that shows the focus
	contour, so focus returned to the trigger after a mouse press opens
	nothing. Touch never opens it: a tap runs the control's own action.
	Escape, moving the pointer away, blur and a press on the trigger close it.
	While open, Bits UI points the trigger's aria-describedby at the tooltip,
	unless the text repeats the control's name. The root carries the delay
	and the focus rule, so they hold inside a group too.
-->
{#snippet tooltip()}
	<BitsTooltip.Root bind:open {delayDuration} ignoreNonKeyboardFocus>
		<BitsTooltip.Trigger>
			{#snippet child({ props })}
				{@render trigger({ props: triggerProps(props) })}
			{/snippet}
		</BitsTooltip.Trigger>

		<BitsTooltip.Portal>
			<BitsTooltip.Content forceMount bind:ref side="top" align="center" sideOffset={8} collisionPadding={8} {...rest}>
				{#snippet child({ wrapperProps, props, open: shown })}
					{#if shown}
						<div {...wrapperProps}>
							<div {...props} role="tooltip" class={['hp-tooltip', className]} transition:pop>{text}</div>
						</div>
					{/if}
				{/snippet}
			</BitsTooltip.Content>
		</BitsTooltip.Portal>
	</BitsTooltip.Root>
{/snippet}

{#if grouped}
	{@render tooltip()}
{:else}
	<BitsTooltip.Provider>
		{@render tooltip()}
	</BitsTooltip.Provider>
{/if}

<style>
	/* On the tooltip layer (tokens.css), over popovers, menus and dialogs.
	   Bits UI copies the z-index to the positioned wrapper. A black box with
	   the control boundary, like the popover, as wide as its text up to
	   --tooltip-width, 280px unless set (an app sets it with a class on the
	   Tooltip and a rule in its stylesheet; the default is the var()
	   fallback, so any rule wins whatever its specificity) and never wider
	   than the space beside the trigger. */
	.hp-tooltip {
		position: relative;
		z-index: var(--layer-tooltip);
		box-sizing: border-box;
		width: max-content;
		max-width: min(var(--tooltip-width, 280px), var(--bits-tooltip-content-available-width));
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-control);
		background: var(--canvas);
		color: var(--text);
		font-family: var(--sans);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: break-word;
	}

	/* 16px where a coarse pointer reads it (keyboard focus on a tablet), the
	   dense 14px on fine pointers. */
	@media (pointer: fine) {
		.hp-tooltip {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
</style>
