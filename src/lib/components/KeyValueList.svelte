<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	export type KeyValueItem = {
		/** The caps label in the first column. A fixed string the app defines. */
		key: string;
		/** The value in Geist Mono. */
		value: string | number;
	};

	/** Items may carry extra fields (an `href`, a status) that the `value` snippet reads. */
	export type KeyValueListProps<T extends KeyValueItem = KeyValueItem> = Omit<
		HTMLAttributes<HTMLDListElement>,
		'children'
	> & {
		items: T[];
		/**
		 * The label column's width from 600px up: any CSS width. Defaults to
		 * `9rem`. Below 600px the label stacks over the value.
		 */
		keyWidth?: string;
		/** Renders one value, for a link or a status. Default: the text. */
		value?: Snippet<[T]>;
	};
</script>

<script lang="ts" generics="T extends KeyValueItem = KeyValueItem">
	import { onMount, untrack } from 'svelte';
	import { useMotion } from '../motion/index.js';

	let { items, keyWidth, value, class: className, ...rest }: KeyValueListProps<T> = $props();

	// Expressive stagger (motion rule 7), as in Table: only the items of the
	// first render enter, by their index. Any change to `items` (a new array
	// or a changed length) ends the entrance, and so does its last animation.
	const motion = useMotion();
	const firstItems = untrack(() => items);
	const firstCount = untrack(() => items.length);
	let entering = $state.raw(motion.expressive);
	let root: HTMLDListElement;

	$effect.pre(() => {
		if (items !== firstItems || items.length !== firstCount) entering = false;
	});

	onMount(() => {
		if (!entering) return;
		const running = root
			.getAnimations({ subtree: true })
			.filter((a) => a instanceof CSSAnimation && a.animationName === 'hp-enter');
		Promise.allSettled(running.map((a) => a.finished)).then(() => {
			entering = false;
		});
	});
</script>

<!--
	A caps label column and a Geist Mono value column, without separators
	(BRIEF, visual rule 6; da3-53). Compact widths stack each label over its
	value. Extra attributes and `class` go to the <dl>.
-->
<dl
	{...rest}
	bind:this={root}
	class={['hp-key-value-list', className]}
	style:--key-value-list-key-width={keyWidth}
>
	{#each items as item, i}
		<div class={[entering && 'hp-enter']} style:--i={entering ? i : undefined}>
			<dt class="hp-label">{item.key}</dt>
			<dd>{#if value}{@render value(item)}{:else}{item.value}{/if}</dd>
		</div>
	{/each}
</dl>

<style>
	.hp-key-value-list {
		display: grid;
		gap: var(--space-3);
	}
	div {
		display: grid;
		/* matches the approved specimen */
		gap: 2px;
	}
	dt {
		color: var(--muted);
	}
	/* 16px on touch, the dense 14px on fine pointers. A long identifier or
	   path breaks anywhere rather than widen the page. */
	dd {
		font-family: var(--mono);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
	}
	@media (pointer: fine) {
		dd {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}
	@media (min-width: 600px) {
		.hp-key-value-list {
			gap: var(--space-2);
		}
		div {
			grid-template-columns: var(--key-value-list-key-width, 9rem) minmax(0, 1fr);
			align-items: baseline;
			gap: var(--space-4);
		}
	}
</style>
