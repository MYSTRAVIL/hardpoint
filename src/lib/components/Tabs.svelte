<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { Tabs as BitsTabs } from 'bits-ui';

	export type TabsItem = {
		/** Identifies the tab; the bound `value` holds the selected one. */
		value: string;
		/** The caps label. A short fixed string the app defines, never user data. */
		label: string;
		/** Shown in `--muted`; it cannot be selected and arrow keys skip it. */
		disabled?: boolean;
	};

	/** Tabs may carry extra fields (a count, an icon name) that the `panel` snippet reads. */
	export type TabsProps<T extends TabsItem = TabsItem> = Omit<
		BitsTabs.RootProps,
		'value' | 'orientation' | 'child' | 'children'
	> & {
		tabs: T[];
		/** The selected tab's `value`. Bindable; defaults to the first tab that is not disabled. */
		value?: string;
		/** The tab list's accessible name, for example "Project sections". */
		label: string;
		/** Renders one tab's panel. Every panel stays mounted; the hidden ones carry `hidden`. */
		panel: Snippet<[T]>;
	};
</script>

<script lang="ts" generics="T extends TabsItem = TabsItem">
	import { untrack } from 'svelte';
	import { fadeIn } from './internal/fade-in.js';

	let {
		tabs,
		value = $bindable(tabs.find((tab) => !tab.disabled)?.value ?? ''),
		label,
		panel,
		class: className,
		ref = $bindable(null),
		onValueChange,
		...rest
	}: TabsProps<T> = $props();

	let list: HTMLElement | null = $state(null);

	// Shows the selected tab whole inside the list, with part of the next one
	// (the list's scroll-padding). It scrolls the list alone, never the page
	// (scrollIntoView would), and jumps: selection snaps (motion rule 3).
	function reveal(list: HTMLElement, selected: string) {
		const tab = Array.from(list.children).find(
			(el): el is HTMLElement => el instanceof HTMLElement && el.dataset.value === selected
		);
		if (!tab) return;
		const style = getComputedStyle(list);
		// The tab's edges in the list's scroll coordinates, from rects: offsetLeft
		// and offsetWidth round to whole pixels. The target rounds outward, so
		// the padding never comes up a fraction short.
		const listLeft = list.getBoundingClientRect().left + list.clientLeft;
		const rect = tab.getBoundingClientRect();
		const left = rect.left - listLeft + list.scrollLeft;
		const start = Math.floor(left - (parseFloat(style.scrollPaddingLeft) || 0));
		const end = Math.ceil(left + rect.width + (parseFloat(style.scrollPaddingRight) || 0));
		if (start < list.scrollLeft) {
			list.scrollTo({ left: start, behavior: 'instant' });
		} else if (end > list.scrollLeft + list.clientWidth) {
			list.scrollTo({ left: end - list.clientWidth, behavior: 'instant' });
		}
	}

	// On the first render and whenever the selection changes.
	$effect(() => {
		if (list) reveal(list, value);
	});

	// Again whenever the list or a tab changes size: the web font arrives, the
	// screen turns, or a hidden parent (another tab panel) shows the list. The
	// watcher restarts whenever the set of tabs changes, not only their number,
	// so a tab an app swaps in for another is watched too (each tab element is
	// keyed by its value).
	$effect(() => {
		const el = list;
		const values = tabs.map((tab) => tab.value);
		if (!el || values.length === 0) return;
		const observer = new ResizeObserver(() => reveal(el, value));
		observer.observe(el);
		for (const tab of el.children) observer.observe(tab);
		return () => observer.disconnect();
	});

	// ---- Short motion: the panel (BRIEF, --dur-panel) ----------------------

	// A panel chosen by a pointer or a touch fades in from 0 over
	// --dur-panel. A panel chosen by a key (arrows, Home, End, Enter, Space)
	// or by the app through `value` cuts, so holding an arrow key through the
	// tabs never starts a fade (the frequency check). The input: the tab list
	// keeps the last one it saw, from pointerdown and keydown in the capture
	// phase, before Bits UI acts on them. Bits UI calls onValueChange only for
	// a selection the user makes, never for a `value` the app sets, so the
	// change notes there whether a pointer made it, and the effect below
	// fades the new panel once it shows. A new selection cancels a fade that
	// still runs. 0ms is a cut, as before the token.
	let input: 'pointer' | 'key' | null = null;
	let fadeTo: string | null = null;
	let fade: Animation | null = null;

	function changed(next: string) {
		fadeTo = input === 'pointer' ? next : null;
		onValueChange?.(next);
	}

	$effect(() => {
		const selected = value;
		untrack(() => {
			fade?.cancel();
			fade = null;
			const chosen = fadeTo === selected;
			fadeTo = null;
			if (!chosen || !ref) return;
			const shown = Array.from(ref.children).find(
				(el): el is HTMLElement =>
					el instanceof HTMLElement && el.classList.contains('hp-tabs-panel') && el.dataset.value === selected
			);
			if (shown) fade = fadeIn(shown, '--dur-panel');
		});
	});
