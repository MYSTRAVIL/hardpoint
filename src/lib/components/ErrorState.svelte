<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * `standard` (default): the title at the section-title size. `display`:
	 * the title in Geist Pixel Square, as the screen's one display line.
	 */
	export type ErrorStateVariant = 'standard' | 'display';

	/** The title's element: `p` by default, a heading where the state names a region of the page. */
	export type ErrorStateTitleElement = 'p' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

	export type ErrorStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
		/** What failed, as a short line: `Couldn't load projects`. Never transformed. */
		title: string;
		/** How to fix it: `Check your connection, then try again.` Errors never apologise. */
		description?: string;
		/** Shows a retry button that calls this. */
		onretry?: () => void;
		/** The retry button's label. Defaults to `Try again`. */
		retryLabel?: string;
		/** A fix that is not a retry, such as signing in again: render a `Button` here. It follows the retry button. */
		action?: Snippet;
		titleAs?: ErrorStateTitleElement;
		variant?: ErrorStateVariant;
	};
</script>

<script lang="ts">
	import Button from './Button.svelte';

	let {
		title,
		description,
		onretry,
		retryLabel = 'Try again',
		action,
		titleAs = 'p',
		variant = 'standard',
		class: className,
		...rest
	}: ErrorStateProps = $props();
</script>

<!--
	A data view that failed to load, shown where its content would be (BRIEF,
	Apps and phones: States): what failed, how to fix it, and a retry action.
	The title carries an outlined square with a "!" in the status red, so the
	state never rests on colour alone; the text stays in the two inks. The
	title and description sit in a role="alert" region, so a screen reader
	announces the failure when the state replaces the content; the actions
	stay outside it. It sets no outer margin. Extra attributes and `class` go
	to the root `div.hp-error-state`.
-->
<div {...rest} class={['hp-error-state', className]} data-variant={variant}>
	<div class="hp-error-state-message" role="alert">
		<svelte:element
			this={titleAs}
			class={['hp-error-state-title', variant === 'display' ? 'hp-pixel' : 'hp-section-title']}
		>
			<span class="hp-error-state-icon" aria-hidden="true">
				<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor">
					<path d="M1.5 1.5h13v13h-13z" />
					<path d="M8 4v4M8 10v2" stroke-width="2" />
				</svg>
			</span>
			<span>{title}</span>
		</svelte:element>
		{#if description}
			<p class="hp-error-state-description">{description}</p>
		{/if}
	</div>
	{#if onretry || action}
		<div class="hp-error-state-actions">
			{#if onretry}
				<!-- type="button", so a retry inside a form never submits it. -->
				<Button type="button" onclick={onretry}>{retryLabel}</Button>
			{/if}
			{@render action?.()}
		</div>
	{/if}
</div>

<style>
	.hp-error-state {
		display: grid;
		justify-items: start;
		min-width: 0;
	}

	.hp-error-state-message {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		max-width: 100%;
	}

	/* The icon hangs before the title's first line, as on a field error. */
	.hp-error-state-title {
		display: flex;
		gap: var(--space-2);
		max-width: 100%;
		overflow-wrap: anywhere;
	}
	/* One line box high, so the icon centres on the first line of the title
	   however it wraps. */
	.hp-error-state-icon {
		display: flex;
		flex: none;
		align-items: center;
		height: 1lh;
		color: var(--danger);
	}
	.hp-error-state-icon svg {
		display: block;
	}

	/* Reading text: 16px at every width, in the reading measure. */
	.hp-error-state-description {
		max-width: var(--measure);
		color: var(--muted);
		font-size: var(--type-body);
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	/* The actions are their own group: three times the gap inside the text. */
	.hp-error-state-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-6);
	}
</style>
