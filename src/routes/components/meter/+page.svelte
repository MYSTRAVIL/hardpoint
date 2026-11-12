<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Meter, { type MeterTone } from '#lib/components/Meter.svelte';

	// A live figure: storage used, moved by hand across the thresholds.
	const capacity = 50;
	let used = $state(32);
	const step = 4;
	const free = $derived(capacity - used);
	const storageDetail = $derived(
		used >= capacity
			? 'Storage is full. Remove files to save new ones.'
			: used >= capacity * 0.8
				? `Running low: ${free} GB left.`
				: `${free} GB left.`
	);

	// A level where lower is worse. The app picks the tone from its own
	// rules; the meter only draws it.
	const levels = [
		{ name: 'Tablet', level: 78 },
		{ name: 'Camera', level: 24 },
		{ name: 'Scanner', level: 9 }
	];
	const levelTone = (level: number): MeterTone =>
		level <= 10 ? 'danger' : level <= 25 ? 'warn' : 'ok';
	const levelNote = (level: number) =>
		level <= 10 ? 'Charge now' : level <= 25 ? 'Charge soon' : 'Charged enough';
</script>

<svelte:head>
	<title>Meter · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Meter</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A measurement inside a known range: storage used, a quota, a monthly budget, a battery level.
		<code>Meter</code> uses the same separate segments as <a href="/components/progress">Progress</a>,
		but its colour follows thresholds, and it can carry a reference mark and a line of detail. It is
		not task progress: work that is getting done shows a Progress.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Value.</strong> <code>value</code> runs from <code>min</code> (default 0) to
				<code>max</code> (default 100). Values outside the range are held at its ends for the bar and
				for <code>aria-valuenow</code>.
			</li>
			<li>
				<strong>Thresholds.</strong> The bar is titanium until <code>warnAt</code>, shows warn from
				there and danger from <code>dangerAt</code>. The defaults are 80 percent of the range and
				<code>max</code>. A value on a line counts as past it. <code>null</code> turns a step off.
			</li>
			<li>
				<strong>Tone.</strong> <code>tone</code> (<code>ok</code>, <code>warn</code> or
				<code>danger</code>) replaces the thresholds. Use it where lower is worse, or for a state the
				value cannot show, such as a limit that is reported as reached.
			</li>
			<li>
				<strong>Words, not colour alone.</strong> Colour never carries the meaning by itself. The
				value text always shows beside the label and takes the tone’s hue. When the app sets
				<code>tone</code>, say why in <code>valueText</code> or <code>detail</code>.
			</li>
			<li>
				<strong>Label.</strong> <code>label</code> is a line above the bar, as written, never in caps.
				It names the meter. Without it, name the meter with <code>aria-label</code> or
				<code>aria-labelledby</code>, and show the value in the app’s own text.
			</li>
			<li>
				<strong>Value in words.</strong> <code>valueText</code>, such as <code>32 of 50 GB</code>,
				ends the label line and is read as <code>aria-valuetext</code>. Without it both give the
				share of the range, rounded down.
			</li>
			<li>
				<strong>Marker.</strong> <code>marker</code> draws a thin mark across the bar at a reference
				value: a target, an expected level, an earlier reading. It is visual only and hidden from
				assistive technology, so state what it means in <code>detail</code>. It runs 4px past the bar
				above and below, so leave room for it.
			</li>
			<li>
				<strong>Detail.</strong> <code>detail</code> is a muted line under the bar, as written. It is
				the meter’s description (<code>aria-describedby</code>); ids the app passes follow it.
			</li>
			<li>
				<strong>Semantics.</strong> Bits UI Meter gives the root <code>role="meter"</code> with
				<code>aria-valuemin</code>, <code>aria-valuemax</code> and <code>aria-valuenow</code>. The
				root carries <code>data-tone</code> (<code>ok</code>, <code>warn</code> or
				<code>danger</code>, absent with none), <code>data-lit</code> and
				<code>data-segments</code>; each segment has <code>data-lit</code> once lit. Parts are
				<code>.hp-meter-bar</code>, <code>.hp-meter-segment</code>, <code>.hp-meter-marker</code> and
				<code>.hp-meter-detail</code>. <code>id</code>, extra attributes and <code>class</code> go to
				the root.
			</li>
			<li>
				<strong>Motion.</strong> A segment fades its colour over <code>--dur-segment</code> as it
				lights, goes out or changes tone. The marker moves at once. Nothing fades on the first
				render. Reduced motion keeps the fade, because it changes only colour.
			</li>
		</ul>
	</section>

	<section aria-labelledby="live">
		<h2 id="live" class="hp-section-title">Moving across the thresholds</h2>
		<p class="lede">
			Add and remove files. From 40 GB the bar shows warn, and at 50 GB it shows danger. Each
			change is in the words as well as the colour.
		</p>
		<div class="row">
			<Button onclick={() => (used = Math.min(capacity, used + step))} disabled={used >= capacity}
				>Add {step} GB</Button
			>
			<Button onclick={() => (used = Math.max(0, used - step))} disabled={used <= 0}
				>Remove {step} GB</Button
			>
			<Button variant="tertiary" onclick={() => (used = 32)}>Reset</Button>
		</div>
		<div class="stack demo">
			<Meter
				label="Storage used"
				value={used}
				max={capacity}
				valueText="{used} of {capacity} GB"
				detail={storageDetail}
			/>
		</div>
	</section>

	<section aria-labelledby="marker">
		<h2 id="marker" class="hp-section-title">Marker and detail</h2>
		<p class="lede">
			The mark shows last month’s use at this date. The detail line says so, because the mark is not
			read aloud.
		</p>
		<div class="stack">
			<Meter
				label="Storage used"
				value={34}
				max={50}
				marker={28}
				valueText="34 of 50 GB"
				detail="6 GB above last month’s use at this date, marked on the bar"
			/>
			<Meter
				label="Storage used"
				value={18}
				max={50}
				marker={28}
				valueText="18 of 50 GB"
				detail="10 GB below last month’s use at this date, marked on the bar"
			/>
		</div>
	</section>

	<section aria-labelledby="warn">
		<h2 id="warn" class="hp-section-title">Warn</h2>
		<p class="lede">
			A quota at 84 percent is past the default warn line of 80 percent.
		</p>
		<div class="stack">
			<Meter
				label="Requests this month"
				value={8400}
				max={10000}
				valueText="8,400 of 10,000"
				detail="Resets on the 1st"
			/>
		</div>
	</section>

	<section aria-labelledby="danger">
		<h2 id="danger" class="hp-section-title">Danger at the maximum</h2>
		<p class="lede">
			At <code>max</code> the default danger line is reached. The bar is full in the danger colour, and the value
			text says it is full.
		</p>
		<div class="stack">
			<Meter label="Team seats" value={25} max={25} valueText="25 of 25 seats" />
		</div>
	</section>

	<section aria-labelledby="tone-danger">
		<h2 id="tone-danger" class="hp-section-title">Tone set from outside</h2>
		<p class="lede">
			The value is 60 percent, but the service reports the limit as reached. The app sets
			<code>tone="danger"</code> and says why in <code>detail</code>.
		</p>
		<div class="stack">
			<Meter
				label="Image processing"
				value={60}
				tone="danger"
				valueText="60% used, limit reached"
				detail="The plan changed on 3 November and cut this quota. Processing resumes on the 1st."
			/>
		</div>
	</section>

	<section aria-labelledby="lower">
		<h2 id="lower" class="hp-section-title">Lower is worse</h2>
		<p class="lede">
			A battery level is better the higher it is, so the thresholds do not fit. The app chooses the
			tone from its own rules and says what to do in <code>detail</code>.
		</p>
		<div class="stack">
			{#each levels as device (device.name)}
				<Meter
					label={device.name}
					value={device.level}
					tone={levelTone(device.level)}
					valueText="{device.level}% charged"
					detail={levelNote(device.level)}
				/>
			{/each}
		</div>
	</section>

	<section aria-labelledby="thresholds">
		<h2 id="thresholds" class="hp-section-title">Thresholds</h2>
		<p class="lede">
			A budget at 100 percent with both steps off stays titanium. The second pair moves the lines to
			60 and 90 percent: 72 percent is in warn.
		</p>
		<div class="stack">
			<Meter
				label="Budget used"
				value={100}
				warnAt={null}
				dangerAt={null}
				valueText="100% of the budget"
			/>
			<Meter
				label="Budget used, warn only"
				value={100}
				dangerAt={null}
				valueText="100% of the budget"
			/>
			<Meter label="Disk used" value={72} warnAt={60} dangerAt={90} />
		</div>
	</section>

	<section aria-labelledby="range">
		<h2 id="range" class="hp-section-title">Any range</h2>
		<p class="lede">
			<code>min</code> and <code>max</code> take the app’s own figures. The default warn line is 80
			percent of the span, not of <code>max</code>: here 80 percent of 20 to 120 is 100.
		</p>
		<div class="stack">
			<Meter label="Temperature" value={104} min={20} max={120} valueText="104 degrees" />
		</div>
	</section>

	<section aria-labelledby="segments">
		<h2 id="segments" class="hp-section-title">Segments</h2>
		<p class="lede">
			10, 20 (the default) and 40 segments at 64 percent: 6, 12 and 25 lit. More segments follow the
			value more closely and need more width.
		</p>
		<div class="stack">
			<Meter label="10 segments" value={64} segments={10} />
			<Meter label="20 segments" value={64} />
			<Meter label="40 segments" value={64} segments={40} />
		</div>
	</section>

	<section aria-labelledby="markers">
		<h2 id="markers" class="hp-section-title">Marker over every tone</h2>
		<p class="lede">
			The mark has a 1px edge in the canvas colour, so it reads over lit segments of every tone, over
			unlit ones, over the gaps, and at either end.
		</p>
		<div class="stack">
			<Meter label="No tone, mark over lit" value={60} marker={35} />
			<Meter label="No tone, mark over unlit" value={30} marker={65} />
			<Meter label="Ok, mark in a gap" value={50} tone="ok" marker={45} />
			<Meter label="Warn" value={85} marker={50} />
			<Meter label="Danger" value={100} marker={72} />
			<Meter label="Mark at the start" value={40} marker={0} />
			<Meter label="Mark at the end" value={40} marker={100} />
		</div>
	</section>

	<section aria-labelledby="unlabelled">
		<h2 id="unlabelled" class="hp-section-title">Named by <code>aria-label</code></h2>
		<p class="lede">
			No label line: the meter takes its name from <code>aria-label</code>, and the row shows the
			value as its own text. <code>valueText</code> is still read aloud.
		</p>
		<div class="row-meter">
			<span>Disk space</span>
			<Meter
				aria-label="Disk space"
				value={412}
				max={512}
				valueText="412 of 512 GB"
				segments={10}
			/>
			<span class="hp-num count">412 of 512 GB</span>
		</div>
	</section>

	<section aria-labelledby="full">
		<h2 id="full" class="hp-section-title">Full width</h2>
		<p class="lede">
			The same 20 segments across the whole content width. This meter has an <code>id</code>, which
			lands on the meter element, so other elements can point at it.
		</p>
		<Meter id="storage-meter" label="Storage used" value={32} max={50} valueText="32 of 50 GB" />
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

	/* A column the width of a settings list or a dialog. Rows have room for
	   the marker's 4px above and below the bar. */
	.stack {
		display: grid;
		gap: var(--space-6);
		max-width: 32rem;
	}
	.demo {
		margin-top: var(--space-6);
	}

	/* Name, bar and count on one line from 600px; the bar under the name on
	   phones. */
	.row-meter {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		max-width: 40rem;
	}
	.row-meter :global(.hp-meter) {
		grid-column: 1 / -1;
		grid-row: 2;
	}
	.count {
		color: var(--muted);
	}
	@media (min-width: 600px) {
		.row-meter {
			grid-template-columns: 8rem minmax(0, 1fr) 8rem;
		}
		.row-meter :global(.hp-meter) {
			grid-column: 2;
			grid-row: 1;
		}
		.count {
			text-align: right;
		}
	}
</style>
