<!--
	The specimen app's project page: one project from the list, with its
	status, progress, phases, details, updates and activity. "Edit project"
	is the view's one solid block; it opens the edit form as a bottom sheet
	on phones and a centred dialog from 600px.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		Dialog,
		KeyValueList,
		MediaFrame,
		MediaImage,
		NativeSelect,
		Progress,
		Stat,
		Steps,
		Tag,
		TextField,
		Timeline,
		type KeyValueItem,
		type NativeSelectItem,
		type StepsItem,
		type TimelineEvent
	} from '#lib';
	import AppFrame from '../AppFrame.svelte';
	import { firstLoad } from '../first-load';
	import { delayedPhoto, staircase } from '../../staircase';

	// ---- First load -------------------------------------------------------

	// The first time a tab opens the project, the view is expressive: the
	// details and updates stagger in, and the photo arrives after photoDelay
	// as a slow network would deliver it, so it resolves from a mosaic. Later
	// visits have the photo "cached": it shows at once, in the quiet tier.
	// Decided once, when the page mounts.
	const first = firstLoad('project');
	const photoDelay = 1000;
	let photo = $state<string | undefined>(first ? undefined : staircase.src);

	$effect(() => {
		if (!first) return;
		const abort = new AbortController();
		let url: string | undefined;
		delayedPhoto(photoDelay, abort.signal).then(
			(copy) => (photo = url = copy),
			() => {
				// An abort is the page going away. Any other failure shows the
				// local file, which the browser loads on its own.
				if (!abort.signal.aborted) photo = staircase.src;
			}
		);
		return () => {
			abort.abort();
			if (url) URL.revokeObjectURL(url);
		};
	});

	type Priority = 'High' | 'Medium' | 'Low';

	const people: NativeSelectItem[] = [
		{ value: 'Mara Ilves', label: 'Mara Ilves' },
		{ value: 'Tomás Reyes', label: 'Tomás Reyes' },
		{ value: 'Ana Kovač', label: 'Ana Kovač' },
		{ value: 'Joel Brandt', label: 'Joel Brandt' },
		{ value: 'Ines Duarte', label: 'Ines Duarte' }
	];
	const priorities: NativeSelectItem<Priority>[] = [
		{ value: 'High', label: 'High' },
		{ value: 'Medium', label: 'Medium' },
		{ value: 'Low', label: 'Low' }
	];

	let project = $state({
		id: 'PRJ-0142',
		name: 'Customer portal redesign',
		owner: 'Mara Ilves',
		team: 'Web platform',
		priority: 'High' as Priority,
		status: 'Blocked',
		tone: 'warn',
		reason: 'Waiting on the vendor contract since 2026-11-02',
		started: '2026-08-18',
		due: '2026-12-15',
		progress: 62,
		// The chart's twelve weeks close 76 tasks: 76 of 123 is the 62%.
		openTasks: 47,
		totalTasks: 123,
		budget: '48,200 EUR'
	});

	const details: KeyValueItem[] = $derived([
		{ key: 'Owner', value: project.owner },
		{ key: 'Team', value: project.team },
		{ key: 'Priority', value: project.priority },
		{ key: 'Started', value: project.started },
		{ key: 'Due', value: project.due },
		{ key: 'Budget', value: project.budget }
	]);

	const phases: StepsItem[] = [
		{ label: 'Discovery' },
		{ label: 'Design' },
		{ label: 'Build' },
		{ label: 'Launch' }
	];

	const updates: TimelineEvent[] = [
		{ title: 'Kick-off', detail: 'Scope and milestones agreed', date: '2026-08-18', time: '10:00' },
		{ title: 'Prototype shared', detail: 'Clickable prototype sent to the product team', date: '2026-09-12', time: '14:30' },
		{ title: 'Usability sessions done', detail: 'Notes from 8 customer sessions filed', date: '2026-10-03', time: '17:15' },
		{ title: 'Design review passed', detail: '14 of 14 screens approved', date: '2026-10-21', time: '16:05' },
		{ title: 'Blocked', detail: 'Waiting on the vendor contract', date: '2026-11-02', time: '09:40', tone: 'warn' }
	];

	// ---- Edit dialog ------------------------------------------------------

	const formId = 'edit-project';
	let editOpen = $state(false);
	let draft = $state({ name: '', owner: '', priority: 'High' as Priority });
	let nameError = $state<string | undefined>();
	let nameInput = $state<HTMLInputElement | null>(null);

	// Every open starts from the project as it is, with no error showing.
	// The reset runs before the dialog renders, so old input never flashes.
	function setEditOpen(open: boolean) {
		if (open && !editOpen) {
			draft = { name: project.name, owner: project.owner, priority: project.priority };
			nameError = undefined;
		}
		editOpen = open;
	}

	function checkName(name: string) {
		return name.trim() ? undefined : 'Enter a project name.';
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		nameError = checkName(draft.name);
		if (nameError) {
			// Focus once the error is linked to the field, so it is read out.
			await tick();
			nameInput?.focus();
			return;
		}
		project.name = draft.name.trim();
		project.owner = draft.owner;
		project.priority = draft.priority;
		editOpen = false;
	}

	// ---- Activity chart ---------------------------------------------------

	// Tasks closed per week. Drawn in pixel units at the frame's real size, so
	// lines stay on whole pixels and labels stay 12px at every width.
	const weeks = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
	const closed = [3, 5, 4, 7, 9, 6, 8, 12, 10, 7, 3, 2];
	const scale = 15;
	const ticks = [0, 5, 10, 15];

	let width = $state(640);
	let height = $state(400);

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
	<title>{project.id} · Project · Specimen app · Hardpoint</title>
