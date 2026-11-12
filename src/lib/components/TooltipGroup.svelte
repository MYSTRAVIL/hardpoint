<script lang="ts" module>
	import { createContext, type Snippet } from 'svelte';

	/**
	 * Wraps a row of controls whose tooltips belong together, such as a
	 * toolbar. The group renders no element of its own: it sets up one Bits UI
	 * `Tooltip.Provider` that every `Tooltip` inside it shares, so once one
	 * tooltip in the row has opened, the next opens at once while the pointer
	 * moves along the row. Lay out the controls with your own markup inside it.
	 */
	export type TooltipGroupProps = {
		/** The controls and their tooltips. */
		children: Snippet;
		/**
		 * Milliseconds a pointer rests on a control before the first tooltip
		 * opens (default 700, Bits UI's, as for a Tooltip outside a group). A
		 * Tooltip's own `delayDuration` wins over it.
		 */
		delayDuration?: number;
		/**
		 * Milliseconds after a tooltip in the group closes during which the next
		 * one opens without the delay (default 300, Bits UI's). 0 makes every
		 * tooltip wait the full delay.
		 */
		skipDelayDuration?: number;
	};

	const [, setGroup, hasGroup] = createContext<true>();

	/** A Tooltip inside a group uses the group's provider instead of its own. */
	export function inTooltipGroup(): boolean {
		return hasGroup();
	}
</script>

<script lang="ts">
	import { Tooltip } from 'bits-ui';

	let { children, delayDuration, skipDelayDuration }: TooltipGroupProps = $props();

	setGroup(true);
</script>

<Tooltip.Provider {delayDuration} {skipDelayDuration}>
	{@render children()}
</Tooltip.Provider>
