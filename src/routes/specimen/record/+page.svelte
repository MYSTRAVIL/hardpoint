<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import KeyValueList from '#lib/components/KeyValueList.svelte';
	import MediaFrame from '#lib/components/MediaFrame.svelte';
	import Tag from '#lib/components/Tag.svelte';
	import Timeline, { type TimelineEvent } from '#lib/components/Timeline.svelte';

	const actions = [
		{ label: 'Files', href: '#files' },
		{ label: 'History', href: '#history' },
		{ label: 'Members', href: '#members' },
		{ label: 'Related', href: '#related' }
	];

	const details = [
		{ key: 'Owner', value: 'Mara Ilves' },
		{ key: 'Team', value: 'Web platform' },
		{ key: 'Priority', value: 'High' },
		{ key: 'Started', value: '2026-08-18' },
		{ key: 'Due', value: '2026-12-15' },
		{ key: 'Progress', value: '62%' },
		{ key: 'Open tasks', value: '18 of 47' },
		{ key: 'Budget', value: '48,200 EUR' }
	];

	const updates: TimelineEvent[] = [
		{ title: 'Kick-off', detail: 'Scope and milestones agreed', date: '2026-08-18', time: '10:00' },
		{ title: 'Design review passed', detail: '14 of 14 screens approved', date: '2026-10-21', time: '16:05' },
		{ title: 'Blocked', detail: 'Waiting on the vendor contract', date: '2026-11-02', time: '09:40', tone: 'warn' }
	];

	// Tasks closed per week. Drawn in pixel units at the frame's real size, so
	// lines stay on whole pixels and labels stay 12px at every width.
	const weeks = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
	const closed = [3, 5, 4, 7, 9, 6, 8, 12, 10, 7, 3, 2];
	const scale = 15;
	const ticks = [0, 5, 10, 15];

	// 0 until MediaFrame measures itself. The chart draws only then, as on the MediaFrame docs page: the
	// server-rendered page cannot know the frame's size, and a guessed size overflows the frame until hydration.
	let width = $state(0);
	let height = $state(0);

	const chart = $derived.by(() => {
		const pad = { top: 40, right: 40, bottom: 44, left: 48 };
		const plotW = Math.max(0, width - pad.left - pad.right);
		const plotH = Math.max(0, height - pad.top - pad.bottom);
		const base = Math.round(pad.top + plotH);
		const unit = plotH / scale;
		const band = plotW / weeks.length;
		const barW = Math.max(4, Math.min(16, Math.round(band * 0.4)));
		const every = band < 36 ? 2 : 1;
		const bars = weeks.map((week, i) => {
			const x = Math.round(pad.left + band * i + (band - barW) / 2);
			const segments = Array.from({ length: closed[i] }, (_, k) => {
				const top = Math.round(base - unit * (k + 1));
				const bottom = Math.round(base - unit * k);
				return { y: top, h: Math.max(1, bottom - top - 2) };
			});
			const current = i === weeks.length - 1;
			const label = (weeks.length - 1 - i) % every === 0;
			return { week, x, segments, current, label, cx: x + barW / 2, count: closed[i] };
		});
		const grid = ticks.map((t) => ({ t, y: Math.round(base - unit * t) + 0.5 }));
		return { pad, base, barW, bars, grid, right: width - pad.right };
	});
</script>

<svelte:head>
	<title>PRJ-0142 · Project · Specimen · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Project</h1></header>

