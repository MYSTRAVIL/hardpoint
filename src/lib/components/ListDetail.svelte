<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** From which width the panes sit side by side: 600px, 900px or 1200px. */
	export type ListDetailBreakpoint = 'medium' | 'expanded' | 'large';

	/** What the `list` and `detail` snippets receive. */
	export type ListDetailSnippetProps = {
		/**
		 * True below `splitFrom`, where one pane shows at a time. Show the
		 * detail's back control only then.
		 */
		stacked: boolean;
	};

	export type ListDetailProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The list pane's content: the items, and any filter over them. */
		list: Snippet<[ListDetailSnippetProps]>;
		/**
		 * The detail pane's content: the open item. Side by side with nothing
		 * open, render an empty state here.
		 */
		detail: Snippet<[ListDetailSnippetProps]>;
		/**
		 * Which pane shows while stacked: the detail when true, the list when
		 * false (default). Side by side both show and this changes nothing.
		 * Bindable.
		 */
		showDetail?: boolean;
		/**
		 * From which width the panes sit side by side; narrower, one shows at
		 * a time. Default `expanded` (900px).
		 */
		splitFrom?: ListDetailBreakpoint;
		/** The root element. */
		ref?: HTMLDivElement | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	let {
		list,
		detail,
		showDetail = $bindable(false),
		splitFrom = 'expanded',
		ref = $bindable(null),
		class: className,
		...rest
	}: ListDetailProps = $props();

	// The CSS below lays the panes out from the same widths before any script
	// runs; this query only tells the snippets and the focus rules.
	const widths: Record<ListDetailBreakpoint, number> = { medium: 600, expanded: 900, large: 1200 };
	const split = $derived(new MediaQuery(`min-width: ${widths[splitFrom]}px`, true));
	const stacked = $derived(!split.current);
	/** The one pane on screen while stacked; null side by side. */
	const alone = $derived(stacked ? (showDetail ? 'detail' : 'list') : null);

	let listPane = $state<HTMLDivElement | null>(null);
	let detailPane = $state<HTMLDivElement | null>(null);

	// ---- The list keeps its place ------------------------------------------

	// A pane that is not shown is display: none, which drops its scroll box.
	// Some browsers then reset its offset, so the list remembers the offset it
	// had while it showed and puts it back when it shows again.
	let listTop = 0;
	function onListScroll() {
		if (listPane && listPane.getClientRects().length > 0) listTop = listPane.scrollTop;
	}
	$effect(() => {
		const showsList = alone !== 'detail';
		untrack(() => {
			if (showsList && listPane && listPane.scrollTop !== listTop) listPane.scrollTop = listTop;
		});
	});

	// ---- Focus follows the pane that shows ---------------------------------

	// When the stacked view switches panes, the app's own update runs first:
	// the check waits a task, past the app's effects and an `await tick()`,
	// so an app that focuses a title, an input or the item that was open
	// keeps that focus. Only if focus is then outside the pane on screen
	// does the pane itself take it. When the window narrows to one pane,
	// focus moves only if the pane that hid held it. Side by side the app
	// owns focus. A new switch before the check cancels it.
	let before: 'list' | 'detail' | null | undefined;
	$effect(() => {
		const now = alone;
		return untrack(() => {
			const was = before;
			before = now;
			if (was === undefined || now === null || was === now) return;
			const shown = now === 'list' ? listPane : detailPane;
			const hidden = now === 'list' ? detailPane : listPane;
			const timer = setTimeout(() => {
				if (!shown) return;
				const active = document.activeElement;
				if (active && shown.contains(active)) return;
				const lost = !active || active === document.body || !!hidden?.contains(active);
				if (was === null && !lost) return;
				shown.focus({ preventScroll: true });
			});
			return () => clearTimeout(timer);
		});
	});
</script>

<!--
	The list-detail layout: a list of items beside the open item. From
	`splitFrom` (900px by default) the list is a column of
	`--list-detail-width` at the left and the detail fills the rest; below
	it the two are separate screens and `showDetail` picks the one that
	shows. The other pane stays mounted, out of the layout, the
	accessibility tree and the tab order, so its state and the list's scroll
	position survive. Switching cuts, as page changes do (motion rule 1).

	The root fills the height its container gives it, or
	`--list-detail-height`; each pane scrolls inside itself. The panes pad
	their content by `--gutter`, and the root keeps the side safe areas, so
	the layout is built to reach the window's edges under the app's header.
	No frame and no divider: the gutters between the panes group them.

	Extra attributes and `class` go to the root, `div.hp-list-detail`, which
	carries `data-split-from`, `data-stacked` (below `splitFrom`) and
	`data-show-detail`. The panes are `div.hp-list-detail-list` and
	`div.hp-list-detail-detail`, each with `tabindex="-1"`.
-->
<div
	{...rest}
	bind:this={ref}
	class={['hp-list-detail', className]}
	data-split-from={splitFrom}
	data-stacked={stacked || undefined}
	data-show-detail={showDetail || undefined}
>
	<div bind:this={listPane} class="pane hp-list-detail-list" tabindex="-1" onscroll={onListScroll}>
		{@render list({ stacked })}
	</div>
	<div bind:this={detailPane} class="pane hp-list-detail-detail" tabindex="-1">
		{@render detail({ stacked })}
	</div>
</div>

<style>
	/* A row of two panes. The side safe areas sit outside them, so a tint
	   that reaches into a gutter stops short of a notch. min-height: 0 lets
	   the root shrink as a flex or grid item. */
	.hp-list-detail {
		display: flex;
		box-sizing: border-box;
		height: var(--list-detail-height, 100%);
		min-height: 0;
		padding: 0 env(safe-area-inset-right) 0 env(safe-area-inset-left);
	}

	/* Each pane is a scroller of its own. The page edges come from
	   --gutter, as everywhere; the bottom safe area keeps the last item
	   clear of the home indicator. A stable scrollbar gutter keeps the
	   content still when filtering or a new item changes whether a pane
	   overflows. */
	.pane {
		flex: 1 1 0;
		min-width: 0;
		box-sizing: border-box;
		padding: var(--space-4) var(--gutter) calc(var(--space-4) + env(safe-area-inset-bottom));
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
	}
	/* Focus lands on a pane only from the switch above, as <main> takes it
	   from a skip link: no contour, since the pane is not a control. */
	.pane:focus {
		outline: none;
	}

	/* ---- Stacked: one pane at a time --------------------------------- */

	.hp-list-detail[data-show-detail] > .hp-list-detail-list,
	.hp-list-detail:not([data-show-detail]) > .hp-list-detail-detail {
		display: none;
	}

	/* ---- Side by side: from splitFrom -------------------------------- */

	/* Later and as specific as the rules above, so both panes show. */
	@media (min-width: 600px) {
		.hp-list-detail[data-split-from='medium'] > .pane {
			display: block;
		}
		.hp-list-detail[data-split-from='medium'] > .hp-list-detail-list {
			flex: none;
			width: var(--list-detail-width);
		}
	}
	@media (min-width: 900px) {
		.hp-list-detail[data-split-from='expanded'] > .pane {
			display: block;
		}
		.hp-list-detail[data-split-from='expanded'] > .hp-list-detail-list {
			flex: none;
			width: var(--list-detail-width);
		}
	}
	@media (min-width: 1200px) {
		.hp-list-detail[data-split-from='large'] > .pane {
			display: block;
		}
		.hp-list-detail[data-split-from='large'] > .hp-list-detail-list {
			flex: none;
			width: var(--list-detail-width);
		}
	}
</style>
