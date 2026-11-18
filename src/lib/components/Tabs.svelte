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
	import { revealTab, watchTabStrip } from './internal/tab-strip.js';

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

	// The selected tab, shown whole inside the list on the first render and
	// whenever the selection changes (the helper is shared with TabNav).
	const selectedTab = (list: HTMLElement, selected: string) =>
		Array.from(list.children).find(
			(el): el is HTMLElement => el instanceof HTMLElement && el.dataset.value === selected
		);

	$effect(() => {
		if (list) revealTab(list, selectedTab(list, value));
	});

	// Again whenever the list or a tab changes size. The watcher restarts
	// whenever the set of tabs changes, not only their number (each tab
	// element is keyed by its value).
	$effect(() => {
		const el = list;
		const values = tabs.map((tab) => tab.value);
		if (!el || values.length === 0) return;
		return watchTabStrip(el, () => revealTab(el, selectedTab(el, value)));
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
						class="hp-tabs-list hp-tab-strip"
						onpointerdowncapture={() => (input = 'pointer')}
						onkeydowncapture={() => (input = 'key')}
					>
						{#each tabs as tab (tab.value)}
							<BitsTabs.Trigger value={tab.value} disabled={tab.disabled}>
								{#snippet child({ props })}
									<button {...props} class="hp-tabs-tab hp-tab hp-label hp-focus-inset">{tab.label}</button>
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
	/* The tab list and the tabs take their look from base.css (.hp-tab-strip
	   and .hp-tab), which TabNav shares. */

	/* In a flex or grid parent the tabs never grow wider than their column:
	   the list scrolls instead of widening the page. */
	.hp-tabs {
		min-width: 0;
	}

	/* A panel a pointer chose fades in over --dur-panel (see the script);
	   otherwise it cuts. Margin, not padding, keeps the panel's focus
	   contour clear of the tabs. */
	.hp-tabs-panel {
		margin-top: var(--space-6);
	}
</style>
