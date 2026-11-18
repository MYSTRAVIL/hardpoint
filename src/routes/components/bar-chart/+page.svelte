<script lang="ts">
	import LabelsTable from '../../LabelsTable.svelte';
	import Button from '#lib/components/Button.svelte';
	import BarChart, { type BarChartItem, type BarChartSeries } from '#lib/components/BarChart.svelte';

	// Every figure on this page comes from fixed formulas, so the server and
	// the browser draw the same bars.
	const pad = (n: number) => String(n).padStart(2, '0');
	const grouped = (n: number) => n.toLocaleString('en-US');

	// ---- Jobs per hour: three series in the inks and a status hue --------

	const jobSeries: BarChartSeries[] = [
		{ key: 'scheduled', label: 'Scheduled', color: 'text' },
		{ key: 'manual', label: 'Manual', color: 'muted' },
		{ key: 'failed', label: 'Failed', tone: 'danger' }
	];
	function jobHour(h: number): BarChartItem {
		const day = Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2));
		return {
			label: `${pad(h % 24)}:00`,
			values: {
				scheduled: 40 + Math.round(90 * day) + ((h * 7) % 11),
				manual: Math.round(60 * day * day) + ((h * 5) % 7),
				failed: (h * 13) % 9 === 0 ? 9 : (h * 3) % 4
			}
		};
	}
	let firstHour = $state(0);
	const jobs = $derived(Array.from({ length: 24 }, (_, i) => jobHour(firstHour + i)));

	// ---- Storage by file type: five categories ---------------------------

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const typeSeries: BarChartSeries[] = [
		{ key: 'documents', label: 'Documents' },
		{ key: 'images', label: 'Images' },
		{ key: 'video', label: 'Video' },
		{ key: 'audio', label: 'Audio' },
		{ key: 'archives', label: 'Archives' }
	];
	const storage: BarChartItem[] = months.map((m, i) => ({
		label: `${m} 2026`,
		axisLabel: m,
		values: {
			documents: 12 + i,
			images: 20 + Math.round(i * 1.5),
			video: 8 + ((i * 7) % 12),
			audio: 4 + (i % 3),
			archives: 6 + Math.floor(i / 2)
		}
	}));

	// ---- One series ------------------------------------------------------

	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const visitSeries: BarChartSeries[] = [{ key: 'visits', label: 'Visits' }];
	const visits: BarChartItem[] = days.map((d, i) => ({
		label: d,
		axisLabel: d.slice(0, 3),
		values: { visits: [1840, 2210, 2075, 2390, 1960, 860, 720][i] }
	}));

	// ---- Below zero ------------------------------------------------------

	const stockSeries: BarChartSeries[] = [{ key: 'change', label: 'Net change', color: 'text' }];
	const stock: BarChartItem[] = [12, 30, -8, 22, -26, -14, 6, 18, 34, -4, 10, 24].map((v, i) => ({
		label: `Week ${i + 1}`,
		axisLabel: `W${i + 1}`,
		values: { change: v }
	}));

	// ---- Shared scale ----------------------------------------------------

	const ticketSeries: BarChartSeries[] = [
		{ key: 'opened', label: 'Opened', color: 'category-3' },
		{ key: 'reopened', label: 'Reopened', color: 'category-5' }
	];
	const week = (seed: number): BarChartItem[] =>
		days.map((d, i) => ({
			label: d,
			axisLabel: d.slice(0, 3),
			values: { opened: 8 + ((i * seed) % 9), reopened: (i + seed) % 4 }
		}));
	const thisWeek = week(5);
	const lastWeek = week(3);
	const shared = Math.max(
		...[...thisWeek, ...lastWeek].map((d) => d.values.opened + d.values.reopened)
	);

	// ---- Many bars -------------------------------------------------------

	const requestSeries: BarChartSeries[] = [{ key: 'requests', label: 'Requests', color: 'text' }];
	const quarter: BarChartItem[] = Array.from({ length: 90 }, (_, i) => {
		const date = new Date(Date.UTC(2026, 7, 1 + i));
		const label = date.toISOString().slice(0, 10);
		return {
			label,
			axisLabel: label.slice(5),
			values: {
				requests:
					3200 + Math.round(1400 * Math.sin(i / 9)) + ((i * 37) % 600) - (i % 7 >= 5 ? 1500 : 0)
			}
		};
	});
