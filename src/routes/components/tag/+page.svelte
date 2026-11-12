<script lang="ts">
	import KeyValueList, { type KeyValueItem } from '#lib/components/KeyValueList.svelte';
	import Tag from '#lib/components/Tag.svelte';

	const details: KeyValueItem[] = [
		{ key: 'Owner', value: 'Mara Ilves' },
		{ key: 'Team', value: 'Web platform' },
		{ key: 'Due', value: '2026-12-15' }
	];
	const files = ['brief.pdf', 'wireframes-v3.fig', 'copy-deck.docx'];
	const labels = ['Pinned', 'Shared', 'Read only', 'Template'];
</script>

<svelte:head>
	<title>Tag · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Tag</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A short fixed label in a small solid titanium block with black caps. <code>Tag</code> follows the
		brief’s visual rule 2: solid blocks mark actions and tags, and a tag may sit above a block to name
		it, as Project ID names the identifier under it. Tags hold short fixed labels the app defines, never
		user data, and a tag never carries a status colour.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Element.</strong> <code>as</code> picks the element: <code>p</code> by default,
				<code>span</code> inside a line or a row of tags, <code>div</code>, or <code>h2</code> to
				<code>h6</code> when the tag names a section. A heading tag takes an <code>id</code>, and the
				section’s <code>aria-labelledby</code> points at it.
			</li>
			<li>
				<strong>Content.</strong> Short fixed labels the app defines, such as Project ID, Details or
				Files, set in caps by <code>.hp-label</code>. Never user data: names, titles and values a user
				wrote stay as written, outside the tag.
			</li>
			<li>
				<strong>No status colour.</strong> A tag is always titanium with black caps, never red, yellow or
				green. A status takes its hue on a small square beside a word that says it, as the
				<a href="/components/timeline">Timeline</a> does.
			</li>
			<li>
				<strong>Spacing.</strong> A tag sets no outer margin; the layout spaces it. Leave 12px
				(<code>--space-3</code>) under a tag that names the block below. A route sets it on
				<code>:global(.hp-tag)</code> under one of its own selectors.
			</li>
			<li>
				Extra attributes such as <code>id</code> and <code>aria-*</code> pass through to the element, and
				<code>class</code> is merged.
			</li>
		</ul>
	</section>

	<section aria-labelledby="names">
		<h2 id="names" class="hp-section-title">Naming a block</h2>
		<p class="lede">
			A tag 12px above a block names it. The identifier under Project ID is the view’s one display
			subject, in Geist Mono; the name a user wrote stays at the page-title size. The Status tag stays
			titanium: the status hue goes on the square beside the word.
		</p>
		<div class="blocks">
			<div class="named">
				<Tag>Project ID</Tag>
				<p class="hp-display hp-mono id">PRJ-0142</p>
				<p class="hp-page-title name">Customer portal redesign</p>
			</div>
			<div class="named">
				<Tag>Status</Tag>
				<p class="hp-page-title status">Waiting on review</p>
				<p class="reason">Assigned to Jonas Berg since 2026-11-06</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="heading">
		<h2 id="heading" class="hp-section-title">As a section heading</h2>
		<p class="lede">
			<code>as="h3"</code> with an <code>id</code>: the tag is the heading of its
			<code>&lt;section&gt;</code>, whose <code>aria-labelledby</code> points at it. Pick the level that
			fits the page outline; here each tag sits under this section’s <code>h2</code>.
		</p>
		<div class="blocks">
			<section class="named" aria-labelledby="details-tag">
				<Tag as="h3" id="details-tag">Details</Tag>
				<KeyValueList items={details} />
			</section>
			<section class="named" aria-labelledby="files-tag">
				<Tag as="h3" id="files-tag">Files</Tag>
				<ul class="files hp-dense hp-mono">
					{#each files as file (file)}
						<li>{file}</li>
					{/each}
				</ul>
			</section>
		</div>
	</section>

	<section aria-labelledby="row">
		<h2 id="row" class="hp-section-title">In a row</h2>
		<p class="lede">
			<code>as="span"</code> in a flex row, 8px apart: labels the app defines for one item, such as a
			file’s kind and access. The row wraps on a narrow screen.
		</p>
		<p class="hp-dense hp-mono file">launch-checklist.md</p>
		<ul class="tags">
			{#each labels as label (label)}
				<li><Tag as="span">{label}</Tag></li>
			{/each}
		</ul>
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

	code {
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

	/* Two blocks side by side from 600px, as on the record specimen. */
	.blocks {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-10);
	}
	@media (min-width: 600px) {
		.blocks {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-10) var(--space-8);
		}
	}

	/* The inner sections are blocks of the demo, not page sections. */
	.named {
		margin-top: 0;
	}

	/* 12px under a tag that names the block below it. */
	.named > :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}

	.id {
		overflow-wrap: anywhere;
	}
	.name {
		margin-top: var(--space-2);
	}

	/* The status hue on a square beside the word, never on the tag. */
	.status {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.status::before {
		content: '';
		flex: none;
		width: 12px;
		height: 12px;
		background: var(--warn);
	}
	.reason {
		margin-top: var(--space-2);
		color: var(--muted);
		font-family: var(--mono);
		font-size: var(--type-body);
	}
	@media (pointer: fine) {
		.reason {
			font-size: var(--type-dense);
		}
	}

	.files {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.file {
		margin-bottom: var(--space-3);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Each tag is a flex item, so the row is exactly as tall as a tag. */
	.tags > li {
		display: flex;
	}
</style>
