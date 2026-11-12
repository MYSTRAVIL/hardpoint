<script lang="ts">
	import Button, { type ButtonVariant } from '#lib/components/Button.svelte';

	const variants: { variant: ButtonVariant; note: string; icon: string; name: string }[] = [
		{ variant: 'primary', note: 'Solid titanium block. The view’s one group of solid blocks.', icon: 'add', name: 'Add' },
		{ variant: 'secondary', note: 'Outlined. The default for every other action.', icon: 'menu', name: 'Menu' },
		{ variant: 'tertiary', note: 'Label only. Quiet actions beside other controls.', icon: 'close', name: 'Close' }
	];

	const states = [
		{ key: 'rest', label: 'Rest', disabled: false },
		{ key: 'disabled', label: 'Disabled', disabled: true }
	];

	const pageActions = ['Files', 'History', 'Members', 'Related'];
</script>

<svelte:head>
	<title>Button · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Button</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		An action. <code>Button</code> renders an <code>&lt;a&gt;</code> when <code>href</code> is set and a
		<code>&lt;button&gt;</code> otherwise. It is 36px high on a fine pointer and 44px on a coarse one, and
		the visible box is the hit area. Press <kbd>Tab</kbd> to see the focus contour.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>One solid group per view.</strong> Use <code>primary</code> for a single main action or
				for the header’s row of equal-weight page actions, never for both. Every other action is
				<code>secondary</code>, the default, or <code>tertiary</code>. This page shows every primary only
				as a specimen.
			</li>
			<li>
				<code>opens</code> adds a small ▸ to a button that opens another view. A button that acts in
				place does not take it.
			</li>
			<li>
				<code>icon</code> makes a square, icon-only button. It has no visible label, so give it an
				accessible name with <code>aria-label</code>. Draw the icon as an inline <code>&lt;svg&gt;</code>
				in <code>currentColor</code>.
			</li>
			<li>
				A disabled <code>&lt;button&gt;</code> leaves the tab order. A disabled link drops its
				<code>href</code> and gets <code>aria-disabled="true"</code>. Say why in nearby text, because a
				disabled control cannot explain itself.
			</li>
			<li>
				Extra attributes, event handlers and <code>class</code> pass through to the element. Button
				renders that one element with no component layer around it, so a list may draw one per row.
			</li>
		</ul>
	</section>

	{#snippet matrix(kind: 'button' | 'link' | 'opens' | 'icon')}
		<div class="matrix">
			{#each variants as v (v.variant)}
				<div class="row">
					<div class="row-head">
						<h3 class="hp-label">{v.variant}</h3>
						<p class="hp-caption">{v.note}</p>
					</div>
					<div class="cells">
						{#each states as s (s.key)}
							<div class="cell">
								<span class="hp-caption state">{s.label}</span>
								{#if kind === 'button'}
									<Button variant={v.variant} disabled={s.disabled}>Save changes</Button>
								{:else if kind === 'link'}
									<Button variant={v.variant} disabled={s.disabled} href="#demo">Learn more</Button>
								{:else if kind === 'opens'}
									<Button variant={v.variant} disabled={s.disabled} opens href="#demo">Open report</Button>
								{:else}
									<Button variant={v.variant} disabled={s.disabled} icon aria-label={v.name}>
										{#if v.icon === 'add'}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
										{:else if v.icon === 'menu'}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>
										{:else}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
										{/if}
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/snippet}

	<section aria-labelledby="as-button">
		<h2 id="as-button" class="hp-section-title">As a button</h2>
		<p class="lede">An action that happens in place: save, delete, apply.</p>
		{@render matrix('button')}
	</section>

	<section aria-labelledby="as-link">
		<h2 id="as-link" class="hp-section-title">As a link</h2>
		<p class="lede">
			With <code>href</code> it navigates and looks the same. A disabled link has no <code>href</code>.
		</p>
		{@render matrix('link')}
	</section>

	<section aria-labelledby="opens">
		<h2 id="opens" class="hp-section-title">Opens another view</h2>
		<p class="lede">
			<code>opens</code> ends the label in ▸, drawn in the label’s colour, so it follows hover and
			disabled states.
		</p>
		{@render matrix('opens')}
	</section>

	<section aria-labelledby="icon">
		<h2 id="icon" class="hp-section-title">Icon only</h2>
		<p class="lede">
			Square: height and width are both <code>--control-height</code>. Each one here carries an
			<code>aria-label</code>.
		</p>
		{@render matrix('icon')}
	</section>

	<section aria-labelledby="group">
		<h2 id="group" class="hp-section-title">Page actions</h2>
		<p class="lede">
			A header row of equal-weight primary links, the view’s one solid group. Neighbours sit 8px apart,
			so a focus contour never overlaps the next button.
		</p>
		<div class="group">
			{#each pageActions as label (label)}
				<Button class="group-item" variant="primary" opens href="#demo">{label}</Button>
			{/each}
		</div>
	</section>

	<section aria-labelledby="inline">
		<h2 id="inline" class="hp-section-title">Beside other controls</h2>
		<p class="lede">
			One quiet primary choice next to a secondary and a tertiary, as in a form footer. Here the
			primary is the only solid block.
		</p>
		<div class="group">
			<Button variant="primary">Save changes</Button>
			<Button variant="secondary">Save draft</Button>
			<Button variant="tertiary">Cancel</Button>
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	code,
	kbd {
		font-size: 0.875em;
	}

	.notes {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: var(--space-3) 0 0;
		padding-left: var(--space-5);
		color: var(--muted);
	}
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	/* ---- Variant rows ---------------------------------------------------- */

	.matrix {
		display: grid;
		gap: var(--space-8);
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}
	.row-head p {
		margin-top: var(--space-1);
		color: var(--muted);
	}
	.cells {
		display: grid;
		/* Rest and Disabled keep the same columns in every row. */
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		max-width: 30rem;
		gap: var(--space-6);
	}
	.cell {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
	}
	.state {
		color: var(--muted);
	}
	@media (min-width: 900px) {
		.row {
			grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
			align-items: center;
			gap: var(--space-8);
		}
	}

	/* ---- Groups ---------------------------------------------------------- */

	/* 8px apart: a focus contour (4px out) never overlaps the neighbour. */
	.group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.group > :global(.group-item) {
		min-width: 112px;
	}
	@media (max-width: 599px) {
		.group {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