</script>

<svelte:head>
	<title>Bar chart · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Bar chart</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		Counts over time or across groups, as vertical bars. <code>BarChart</code> stacks the series of
		each bar, draws its scale in hairlines, and keeps every value within reach of a mouse, a tap and
		the keyboard. It is not a meter: a single measurement against a range is a
		<a href="/components/meter">Meter</a>.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Data.</strong> <code>items</code> are the bars, from left to right. Each has a
				<code>label</code> (the readout and the table), an optional shorter <code>axisLabel</code> under the
				bar, and <code>values</code>, one number per series <code>key</code>. A missing key counts as 0.
				Positive values stack up from zero in series order, negative values stack down from it.
			</li>
			<li>
				<strong>Series.</strong> <code>series</code> lists them bottom up, each with a <code>key</code> and a
				<code>label</code> as written. Two or more stack, and the readout and the table add a total. With
				no <code>color</code>, a series takes the next data category, <code>--category-1</code> to
				<code>--category-5</code>. <code>color</code> also takes the inks <code>text</code> and
				<code>muted</code>; <code>tone</code> takes a status hue, only where the series means that status.
				Five categories at most: group the rest, or draw them in an ink.
			</li>
			<li>
				<strong>Readout.</strong> The line above the plot is the legend. It shows each series’ swatch, name
				and value for one bar, then the total: the bar a mouse points at, the bar a tap or the keys chose,
				and the last bar otherwise. Each part keeps its width for every bar, so nothing moves as the values
				change. Nothing in it waits for hover.
			</li>
			<li>
				<strong>Touch.</strong> A tap chooses a bar and a sideways drag moves along them. Up and down still
				scroll the page. A tap outside the chart lets the readout go back to the last bar.
			</li>
			<li>
				<strong>Keys.</strong> The plot is one tab stop with the focus contour. Focus marks the bar the
				readout shows; <kbd>←</kbd> and <kbd>→</kbd> move one bar, <kbd>Home</kbd> and <kbd>End</kbd> go to
				the ends. A hidden status line says each bar’s values.
			</li>
			<li>
				<strong>Text alternative.</strong> <code>label</code> names the plot and a visually hidden table that
				holds every value, so a screen reader can read the whole chart. It is not shown: say it in the
				page’s own heading. To show the numbers on screen too, put a <a href="/components/table">Table</a>
				beside the chart.
			</li>
			<li>
				<strong>Scale.</strong> Hairlines in <code>--border</code> at round steps, labelled in Geist Mono in
				<code>--muted</code> with tabular figures. <code>format</code> writes every value: the scale, the
				readout and the table. <code>max</code> sets a top the scale reaches at least, so two charts can
				share one.
			</li>
			<li>
				<strong>Size.</strong> The chart fills its width and measures it, so bars, gaps and hairlines sit on
				whole pixels. Bars are 4px apart, closer when many share the width, and 40px wide at most. Axis
				labels thin out to fit. The plot is 160px high; set <code>--bar-chart-height</code> in the app’s
				class for another height.
			</li>
			<li>
				<strong>Semantics.</strong> The root carries <code>data-active</code> (the marked bar’s index) and
				<code>data-stacked</code>. Each bar is a <code>.hp-bar-chart-bar</code> with
				<code>data-index</code>; each part is a <code>.hp-bar-chart-part</code> with
				<code>data-series</code> and <code>data-color</code> or <code>data-tone</code>. Extra attributes and
				<code>class</code> go to the root.
			</li>
			<li>
				<strong>Motion.</strong> None. New data, a pointer and the keys change the bars and the mark at once.
			</li>
		</ul>
	</section>

	<section aria-labelledby="stacked">
		<h2 id="stacked" class="hp-section-title">Stacked series</h2>
		<p class="lede">
			Jobs per hour over a day. Scheduled runs are titanium, manual runs muted, and failures take the
			danger hue because they mean failure. Point at a bar, tap it or tab to the plot. Next hour moves
			the window; the bars change at once.
		</p>
		<div class="row">
			<Button onclick={() => (firstHour += 1)}>Next hour</Button>
			<Button variant="tertiary" onclick={() => (firstHour = 0)} disabled={firstHour === 0}>Reset</Button>
		</div>
		<BarChart label="Jobs per hour, by how they started" items={jobs} series={jobSeries} />
	</section>

	<section aria-labelledby="categories">
		<h2 id="categories" class="hp-section-title">Five categories</h2>
		<p class="lede">
			Storage by file type, month by month. Five series take the five categories in order. The readout
			names each one beside its swatch, so the colours always have a legend.
		</p>
		<BarChart
			label="Storage used by file type, per month"
			items={storage}
			series={typeSeries}
			format={(n) => `${n} GB`}
		/>
	</section>

	<section aria-labelledby="single">
		<h2 id="single" class="hp-section-title">One series</h2>
		<p class="lede">
			Visits per day. One series takes the first category and no total. Bars in a wide slot stop at
			40px and centre in it. The app formats the figures with <code>format</code>.
		</p>
		<BarChart label="Visits per day" items={visits} series={visitSeries} format={grouped} />
	</section>

	<section aria-labelledby="negative">
		<h2 id="negative" class="hp-section-title">Below zero</h2>
		<p class="lede">
			Net change in stock per week. Losses draw down from the zero line, and the scale reaches the
			lowest one.
		</p>
		<BarChart label="Net change in stock per week" items={stock} series={stockSeries} />
	</section>

	<section aria-labelledby="shared">
		<h2 id="shared" class="hp-section-title">Shared scale</h2>
		<p class="lede">
			Two weeks side by side with the same <code>max</code>, so equal bars are equal heights. Named
			colours: blue and magenta, the third and fifth categories.
		</p>
		<div class="pair">
			<div>
				<h3 class="hp-label pair-title">This week</h3>
				<BarChart
					label="Tickets this week"
					items={thisWeek}
					series={ticketSeries}
					max={shared}
				/>
			</div>
			<div>
				<h3 class="hp-label pair-title">Last week</h3>
				<BarChart
					label="Tickets last week"
					items={lastWeek}
					series={ticketSeries}
					max={shared}
				/>
			</div>
		</div>
	</section>

	<section aria-labelledby="many">
		<h2 id="many" class="hp-section-title">Many bars, a lower plot</h2>
		<p class="lede">
			Ninety days of requests. The gaps narrow to fit the width and the dates thin out. The page’s class
			sets <code>--bar-chart-height</code> to 96px.
		</p>
		<BarChart
			class="low"
			label="Requests per day, August to October"
			items={quarter}
			series={requestSeries}
			format={grouped}
		/>
	</section>

	<section aria-labelledby="narrow">
		<h2 id="narrow" class="hp-section-title">In a narrow column</h2>
		<p class="lede">
			The jobs chart in 288px, the content width of a 320px phone. The readout wraps but keeps its
			places.
		</p>
		<div class="narrow">
			<BarChart label="Jobs per hour, narrow" items={jobs} series={jobSeries} />
		</div>
	</section>

	<section aria-labelledby="labels">
		<h2 id="labels" class="hp-section-title">Labels</h2>
		<LabelsTable
			rows={[
				{ prop: 'totalLabel', value: 'Total', shows: 'The stacked total in the readout, the status line and the table.' },
				{ prop: 'keysText', value: 'Arrow keys move between bars.', shows: 'Read by assistive technology when the plot takes focus.' }
			]}
		/>
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

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-6);
	}
	.row + :global(.hp-bar-chart) {
		margin-top: var(--space-6);
	}

	.pair {
		display: grid;
		gap: var(--space-10);
	}
	@media (min-width: 900px) {
		.pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-8);
		}
	}
	.pair-title {
		margin: 0 0 var(--space-3);
		color: var(--muted);
	}

	.narrow {
		max-width: 288px;
	}

	:global(.hp-bar-chart.low) {
		--bar-chart-height: 96px;
	}
</style>