<!-- The view's one group of solid blocks: equal-weight page actions. -->
<nav class="actions" aria-label="Project views">
	{#each actions as a (a.href)}
		<Button class="action" variant="primary" opens href={a.href}>{a.label}</Button>
	{/each}
</nav>

<main id="main" tabindex="-1">
	<a class="back hp-label" href="/specimen">All projects</a>

	<div class="record">
		<div class="subject">
			<Tag>Project ID</Tag>
			<h2 class="hp-display hp-mono id">PRJ-0142</h2>
			<p class="hp-page-title name">Customer portal redesign</p>
		</div>

		<div class="state">
			<Tag>Status</Tag>
			<p class="hp-page-title status" data-tone="warn">Blocked</p>
			<p class="reason">Waiting on the vendor contract since 2026-11-02</p>
		</div>

		<section class="details" aria-labelledby="details-tag">
			<Tag as="h3" id="details-tag">Details</Tag>
			<KeyValueList items={details} />
		</section>

		<section class="updates" aria-labelledby="updates-tag">
			<Tag as="h3" id="updates-tag">Updates</Tag>
			<Timeline events={updates} />
		</section>

		<figure class="media">
			<Tag>Activity</Tag>
			<MediaFrame bind:width bind:height>
				{#if width > 0 && height > 0}
					<svg
						class="chart"
						{width}
						{height}
						viewBox="0 0 {width} {height}"
						role="img"
						aria-label="Tasks closed per week, weeks {weeks[0]} to {weeks[weeks.length - 1]}: {closed.join(', ')}."
					>
						{#each chart.grid as g (g.t)}
							<line
								class={g.t === 0 ? 'baseline' : 'gridline'}
								x1={chart.pad.left}
								x2={chart.right}
								y1={g.y}
								y2={g.y}
							/>
							<text class="tick" x={chart.pad.left - 12} y={g.y + 4} text-anchor="end">{g.t}</text>
						{/each}
						{#each chart.bars as b (b.week)}
							{#each b.segments as s, k (k)}
								<rect class:current={b.current} x={b.x} y={s.y} width={chart.barW} height={s.h} />
							{/each}
							{#if b.label}
								<text class="tick" x={b.cx} y={chart.base + 24} text-anchor="middle">W{b.week}</text>
							{/if}
							{#if b.current}
								<text class="value" x={b.cx} y={(b.segments.at(-1)?.y ?? chart.base) - 10} text-anchor="middle"
									>{b.count}</text
								>
							{/if}
						{/each}
					</svg>
				{/if}
			</MediaFrame>
			<figcaption>
				<span class="caption">Tasks closed per week, W{weeks[0]} to W{weeks[weeks.length - 1]}</span>
				<Button variant="secondary" opens href="#report">Open report</Button>
			</figcaption>
		</figure>
	</div>
</main>

<style>
	/* ---- Page actions: solid titanium blocks, black caps, small ▸ ------- */

	/* 8px apart, so a focus contour (4px out) never overlaps the neighbour. */
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
	}
	@media (min-width: 600px) {
		.actions {
			display: flex;
			flex-wrap: wrap;
		}
	}
	@media (min-width: 900px) {
		.actions {
			flex-wrap: nowrap;
		}
	}

	/* The equal-weight actions share a minimum width. */
	.actions > :global(.action) {
		min-width: 112px;
	}

	/* ---- Back: plain text, not a block ---------------------------------- */

	.back {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--hit-target);
		color: var(--muted);
		text-decoration: none;
	}
	.back::before {
		content: '';
		width: 6px;
		height: 8px;
		background: currentColor;
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
	@media (hover: hover) and (pointer: fine) {
		.back:hover {
			color: var(--text);
		}
	}

	/* ---- Record: two columns like the reel's data page (da3-54) --------- */

	.record {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'subject' 'state' 'details' 'updates' 'media';
		gap: var(--space-10);
		margin-top: var(--space-4);
	}
	@media (min-width: 600px) {
		.record {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			grid-template-areas:
				'subject state'
				'details updates'
				'media media';
			gap: var(--space-10) var(--space-8);
		}
	}
	@media (min-width: 900px) {
		.record {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			grid-template-areas:
				'subject state'
				'details media'
				'updates media';
			grid-template-rows: auto auto 1fr;
			gap: var(--space-12) var(--space-16);
		}
	}

	.subject {
		grid-area: subject;
	}
	.state {
		grid-area: state;
	}
	.details {
		grid-area: details;
	}
	.updates {
		grid-area: updates;
	}
	.media {
		grid-area: media;
		align-self: start;
	}

	/* Each tag names the block below it, 12px above it. */
	.record :global(.hp-tag) {
		margin-bottom: var(--space-3);
	}

	.id {
		overflow-wrap: anywhere;
	}
	.name {
		margin-top: var(--space-2);
	}

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
	}
	.status[data-tone='warn']::before {
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

	/* ---- Media: the chart in a MediaFrame, its ratio by breakpoint ------ */

	.media {
		display: grid;
		--media-frame-ratio: 4 / 3;
	}
	@media (min-width: 600px) {
		.media {
			--media-frame-ratio: 16 / 9;
		}
	}
	@media (min-width: 900px) {
		.media {
			--media-frame-ratio: 16 / 11;
		}
	}
	.chart {
		position: absolute;
		inset: 0;
		shape-rendering: crispEdges;
	}
	.chart rect {
		fill: var(--muted);
	}
	.chart rect.current {
		fill: var(--accent);
	}
	.gridline {
		stroke: var(--border);
		stroke-dasharray: 2 4;
	}
	.baseline {
		stroke: var(--border);
	}
	.tick,
	.value {
		font-family: var(--mono);
		font-size: 12px;
	}
	.tick {
		fill: var(--muted);
	}
	.value {
		fill: var(--text);
	}

	figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-6);
		margin-top: var(--space-3);
	}
	.caption {
		color: var(--muted);
		font-size: var(--type-caption);
	}
</style>
