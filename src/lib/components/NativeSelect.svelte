<script lang="ts" module>
	import type { HTMLSelectAttributes } from 'svelte/elements';

	export type NativeSelectOption<V = string> = {
		value: V;
		label: string;
		/**
		 * The `<optgroup>` the option sits in. Options with the same group share
		 * one, in the order each group first appears; options without one come
		 * first.
		 */
		group?: string;
		disabled?: boolean;
	};

	/** From which width the label sits beside the well: 600px, 900px or 1200px. */
	export type NativeSelectBreakpoint = 'medium' | 'expanded' | 'large';
</script>

<script lang="ts" generics="V = string">
	import type { Snippet } from 'svelte';
	import { groupOptions } from './internal/groups.js';

	const uid = $props.id();

	let {
		label,
		value = $bindable(),
		options,
		labelBeside = false,
		id = uid,
		class: className,
		children,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'multiple' | 'children'> & {
		/** The caps field label. */
		label: string;
		/** The chosen option's value. Bindable. */
		value?: V;
		/** The choices. Without it, pass `<option>` elements as children. */
		options?: NativeSelectOption<V>[];
		/**
		 * The label sits above the well by default. `true` puts it beside the
		 * well at every width; a breakpoint puts it beside from that width up.
		 */
		labelBeside?: boolean | NativeSelectBreakpoint;
		children?: Snippet;
	} = $props();

	const grouped = $derived(options && groupOptions(options));
</script>

<!--
	A single choice from a short fixed list. A native <select>, so phones keep
	their own picker (BRIEF, Apps and phones). Extra attributes, handlers and
	`class` go to the <select>.
-->
<div
	class="hp-native-select"
	data-label-beside={labelBeside === true ? 'always' : labelBeside || undefined}
>
	<label class="hp-label" for={id}>{label}</label>
	<span class="hp-well-chevron">
		<select {...rest} {id} class={['hp-well', className]} bind:value>
			{#if grouped}
				{#each grouped.loose as option (option.value)}
					<option value={option.value} disabled={option.disabled}>{option.label}</option>
				{/each}
				{#each grouped.groups as group (group.name)}
					<optgroup label={group.name}>
						{#each group.items as option (option.value)}
							<option value={option.value} disabled={option.disabled}>{option.label}</option>
						{/each}
					</optgroup>
				{/each}
			{:else}
				{@render children?.()}
			{/if}
		</select>
	</span>
</div>

<style>
	.hp-native-select {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}
	label {
		color: var(--muted);
	}
	/* The well fills its column, never narrower than a short choice and the
	   chevron. The wrapper is the grid or flex item, so it holds the minimum;
	   a select's own minimum would be its longest option. */
	.hp-well-chevron {
		width: 100%;
		min-width: 136px;
	}
	select {
		display: block;
		width: 100%;
	}

	/* Beside the well, the label keeps its one line and the well gives way. */
	[data-label-beside] label {
		flex: none;
	}

	[data-label-beside='always'] {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	@media (min-width: 600px) {
		[data-label-beside='medium'] {
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
	}
	@media (min-width: 900px) {
		[data-label-beside='expanded'] {
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
	}
	@media (min-width: 1200px) {
		[data-label-beside='large'] {
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
	}
</style>
