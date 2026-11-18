<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** The title's heading level: `h2` by default, as on Disclosure. */
	export type SectionTitleElement = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	export type SectionProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
		/** The title, as written, never caps. It names the section for assistive technology. */
		title: string;
		/** The title's heading level. Pick the level the page's outline needs. Defaults to `h2`. */
		titleAs?: SectionTitleElement;
		/** Supporting text after the title, in `--muted`: a count, a date, a range. A string or a snippet. */
		meta?: string | Snippet;
		/**
		 * The app's `Button`s and links at the end of the head row. They wrap
		 * under the title when the row is too narrow.
		 */
		actions?: Snippet;
		/** A line under the body, in `--muted`: a count, a page control, a note. */
		foot?: Snippet;
		/** The body. It has no padding of its own, so a Table inside runs its band into the gutter. */
		children?: Snippet;
		/** The root `section`. */
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	let {
		title,
		titleAs = 'h2',
		meta,
		actions,
		foot,
		children,
		ref = $bindable(null),
		class: className,
		...rest
	}: SectionProps = $props();

	const uid = $props.id();

	// A named section with a presentational role stays a region in Chromium
	// (ARIA's conflict rule keeps the role a name implies), so the name goes
	// with the opt-out.
	const landmark = $derived(rest.role !== 'none' && rest.role !== 'presentation');
</script>

<!--
	A block of a page: a head row, a body and an optional foot, with no frame,
	no fill and no rule. It groups by space: sections sit 48px apart, four
	times the 12px inside one (style rule 9: at least twice).

	The head is the title (a heading in the section-title role), then the meta
	in --muted, then the actions at the end. When the row is too narrow the
	meta and the actions wrap under the title: the actions end the row beside
	a short meta, and start a row of their own under a long one.

	The body has no padding and clips nothing, so content keeps the page edge
	and a Table in it bleeds its band into the gutter as it does anywhere.
	The section is a landmark region named by its title (`aria-labelledby`).
	With role="none" or role="presentation" it is no landmark: the name is
	left out too, and the heading stays.
-->
<section
	{...rest}
	bind:this={ref}
	class={['hp-section', className]}
	aria-labelledby={landmark ? `${uid}-title` : undefined}
>
	<header class="head">
		<svelte:element this={titleAs} id="{uid}-title" class="hp-section-title title">{title}</svelte:element>
		{#if meta}
			<span class="meta">{#if typeof meta === 'string'}{meta}{:else}{@render meta()}{/if}</span>
		{/if}
		{#if actions}
			<div class="actions">{@render actions()}</div>
		{/if}
	</header>
	{#if children}
		<div class="body">{@render children()}</div>
	{/if}
	{#if foot}
		<footer class="foot">{@render foot()}</footer>
	{/if}
</section>

<style>
	/* Sections stack 48px apart: four times the 12px between a head and its
	   body. An app that places them differently sets its own margin. */
	:global(.hp-section + .hp-section) {
		margin-top: var(--space-12);
	}

	.hp-section {
		display: block;
		min-width: 0;
	}

	/* One row that wraps. The title keeps its own width first; the element
	   before the actions takes the free space, so the actions end the row,
	   and sit at the start of a row of their own when they wrap. */
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		min-height: var(--control-height);
	}

	.title {
		flex: 0 1 auto;
		min-width: 0;
		margin: 0;
		overflow-wrap: anywhere;
	}

	.meta {
		flex: 1 1 auto;
		min-width: 0;
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
	}
	.head:not(:has(.meta)) > .title {
		flex-grow: 1;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	@media (pointer: fine) {
		.meta,
		.foot {
			font-size: var(--type-dense);
			line-height: 20px;
		}
	}

	.body {
		min-width: 0;
		margin-top: var(--space-3);
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-3);
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
	}
</style>
