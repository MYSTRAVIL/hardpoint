<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Stat from '#lib/components/Stat.svelte';

	// ---- Tick on change ----------------------------------------------------

	const grouped = new Intl.NumberFormat('en-US');
	const groupThousands = (n: number) => grouped.format(n);
	/** A change as the app writes it: a sign, a true minus, grouping. */
	const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '\u2212' : '') + grouped.format(Math.abs(n));
	/** A whole number from `min` to `max` that is not `not`. */
	function pick(min: number, max: number, not: number): number {
		let n = not;
		while (n === not) n = min + Math.floor(Math.random() * (max - min + 1));
		return n;
	}

	let budget = $state(21400);
	let budgetChange = $state(-1250);
	let hours = $state(3.5);
	let tasks = $state(18);
	let tasksChange = $state(-3);

	function changeBudget() {
		const next = pick(100, 800, budget / 50) * 50;
		budgetChange = next - budget;
		budget = next;
	}
	// Hundredths, so the number of decimal places varies: 4.25, 2.7, 6.
	function changeHours() {
		hours = pick(100, 800, Math.round(hours * 100)) / 100;
	}
	function changeTasks() {
		const next = pick(0, 40, tasks);
		tasksChange = next - tasks;
		tasks = next;
	}
</script>

<svelte:head>
	<title>Stat · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Stat</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A key figure with its name. <code>Stat</code> sets a caps label over a value in Geist with tabular
		figures, so numbers line up and keep their width. A unit and a delta are optional. The
		<code>display</code> variant is for a view’s one display subject (the brief’s visual rule 3); a row
		of several stats uses the standard size.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label and value.</strong> <code>label</code> is a fixed caps string the app defines.
				A string <code>value</code> is shown as given: format it in the app (grouping, decimals,
				<code>%</code>). It renders a <code>&lt;dl&gt;</code>.
			</li>
			<li>
				<strong>Number values.</strong> A number <code>value</code> is shown through
				<code>format</code>, a function from the number to its text, such as
				<code>(n) =&gt; n.toLocaleString('en-US')</code>. Without <code>format</code> it shows as
				<code>String(value)</code> writes it. A number ticks when it changes; see
				<a href="#tick">Tick on change</a>.
			</li>
			<li>
				<strong>Unit.</strong> <code>unit</code> follows the value, smaller and in the muted ink. A
				symbol that belongs to the number, such as <code>%</code>, stays in the value.
			</li>
			<li>
				<strong>Delta.</strong> <code>delta</code> is the change, in the muted ink. A number gets its sign
				(<code>+4</code>, <code>−3</code>, <code>0</code>); a string is shown as written.
				<code>deltaNote</code> says what it compares with.
			</li>
			<li>
				<strong>Tone.</strong> <code>tone</code> colours the delta in a status hue: <code>ok</code> for
				good, <code>warn</code> for needs attention, <code>danger</code> for bad. Without it the delta
				stays muted. The label or note says the same in words.
			</li>
			<li>
				<strong>Size.</strong> <code>standard</code> (default) is the page-title size, 24px and 20px on
				phones. <code>display</code> clamps from 32px on phones to 56px from 1200px; use it once per view.
			</li>
			<li>Extra attributes and <code>class</code> go to the <code>&lt;dl&gt;</code>.</li>
		</ul>
	</section>

	<section aria-labelledby="row">
		<h2 id="row" class="hp-section-title">A row of stats</h2>
		<p class="lede">
			A project summary. The page lays the stats out: two columns on phones, four from 900px.
		</p>
		<div class="stats">
			<Stat label="Open tasks" value={18} delta={-3} deltaNote="since last week" />
			<Stat label="Closed this week" value={12} delta={4} />
			<Stat label="Members" value={9} />
			<Stat label="Budget left" value="21,400" unit="EUR" />
		</div>
	</section>

	<section aria-labelledby="units">
		<h2 id="units" class="hp-section-title">Units and deltas</h2>
		<p class="lede">
			A unit only; a number delta that rose, fell and stayed; a string delta written by the app.
		</p>
		<div class="stats">
			<Stat label="Median review time" value="3.5" unit="hours" />
			<Stat label="Files" value={312} delta={27} deltaNote="this month" />
			<Stat label="Overdue" value={2} delta={-1} deltaNote="since Monday" />
			<Stat label="Members" value={9} delta={0} deltaNote="this month" />
			<Stat label="Storage used" value="41.6" unit="GB" delta="+2.4 GB" deltaNote="this week" />
		</div>
	</section>

	<section aria-labelledby="tones">
		<h2 id="tones" class="hp-section-title">Status tones</h2>
		<p class="lede">
			<code>danger</code>, <code>warn</code> and <code>ok</code> colour the delta only. Each note says
			whether the change is good or bad, so the stat reads the same without colour.
		</p>
		<div class="stats">
			<Stat label="Failed checks" value={3} delta={2} deltaNote="more than yesterday" tone="danger" />
			<Stat label="Waiting on review" value={5} delta={1} deltaNote="needs a reviewer" tone="warn" />
			<Stat label="Tests passing" value="98.6%" delta="+1.2%" deltaNote="better than last release" tone="ok" />
		</div>
	</section>

	<section aria-labelledby="display">
		<h2 id="display" class="hp-section-title">Display</h2>
		<p class="lede">
			The view’s one display subject: here, a key figure on a project page. It clamps from 32px on
			phones to 56px from 1200px.
		</p>
		<Stat
			variant="display"
			label="Tasks closed this quarter"
			value="1,204"
			delta={86}
			deltaNote="since last quarter"
		/>
	</section>

	<section aria-labelledby="tick">
		<h2 id="tick" class="hp-section-title">Tick on change</h2>
		<p class="lede">
			When a number value changes, the figure ticks from the old value to the new one over
			<code>--dur-tick</code> on the <code>--tick</code> curve. It never ticks on the first render. A
			string value changes at once, and so do the label, the unit and the delta. Press a button again
			during a tick: the figure continues from the value on screen.
		</p>
		<div class="stats">
			<div class="ticker">
				<Stat
					label="Budget left"
					value={budget}
					format={groupThousands}
					unit="EUR"
					delta={signed(budgetChange)}
					deltaNote="since the last change"
				/>
				<div><Button aria-label="Change budget left" onclick={changeBudget}>Change</Button></div>
			</div>
			<div class="ticker">
				<Stat label="Median review time" value={hours} unit="hours" />
				<div><Button aria-label="Change median review time" onclick={changeHours}>Change</Button></div>
			</div>
			<div class="ticker">
				<Stat label="Open tasks" value={tasks} delta={tasksChange} deltaNote="since the last change" />
				<div><Button aria-label="Change open tasks" onclick={changeTasks}>Change</Button></div>
			</div>
		</div>
		<ul class="notes after-row">
			<li>
				<strong>Format.</strong> <code>format</code> formats every step of the tick and the value at
				rest; here it groups the budget’s thousands. Without it the steps keep the larger number of
				decimal places of the old and new value: 3.5 to 4.25 steps in hundredths, 18 to 21 in whole
				numbers.
			</li>
			<li>
				<strong>When it jumps.</strong> Under reduced motion, and inside a live region
				(<code>aria-live</code>, or the role <code>status</code>, <code>log</code> or
				<code>alert</code>), the value jumps to the new figure.
			</li>
			<li>
				<strong>Screen readers and width.</strong> Screen readers get only the final value; the moving
				digits are hidden from them. While a figure ticks it keeps the width of the wider of the old
				and new value, so the unit beside it holds still.
			</li>
		</ul>
	</section>

	<section aria-labelledby="long">
		<h2 id="long" class="hp-section-title">Long values</h2>
		<p class="lede">
			A figure wider than its column breaks rather than widen the page. Shorten it in the app where you
			can, for example with a larger unit.
		</p>
		<div class="stats">
			<Stat label="Bytes uploaded" value="1,204,587,331,904" />
			<Stat label="Bytes uploaded" value="1.2" unit="TB" />
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

	/* Token names never break at their hyphens. */
	code {
		font-size: 0.875em;
		white-space: nowrap;
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
	.notes.after-row {
		margin-top: var(--space-8);
	}

	/* The page's layout for a row of stats: two columns on phones, four from
	   900px, 16px apart in a row and 32px between rows. */
	.stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-8) var(--space-4);
	}
	@media (min-width: 900px) {
		.stats {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	/* A stat over the button that changes it. The buttons of one row line up
	   at its foot. */
	.ticker {
		display: grid;
		align-content: space-between;
		gap: var(--space-4);
		min-width: 0;
	}
</style>