</script>

<!--
	Bits UI Tabs, rendered through `child` snippets so every element is this
	component's markup and its styles stay scoped. Extra attributes, `class`
	and Bits UI root props (`activationMode`, `loop`, `disabled`,
	`onValueChange`) go to the root `div.hp-tabs`. Parts: `.hp-tabs-list`
	(role tablist), `.hp-tabs-tab` (role tab, with Bits UI's `data-state` and
	`data-value`), `.hp-tabs-panel` (role tabpanel).
-->
<BitsTabs.Root bind:value bind:ref onValueChange={changed} {...rest}>
	{#snippet child({ props })}
		<div {...props} class={['hp-tabs', className]}>
			<BitsTabs.List bind:ref={list} aria-label={label}>
				{#snippet child({ props })}
					<div
						{...props}
						class="hp-tabs-list"
						onpointerdowncapture={() => (input = 'pointer')}
						onkeydowncapture={() => (input = 'key')}
					>
						{#each tabs as tab (tab.value)}
							<BitsTabs.Trigger value={tab.value} disabled={tab.disabled}>
								{#snippet child({ props })}
									<button {...props} class="hp-tabs-tab hp-label hp-focus-inset">{tab.label}</button>
								{/snippet}
							</BitsTabs.Trigger>
						{/each}
					</div>
				{/snippet}
			</BitsTabs.List>
			{#each tabs as tab (tab.value)}
				<BitsTabs.Content value={tab.value}>
					{#snippet child({ props })}
						<div {...props} class="hp-tabs-panel">{@render panel(tab)}</div>
					{/snippet}
				</BitsTabs.Content>
			{/each}
		</div>
	{/snippet}
</BitsTabs.Root>

<style>
	/* In a flex or grid parent the tabs never grow wider than their column:
	   the list scrolls instead of widening the page. */
	.hp-tabs {
		min-width: 0;
	}

	/* One row that scrolls sideways when the tabs do not fit. It reaches
	   --bleed past the text edge, as the table band does, and each tab pads
	   by --bleed, so the first label keeps the page's text edge. */
	.hp-tabs-list {
		display: flex;
		margin-inline: calc(-1 * var(--bleed));
		overflow-x: auto;
		overscroll-behavior-x: contain;
		/* Scrolling a tab into view leaves part of the next one showing. */
		scroll-padding-inline: var(--space-8);
		/* A thin bar on fine pointers, where a wheel cannot scroll sideways
		   without one; touch swipes. */
		scrollbar-width: thin;
	}
	@media (pointer: coarse) {
		.hp-tabs-list {
			scrollbar-width: none;
		}
	}

	/* The visible box is the hit area: --control-height high (44px on
	   coarse pointers) and never narrower than --hit-target. */
	.hp-tabs-tab {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-width: var(--hit-target);
		min-height: var(--control-height);
		padding: 0 var(--bleed);
		border: 0;
		background: transparent;
		color: var(--text);
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Selected: a 3px titanium edge on the side facing the panel and the
	   selected tint, text unchanged. Selection snaps, so nothing on a tab
	   transitions: a fading hover tint would also animate the tab an arrow
	   key just left while the pointer rests on it. */
	.hp-tabs-tab[data-state='active'] {
		background: var(--surface-selected);
		box-shadow: inset 0 -3px 0 var(--accent);
	}

	/* Hover: fine pointers only, never on the selected tab. */
	@media (hover: hover) and (pointer: fine) {
		.hp-tabs-tab[data-state='inactive']:hover:not(:disabled) {
			background: var(--surface-hover);
		}
	}

	/* Press: one step past hover, so it reads on a phone too. */
	.hp-tabs-tab[data-state='inactive']:active:not(:disabled) {
		background: var(--surface-raised);
	}

	.hp-tabs-tab:disabled {
		color: var(--muted);
		cursor: not-allowed;
	}

	/* A panel a pointer chose fades in over --dur-panel (see the script);
	   otherwise it cuts. Margin, not padding, keeps the panel's focus
	   contour clear of the tabs. */
	.hp-tabs-panel {
		margin-top: var(--space-6);
	}
</style>
