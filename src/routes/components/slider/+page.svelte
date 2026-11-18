<script lang="ts">
	import Slider from '#lib/components/Slider.svelte';

	let opacity = $state(60);
	let threshold = $state(0.4);
	let quality = $state(3);
	let volume = $state(35);
	let committed = $state(35);
	let draft = $state(12);
	let steps = $state(0);

	const percent = (n: number) => `${n}%`;
	const fixed = (n: number) => n.toFixed(2);
	const level = (n: number) => `Level ${n} of 10`;
</script>

<svelte:head>
	<title>Slider · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Slider</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		One number picked by moving a thumb along a track: a threshold, a level, a volume. <code>Slider</code>
		is Bits UI Slider with a caps label above the track and the current value beside it, updated live. It
		suits a value where the position matters more than the digits. For a value the reader types, use a
		<a href="/components/text-field">number field</a>.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label and value.</strong> <code>label</code> is required: a caps label above the track, and the
				slider’s accessible name. The value sits at the other end of that line in tabular figures.
				<code>format</code> turns the number into the text shown, such as <code>(n) =&gt; n + '%'</code>;
				without it the number is shown as it is.
			</li>
			<li>
				<strong>Value.</strong> <code>bind:value</code> holds the number. <code>min</code> (default 0),
				<code>max</code> (default 100) and <code>step</code> (default 1) set the range; the value stays inside
				it and on a step.
			</li>
			<li>
				<strong>Assistive technology.</strong> The thumb has <code>role="slider"</code> with the range and the
				value. <code>valueText</code> gives the value in words for <code>aria-valuetext</code>, such as
				“Level 3 of 10”; without it the formatted value is read. <code>hint</code> shows guidance under the
				track and is linked by <code>aria-describedby</code>.
			</li>
			<li>
				<strong>Pointer and touch.</strong> A press anywhere on the track moves the thumb there, and a drag
				follows. The track area is 24px high with a mouse and 44px on touch, and the thumb’s own hit area is at
				least 24px square (44px on touch). A touch that starts on the track and moves sideways drags the thumb;
				one that moves up or down scrolls the page.
			</li>
			<li>
				<strong>Keys.</strong> Tab moves to the thumb. The arrow keys move it by one <code>step</code>,
				<kbd>Home</kbd> and <kbd>End</kbd> to the ends.
			</li>
			<li>
				<strong>Events.</strong> <code>onValueChange</code> runs on every change while the thumb moves.
				<code>onValueCommit</code> runs once when a drag or a key press ends: use it to run work that is too
				heavy for every step.
			</li>
			<li>
				<strong>Motion.</strong> Nothing animates. The thumb and the filled part of the track follow the value
				at once, because a drag is frequent and continuous.
			</li>
			<li>
				<strong>Width.</strong> The slider fills the width it is given; <code>class</code> goes to the outer
				element so an app can set a width or a margin. Other attributes go to the track area.
			</li>
		</ul>
	</section>

	<section aria-labelledby="default">
		<h2 id="default" class="hp-section-title">Default</h2>
		<p class="lede">
			A percentage from 0 to 100. The track is a plain well with the 3:1 boundary, and the part up to the
			thumb is filled in titanium. Unlike Progress and Meter, which only show a value in separate segments, it
			is plain and has a thumb, so it reads as something to move.
		</p>
		<div class="stack">
			<Slider label="Opacity" format={percent} bind:value={opacity} />
		</div>
		<p class="value hp-caption"><span class="hp-mono">opacity = {opacity}</span></p>
	</section>

	<section aria-labelledby="range">
		<h2 id="range" class="hp-section-title">Range, step and hint</h2>
		<p class="lede">
			<code>min</code>, <code>max</code> and <code>step</code> set a range of fractions; <code>format</code> keeps
			them to two places. The hint says what the number means.
		</p>
		<div class="stack">
			<Slider
				label="Match threshold"
				min={0}
				max={1}
				step={0.05}
				format={fixed}
				hint="Results scoring below this are hidden."
				bind:value={threshold}
			/>
		</div>
		<p class="value hp-caption"><span class="hp-mono">threshold = {threshold}</span></p>
	</section>

	<section aria-labelledby="words">
		<h2 id="words" class="hp-section-title">The value in words</h2>
		<p class="lede">
			A level from 1 to 10. The line shows the number; a screen reader hears “Level 3 of 10” through
			<code>valueText</code>.
		</p>
		<div class="stack">
			<Slider label="Quality" min={1} max={10} valueText={level} bind:value={quality} />
		</div>
	</section>

	<section aria-labelledby="commit">
		<h2 id="commit" class="hp-section-title">Change and commit</h2>
		<p class="lede">
			<code>onValueChange</code> counts every change; <code>onValueCommit</code> reads the value only when a
			drag or a key press ends.
		</p>
		<div class="stack">
			<Slider
				label="Volume"
				format={percent}
				bind:value={volume}
				onValueChange={() => steps++}
				onValueCommit={(v) => (committed = v)}
			/>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">changes = {steps}</span> · <span class="hp-mono">committed = {committed}</span>
		</p>
	</section>

	<section aria-labelledby="disabled">
		<h2 id="disabled" class="hp-section-title">Disabled</h2>
		<p class="lede">
			A disabled slider keeps its place and its value, in the muted ink with the quieter boundary. It takes no
			focus.
		</p>
		<div class="stack">
			<Slider label="Draft limit" format={percent} disabled bind:value={draft} hint="Set by the workspace owner." />
		</div>
	</section>

	<section aria-labelledby="row">
		<h2 id="row" class="hp-section-title">In a row</h2>
		<p class="lede">
			Two sliders side by side from 600px, stacked below. Each fills its column.
		</p>
		<div class="pair">
			<Slider label="Opacity" format={percent} bind:value={opacity} />
			<Slider label="Match threshold" min={0} max={1} step={0.05} format={fixed} bind:value={threshold} />
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
	code,
	kbd {
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

	.stack {
		display: grid;
		gap: var(--space-6);
		max-width: 32rem;
	}
	.pair {
		display: grid;
		gap: var(--space-6);
		max-width: 48rem;
	}
	@media (min-width: 600px) {
		.pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-8);
		}
	}

	.value {
		margin: var(--space-3) 0 0;
		color: var(--muted);
	}
</style>
