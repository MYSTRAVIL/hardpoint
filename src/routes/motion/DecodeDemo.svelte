<!--
	The /motion decode demo, a lab piece: a small mock view whose fixed labels
	decode when it mounts. No component uses decode-in (the user, 2026-11-10:
	it reads as a gimmick in real apps). The page renders the demo inside
	<Motion tier="expressive"> and remounts it on Replay. The header decodes
	first and the content one frame later; each label also starts on its own
	clock. The wordmark and the data row never decode.
-->
<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Tag from '#lib/components/Tag.svelte';
	import { useDecode } from './decode';

	const decode = useDecode();
</script>

<div class="view">
	<div class="head">
		<span class="wordmark hp-pixel">HARDPOINT</span>
		<p class="title hp-view-title" {@attach decode()}>Projects</p>
		<div class="actions">
			<Button variant="primary" {@attach decode()}>Import</Button>
			<Button variant="primary" {@attach decode()}>Export</Button>
			<Button variant="primary" opens {@attach decode()}>New project</Button>
		</div>
	</div>

	<div class="table">
		<div class="band">
			<span class="hp-label" {@attach decode({ delay: 1 })}>Name</span>
			<span class="hp-label" {@attach decode({ delay: 1 })}>Owner</span>
			<span class="hp-label" {@attach decode({ delay: 1 })}>Due</span>
		</div>
		<div class="row hp-mono hp-dense">
			<span>Atlas</span>
			<span>Lena Fischer</span>
			<span>2026-12-04</span>
		</div>
	</div>

	<div class="archive">
		<Tag {@attach decode({ delay: 1 })}>Archived</Tag>
		<p class="hp-pixel" {@attach decode({ delay: 1 })}>Nothing here yet</p>
	</div>
</div>

<style>
	/* A hairline frame sets the mock view apart from the docs around it. */
	.view {
		display: grid;
		gap: var(--space-8);
		padding: 0 var(--space-4) var(--space-8);
		border: 1px solid var(--border);
		container-type: inline-size;
	}

	/* AppShell's header row: the wordmark at the left, the caps title
	   centred, the page actions at the right. The 56px row leaves even free
	   space around the wordmark's 32px line, so its module lands on whole
	   pixels. Narrow views put the actions on their own row and let the
	   title follow the wordmark. */
	.head {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		row-gap: var(--space-2);
	}
	.wordmark {
		display: flex;
		align-items: center;
		height: var(--header-height);
	}
	/* The title truncates before it pushes the actions, as in AppShell. */
	.title {
		min-width: 0;
		padding-left: var(--space-5);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.actions {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}
	@container (min-width: 56rem) {
		.head {
			grid-template-columns: 1fr auto 1fr;
			column-gap: var(--space-8);
		}
		.title {
			padding-left: 0;
		}
		.actions {
			grid-column: auto;
			justify-content: end;
		}
	}

	/* Table's band and one row of Geist Mono under it, on one grid so the
	   labels sit over their values. The band reaches --bleed past the text
	   edge. The owner column is the wider one, so the name fits a phone. */
	.table {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
		column-gap: var(--space-4);
	}
	.band,
	.row {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
		margin-inline: calc(-1 * var(--bleed));
		padding-inline: var(--bleed);
	}
	.band {
		height: 36px;
		margin-bottom: var(--space-2);
		background: var(--surface-band);
		color: var(--text);
	}
	.row {
		height: var(--control-height);
	}
	.row > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The tag names the empty block under it, as on the record page. */
	.archive :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}
</style>
