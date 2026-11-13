<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * `standard` (default): the title at the section-title size. `display`:
	 * the title in Geist Pixel Square, as the screen's one display line.
	 */
	export type EmptyStateVariant = 'standard' | 'display';

	/** The title's element: `p` by default, a heading where the state names a region of the page. */
	export type EmptyStateTitleElement = 'p' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
		/** What is empty, as a short fixed line: `No projects yet`. Never transformed. */
		title: string;
		/** Why it is empty or what fills it, in the muted ink. */
		description?: string;
		/** The one clear next action: render a `Button` here. */
		actions?: Snippet;
		titleAs?: EmptyStateTitleElement;
		variant?: EmptyStateVariant;
	};
</script>

<script lang="ts">
	let {
		title,
		description,
		actions,
		titleAs = 'p',
		variant = 'standard',
		class: className,
		...rest
	}: EmptyStateProps = $props();
</script>

<!--
	A data view with nothing to show (BRIEF, Apps and phones: States): a title,
	an optional description and one clear next action, aligned to the text
	edge with no box around them. It sets no outer margin; the page or the
	Table's `empty` snippet places it. Extra attributes and `class` go to the
	root `div.hp-empty-state`.
-->
<div {...rest} class={['hp-empty-state', className]} data-variant={variant}>
	<svelte:element
		this={titleAs}
		class={['hp-empty-state-title', variant === 'display' ? 'hp-pixel' : 'hp-section-title']}
		>{title}</svelte:element
	>
	{#if description}
		<p class="hp-empty-state-description">{description}</p>
	{/if}
	{#if actions}
		<div class="hp-empty-state-actions">{@render actions()}</div>
	{/if}
</div>

<style>
	.hp-empty-state {
		display: grid;
		justify-items: start;
		min-width: 0;
	}

	.hp-empty-state-title {
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	/* Reading text: 16px at every width, in the reading measure. */
	.hp-empty-state-description {
		max-width: var(--measure);
		margin-top: var(--space-2);
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	/* The actions are their own group: three times the gap inside the text. */
	.hp-empty-state-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-6);
	}
</style>