</svelte:head>

{#snippet actions()}
	<!-- The view's one group of solid blocks: a single primary action. -->
	<Dialog title="Edit project" bind:open={() => editOpen, setEditOpen}>
		{#snippet trigger({ props })}
			<Button {...props} variant="primary">Edit project</Button>
		{/snippet}
		<form id={formId} class="form" novalidate onsubmit={save}>
			<TextField
				label="Name"
				name="name"
				required
				autocomplete="off"
				enterkeyhint="done"
				bind:value={draft.name}
				bind:ref={nameInput}
				error={nameError}
				onblur={() => (nameError = checkName(draft.name))}
				oninput={() => {
					if (nameError) nameError = checkName(draft.name);
				}}
			/>
			<NativeSelect label="Owner" name="owner" items={people} bind:value={draft.owner} />
			<NativeSelect label="Priority" name="priority" items={priorities} bind:value={draft.priority} />
		</form>
		{#snippet actions({ close })}
			<Button onclick={close}>Cancel</Button>
			<Button variant="primary" type="submit" form={formId}>Save</Button>
		{/snippet}
	</Dialog>
{/snippet}

<AppFrame title="Project" controls={actions} expressive={first}>
	<a class="back hp-label" href="/app">All projects</a>

	<div class="record">
		<div class="subject">
			<Tag>Project ID</Tag>
			<h2 class="hp-display hp-mono id">{project.id}</h2>
			<p class="hp-page-title name">{project.name}</p>
		</div>

		<div class="state">
			<Tag>Status</Tag>
			<p class="hp-page-title status" data-tone={project.tone}>{project.status}</p>
			<p class="reason">{project.reason}</p>
		</div>

		<div class="progress">
			<Progress label="Progress" value={project.progress} />
		</div>

		<div class="phases">
			<Steps aria-label="Project phases" steps={phases} current={2} />
		</div>

		<!-- Two pairs, tasks then schedule and budget, so that from 900px the
		     second pair starts with the page's right column. -->
		<div class="stats">
			<div class="pair">
				<Stat label="Open tasks" value={project.openTasks} unit="of {project.totalTasks}" />
				<Stat label="Closed this week" value={2} delta={-1} deltaNote="vs last week" />
			</div>
			<div class="pair">
				<Stat label="Days to due" value={35} />
				<Stat label="Budget used" value="61%" />
			</div>
		</div>

		<section class="details" aria-labelledby="details-tag">
			<Tag as="h3" id="details-tag">Details</Tag>
			<KeyValueList items={details} />
		</section>

		<section class="updates" aria-labelledby="updates-tag">
			<Tag as="h3" id="updates-tag">Updates</Tag>
			<Timeline events={updates} />
		</section>

		<!-- The photo and the chart share the page's right column from 1200px:
		     a wrapper that adds no box before that. -->
		<div class="visuals">
			<figure class="photo">
				<Tag>Site photo</Tag>
				<MediaFrame>
					<MediaImage src={photo} alt={staircase.alt} />
				</MediaFrame>
			</figure>

			<figure class="media">
				<Tag>Activity</Tag>
				<MediaFrame bind:width bind:height>
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
				</MediaFrame>
				<figcaption>Tasks closed per week, W{weeks[0]} to W{weeks[weeks.length - 1]}</figcaption>
			</figure>
		</div>
	</div>
</AppFrame>

<style>
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
		width: 6px; /* matches the approved specimen */
		height: 8px;
		background: currentColor;
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
	@media (hover: hover) and (pointer: fine) {
		.back:hover {
			color: var(--text);
		}
	}

	/* ---- Record: one column, two from 600px, 5fr/7fr from 1200px -------- */

	/* The record page splits 5fr/7fr from 900px, where its content is 836px
	   wide. Here the shell's sidebar arrives at 900px and leaves 596px, so
	   the split waits for 1200px (896px): narrower, the left column breaks
	   the details' values and the chart shrinks to 310px.
	   Groups sit 40px apart, 48px from 1200px; inside a group nothing is
	   more than 20px apart. */
	.record {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'subject' 'state' 'photo' 'progress' 'phases' 'stats' 'details' 'updates' 'chart';
		gap: var(--space-10);
		margin-top: var(--space-4);
	}
	@media (min-width: 600px) {
		.record {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			grid-template-areas:
				'subject state'
				'progress progress'
				'phases phases'
				'stats stats'
				'details updates'
				'photo photo'
				'chart chart';
			gap: var(--space-10) var(--space-8);
		}
	}
	/* The phases sit beside the progress, and the photo and the chart take
	   the right column beside the details and updates; the last row takes
	   the height they add, so the updates follow the details. */
	@media (min-width: 1200px) {
		.record {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			grid-template-areas:
				'subject state'
				'progress phases'
				'stats stats'
				'details visuals'
				'updates visuals';
			grid-template-rows: repeat(4, auto) 1fr;
			gap: var(--space-12) var(--space-16);
		}
	}

	.subject {
		grid-area: subject;
	}
	.state {
		grid-area: state;
	}
	.progress {
		grid-area: progress;
		align-self: start;
	}
	.phases {
		grid-area: phases;
		align-self: start;
	}
	.stats {
		grid-area: stats;
	}
	.details {
		grid-area: details;
	}
	.updates {
		grid-area: updates;
	}
	/* On a phone the photo follows the status, so the mosaic is on screen
	   when the page loads; from 600px it follows the details and updates. */
	.photo {
		grid-area: photo;
		align-self: start;
	}
	.media {
		grid-area: chart;
		align-self: start;
	}
	/* The photo over the chart: one cell of the page's right column from
	   1200px, no box of its own before that. */
	.visuals {
		display: contents;
	}
	@media (min-width: 1200px) {
		.visuals {
			grid-area: visuals;
			display: grid;
			grid-template-areas: 'photo' 'chart';
			gap: var(--space-12);
			align-self: start;
		}
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
		width: 12px; /* matches the approved specimen */
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

	/* ---- Stats: two columns, four from 900px ---------------------------- */

	/* The pairs stack below 900px. Column-gap stays `normal`, so from 900px
	   the subgrid keeps the page's columns and gap. */
	.stats {
		display: grid;
		row-gap: var(--space-5);
	}
	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4);
	}
	/* The second column starts with the page's right column. */
	@media (min-width: 600px) {
		.pair {
			column-gap: var(--space-8);
		}
	}
	/* One pair in each of the page's columns: four in a row. */
	@media (min-width: 900px) {
		.stats {
			grid-template-columns: subgrid;
		}
		.pair {
			column-gap: var(--space-4);
		}
	}

	/* ---- Media: the photo and the chart in MediaFrames, ratios by breakpoint -- */

	.photo,
	.media {
		display: grid;
	}
	.photo {
		--media-frame-ratio: 3 / 2; /* the photo's own ratio: no crop */
	}
	.media {
		--media-frame-ratio: 4 / 3;
	}
	@media (min-width: 600px) {
		.photo,
		.media {
			--media-frame-ratio: 16 / 9;
		}
	}
	/* In the right column, beside the details and updates. */
	@media (min-width: 1200px) {
		.photo {
			--media-frame-ratio: 3 / 2;
		}
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
		font-size: 12px; /* matches the approved specimen */
	}
	.tick {
		fill: var(--muted);
	}
	.value {
		fill: var(--text);
	}

	figcaption {
		margin-top: var(--space-3);
		color: var(--muted);
		font-size: var(--type-caption);
	}

	/* ---- Edit form, inside the dialog ----------------------------------- */

	.form {
		display: grid;
		gap: var(--space-5);
	}
</style>
